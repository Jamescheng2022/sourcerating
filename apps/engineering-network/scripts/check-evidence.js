import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PROJECT_DATA } from '../src/data/projectData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

/**
 * 1. 深度遍历 PROJECT_DATA (排除 evidenceDb 定义区)，提取所有实际引用的证据 ID 与数据路径
 */
export function extractDataReferences(data) {
  const references = []; // { id, path }

  function walk(node, currentPath) {
    if (node === null || node === undefined) return;

    if (typeof node === 'string') {
      if (node.startsWith('EVD-')) {
        references.push({ id: node, path: currentPath });
      }
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item, idx) => {
        const itemPath = `${currentPath}[${idx}]`;
        if (typeof item === 'string') {
          if (currentPath.endsWith('evidenceIds') || item.startsWith('EVD-')) {
            references.push({ id: item, path: itemPath });
          }
        } else if (item && typeof item === 'object') {
          walk(item, itemPath);
        }
      });
      return;
    }

    if (typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        if (key === 'evidenceDb') {
          // 排除定义表本身
          continue;
        }

        const nextPath = currentPath ? `${currentPath}.${key}` : key;

        if (typeof value === 'string') {
          if (key === 'evidenceId' || key === 'refId' || key === 'evd' || value.startsWith('EVD-')) {
            references.push({ id: value, path: nextPath });
          }
        } else if (Array.isArray(value)) {
          if (key === 'evidenceIds') {
            value.forEach((idStr, idx) => {
              if (typeof idStr === 'string') {
                references.push({ id: idStr, path: `${nextPath}[${idx}]` });
              }
            });
          } else {
            walk(value, nextPath);
          }
        } else if (typeof value === 'object') {
          walk(value, nextPath);
        }
      }
    }
  }

  walk(data, 'PROJECT_DATA');
  return references;
}

/**
 * 2. 校验 PROJECT_DATA 数据本身的完整性与约束规则：
 *    - key === id
 *    - PLAN 存证绝不可标注为 VERIFIED (必须为 PLANNED/PROSPECTIVE 等预期态)
 *    - 所有数据节点引用的 ID 必须在 evidenceDb 中存在
 */
