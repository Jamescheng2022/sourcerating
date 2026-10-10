import { supabase } from './supabase';

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

/** Restore a UI identity from active database memberships, never editable metadata. */
export async function resolveSessionIdentity() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;
  const { data, error } = await supabase.from('room_members')
    .select('acting_organization_id,rooms!inner(owner_organization_id)')
    .eq('user_id', user.id).is('removed_at', null);
  if (error) throw error;
  const preferred = getPersistedDemoSession().actingOrgId;
  const membership = data?.find(row => row.acting_organization_id === preferred) || data?.[0];
  if (!membership) throw new Error('No active project room membership. Open your project invitation to join.');
  const room = Array.isArray(membership.rooms) ? membership.rooms[0] : membership.rooms;
  const role: DemoRole = room.owner_organization_id === membership.acting_organization_id ? 'buyer' : 'supplier';
  localStorage.setItem(STORAGE_KEY_ROLE, role);
  localStorage.setItem(STORAGE_KEY_ORG_ID, membership.acting_organization_id);
  return { role, actingOrgId: membership.acting_organization_id, userId: user.id };
}

export async function loginWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  const identity = await resolveSessionIdentity();
  if (!identity) throw new Error('Unable to restore your project session.');
  return identity;
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