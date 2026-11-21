// Local test processes only. Select PATH directly; never enumerate parent values.
function pathOnlyEnv(source = process.env) {
  const path = source.PATH;
  if (typeof path !== 'string' || !path) throw Error('Local test child requires PATH');
  return { PATH: path };
}
function canaryServerEnv(values, source = process.env) {
  if (values.API_URL !== 'http://127.0.0.1:54321' || typeof values.ANON_KEY !== 'string' || !values.ANON_KEY) {
    throw Error('Canary requires the actual loopback Auth fixture');
  }
  return { ...pathOnlyEnv(source), NEXT_PUBLIC_SUPABASE_URL: values.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: values.ANON_KEY, NEXT_TELEMETRY_DISABLED: '1' };
}
module.exports = { pathOnlyEnv, canaryServerEnv };
