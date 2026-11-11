// Read-only Project Atlas catalog.
// Backend: Supabase RLS-protected published source records. Static, checksum-verified
// Atlas files are an explicit fallback, never silently reclassified as live data.
// No service-role keys or GCP private endpoints are accessed from the browser.
import { enPilotClient } from './enPilotClient';

let catalogPromise = null;
const basePath = (import.meta.env.BASE_URL || './').replace(/\/?$/, '/');
const PAGE = 1000;
const PARALLEL = 4;

async function getJson(relativePath) {
  const res = await fetch(basePath + 'data/atlas/' + relativePath, { method: 'GET' });
  if (!res.ok) throw new Error('Snapshot unavailable: ' + relativePath + ' (' + res.status + ')');
  return res.json();
}

async function loadBundledCatalog() {
  const [manifest, worldBank, ukProcurements] = await Promise.all([
    getJson('manifest.json'),
    getJson('worldbank-projects.json'),
    getJson('uk-procurement.json'),
  ]);
  if (manifest.schemaVersion !== 'atlas-public/1.0') throw new Error('Unexpected bundled snapshot version');
  if (!Array.isArray(worldBank) || !Array.isArray(ukProcurements)) throw new Error('Bundled data is not an array');
  if (worldBank.length !== manifest.totals.worldBank || ukProcurements.length !== manifest.totals.ukProcurements) {
    throw new Error('Bundled snapshot counts do not match the signed manifest');
  }
  return {
    manifest, worldBank, ukProcurements, records: [...worldBank, ...ukProcurements],
    backend: { kind: 'static-fallback', asOf: manifest.generatedAt },
  };
}

function mapDatabaseRecord(r) {
  const value = r.amount_value == null ? null : Number(r.amount_value);
  const amount = Number.isFinite(value) && value !== null
    ? { value, currency: r.amount_currency || '' }
    : null;
  const excerpt = r.source_excerpt && typeof r.source_excerpt === 'object' ? r.source_excerpt : {};
  const uk = r.record_kind === 'uk_procurement_notice';
  return {
    id: r.record_id,
    type: r.record_kind,
    title: r.title,
    country: r.country,
    region: r.region,
    status: r.source_status,
    amount,
    approvalDate: uk ? null : r.source_date,
    sourceUrl: r.source_url,
    source: r.source_name,
    recordCode: uk ? null : r.record_code,
    ocid: uk ? (excerpt.ocid || r.record_code) : undefined,
    classification: uk ? excerpt.classification : undefined,
    description: r.description,
    buyers: uk && Array.isArray(excerpt.buyers) ? excerpt.buyers : undefined,
    awards: uk && Array.isArray(excerpt.awards) ? excerpt.awards : undefined,
    evidenceLevel: r.evidence_level,
    statusCaveat: r.status_caveat,
    titleEngineeringSignal: !!r.engineering_title_signal,
    snapshotId: r.snapshot_id,
  };
}

