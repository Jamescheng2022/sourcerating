import { PROJECTS_LIST, COMPANIES_LIST, PEOPLE_LIST, POSTS_LIST } from '../data/projectData.js';
import { BMA_NOTICES } from '../data/bmaNotices.js';
import { canonicalEntity } from '../data/canonicalEntities.js';

export const MOCK_META = Object.freeze({ isMock: true, mode: 'LOCAL_SANDBOX', schema_version: 'atlas-mock/1.0', live_service: false });
export const envelope = (data, extra = {}) => ({ ...extra, ...MOCK_META, data });

// Offline adapter usable directly by frontend. No HTTP, GPS or geocoding requests.
export function queryNearby({ city = 'Bangkok', country_iso = 'TH', mode = 'CITY' } = {}) {
  if (mode !== 'CITY') return envelope([], { status: 'UNSUPPORTED_MODE', query_meta: { distance_available: false } });
  const bangkok = country_iso === 'TH' && ['bangkok', 'กรุงเทพมหานคร', '曼谷'].includes(String(city).trim().toLowerCase());
  return envelope(bangkok ? structuredClone(BMA_NOTICES) : [], {
    status: bangkok ? 'SNAPSHOT_AVAILABLE' : 'NO_RECORDS',
    query_meta: { city, country_iso, scope: 'PUBLISHER_JURISDICTION_ONLY', distance_available: false, verified_sites: false, provenance: 'OFFLINE_PRIOR_PILOT_QA_SNAPSHOT' }
  });
}

export function searchMock({ q = '', type = 'all', limit = 50 } = {}) {
  if (typeof q !== 'string' || q.length > 200 || !['all', 'post', 'project', 'company', 'person'].includes(type)) throw new TypeError('Invalid search query');
  const sources = { post: POSTS_LIST, project: PROJECTS_LIST, company: COMPANIES_LIST, person: PEOPLE_LIST };
  const query = q.trim().toLocaleLowerCase();
  const results = Object.entries(sources).flatMap(([kind, rows]) => type !== 'all' && type !== kind ? [] : rows.map(row => {
    const entity = canonicalEntity(row.id);
    const label = entity?.name || row.title || row.name;
    const route = kind === 'post' ? `/feed?post=${row.id}` : kind === 'project' ? `/projects/${row.code.toLowerCase()}` : `/${kind === 'company' ? 'companies' : 'people'}/${row.id.toLowerCase()}`;
    return { id: row.id, type: kind, name: label, role: entity?.role || entity?.title || null, route, isMock: true, searchable: [label, row.id, row.content, row.sector, row.bio, row.title, row.authorName, ...(row.skills || [])].filter(Boolean).join(' ').toLocaleLowerCase() };
  })).filter(row => !query || row.searchable.includes(query));
  return envelope(results.slice(0, Math.min(100, Math.max(1, Number(limit) || 50))).map(({searchable, ...row}) => row), { total: results.length });
}
