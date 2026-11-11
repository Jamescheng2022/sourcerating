/**
 * Nearby Geo Data Client Service
 * Connects to versioned local Atlas trial backend (schema nearby/1.0)
 * Default runtime: http://127.0.0.1:43141
 * Expected frontend Origin: http://localhost:5173
 */

const DEFAULT_API_BASE = 'http://127.0.0.1:43141';

/**
 * Determines whether the current window origin is a local loopback environment.
 * On non-loopback public hosts (e.g. https://*.vercel.app or any external domain),
 * browsers must NEVER issue automatic or clicked fetch requests to localhost/127.0.0.1.
 * 
 * @param {string} [customHostname] Optional hostname override (useful for unit testing).
 * @returns {boolean}
 */
export function isLoopbackOrigin(customHostname) {
  if (customHostname !== undefined) {
    return (
      customHostname === 'localhost' ||
      customHostname === '127.0.0.1' ||
      customHostname === '[::1]' ||
      customHostname === ''
    );
  }
  if (typeof window === 'undefined') return true;
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '' // local file or test runner
  );
}

export function getAtlasApiBase() {
  if (typeof window !== 'undefined' && window.__ATLAS_API_URL__) {
    return window.__ATLAS_API_URL__;
  }
  return import.meta.env?.VITE_ATLAS_API_URL || DEFAULT_API_BASE;
}

/**
 * Health check for Atlas trial service.
 * Guard: if app origin is not localhost/127.0.0.1, does NOT issue any network request.
 * 
 * @param {string} [customHostname] Optional hostname override.
 * @returns {Promise<{ ok: boolean, status: string, isPublicPreview?: boolean, data?: any, error?: string }>}
 */
export async function checkNearbyHealth(customHostname) {
  if (!isLoopbackOrigin(customHostname)) {
    return {
      ok: false,
      status: 'PUBLIC_PREVIEW_DISCONNECTED',
      isPublicPreview: true,
      error: 'Nearby backend is not connected in this public preview. Local trial runtime is available on localhost.'
    };
  }

  const base = getAtlasApiBase();
  const headers = {
    'Accept': 'application/json'
  };
  if (typeof window === 'undefined') {
    headers['Origin'] = 'http://localhost:5173';
  }

  try {
    const res = await fetch(`${base}/api/atlas/v1/health`, {
      method: 'GET',
      headers
    });
    if (!res.ok) {
      return { ok: false, status: 'HTTP_ERROR', error: `HTTP ${res.status} ${res.statusText}` };
    }
    const data = await res.json();
    return { ok: true, status: data.status || 'READY', data };
  } catch (err) {
    return { ok: false, status: 'DISCONNECTED', error: err.message || 'Failed to connect to backend runtime' };
  }
}

/**
 * Query BMA jurisdiction records for Bangkok (CITY mode).
 * Guard: if app origin is not localhost/127.0.0.1, does NOT issue any network request.
 * 
 * @param {string} [customHostname] Optional hostname override.
 * @returns {Promise<{ ok: boolean, schema_version?: string, isPublicPreview?: boolean, data?: any[], error?: string, raw?: any }>}
 */
export async function queryNearbyBangkok(customHostname) {
  if (!isLoopbackOrigin(customHostname)) {
    return {
      ok: false,
      status: 'PUBLIC_PREVIEW_DISCONNECTED',
      isPublicPreview: true,
      error: 'Nearby backend not connected in this public preview. Local trial runtime is available on localhost.',
      data: []
    };
  }

  const base = getAtlasApiBase();
  const payload = {
    mode: 'CITY',
    country_iso: 'TH',
    administrative_area: 'Bangkok',
    city: 'Bangkok'
  };

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (typeof window === 'undefined') {
    headers['Origin'] = 'http://localhost:5173';
  }

  try {
    const res = await fetch(`${base}/api/atlas/v1/nearby/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      return {
        ok: false,
        error: `Backend query returned HTTP ${res.status} ${res.statusText}`,
        statusCode: res.status,
        data: []
      };
    }

    const json = await res.json();
    return {
      ok: true,
      schema_version: json.schema_version,
      query_meta: json.query_meta,
      data: Array.isArray(json.data) ? json.data : [],
      raw: json
    };
  } catch (err) {
    return {
      ok: false,
      error: `Network connection failed to ${base}: ${err.message || 'Connection refused'}`,
      isNetworkError: true,
      data: []
    };
  }
}
