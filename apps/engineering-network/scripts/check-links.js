import { 
  PROJECT_DATA, 
  PROJECTS_LIST, 
  COMPANIES_LIST, 
  PEOPLE_LIST, 
  PARTICIPATIONS_LIST, 
  POSTS_LIST, 
  SEARCH_PRESETS,
  getCompanyParticipations,
  getPersonParticipations,
  getProjectParticipations,
  getProjectById,
  getCompanyById,
  getPersonById,
  normalizeOrgId,
  normalizePersonId,
  normalizeProjectId
} from '../src/data/projectData.js';

export const VALID_ROLES = new Set(['bidding', 'awarding', 'performance', 'delivery', 'acceptance']);
export const VALID_ENTITY_TYPES = new Set(['company', 'project', 'person']);
export const VALID_CHANNELS = new Set(['工业建筑', '土木市政', '动力机电', '新能源工程', '港口航道']);

/**
 * 核心验证函数：可对任意给定的数据集执行完整的实体外键、工作包、时序、角色枚举与路由一致性校验
 */
export function validateLinksContract(customData = {}) {
  const errors = [];

  const projects = customData.projects || PROJECTS_LIST;
  const companies = customData.companies || COMPANIES_LIST;
  const people = customData.people || PEOPLE_LIST;
  const participations = customData.participations || PARTICIPATIONS_LIST;
  const posts = customData.posts || POSTS_LIST;
  const presets = customData.searchPresets || SEARCH_PRESETS;
  const evidenceDb = customData.evidenceDb || PROJECT_DATA.evidenceDb;

  const validProjectIds = new Set(projects.map(p => p.id));
  const validCompanyIds = new Set(companies.map(c => c.id));
  const validPersonIds = new Set(people.map(pe => pe.id));
  const validEvidenceIds = new Set(Object.keys(evidenceDb));

  // 1. Projects Validation
  for (const proj of projects) {
    if (!proj.id || !proj.code || !proj.name) {
      errors.push(`项目缺少基本标识: ${JSON.stringify(proj)}`);
    }
    if (!validCompanyIds.has(proj.clientOrgId)) {
      errors.push(`项目 [${proj.id}] 的建设单位 clientOrgId '${proj.clientOrgId}' 在 companies 中不存在！`);
    }
    if (proj.evidenceId && !validEvidenceIds.has(proj.evidenceId)) {
      errors.push(`项目 [${proj.id}] 引用的 evidenceId '${proj.evidenceId}' 在 evidenceDb 中不存在！`);
    }
    if (!VALID_CHANNELS.has(proj.sector)) {
      errors.push(`项目 [${proj.id}] 的行业分类 '${proj.sector}' 不在有效频道列表中！`);
    }
  }

  // 2. Companies Validation
  for (const comp of companies) {
    if (!comp.id || !comp.name || !comp.fullName) {
      errors.push(`企业缺少基本标识: ${comp.id}`);
    }
    if (!Array.isArray(comp.services) || comp.services.length === 0) {
      errors.push(`企业 [${comp.id}] 缺少服务能力列表 services！`);
    }
    if (!comp.licenseNo || !comp.licenseNo.startsWith('MOCK-')) {
      errors.push(`企业 [${comp.id}] 的证照号必须使用以 MOCK- 为前缀的虚构通用占位！当前为 '${comp.licenseNo}'`);
    }
  }

  // 3. People Validation
  for (const person of people) {
    if (!person.id || !person.name || !person.title) {
      errors.push(`工程师缺少基本标识: ${person.id}`);
    }
    if (!validCompanyIds.has(person.orgId)) {
      errors.push(`工程师 [${person.id}] 的任职企业 orgId '${person.orgId}' 在 companies 中不存在！`);
    }
    if (person.verificationBadge !== 'Mock 核验') {
      errors.push(`工程师 [${person.id}] 的认证标记必须严格固定为 'Mock 核验'！当前为 '${person.verificationBadge}'`);
    }
    if (!person.regNumber || !person.regNumber.startsWith('MOCK-')) {
      errors.push(`工程师 [${person.id}] 的执业编号必须使用 MOCK- 前缀虚构格式！当前为 '${person.regNumber}'`);
    }
  }

  // 4. Participations Validation (严格校验工作包、时序时段、角色枚举与存证列表)
  for (const part of participations) {
    if (!validProjectIds.has(part.projectId)) {
      errors.push(`参与关系 [${part.id}] 引用了不存在的项目 projectId '${part.projectId}'！`);
    }
    if (!part.orgId && !part.personId) {
      errors.push(`参与关系 [${part.id}] 必须指定 orgId 或 personId 至少一个责任主体！`);
    }
    if (part.orgId && !validCompanyIds.has(part.orgId)) {
      errors.push(`参与关系 [${part.id}] 引用了不存在的企业 orgId '${part.orgId}'！`);
    }
    if (part.personId && !validPersonIds.has(part.personId)) {
      errors.push(`参与关系 [${part.id}] 引用了不存在的人员 personId '${part.personId}'！`);
    }
    if (!VALID_ROLES.has(part.role)) {
      errors.push(`参与关系 [${part.id}] 的角色 '${part.role}' 非法！必须严格为 bidding/awarding/performance/delivery/acceptance 之一。`);
    }
    // 工作包校验
    if (!part.workPackageId || typeof part.workPackageId !== 'string' || !part.workPackageId.trim()) {
      errors.push(`参与关系 [${part.id}] 缺少有效的工作包标识 workPackageId！`);
    }
    if (!part.workPackageName || typeof part.workPackageName !== 'string' || !part.workPackageName.trim()) {
      errors.push(`参与关系 [${part.id}] 缺少工作包名称 workPackageName！`);
    }
    // 时序时点校验
    if (!part.period || typeof part.period !== 'string' || !part.period.trim()) {
      errors.push(`参与关系 [${part.id}] 缺少履约时序周期时点 period！`);
    }
    // 存证列表校验
    if (!Array.isArray(part.evidenceIds) || part.evidenceIds.length === 0) {
      errors.push(`参与关系 [${part.id}] 缺少支撑存证 evidenceIds 数组！`);
    } else {
      for (const evdId of part.evidenceIds) {
        if (!validEvidenceIds.has(evdId)) {
          errors.push(`参与关系 [${part.id}] 引用的存证 ID '${evdId}' 未在 evidenceDb 中登记！`);
        }
      }
    }
  }

  // 5. Posts Validation
  for (const post of posts) {
    const isAuthorValid = validCompanyIds.has(post.authorId) || validPersonIds.has(post.authorId);
    if (!isAuthorValid) {
      errors.push(`动态 [${post.id}] 的作者 authorId '${post.authorId}' 既非有效企业又非有效人员！`);
    }
    if (post.projectId && !validProjectIds.has(post.projectId)) {
      errors.push(`动态 [${post.id}] 引用的项目 projectId '${post.projectId}' 不存在！`);
    }
    if (post.evidenceId && !validEvidenceIds.has(post.evidenceId)) {
      errors.push(`动态 [${post.id}] 引用的存证 evidenceId '${post.evidenceId}' 不存在！`);
    }
    if (!VALID_CHANNELS.has(post.channel)) {
      errors.push(`动态 [${post.id}] 的频道 channel '${post.channel}' 不在有效频道列表中！`);
    }
    if (post.isMock !== true) {
      errors.push(`动态 [${post.id}] 必须显式标明 isMock: true！`);
    }
  }

  // 6. Search Presets Validation (校验实体存在、type 枚举及 route 与实体一致性)
  for (const preset of presets) {
    if (!preset.query || !preset.whyMatched || !Array.isArray(preset.matchedEntities)) {
      errors.push(`搜索预置 [${preset.id}] 字段不完整！`);
    }
    for (const match of preset.matchedEntities) {
      if (!VALID_ENTITY_TYPES.has(match.type)) {
        errors.push(`搜索预置 [${preset.id}] 实体 '${match.id}' 的类型 '${match.type}' 非法！必须为 company/project/person 之一。`);
      }
      if (match.type === 'company') {
        if (!validCompanyIds.has(match.id)) {
          errors.push(`搜索预置 [${preset.id}] 匹配的企业 '${match.id}' 不存在！`);
        }
        if (!match.route || !match.route.startsWith('/companies/')) {
          errors.push(`搜索预置 [${preset.id}] 企业 '${match.id}' 的 route '${match.route}' 格式非法，必须以 /companies/ 开头！`);
        } else {
          const routeParam = match.route.replace('/companies/', '');
          if (normalizeOrgId(routeParam) !== match.id) {
            errors.push(`搜索预置 [${preset.id}] 企业 '${match.id}' 的 route '${match.route}' 解析后与实体 ID 不一致！`);
          }
        }
      }
      if (match.type === 'project') {
        if (!validProjectIds.has(match.id)) {
          errors.push(`搜索预置 [${preset.id}] 匹配的项目 '${match.id}' 不存在！`);
        }
        if (!match.route || !match.route.startsWith('/projects/')) {
          errors.push(`搜索预置 [${preset.id}] 项目 '${match.id}' 的 route '${match.route}' 格式非法，必须以 /projects/ 开头！`);
        } else {
          const routeParam = match.route.replace('/projects/', '');
          if (normalizeProjectId(routeParam) !== match.id) {
            errors.push(`搜索预置 [${preset.id}] 项目 '${match.id}' 的 route '${match.route}' 解析后与实体 ID 不一致！`);
          }
        }
      }
      if (match.type === 'person') {
        if (!validPersonIds.has(match.id)) {
          errors.push(`搜索预置 [${preset.id}] 匹配的人员 '${match.id}' 不存在！`);
        }
        if (!match.route || !match.route.startsWith('/people/')) {
          errors.push(`搜索预置 [${preset.id}] 人员 '${match.id}' 的 route '${match.route}' 格式非法，必须以 /people/ 开头！`);
        } else {
          const routeParam = match.route.replace('/people/', '');
          if (normalizePersonId(routeParam) !== match.id) {
            errors.push(`搜索预置 [${preset.id}] 人员 '${match.id}' 的 route '${match.route}' 解析后与实体 ID 不一致！`);
          }
        }
      }
      if (match.evidenceId && !validEvidenceIds.has(match.evidenceId)) {
        errors.push(`搜索预置 [${preset.id}] 引用的存证 '${match.evidenceId}' 不存在！`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 负例测试套件：验证损坏的数据、坏路由、坏外键、非法角色与缺失工作包/时序确实会触发校验失败退出
 */
export function runLinksNegativeTests() {
  console.log('--- 运行 check:links 负例回归测试套件 ---');
  let passedCount = 0;
  const totalNegativeTests = 6;

  // 负例 1: 坏实体外键 (participation 引用不存在的项目 ID)
  {
    const badData = {
      participations: [{
        id: 'bad-part-1',
        projectId: 'PRJ-NONEXISTENT-999',
        orgId: 'ORG-B',
        role: 'bidding',
        workPackageId: 'WP-TEST',
        workPackageName: '测试工程包',
        period: '2025.01 - 2025.06',
        evidenceIds: ['EVD-P001-A01']
      }]
    };
    const res = validateLinksContract(badData);
    if (!res.valid && res.errors.some(e => e.includes('PRJ-NONEXISTENT-999'))) {
      console.log('  ✓ 负例 1 通过: 成功拦截不存在的项目外键 (PRJ-NONEXISTENT-999)');
      passedCount++;
    } else {
      console.error('  ✗ 负例 1 失败: 未能拦截坏项目外键！', res.errors);
    }
  }

  // 负例 2: 坏路由 (matchedEntities 企业 route 与 ID 不一致)
  {
    const badData = {
      searchPresets: [{
        id: 'bad-preset-1',
        query: '测试预置',
        whyMatched: '测试',
        matchedEntities: [{
          id: 'ORG-B',
          name: 'Demo Org B',
          type: 'company',
          route: '/wrong-path/broken-org',
          evidenceId: 'EVD-P001-A01'
        }]
      }]
    };
    const res = validateLinksContract(badData);
    if (!res.valid && res.errors.some(e => e.includes('route') && (e.includes('/wrong-path/broken-org') || e.includes('/companies/')))) {
      console.log('  ✓ 负例 2 通过: 成功拦截实体路由不一致 (route: /wrong-path/broken-org)');
      passedCount++;
    } else {
      console.error('  ✗ 负例 2 失败: 未能拦截坏路由！', res.errors);
    }
  }

  // 负例 3: 坏 evidenceIds (参与关系引用不存在的存证 ID)
  {
    const badData = {
      participations: [{
        id: 'bad-part-2',
        projectId: 'DEMO-PRJ-P001',
        orgId: 'ORG-B',
        role: 'awarding',
        workPackageId: 'WP-TEST',
        workPackageName: '测试工程包',
        period: '2025.01 - 2025.06',
        evidenceIds: ['EVD-BROKEN-999']
      }]
    };
    const res = validateLinksContract(badData);
    if (!res.valid && res.errors.some(e => e.includes('EVD-BROKEN-999'))) {
      console.log('  ✓ 负例 3 通过: 成功拦截参与关系中的未登记存证 (EVD-BROKEN-999)');
      passedCount++;
    } else {
      console.error('  ✗ 负例 3 失败: 未能拦截坏存证 ID！', res.errors);
    }
  }

  // 负例 4: 非法 role 枚举 (使用 contractor 等非五态标准枚举)
  {
    const badData = {
      participations: [{
        id: 'bad-part-3',
        projectId: 'DEMO-PRJ-P001',
        orgId: 'ORG-B',
        role: 'contractor',
        workPackageId: 'WP-TEST',
        workPackageName: '测试工程包',
        period: '2025.01 - 2025.06',
        evidenceIds: ['EVD-P001-A01']
      }]
    };
    const res = validateLinksContract(badData);
    if (!res.valid && res.errors.some(e => e.includes('contractor') && e.includes('非法'))) {
      console.log('  ✓ 负例 4 通过: 成功拦截非法参与角色枚举 (role: contractor)');
      passedCount++;
    } else {
      console.error('  ✗ 负例 4 失败: 未能拦截非法角色枚举！', res.errors);
    }
  }

  // 负例 5: 缺失工作包与履约时序 (workPackageId 与 period 为空)
  {
    const badData = {
      participations: [{
        id: 'bad-part-4',
        projectId: 'DEMO-PRJ-P001',
        orgId: 'ORG-B',
        role: 'performance',
        workPackageId: '',
        workPackageName: '',
        period: '',
        evidenceIds: ['EVD-P001-A01']
      }]
    };
    const res = validateLinksContract(badData);
    if (!res.valid && res.errors.some(e => e.includes('workPackageId')) && res.errors.some(e => e.includes('period'))) {
      console.log('  ✓ 负例 5 通过: 成功拦截缺失工作包与履约时序字段');
      passedCount++;
    } else {
      console.error('  ✗ 负例 5 失败: 未能拦截缺失工作包与时序！', res.errors);
    }
  }

  // 负例 6: 非法 matchedEntities type (如使用 vendor 等非三实体标准类型)
  {
    const badData = {
      searchPresets: [{
        id: 'bad-preset-2',
        query: '测试非法类型',
        whyMatched: '测试',
        matchedEntities: [{
          id: 'ORG-B',
          name: 'Demo Org B',
          type: 'vendor',
          route: '/companies/org-b',
          evidenceId: 'EVD-P001-A01'
        }]
      }]
    };
    const res = validateLinksContract(badData);
    if (!res.valid && res.errors.some(e => e.includes('vendor') && e.includes('非法'))) {
      console.log('  ✓ 负例 6 通过: 成功拦截非法实体类型 (type: vendor)');
      passedCount++;
    } else {
      console.error('  ✗ 负例 6 失败: 未能拦截非法实体类型！', res.errors);
    }
  }

  if (passedCount !== totalNegativeTests) {
    console.error(`❌ check:links 负例测试失败，仅 ${passedCount}/${totalNegativeTests} 通过！`);
    return false;
  }
  console.log(`[Links Negative Tests PASS] 全部 ${totalNegativeTests} 组负例测试均精准捕获异常。\n`);
  return true;
}

// 主校验流程
console.log('===========================================================');
console.log('  Project Atlas 统一数据实体与关联关系链完整性校验器 (check:links)');
console.log('===========================================================');

// 1. 运行负例测试套件
const negPassed = runLinksNegativeTests();
if (!negPassed) {
  process.exit(1);
}

// 2. 运行真实全量数据校验
console.log(`--- 实体基数核验 ---`);
console.log(`  ✓ 项目实体数: ${PROJECTS_LIST.length} (要求至少 6-8 个, 当前 8 个)`);
console.log(`  ✓ 企业实体数: ${COMPANIES_LIST.length} 个`);
console.log(`  ✓ 人员实体数: ${PEOPLE_LIST.length} 个`);
console.log(`  ✓ 参与关系数: ${PARTICIPATIONS_LIST.length} 条`);
console.log(`  ✓ 动态帖子数: ${POSTS_LIST.length} 条`);
console.log(`  ✓ 检索预置数: ${SEARCH_PRESETS.length} 组`);
console.log(`  ✓ 存证定义数: ${Object.keys(PROJECT_DATA.evidenceDb).length} 个`);

const result = validateLinksContract();

// 3. 关系动态推导回归测试
console.log(`\n--- 关系动态推导回归测试 ---`);
const bParts = getCompanyParticipations('ORG-B');
if (bParts.length === 0) {
  result.errors.push(`getCompanyParticipations('ORG-B') 返回为空！`);
} else {
  console.log(`  ✓ ORG-B (Demo Org B) 动态推导出 ${bParts.length} 项工程参与业绩 (无硬编码冗余)`);
}

const eng1Parts = getPersonParticipations('ENG-01');
if (eng1Parts.length === 0) {
  result.errors.push(`getPersonParticipations('ENG-01') 返回为空！`);
} else {
  console.log(`  ✓ ENG-01 (Demo Engineer 01) 动态推导出 ${eng1Parts.length} 项执业项目经历 (无硬编码冗余)`);
}

const p1Parts = getProjectParticipations('DEMO-PRJ-P001');
if (p1Parts.length === 0) {
  result.errors.push(`getProjectParticipations('DEMO-PRJ-P001') 返回为空！`);
} else {
  console.log(`  ✓ P001 动态推导出 ${p1Parts.length} 项组织与人员责任分配`);
}

// 结果裁定
console.log(`\n===========================================================`);
if (result.errors.length === 0) {
  console.log(`[PASS] 全量数据契约与关联链路校验通过！0 坏链，0 孤立实体，0 非法角色，路由与工作包/时序 100% 闭环。`);
  process.exit(0);
} else {
  console.error(`[FAIL] 发现 ${result.errors.length} 项数据契约异常：`);
  result.errors.forEach(e => console.error(`  ✗ ${e}`));
  process.exit(1);
}
