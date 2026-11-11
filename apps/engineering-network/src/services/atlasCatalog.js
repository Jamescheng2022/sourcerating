// Read-only, public-source data. No browser calls to GCP private endpoints or local services.
let catalogPromise = null;
const basePath = (import.meta.env.BASE_URL || './').replace(/\/?$/, '/');

async function getJson(relativePath) {
  const res = await fetch(basePath + 'data/atlas/' + relativePath, { method: 'GET' });
  if (!res.ok) throw new Error('Data file unavailable: ' + relativePath + ' (' + res.status + ')');
  return res.json();
}

export async function loadAtlasCatalog() {
  if (!catalogPromise) {
    catalogPromise = Promise.all([
      getJson('manifest.json'),
      getJson('worldbank-projects.json'),
      getJson('uk-procurement.json'),
    ]).then(([manifest, worldBank, ukProcurements]) => {
      if (manifest.schemaVersion !== 'atlas-public/1.0') throw new Error('Unexpected dataset version');
      if (!Array.isArray(worldBank) || !Array.isArray(ukProcurements)) throw new Error('Dataset shape invalid');
      if (worldBank.length !== manifest.totals.worldBank || ukProcurements.length !== manifest.totals.ukProcurements)
        throw new Error('Dataset counts do not match manifest');
      return { manifest, worldBank, ukProcurements, records: [...worldBank, ...ukProcurements] };
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
