#!/usr/bin/env node
'use strict';
// OWNER tool. Writes integrity.lock.json and prints the root hash. The owner stores the root hash in
// QA_INTEGRITY_ROOT_SHA256 (machine-level, not writable by the Test Director).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { ROOT } = require('../lib/guard.cjs');
const files = ['qa/windows-b/profile/sourcerating_playwright_e2e.json', 'qa/windows-b/acceptance/criteria.json', 'qa/windows-b/oracle/queries/oracle.sql', 'qa/windows-b/oracle/expectations.json', 'qa/windows-b/oracle/oracle.cjs', 'qa/windows-b/lib/guard.cjs', 'qa/windows-b/lib/preload.cjs', 'qa/windows-b/runner/run.cjs', 'qa/windows-b/tools/playwright-mcp.cjs', 'qa/windows-b/scenarios/offline-recovery.cjs', 'apps/web/scripts/project-room-b-real-e2e.cjs'];
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const lock = { createdAt: new Date().toISOString(), files: Object.fromEntries(files.map((f) => [f, sha(fs.readFileSync(path.join(ROOT, f)))])) };
const text = JSON.stringify(lock, null, 2) + '\n';
fs.writeFileSync(path.join(ROOT, 'qa/windows-b/integrity.lock.json'), text);
console.log('QA_INTEGRITY_ROOT_SHA256=' + sha(text));
