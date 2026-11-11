// Independent, resource-bounded public-dataset audit. No network, no browser, no product write.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dir = join(root, 'public', 'data', 'atlas');
const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
assert.equal(manifest.schemaVersion, 'atlas-public/1.0');
const datasets = [
  ['worldbank-projects.json', 'world_bank_project', 'projects.worldbank.org'],
  ['uk-procurement.json', 'uk_procurement_notice', 'www.contractsfinder.service.gov.uk'],
];
const all = [];
for (const [filename, type, domain] of datasets) {
  const bytes = readFileSync(join(dir, filename));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.dataFiles[filename].sha256);
  assert.equal(bytes.length, manifest.dataFiles[filename].bytes);
  const rows = JSON.parse(bytes.toString('utf8'));
  assert.equal(rows.length, manifest.dataFiles[filename].records);
  for (const r of rows) {
    assert.ok(typeof r.id === 'string' && r.id.length > 10);
    assert.ok(typeof r.title === 'string' && r.title.trim().length > 2);
    assert.equal(r.type, type);
    assert.equal(new URL(r.sourceUrl).hostname, domain);
    assert.ok(['official_source_record', 'source_declared'].includes(r.evidenceLevel));
    assert.ok(!('contact' in r) && !('email' in r) && !('phone' in r) && !('latitude' in r) && !('longitude' in r));
    if (r.amount) {
      assert.ok(Number.isFinite(r.amount.value) && r.amount.value >= 0);
      assert.ok(['USD', 'GBP'].includes(r.amount.currency));
    }
    if (type === 'uk_procurement_notice') {
      assert.ok(r.ocid?.startsWith('ocds-'));
      assert.ok(Array.isArray(r.awards));
      assert.ok(Array.isArray(r.buyers));
      assert.ok(r.buyers.every(x => x.evidenceLevel === 'source_declared'));
      for (const a of r.awards) {
        assert.ok(a.suppliers.every(x => x.evidenceLevel === 'source_declared'));
      }
    }
    all.push(r);
  }
  console.log(filename, 'PASS', rows.length, 'sha256', manifest.dataFiles[filename].sha256);
}
assert.equal(new Set(all.map(x => x.id)).size, all.length);
assert.equal(all.filter(x => x.type === 'world_bank_project').length, manifest.totals.worldBank);
assert.equal(all.filter(x => x.type === 'uk_procurement_notice').length, manifest.totals.ukProcurements);
assert.equal(all.filter(x => x.type === 'world_bank_project' && x.status === 'Active').length, manifest.totals.worldBankActive);
assert.equal(all.filter(x => x.type === 'world_bank_project' && x.status === 'Closed').length, manifest.totals.worldBankClosed);
assert.equal(all.filter(x => x.type === 'world_bank_project' && x.titleEngineeringSignal).length, manifest.totals.engineeringTitleSignal);
const app = readFileSync(join(root, 'src', 'App.jsx'), 'utf8');
assert.ok(app.includes('path="/projects" element={<AtlasProjectsPage />} />'));
assert.ok(app.includes('path="/projects/record/:recordId" element={<AtlasRecordPage />} />'));
assert.ok(app.includes('path="/projects/demo"'));
console.log('PASS', { total: all.length, activeWorldBank: manifest.totals.worldBankActive, engineeringTitleMatches: manifest.totals.engineeringTitleSignal, realRoutes: true });
