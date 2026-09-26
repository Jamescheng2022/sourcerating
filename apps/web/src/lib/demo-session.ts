import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

export type DemoRole = 'buyer' | 'supplier';

export interface Room {
  id: string;
  name: string;
  boundary?: string;
  note?: string;
  type?: string;
  project_id?: string;
  buyer_organization_id?: string;
  supplier_organization_id?: string;
  organization_id?: string;
  [key: string]: any;
}

export interface RoomEvent {
  id?: string;
  room_id: string;
  seq?: number;
  client_msg_id?: string | null;
  actor_organization_id?: string | null;
  actor_user_id?: string | null;
  event_type: string;
  payload: {
    text?: string;
    who?: string;
    org?: string;
    file?: string;
    [key: string]: any;
  } | any;
  created_at: string;
  [key: string]: any;
}

export interface PendingDraft {
  client_msg_id: string;
  room_id: string;
  text: string;
  status: 'sending' | 'failed';
  error?: string;
  created_at: string;
}

export const STORAGE_KEY_ROLE = 'p1_demo_role';
export const STORAGE_KEY_ORG_ID = 'p1_demo_acting_org_id';

/**
 * Perform Demo Auth flow:
 * 1. Edge function POST p1-demo-auth -> { role, email, password, userId }
 * 2. signInWithPassword
 * 3. RPC claim_p1_demo_role({ p_role: role })
 */
export async function loginWithDemoRole(role: DemoRole): Promise<{
  role: DemoRole;
  actingOrgId: string | null;
  userId: string;
  email: string;
}> {
  // Step 1: Call demo auth edge function
  const edgeFnUrl = `${SUPABASE_URL}/functions/v1/p1-demo-auth`;
  const response = await fetch(edgeFnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Demo auth error (${response.status}): ${errorText || 'Failed to authenticate'}`);
  }

  const authData = await response.json();
  const email = authData.email;
  const password = authData.password;
  const userId = authData.userId || authData.user_id || '';

  if (!email || !password) {
    throw new Error('Demo auth did not return required credentials.');
  }

  // Step 2: Sign in with password
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw signInError;
  }

  // Step 3: RPC claim_p1_demo_role
  let claimData: any = null;
  try {
    const rpcRes = await supabase.rpc('claim_p1_demo_role', {
      p_role: role,
    });
    if (rpcRes.error) {
      console.warn('claim_p1_demo_role warning:', rpcRes.error);
    } else {
      claimData = rpcRes.data;
    }
  } catch (err) {
    console.warn('claim_p1_demo_role call exception:', err);
  }

  // Determine acting organization ID. Table-returning RPCs come back as an array.
  let actingOrgId: string | null = null;
  const claimRow = Array.isArray(claimData) ? claimData[0] : claimData;

  if (typeof claimRow === 'string' && claimRow.trim()) {
    actingOrgId = claimRow.trim();
  } else if (claimRow && typeof claimRow === 'object') {
    actingOrgId =
      claimRow.organization_id ||
      claimRow.org_id ||
      claimRow.actor_organization_id ||
      claimRow.id ||
      null;
  }

  if (!actingOrgId && authData) {
    actingOrgId =
      authData.organization_id ||
      authData.org_id ||
      authData.actor_organization_id ||
      authData.acting_org_id ||
      null;
  }

  const user = signInData.user;
  if (!actingOrgId && user) {
    actingOrgId =
      user.user_metadata?.organization_id ||
      user.app_metadata?.organization_id ||
      user.user_metadata?.org_id ||
      user.app_metadata?.org_id ||
      null;
  }

  // Persist locally
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_ROLE, role);
    if (actingOrgId) {
      localStorage.setItem(STORAGE_KEY_ORG_ID, actingOrgId);
    } else {
      localStorage.removeItem(STORAGE_KEY_ORG_ID);
    }
  }

  return {
    role,
    actingOrgId,
    userId: user?.id || userId,
    email,
  };
}

/**
 * Sign out and clear all local storage identity keys
 */
export async function resetDemoIdentity(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Error signing out:', err);
  } finally {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_ROLE);
      localStorage.removeItem(STORAGE_KEY_ORG_ID);
    }
  }
}

/**
 * Read persisted demo session if active
 */
export function getPersistedDemoSession(): {
  role: DemoRole | null;
  actingOrgId: string | null;
} {
  if (typeof window === 'undefined') {
    return { role: null, actingOrgId: null };
  }
  const role = (localStorage.getItem(STORAGE_KEY_ROLE) as DemoRole) || null;
  const actingOrgId = localStorage.getItem(STORAGE_KEY_ORG_ID) || null;
  return { role, actingOrgId };
}

/**
 * Deduplicate and sort events:
 * - Match by canonical id, client_msg_id, or seq
 * - Sort primarily by seq (ascending)
 * - Fall back to created_at
 */
export function dedupeAndSortEvents(
  existingEvents: RoomEvent[],
  incomingEvents: RoomEvent[]
): RoomEvent[] {
  const map = new Map<string, RoomEvent>();
  const clientMsgIdToKey = new Map<string, string>();

  const all = [...existingEvents, ...incomingEvents];

  for (const event of all) {
    // Unique key preference: id > client_msg_id > room_id + seq
    const primaryKey = event.id
      ? `id:${event.id}`
      : event.client_msg_id
      ? `client:${event.client_msg_id}`
      : `seq:${event.room_id}-${event.seq}`;

    // If client_msg_id exists, check if we have a draft or existing row
    if (event.client_msg_id) {
      const existingKey = clientMsgIdToKey.get(event.client_msg_id);
      if (existingKey && existingKey !== primaryKey) {
        const existing = map.get(existingKey);
        // If incoming has id or seq, replace the older less-complete entry
        if ((event.id || event.seq !== undefined) && (!existing?.id || existing?.seq === undefined)) {
          map.delete(existingKey);
        } else if (existing?.id || existing?.seq !== undefined) {
          // Existing is canonical, skip this incoming draft
          continue;
        }
      }
      clientMsgIdToKey.set(event.client_msg_id, primaryKey);
    }

    map.set(primaryKey, event);
  }

  return Array.from(map.values()).sort((a, b) => {
    if (typeof a.seq === 'number' && typeof b.seq === 'number') {
      if (a.seq !== b.seq) return a.seq - b.seq;
    } else if (typeof a.seq === 'number') {
      return -1;
    } else if (typeof b.seq === 'number') {
      return 1;
    }

    const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tA - tB;
  });
}

/**
 * Extract max sequence number from event list
 */
export function getMaxSeq(events: RoomEvent[]): number {
  let max = 0;
  for (const ev of events) {
    if (typeof ev.seq === 'number' && ev.seq > max) {
      max = ev.seq;
    }
  }
  return max;
}

/**
 * Safely parse text from room event payload
 */
export function extractEventText(payload: any): string {
  if (!payload) return '';
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      return parsed.text || parsed.message || payload;
    } catch {
      return payload;
    }
  }
  return payload.text || payload.message || '';
}