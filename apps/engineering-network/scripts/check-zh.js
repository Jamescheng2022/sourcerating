import fs from 'fs';
import path from 'path';
import { zh } from '../src/i18n/zh.js';

function getAllFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) results = results.concat(getAllFiles(full));
    else if (full.endsWith('.js') || full.endsWith('.jsx')) results.push(full);
  });
  return results;
}

const files = getAllFiles('src');
let missing = 0;
// Match zh.prop1.prop2 or zh.prop1
const regex = /\bzh(?:\.([a-zA-Z0-9_]+))(?:\.([a-zA-Z0-9_]+))?(?:\.([a-zA-Z0-9_]+))?/g;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let match;
  while ((match = regex.exec(content)) !== null) {
    const p1 = match[1];
    const p2 = match[2];
    const p3 = match[3];

    if (!p1) continue;
    if (zh[p1] === undefined) {
      console.error(`[FAIL] ${f}: zh.${p1} is undefined`);
      missing++;
      continue;
    }

    if (p2) {
      // ignore methods like .map, .filter, .find, .forEach on arrays/objects
      if (typeof zh[p1] === 'object' && zh[p1] !== null && p2 in zh[p1]) {
        // ok
        if (p3) {
          if (zh[p1][p2] === undefined || !(p3 in zh[p1][p2])) {
            console.error(`[FAIL] ${f}: zh.${p1}.${p2}.${p3} is undefined`);
            missing++;
          }
        }
      } else {
        console.error(`[FAIL] ${f}: zh.${p1}.${p2} is undefined`);
        missing++;
      }
    }
  }
});

if (missing === 0) {
  console.log('[PASS] All static zh.* references in src/ exist and are defined.');
} else {
  console.error(`[ERROR] Total ${missing} undefined zh.* references found!`);
  process.exit(1);
}