async function loadDatabaseCatalog() {
  const [{ data: snapshot, error: snapError }, manifest] = await Promise.all([
    enPilotClient.from('en_atlas_snapshots')
      .select('snapshot_id,expected_count,worldbank_count,uk_count,data_as_of,published_at,source_manifest_sha256,limitations')
      .order('published_at', { ascending: false }).limit(1).maybeSingle(),
    getJson('manifest.json'),
  ]);
  if (snapError) throw new Error('Database snapshot unavailable: ' + snapError.message);
  if (!snapshot || !snapshot.snapshot_id) throw new Error('No verified database snapshot has been published');
  if (snapshot.expected_count !== snapshot.worldbank_count + snapshot.uk_count) {
    throw new Error('Database snapshot totals are inconsistent');
  }
  if (snapshot.expected_count > 250000 || snapshot.expected_count <= 0) {
    throw new Error('Database declared an unexpected record count');
  }
  // For the first limited beta we preserve the existing client-side catalog API.
  // G2 scale-up will replace this with server-side search/count/pagination.
  const pageCount = Math.ceil(snapshot.expected_count / PAGE);
  const rowsByPage = new Array(pageCount);
  const columns = [
    'record_id', 'record_kind', 'title', 'country', 'region', 'source_status',
    'amount_value', 'amount_currency', 'record_code', 'source_date',
    'source_url', 'source_name', 'source_excerpt', 'description',
    'evidence_level', 'status_caveat', 'engineering_title_signal', 'snapshot_id',
  ].join(',');

  for (let startIndex = 0; startIndex < pageCount; startIndex += PARALLEL) {
    const jobs = [];
    for (let i = startIndex; i < Math.min(pageCount, startIndex + PARALLEL); i += 1) {
      const from = i * PAGE;
      const expected = Math.min(PAGE, snapshot.expected_count - from);
      jobs.push((async () => {
        const { data, error } = await enPilotClient.from('en_atlas_records')
          .select(columns)
          .eq('snapshot_id', snapshot.snapshot_id)
          .order('record_id', { ascending: true })
          .range(from, from + expected - 1);
        if (error) throw new Error('Database Atlas query failed: ' + error.message);
        if (!Array.isArray(data) || data.length !== expected) {
          throw new Error('Database Atlas page size mismatch at ' + from);
        }
        rowsByPage[i] = data;
      })());
    }
    await Promise.all(jobs);
  }
  const dbRows = rowsByPage.flat();
  if (dbRows.length !== snapshot.expected_count || new Set(dbRows.map(x => x.record_id)).size !== dbRows.length) {
    throw new Error('Database Atlas record count or unique-ID check failed');
  }
  const records = dbRows.map(mapDatabaseRecord);
  const worldBank = records.filter(x => x.type === 'world_bank_project');
  const ukProcurements = records.filter(x => x.type === 'uk_procurement_notice');
  if (worldBank.length !== snapshot.worldbank_count || ukProcurements.length !== snapshot.uk_count) {
    throw new Error('Database Atlas source breakdown differs from its manifest');
  }
  return {
    manifest: {
      ...manifest,
      generatedAt: snapshot.data_as_of,
      totals: {
        ...manifest.totals,
        worldBank: worldBank.length,
        ukProcurements: ukProcurements.length,
      },
      limits: Array.isArray(snapshot.limitations) ? snapshot.limitations : manifest.limits,
    },
    worldBank, ukProcurements, records,
    backend: { kind: 'supabase', asOf: snapshot.data_as_of, snapshotId: snapshot.snapshot_id },
  };
}

export async function loadAtlasCatalog() {
  if (!catalogPromise) {
    catalogPromise = loadDatabaseCatalog().catch(async (error) => {
      // A fallback must be conspicuous in the UI. Never substitute demo records.
      const fallback = await loadBundledCatalog();
      console.warn('Atlas database unavailable; using the explicitly disclosed static snapshot.', error);
      return { ...fallback, backend: { ...fallback.backend, reason: String(error?.message || error) } };
    }).catch((error) => {
      catalogPromise = null;
      throw error;
    });
  }
  return catalogPromise;
}

export function formatAtlasMoney(amount, locale = 'en') {
  if (!amount || !Number.isFinite(amount.value)) return 'Not disclosed';
  try {
    return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : locale === 'th' ? 'th-TH' : 'en-GB', {
      style: 'currency',
      currency: amount.currency === 'GBP' ? 'GBP' : amount.currency === 'USD' ? 'USD' : 'USD',
      maximumFractionDigits: amount.value >= 1000 ? 0 : 2,
    }).format(amount.value) + (amount.currency !== 'GBP' && amount.currency !== 'USD' ? ' (' + (amount.currency || '?') + ')' : '');
  } catch {
    return String(amount.value) + ' ' + (amount.currency || '');
  }
}

export function atlasRecordUrl(id) {
  return '/projects/record/' + encodeURIComponent(id);
}
