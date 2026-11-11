/**
 * Test Suite: Public Host Guard & Localhost Loopback Preservation
 * Verifies that:
 * 1. Non-loopback/public hosts (e.g. Vercel, external domain) make ZERO network requests to localhost.
 * 2. Non-loopback hosts return honest disconnected status with NO fake records.
 * 3. Local loopback hosts (localhost/127.0.0.1) preserve live BMA query and null GPS contract.
 */

async function run() {
  console.log('===========================================================');
  console.log('  Testing Public Host Guard & Local Loopback Preservation  ');
  console.log('===========================================================');

  // Dynamic import of nearbyApi ES module
  const { isLoopbackOrigin, checkNearbyHealth, queryNearbyBangkok } = await import('../src/services/nearbyApi.js');

  let passed = true;

  // Test 1: Hostname detection
  const testCases = [
    { host: 'localhost', expected: true },
    { host: '127.0.0.1', expected: true },
    { host: '[::1]', expected: true },
    { host: '', expected: true },
    { host: 'atlas-v41.vercel.app', expected: false },
    { host: 'preview.atlas.engineering', expected: false },
    { host: 'engineering-network.com', expected: false },
    { host: '192.168.1.100', expected: false }
  ];

  console.log('\n--- 1. Testing isLoopbackOrigin() Hostname Filtering ---');
  for (const tc of testCases) {
    const result = isLoopbackOrigin(tc.host);
    const ok = result === tc.expected;
    if (!ok) passed = false;
    console.log(`  ${ok ? '✓' : '✗'} host "${tc.host}": expected ${tc.expected}, got ${result}`);
  }

  // Test 2: Verify ZERO network requests on public host
  console.log('\n--- 2. Verifying ZERO Network Requests on Public Host ---');
  let fetchCallCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = function(...args) {
    fetchCallCount++;
    console.error(`  [VIOLATION] fetch was called on public host with: ${args[0]}`);
    return originalFetch.apply(this, args);
  };

  const publicHost = 'atlas-v41-preview.vercel.app';
  const healthRes = await checkNearbyHealth(publicHost);
  const queryRes = await queryNearbyBangkok(publicHost);

  globalThis.fetch = originalFetch; // restore

  const zeroFetch = fetchCallCount === 0;
  const honestHealth = healthRes.ok === false && healthRes.status === 'PUBLIC_PREVIEW_DISCONNECTED' && healthRes.isPublicPreview === true;
  const honestQuery = queryRes.ok === false && queryRes.status === 'PUBLIC_PREVIEW_DISCONNECTED' && Array.isArray(queryRes.data) && queryRes.data.length === 0;

  console.log(`  ${zeroFetch ? '✓' : '✗'} Network fetch calls on public host: ${fetchCallCount} (must be 0)`);
  console.log(`  ${honestHealth ? '✓' : '✗'} Honest health status: ${healthRes.status}`);
  console.log(`  ${honestQuery ? '✓' : '✗'} Honest query status: ${queryRes.status}, data length: ${queryRes.data?.length} (no fake records)`);

  if (!zeroFetch || !honestHealth || !honestQuery) passed = false;

  // Test 3: Verify live loopback behavior preserved on localhost
  console.log('\n--- 3. Verifying Live Loopback Connection Preserved on localhost ---');
  let mockServer = null;
  try {
    const probe = await fetch('http://127.0.0.1:43141/api/atlas/v1/health').catch(() => null);
    if (!probe || !probe.ok) {
      const http = await import('http');
      mockServer = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Content-Type', 'application/json');
        if (req.url && req.url.includes('/health')) {
          res.end(JSON.stringify({ status: 'READY' }));
        } else if (req.url && req.url.includes('/nearby')) {
          res.end(JSON.stringify({
            schema_version: 'nearby/1.0',
            data: [
              { id: 'BMA-REC-01', geo: { coordinates: null, distance_km: null } },
              { id: 'BMA-REC-02', geo: { coordinates: null, distance_km: null } },
              { id: 'BMA-REC-03', geo: { coordinates: null, distance_km: null } },
              { id: 'BMA-REC-04', geo: { coordinates: null, distance_km: null } },
              { id: 'BMA-REC-05', geo: { coordinates: null, distance_km: null } }
            ]
          }));
        } else {
          res.end(JSON.stringify({}));
        }
      });
      await new Promise(resolve => mockServer.listen(43141, '127.0.0.1', resolve));
    }
  } catch (e) {
    // If binding port fails or live server already up, proceed to query
  }

  const liveHealth = await checkNearbyHealth('localhost');
  const liveQuery = await queryNearbyBangkok('localhost');

  if (mockServer) {
    mockServer.close();
    mockServer.unref();
  }

  const liveHealthOk = liveHealth.ok === true && liveHealth.status === 'READY';
  const liveQueryOk = liveQuery.ok === true && Array.isArray(liveQuery.data) && liveQuery.data.length === 5;
  const allNullGps = liveQuery.data?.every(rec => rec.geo?.coordinates === null && rec.geo?.distance_km === null);

  console.log(`  ${liveHealthOk ? '✓' : '✗'} Local backend health: ${liveHealth.status}`);
  console.log(`  ${liveQueryOk ? '✓' : '✗'} Local query records: ${liveQuery.data?.length} BMA records`);
  console.log(`  ${allNullGps ? '✓' : '✗'} All records coordinates & distance are NULL (zero geocoding): ${allNullGps}`);

  if (!liveHealthOk || !liveQueryOk || !allNullGps) passed = false;

  console.log('\n===========================================================');
  if (passed) {
    console.log('🎉 ALL PUBLIC HOST GUARD & LOOPBACK TESTS PASSED!');
    process.exitCode = 0;
  } else {
    console.error('❌ SOME TESTS FAILED');
    process.exitCode = 1;
  }
}

run().catch(err => {
  console.error('Test error:', err);
  process.exitCode = 1;
});
