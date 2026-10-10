// Unit tests for the pure rules behind project-invite and room-file-gateway.
// Run: deno test --no-remote supabase/functions/tests/

import {
  checkBootstrapInput,
  bootstrapPeerAddress,
  cleanDisplayName,
  type InviteRow,
  inviteState,
  isEmailExistsError,
  isWellFormedToken,
  normalizeEmail,
} from "../_shared/invite.ts";
import {
  decideVerification,
  detectMimeType,
  isRoomObjectPath,
  MIME_JPEG,
  MIME_PDF,
  MIME_PNG,
  MIME_UNKNOWN,
  MIME_XLS,
  MIME_XLSX,
  MIME_ZIP,
} from "../_shared/file-verify.ts";
import { isUuid, sha256Hex } from "../_shared/http.ts";

function assertEquals<T>(actual: T, expected: T, msg = "") {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}

const TOKEN = "a".repeat(64);
const ROOM = "11111111-2222-4333-8444-555555555555";
const UPLOAD = "66666666-7777-4888-9999-000000000000";

function invite(overrides: Partial<InviteRow> = {}): InviteRow {
  return {
    id: "inv",
    project_id: "p",
    room_id: "r",
    target_organization_id: "o",
    invited_role: "supplier",
    invited_email: null,
    expires_at: "2026-10-20T00:00:00Z",
    used_at: null,
    revoked_at: null,
    ...overrides,
  };
}

const NOW = new Date("2026-10-10T00:00:00Z");

Deno.test("bootstrap IP uses the transport peer and fails closed without metadata", () => {
  assertEquals(bootstrapPeerAddress({ remoteAddr: { hostname: "192.0.2.9" } }), "192.0.2.9");
  assertEquals(bootstrapPeerAddress({}), "unknown-peer");
  assertEquals(bootstrapPeerAddress(undefined), "unknown-peer");
});

Deno.test("token format matches create_supplier_room_invite output", () => {
  assertEquals(isWellFormedToken(TOKEN), true);
  assertEquals(isWellFormedToken("A".repeat(64)), false, "uppercase hashes differently in claim RPC");
  assertEquals(isWellFormedToken("a".repeat(63)), false);
  assertEquals(isWellFormedToken(undefined), false);
});

Deno.test("sha256Hex matches Postgres encode(digest(token,'sha256'),'hex')", async () => {
  assertEquals(
    await sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

Deno.test("invite state mirrors claim_project_invite checks", () => {
  assertEquals(inviteState(null, NOW), "not_found");
  assertEquals(inviteState(invite(), NOW), "ok");
  assertEquals(inviteState(invite({ revoked_at: "2026-10-01T00:00:00Z" }), NOW), "revoked");
  assertEquals(inviteState(invite({ used_at: "2026-10-01T00:00:00Z" }), NOW), "used");
  assertEquals(inviteState(invite({ expires_at: "2026-10-10T00:00:00Z" }), NOW), "expired", "expiry is inclusive");
});

Deno.test("bootstrap input validation", () => {
  const ok = checkBootstrapInput({ email: " Buyer@Example.COM ", password: "0123456789" }, invite());
  assertEquals(ok, { ok: true, value: { email: "buyer@example.com", password: "0123456789", displayName: null } });
  assertEquals(checkBootstrapInput({ email: "x", password: "0123456789" }, invite()).ok, false);
  assertEquals(checkBootstrapInput({ email: "a@b.co", password: "short" }, invite()).ok, false);
  assertEquals(checkBootstrapInput({ email: "a@b.co", password: "x".repeat(73) }, invite()).ok, false);
  const mismatch = checkBootstrapInput(
    { email: "other@b.co", password: "0123456789" },
    invite({ invited_email: "bound@b.co" }),
  );
  assertEquals(mismatch.ok === false && mismatch.status, 403);
  assertEquals(
    checkBootstrapInput({ email: "BOUND@b.co", password: "0123456789" }, invite({ invited_email: "bound@b.co" })).ok,
    true,
  );
});

Deno.test("email and display name cleaning", () => {
  assertEquals(normalizeEmail("a b@c.de"), null);
  assertEquals(cleanDisplayName("  Wang‮Lin\u0007 "), "WangLin");
  assertEquals(cleanDisplayName("   "), null);
  assertEquals(cleanDisplayName("x".repeat(500))?.length, 120);
});

Deno.test("existing-account detection", () => {
  assertEquals(isEmailExistsError({ code: "email_exists" }), true);
  assertEquals(isEmailExistsError({ message: "A user with this email address has already been registered" }), true);
  assertEquals(isEmailExistsError({ message: "Database error" }), false);
  assertEquals(isEmailExistsError(null), false);
});

const enc = (s: string) => new TextEncoder().encode(s);
const bytes = (...xs: number[]) => new Uint8Array(xs);

Deno.test("magic-byte MIME detection", () => {
  assertEquals(detectMimeType(enc("%PDF-1.7\n...")), MIME_PDF);
  assertEquals(detectMimeType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)), MIME_PNG);
  assertEquals(detectMimeType(bytes(0xff, 0xd8, 0xff, 0xe0)), MIME_JPEG);
  assertEquals(detectMimeType(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)), MIME_XLS);
  const zipHead = String.fromCharCode(0x50, 0x4b, 0x03, 0x04);
  assertEquals(detectMimeType(enc(zipHead + "[Content_Types].xml ... xl/workbook.xml")), MIME_XLSX);
  assertEquals(detectMimeType(enc(zipHead + "[Content_Types].xml ... word/document.xml")), MIME_ZIP);
  assertEquals(detectMimeType(enc("<html>")), MIME_UNKNOWN);
  assertEquals(detectMimeType(new Uint8Array()), MIME_UNKNOWN);
});

Deno.test("verification verdicts", () => {
  const base = {
    declaredMimeType: MIME_PDF,
    expectedSha256: "AB".repeat(32),
    expectedSizeBytes: 10,
    serverSha256: "ab".repeat(32),
    sizeBytes: 10,
    detectedMimeType: MIME_PDF,
  };
  assertEquals(decideVerification(base).status, "verified");
  assertEquals(decideVerification({ ...base, serverSha256: "cd".repeat(32) }).status, "hash_mismatch");
  assertEquals(decideVerification({ ...base, sizeBytes: 11 }).status, "hash_mismatch");
  assertEquals(decideVerification({ ...base, detectedMimeType: MIME_UNKNOWN }).status, "quarantined");
});

Deno.test("cleanup_orphan object path must sit in the caller's room folder", () => {
  assertEquals(isRoomObjectPath(`${ROOM}/${UPLOAD}/quote.pdf`, ROOM), true);
  assertEquals(isRoomObjectPath(`${ROOM}/${UPLOAD}/quote.pdf`, "99999999-2222-4333-8444-555555555555"), false);
  assertEquals(isRoomObjectPath(`${ROOM}/${UPLOAD}/../x.pdf`, ROOM), false);
  assertEquals(isRoomObjectPath(`${ROOM}/${UPLOAD}/a/b.pdf`, ROOM), false);
  assertEquals(isRoomObjectPath(`${ROOM}/not-a-uuid/b.pdf`, ROOM), false);
  assertEquals(isRoomObjectPath(`${ROOM}/${UPLOAD}/a..b.pdf`, ROOM), false);
  assertEquals(isRoomObjectPath(123, ROOM), false);
  assertEquals(isUuid(ROOM), true);
  assertEquals(isUuid("x"), false);
});