export function validateProjectData(data) {
  const errors = [];
  const evidenceDb = data.evidenceDb || {};
  const definedKeys = new Set(Object.keys(evidenceDb));

  // 校验定义项本身
  for (const [key, evd] of Object.entries(evidenceDb)) {
    if (!evd || typeof evd !== 'object') {
      errors.push(`evidenceDb['${key}'] 不是有效对象`);
      continue;
    }
    if (key !== evd.id) {
      errors.push(`Key 不一致: evidenceDb 键名 '${key}' !== 实体 id '${evd.id}'`);
    }
    // PLAN 规则：未来/计划阶段不能是已核实
    if (key.includes('PLAN') || (evd.id && evd.id.includes('PLAN'))) {
      if (evd.verificationLevel === 'VERIFIED') {
        errors.push(`合规错误: 计划阶段证据 '${key}' 的 verificationLevel 不能为 'VERIFIED'，当前为 '${evd.verificationLevel}'`);
      }
    }
  }

  // 提取实际数据引用
  const dataRefs = extractDataReferences(data);
  const referencedIds = new Set();

  for (const ref of dataRefs) {
    referencedIds.add(ref.id);
    if (!definedKeys.has(ref.id)) {
      errors.push(`未定义证据引用: 数据路径 '${ref.path}' 引用了未定义的存证 ID '${ref.id}'`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    dataRefs,
    referencedIds,
    definedCount: definedKeys.size,
    uniqueRefCount: referencedIds.size
  };
}

/**
 * 辅助：提取从指定起始位置开始的属性表达式值（支持多行、嵌套括号、模板字符串及数组）
 */
function extractAssignedValue(code, startIndex) {
  let depthBrace = 0;
  let depthBracket = 0;
  let depthParen = 0;
  let inString = false;
  let stringChar = null;
  let val = '';

  for (let i = startIndex; i < code.length; i++) {
    const ch = code[i];

    if (inString) {
      val += ch;
      if (ch === stringChar && code[i - 1] !== '\\') {
        inString = false;
        stringChar = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      inString = true;
      stringChar = ch;
      val += ch;
      continue;
    }

    if (ch === '{') {
      depthBrace++;
      val += ch;
      continue;
    }
    if (ch === '}') {
      if (depthBrace > 0) {
        depthBrace--;
        val += ch;
        continue;
      } else {
        break;
      }
    }
    if (ch === '[') {
      depthBracket++;
      val += ch;
      continue;
    }
    if (ch === ']') {
      if (depthBracket > 0) depthBracket--;
      val += ch;
      continue;
    }
    if (ch === '(') {
      depthParen++;
      val += ch;
      continue;
    }
    if (ch === ')') {
      if (depthParen > 0) depthParen--;
      val += ch;
      continue;
    }

    if (ch === ',' && depthBrace === 0 && depthBracket === 0 && depthParen === 0) {
      break;
    }
    if (ch === ';' && depthBrace === 0 && depthBracket === 0 && depthParen === 0) {
      break;
    }

    val += ch;
  }
  return val.trim();
}

/**
 * 结构化检测代码中受信数据源绑定变量 (AST/结构化特征)
 * 拒绝基于无关变量名或 bare const 的泛化信任，严格关联数据链
 */
export function getVerifiedDataBindings(code, definedKeys) {
  const verifiedVars = new Set();

  // 1. 结构化检测 PROJECT_DATA 或 evidenceDb 集合的 .map() / .forEach() 迭代回调参数
  // 匹配形如:
  // PROJECT_DATA.<collection>.map((varName) => ...) 或 .map(varName => ...)
  // Object.values(PROJECT_DATA.evidenceDb)...map((varName) => ...)
  const mapRegex = /(?:PROJECT_DATA\s*\.\s*[a-zA-Z0-9_.]+|Object\s*\.\s*values\s*\(\s*PROJECT_DATA\s*\.\s*evidenceDb\s*\))(?:\s*\.[a-zA-Z0-9_]+\s*\([^)]*\))*\s*\.\s*(?:map|forEach)\s*\(\s*(?:\(\s*([a-zA-Z0-9_$]+)|([a-zA-Z0-9_$]+)\s*=>)/g;
  let m;
  while ((m = mapRegex.exec(code)) !== null) {
    const varName = m[1] || m[2];
    if (varName) {
      verifiedVars.add(varName);
    }
  }

  // 2. 结构化检测从 PROJECT_DATA 集合提取的局部变量或组件默认 Props (如 filter, find, 索引或属性提取)
  // 匹配形如: const filteredStages = PROJECT_DATA.timelineStages.filter(...)
  // 或 const selectedStage = PROJECT_DATA.timelineStages.find(...)
  // 或 { posts = PROJECT_DATA.posts }
  const directAssignRegex = /(?:(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=[^;]*?PROJECT_DATA\s*\.\s*[a-zA-Z0-9_.]+|([a-zA-Z0-9_$]+)\s*=\s*PROJECT_DATA\s*\.\s*[a-zA-Z0-9_.]+)/g;
  while ((m = directAssignRegex.exec(code)) !== null) {
    const varName = m[1] || m[2];
    if (varName) {
      verifiedVars.add(varName);
    }
  }

  // 2b. 结构化检测由已受信任工程派生函数赋权之集合变量 (getCompanyParticipations, getPersonParticipations, getProjectParticipations 等)
  const derivedFnRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:getCompanyParticipations|getPersonParticipations|getProjectParticipations|getProjectById|getCompanyById|getPersonById)\s*\(/g;
  while ((m = derivedFnRegex.exec(code)) !== null) {
    const varName = m[1];
    if (varName) {
      verifiedVars.add(varName);
    }
  }

  // 2c. 结构化检测由已验证变量或 PROJECT_DATA 驱动的状态变量 (如 aiResponse, posts)
  const stateRegex = /const\s*\[\s*([a-zA-Z0-9_$]+)\s*,\s*set([A-Za-z0-9_$]+)\s*\]\s*=\s*useState/g;
  while ((m = stateRegex.exec(code)) !== null) {
    const stateVar = m[1];
    const setterName = m[2];
    const setterCallRegex = new RegExp(`set${setterName}\\s*\\(\\s*([a-zA-Z0-9_$]+|PROJECT_DATA)`);
    const setterMatch = code.match(setterCallRegex);
    if (setterMatch) {
      const arg = setterMatch[1];
      if (arg === 'PROJECT_DATA' || verifiedVars.has(arg)) {
        verifiedVars.add(stateVar);
      }
    }
    // 检测初值直接包含 PROJECT_DATA 或已受信任变量的 useState
    const directInitMatch = code.match(new RegExp(`const\\s*\\[\\s*${stateVar}\\s*,\\s*set${setterName}\\s*\\]\\s*=\\s*useState\\s*\\(\\s*([a-zA-Z0-9_.]+)`));
    if (directInitMatch) {
      const initArg = directInitMatch[1];
      if (initArg.startsWith('PROJECT_DATA') || verifiedVars.has(initArg)) {
        verifiedVars.add(stateVar);
      }
    }
  }

  // 2d. 结构化传递性检测由已受信任数据链派生出的局部变量 (如 filter, slice, map, 属性提取等)
  let addedNew = true;
  while (addedNew) {
    addedNew = false;
    for (const collName of Array.from(verifiedVars)) {
      const derivedAssignRegex = new RegExp(`(?:const|let|var)\\s+([a-zA-Z0-9_$]+)\\s*=[^;]*?${collName}(?:\\.[a-zA-Z0-9_]+)*\\s*\\.\\s*(?:filter|slice|map|find)`, 'g');
      while ((m = derivedAssignRegex.exec(code)) !== null) {
        const nextVar = m[1];
        if (nextVar && !verifiedVars.has(nextVar)) {
          verifiedVars.add(nextVar);
          addedNew = true;
        }
      }
    }
  }

  // 3. 结构化检测由已受信任集合派生出的 .map() / .forEach() 迭代回调参数
  // 例如: filteredStages.map((stage, idx) => ...)
  for (const collName of Array.from(verifiedVars)) {
    const collMapRegex = new RegExp(`${collName}(?:\\s*\\.[a-zA-Z0-9_]+\\s*\\([^)]*\\))*\\s*\\.\\s*(?:map|forEach)\\s*\\(\\s*(?:\\(\\s*([a-zA-Z0-9_$]+)|([a-zA-Z0-9_$]+)\\s*=>)`, 'g');
    while ((m = collMapRegex.exec(code)) !== null) {
      const iterVar = m[1] || m[2];
      if (iterVar) {
        verifiedVars.add(iterVar);
      }
    }
  }

  // 5. 结构化检测声明在当前作用域且证据字段为合法静态字面量的本地对象
  // 必须精确匹配: const/let/var <objName> = { ... evidenceId: 'EVD-...' ... }
  // 且所赋静态 ID 必须在 definedKeys 中登记
  const localObjRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*\{[\s\S]*?(?:evidenceId|refId|evd)\s*:\s*['"](EVD-[A-Za-z0-9_-]+)['"][\s\S]*?\}/g;
  while ((m = localObjRegex.exec(code)) !== null) {
    const objName = m[1];
    const evdId = m[2];
    if (definedKeys && definedKeys.has(evdId)) {
      verifiedVars.add(objName);
    }
  }

  return verifiedVars;
}

/**
 * 3. 校验源代码中的调用端 (静态字面、变量访问、本地对象与动态拼接拦截)
 */
export function validateCallerCode(code, filePath, definedKeys) {
  const errors = [];

  // A. 非 projectData.js 的所有证据字段 (evidenceId, refId, evd) 赋值必须为已定义的静态字面量 (Fail-Closed 极小规则)
  if (!filePath.includes('projectData.js')) {
    const propRegex = /(?:evidenceId|refId|evd)\s*:/g;
    let pMatch;
    while ((pMatch = propRegex.exec(code)) !== null) {
      const propName = pMatch[0].split(':')[0].trim();
      const startIndex = pMatch.index + pMatch[0].length;
      const rawVal = extractAssignedValue(code, startIndex);

      // 必须是规范的单/双引号静态字面量: 'EVD-...' 或 "EVD-..."
      const litMatch = rawVal.match(/^['"](EVD-[A-Za-z0-9_-]+)['"]$/);
      if (!litMatch) {
        errors.push(
          `[${filePath}] 非 projectData.js 的证据字段赋值必须是已定义的静态字面量 (如 'EVD-...'): ${propName}: ${rawVal}`
        );
        continue;
      }

      const id = litMatch[1];
      if (!definedKeys.has(id)) {
        errors.push(
          `[${filePath}] 字段声明的证据 ID '${id}' 未在 evidenceDb 中登记！`
        );
      }
    }
  }

  // B. 针对 onSelectEvidence(...) 调用的语法与数据溯源分析
  const verifiedVars = getVerifiedDataBindings(code, definedKeys);
  const callRegex = /onSelectEvidence\s*\(\s*([^)]+?)\s*\)/g;
  let match;

  while ((match = callRegex.exec(code)) !== null) {
    const rawArg = match[1].trim();

    // 检查组件回调参数声明: onSelectEvidence={(evdId) => ...}
    if (rawArg === 'evdId') {
      continue;
    }

    // 拦截模板字符串中嵌入表达式: `EVD-${...}` 或包含拼接: 'EVD-' + ...
    const isDynamicTemplate = /`[^`]*\${.+?}[^`]*`/.test(rawArg);
    const isConcat = /\+\s*['"`]|['"`]\s*\+|\.join\s*\(|\.concat\s*\(/.test(rawArg);

    if (isDynamicTemplate || isConcat) {
      errors.push(
        `[${filePath}] 禁止使用动态模板/拼接构造证据 ID: onSelectEvidence(${rawArg})。必须使用静态字面量或由 PROJECT_DATA 校验通过的数据源属性。`
      );
      continue;
    }

    // 检查是否为静态字面量: 'EVD-...' 或 "EVD-..."
    const literalMatch = rawArg.match(/^['"](EVD-[A-Za-z0-9_-]+)['"]$/);
    if (literalMatch) {
      const id = literalMatch[1];
      if (!definedKeys.has(id)) {
        errors.push(
          `[${filePath}] onSelectEvidence 传入的静态字面量 '${id}' 在 evidenceDb 中未定义！`
        );
      }
      continue;
    }

    // 检查成员属性传递: obj.prop 或 obj.evidenceIds[0] (严格限制可用证据字段，禁止非证据对象传递 .id)
    const memberMatch = rawArg.match(/^([a-zA-Z0-9_$]+)\.(evidenceId|refId|evd|evidenceIds\[0\])$/) || 
      (rawArg === 'evd.id' ? ['evd.id', 'evd', 'id'] : null);
    if (memberMatch) {
      const objName = memberMatch[1];

      // 必须通过结构化绑定验证 (来自 PROJECT_DATA 遍历、派生赋值、受控状态或合法声明)
      if (verifiedVars.has(objName)) {
        continue;
      }

      // 既非已证明的 PROJECT_DATA 数据源，又无受控合法声明
      errors.push(
        `[${filePath}] 无法证明对象 '${objName}' 的数据来源，拒绝未登记的成员传递: onSelectEvidence(${rawArg})`
      );
      continue;
    }

    // 未知或不可静态解析的调用
    errors.push(
      `[${filePath}] 遇到无法静态解析的 onSelectEvidence 参数: '${rawArg}'。要求统一使用规范的数据源字段或已在 evidenceDb 登记的静态字面量。`
    );
  }

  // C. 扫描非 projectData.js 中的裸 EVD- 字符串字面量
  if (!filePath.includes('projectData.js')) {
    const literalRegex = /['"`](EVD-[A-Za-z0-9_-]+)['"`]/g;
    let litMatch;
    while ((litMatch = literalRegex.exec(code)) !== null) {
      const litId = litMatch[1];
      if (!definedKeys.has(litId)) {
        errors.push(`[${filePath}] 包含未在 evidenceDb 中定义的静态证据字符串 '${litId}'`);
      }
    }
  }

  return errors;
}

/**
 * 递归收集所有待检测源代码文件
 */
function getAllSrcFiles(dir, extensions = ['.js', '.jsx', '.ts', '.tsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllSrcFiles(fullPath, extensions));
    } else {
      const ext = path.extname(fullPath);
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

/**
 * 4. 负例测试套件 (在内存中运行，不污染 src)
 */
export function runNegativeTests() {
  console.log('--- 运行证据校验负例回归测试 (Negative Tests Fixtures) ---');
  let passedCount = 0;
  const totalNegativeTests = 12;

  // 负例 1: 缺失 ID 引用
  {
    const fixtureData = {
      evidenceDb: { 'EVD-01': { id: 'EVD-01', verificationLevel: 'VERIFIED' } },
      timelineStages: [{ id: 's1', evidenceId: 'EVD-MISSING-999' }]
    };
    const res = validateProjectData(fixtureData);
    if (!res.valid && res.errors.some(e => e.includes('EVD-MISSING-999'))) {
      console.log('  ✓ 负例 1 通过: 成功拦截未定义 ID (EVD-MISSING-999)');
      passedCount++;
    } else {
      console.error('  ✗ 负例 1 失败: 未能拦截缺失 ID！', res);
    }
  }

  // 负例 2: PLAN 存证标注为 VERIFIED
  {
    const fixtureData = {
      evidenceDb: {
        'EVD-P001-PLAN-01': { id: 'EVD-P001-PLAN-01', verificationLevel: 'VERIFIED' }
      },
      timelineStages: [{ id: 's1', evidenceId: 'EVD-P001-PLAN-01' }]
    };
    const res = validateProjectData(fixtureData);
    if (!res.valid && res.errors.some(e => e.includes('verificationLevel 不能为 \'VERIFIED\''))) {
      console.log('  ✓ 负例 2 通过: 成功拦截 PLAN 状态标注为 VERIFIED 的非法存证');
      passedCount++;
    } else {
      console.error('  ✗ 负例 2 失败: 未能拦截 PLAN 伪造已核实状态！', res);
    }
  }

  // 负例 3: Key 与 id 不一致
  {
    const fixtureData = {
      evidenceDb: {
        'EVD-KEY-A': { id: 'EVD-KEY-B', verificationLevel: 'PLANNED' }
      }
    };
    const res = validateProjectData(fixtureData);
    if (!res.valid && res.errors.some(e => e.includes('Key 不一致'))) {
      console.log('  ✓ 负例 3 通过: 成功拦截 evidenceDb 键名与内嵌 id 不一致');
      passedCount++;
    } else {
      console.error('  ✗ 负例 3 失败: 未能拦截 key !== id！', res);
    }
  }

  // 负例 4: 动态模板字符串/拼接调用直接传入 onSelectEvidence
  {
    const definedKeys = new Set(['EVD-01']);
    const badCode1 = "const f = () => onSelectEvidence(`EVD-${id}`);";
    const badCode2 = "const f = () => onSelectEvidence('EVD-' + index);";
    const errs1 = validateCallerCode(badCode1, 'fake1.jsx', definedKeys);
    const errs2 = validateCallerCode(badCode2, 'fake2.jsx', definedKeys);
    if (errs1.length > 0 && errs2.length > 0) {
      console.log('  ✓ 负例 4 通过: 成功拦截动态模板字符串与拼接式 onSelectEvidence 调用');
      passedCount++;
    } else {
      console.error('  ✗ 负例 4 失败: 未能拦截动态拼接！', { errs1, errs2 });
    }
  }

  // 负例 5: 传入未登记的静态字面量
  {
    const definedKeys = new Set(['EVD-01']);
    const badCode = "const f = () => onSelectEvidence('EVD-UNKNOWN-999');";
    const errs = validateCallerCode(badCode, 'fake3.jsx', definedKeys);
    if (errs.length > 0 && errs.some(e => e.includes('EVD-UNKNOWN-999'))) {
      console.log('  ✓ 负例 5 通过: 成功拦截调用端传入的未登记静态字面量 (EVD-UNKNOWN-999)');
      passedCount++;
    } else {
      console.error('  ✗ 负例 5 失败: 未能拦截未登记静态字面量！', errs);
    }
  }

  // 负例 6: 本地对象字段使用动态模板字符串构造
  {
    const definedKeys = new Set(['EVD-01']);
    const badCode = "const item = { evidenceId: `EVD-${missing}` }; onSelectEvidence(item.evidenceId);";
    const errs = validateCallerCode(badCode, 'fake4.jsx', definedKeys);
    if (errs.length > 0 && errs.some(e => e.includes('静态字面量') || e.includes('无法证明对象'))) {
      console.log('  ✓ 负例 6 通过: 成功拦截对象字段动态模板字符串赋值 (item.evidenceId = `EVD-${missing}`)');
      passedCount++;
    } else {
      console.error('  ✗ 负例 6 失败: 未能拦截本地对象动态模板字符串！', errs);
    }
  }

  // 负例 7: 本地对象字段使用数组 join 动态拼接
  {
    const definedKeys = new Set(['EVD-01']);
    const badCode = "const item = { evidenceId: ['EVD', 'MISSING'].join('-') }; onSelectEvidence(item.evidenceId);";
    const errs = validateCallerCode(badCode, 'fake5.jsx', definedKeys);
    if (errs.length > 0 && errs.some(e => e.includes('静态字面量') || e.includes('无法证明对象'))) {
      console.log('  ✓ 负例 7 通过: 成功拦截对象字段动态 join 拼接赋值 (item.evidenceId = [\'EVD\', \'MISSING\'].join(\'-\'))');
      passedCount++;
    } else {
      console.error('  ✗ 负例 7 失败: 未能拦截本地对象 join 拼接！', errs);
    }
  }

  // 负例 8 (审查员反例 1): 存在无关 const 声明时的未注册外部对象成员调用
  {
    const definedKeys = new Set(['EVD-01']);
    const badCode = "const unrelated = 1; onSelectEvidence(unregisteredForeignObj.evidenceId);";
    const errs = validateCallerCode(badCode, 'reviewer-case-1.jsx', definedKeys);
    if (errs.length > 0 && errs.some(e => e.includes('无法证明对象') || e.includes('unregisteredForeignObj'))) {
      console.log('  ✓ 负例 8 通过: 成功拦截未登记的外部对象成员调用 (const unrelated = 1; onSelectEvidence(unregisteredForeignObj.evidenceId))');
      passedCount++;
    } else {
      console.error('  ✗ 负例 8 失败: 未能拦截未注册外部对象！', errs);
    }
  }

  // 负例 9 (审查员反例 2): 函数/表达式动态构造证据字段值
  {
    const definedKeys = new Set(['EVD-01']);
    const badCode = 'const suffix = "MISSING"; const org = { evidenceId: makeId(suffix) }; onSelectEvidence(org.evidenceId);';
    const errs = validateCallerCode(badCode, 'reviewer-case-2.jsx', definedKeys);
    if (errs.length > 0 && errs.some(e => e.includes('静态字面量') || e.includes('无法证明对象'))) {
      console.log('  ✓ 负例 9 通过: 成功拦截函数动态求值构造证据字段 (evidenceId: makeId(suffix))');
      passedCount++;
    } else {
      console.error('  ✗ 负例 9 失败: 未能拦截动态函数求值证据字段！', errs);
    }
  }

  // 负例 10: 非 projectData.js 中存在未定义的裸静态证据字符串
  {
    const definedKeys = new Set(['EVD-01']);
    const badCode = "const evdId = 'EVD-P001-NONEXISTENT';";
    const errs = validateCallerCode(badCode, 'fake6.jsx', definedKeys);
    if (errs.length > 0 && errs.some(e => e.includes('EVD-P001-NONEXISTENT'))) {
      console.log('  ✓ 负例 10 通过: 成功拦截非 projectData 文件中未在 evidenceDb 中定义的静态证据字符串 (EVD-P001-NONEXISTENT)');
      passedCount++;
    } else {
      console.error('  ✗ 负例 10 失败: 未能拦截未登记静态字符串！', errs);
    }
  }

  // 负例 11 (审查员指定反例 3): participations[0].evidenceIds 包含未定义存证 ID 字符串数组遍历
  {
    const fixtureData = {
      evidenceDb: { 'EVD-01': { id: 'EVD-01', verificationLevel: 'VERIFIED' } },
      participations: [{ id: 'part-1', role: 'bidding', evidenceIds: ['BROKEN-ID'] }]
    };
    const res = validateProjectData(fixtureData);
    if (!res.valid && res.errors.some(e => e.includes('BROKEN-ID'))) {
      console.log('  ✓ 负例 11 通过: 成功捕获 participations[0].evidenceIds 字符串数组中的未定义存证 (BROKEN-ID)');
      passedCount++;
    } else {
      console.error('  ✗ 负例 11 失败: 未能捕获 evidenceIds 字符串数组坏 ID！', res.errors);
    }
  }

  // 负例 12 (审查员指定反例 4): 来自 PROJECT_DATA 的对象传递非法非证据字段 post.id 至 onSelectEvidence
  {
    const definedKeys = new Set(['EVD-01']);
    const badCode = "const posts = PROJECT_DATA.posts; posts.map(post => onSelectEvidence(post.id));";
    const errs = validateCallerCode(badCode, 'src/pages/FeedPage.jsx', definedKeys);
    if (errs.length > 0 && errs.some(e => e.includes('post.id') || e.includes('无法静态解析') || e.includes('未登记'))) {
      console.log('  ✓ 负例 12 通过: 成功拦截来自 PROJECT_DATA 的对象传递非法非证据字段 (posts.map(post => onSelectEvidence(post.id)))');
      passedCount++;
    } else {
      console.error('  ✗ 负例 12 失败: 未能拦截非法字段 post.id！', errs);
    }
  }

  if (passedCount !== totalNegativeTests) {
    console.error(`❌ 负例测试失败，仅 ${passedCount}/${totalNegativeTests} 通过`);
    process.exitCode = 1;
    return false;
  }
  console.log(`[Negative Tests PASS] 全部 ${totalNegativeTests} 组负例测试均精准捕获异常。\n`);
  return true;
}

/**
 * 主执行流程
 */
export function runCheck() {
  console.log('===========================================================');
  console.log('  Project Atlas 证据链与调用端完整性自动化校验器');
  console.log('===========================================================');

  // 1. 运行负例测试
  const negOk = runNegativeTests();
  if (!negOk) {
    process.exitCode = 1;
    return;
  }

  // 2. 校验 PROJECT_DATA 结构
  console.log('--- 校验 PROJECT_DATA 数据存证闭环 ---');
  const dataResult = validateProjectData(PROJECT_DATA);
  if (!dataResult.valid) {
    console.error(`❌ PROJECT_DATA 数据校验失败，发现 ${dataResult.errors.length} 项违规:`);
    dataResult.errors.forEach(err => console.error(`  - ${err}`));
    process.exitCode = 1;
    return;
  }

  console.log(`  ✓ 数据层实际引用存证数: ${dataResult.dataRefs.length} 处`);
  console.log(`  ✓ 数据层去重存证 ID 数: ${dataResult.uniqueRefCount} 个`);
  console.log(`  ✓ evidenceDb 已定义条目数: ${dataResult.definedCount} 个`);

  // 3. 校验源代码中的调用端
  console.log('\n--- 扫描 src/ 下所有 JS/JSX 调用端与静态字面量 ---');
  const srcFiles = getAllSrcFiles(srcDir);
  const definedKeys = new Set(Object.keys(PROJECT_DATA.evidenceDb));
  let totalCallerErrors = [];

  for (const file of srcFiles) {
    const code = fs.readFileSync(file, 'utf-8');
    const relPath = path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/');
    const errors = validateCallerCode(code, relPath, definedKeys);
    if (errors.length > 0) {
      totalCallerErrors = totalCallerErrors.concat(errors);
    }
  }

  if (totalCallerErrors.length > 0) {
    console.error(`❌ 源代码调用端校验失败，发现 ${totalCallerErrors.length} 处违规:`);
    totalCallerErrors.forEach(err => console.error(`  - ${err}`));
    process.exitCode = 1;
    return;
  }

  console.log(`  ✓ 扫描了 ${srcFiles.length} 个源文件，全部 onSelectEvidence 调用与静态字面量均合规。`);
  console.log('\n--- 存证项状态清单摘要 ---');
  const sortedIds = Array.from(definedKeys).sort();
  for (const id of sortedIds) {
    const evd = PROJECT_DATA.evidenceDb[id];
    console.log(`  ✓ ${id.padEnd(20)} [${evd.verificationLevel.padEnd(13)}] -> ${evd.sourceType.slice(0, 30)}`);
  }

  console.log(`\n[PASS] 存证链 ID 与状态全量闭环，无断链，无非法动态拼接，全部 ${definedKeys.size} 个存证均有效定义。`);
}

// 直接运行时执行校验
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCheck();
}
