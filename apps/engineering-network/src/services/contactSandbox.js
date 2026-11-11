import { canonicalEntity } from '../data/canonicalEntities.js';
import { envelope } from './mockApi.js';

// Deliberately fake bearer sessions. Never accept a client-selected role or subject.
const sessions = new Map([
  ['sandbox-eng-01', { subject: 'ENG-01', identityVerified: true, role: 'member' }],
  ['sandbox-eng-02', { subject: 'ENG-02', identityVerified: true, role: 'member' }],
  ['sandbox-eng-03-unverified', { subject: 'ENG-03', identityVerified: false, role: 'member' }],
  ['sandbox-guest', { subject: 'GUEST', identityVerified: false, role: 'guest' }]
]);
export class ContractError extends Error {
  constructor(status, code) { super(code); this.status = status; }
}
const fail = (status, code) => { throw new ContractError(status, code); };
export function createContactSandbox({ now = Date.now } = {}) {
  const requests = new Map();
  const idempotency = new Map();
  // Simulated recipient opt-in, not consent inferred from a public profile.
  const optedIn = new Set(['ENG-01', 'ENG-02', 'ORG-A']);
  function actor(token) {
    const session = sessions.get(token);
    if (!session) fail(401, 'SANDBOX_SESSION_REQUIRED');
    if (!session.identityVerified || session.role !== 'member') fail(403, 'VERIFIED_MEMBER_REQUIRED');
    return session;
  }
  return {
    create(token, body, key) {
      const session = actor(token);
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !['recipient_id','message','consent'].includes(k))) fail(400, 'INVALID_FIELDS');
      if (typeof key !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(key)) fail(400, 'IDEMPOTENCY_KEY_REQUIRED');
      const recipient = canonicalEntity(body.recipient_id);
      if (!recipient || recipient.id !== body.recipient_id || recipient.id === session.subject || !optedIn.has(recipient.id)) fail(403, 'RECIPIENT_UNAVAILABLE');
      if (body.consent !== true) fail(400, 'EXPLICIT_CONSENT_REQUIRED');
      if (typeof body.message !== 'string' || body.message.trim().length < 10 || body.message.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(body.message)) fail(400, 'INVALID_MESSAGE');
      const message = body.message.trim();
      const fingerprint = JSON.stringify([recipient.id, message, true]);
      const scope = `${session.subject}:${key}`;
      const previous = idempotency.get(scope);
      if (previous) {
        if (previous.fingerprint !== fingerprint) fail(409, 'IDEMPOTENCY_CONFLICT');
        return envelope(structuredClone(requests.get(previous.id)), { replayed: true });
      }
      const recent = [...requests.values()].filter(r => r.sender_id === session.subject && r.created_at_ms > now() - 3600000);
      if (recent.length >= 3 || recent.some(r => r.recipient_id === recipient.id && r.created_at_ms > now() - 60000)) fail(429, 'RATE_LIMITED');
      if (requests.size >= 1000) fail(503, 'SANDBOX_CAPACITY');
      const id = `mock-contact-${requests.size + 1}`;
      const record = { id, sender_id: session.subject, recipient_id: recipient.id, message, consent: true, consent_version: 'contact-v1', created_at_ms: now(), status: 'STORED_MOCK_ONLY', delivery: 'DISABLED', isMock: true };
      requests.set(id, record);
      idempotency.set(scope, { id, fingerprint });
      return envelope(structuredClone(record), { replayed: false });
    },
    read(token, id) {
      const session = actor(token);
      const record = requests.get(id);
      if (!record || ![record.sender_id, record.recipient_id].includes(session.subject)) fail(404, 'NOT_FOUND');
      return envelope(structuredClone(record));
    }
  };
}
