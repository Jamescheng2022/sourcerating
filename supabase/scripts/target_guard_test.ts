// deno test --no-remote supabase/scripts/
import { checkSeedTarget } from "./target-guard.ts";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

Deno.test("seed target guard allows only the local stack by default", () => {
  assert(checkSeedTarget("http://127.0.0.1:54321") === null, "local IP allowed");
  assert(checkSeedTarget("http://localhost:54321") === null, "localhost allowed");
  assert(checkSeedTarget("https://abcdefghijklmnopqrst.supabase.co") !== null, "unnamed remote refused");
  assert(checkSeedTarget("not a url") !== null, "invalid URL refused");
});

Deno.test("production project is refused even when named", () => {
  assert(checkSeedTarget("https://qnozpurjtgkmwtvsrjoi.supabase.co") !== null, "prod refused");
  assert(
    checkSeedTarget("https://qnozpurjtgkmwtvsrjoi.supabase.co", "qnozpurjtgkmwtvsrjoi") !== null,
    "prod refused even if allowed explicitly",
  );
  assert(
    checkSeedTarget("https://abcdefghijklmnopqrst.supabase.co", "abcdefghijklmnopqrst") === null,
    "named test project allowed",
  );
});
