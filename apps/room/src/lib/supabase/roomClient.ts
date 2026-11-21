import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

export interface LiveRoomEvent {
  id: string;
  room_id: string;
  seq: number;
  client_msg_id: string;
  actor_user_id: string;
  actor_organization_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  prev_hash: string | null;
  content_hash: string;
  created_at: string;
}

export interface LiveRoom {
  id: string;
  project_id: string;
  kind: 'buyer_internal' | 'supplier_external' | 'provider_external' | 'shared_execution';
  name: string;
  owner_organization_id: string;
  counterpart_organization_id: string | null;
  last_seq: number;
  digest_head: string | null;
  created_at: string;
}

export async function listRooms(client: SupabaseClient): Promise<LiveRoom[]> {
  const { data, error } = await client
    .from('rooms')
    .select('id,project_id,kind,name,owner_organization_id,counterpart_organization_id,last_seq,digest_head,created_at')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as LiveRoom[];
}

export async function listRoomEvents(
  client: SupabaseClient,
  roomId: string,
  afterSeq = 0,
  limit = 200,
): Promise<LiveRoomEvent[]> {
  const { data, error } = await client
    .from('room_events')
    .select('id,room_id,seq,client_msg_id,actor_user_id,actor_organization_id,event_type,payload,prev_hash,content_hash,created_at')
    .eq('room_id', roomId)
    .gt('seq', afterSeq)
    .order('seq', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as LiveRoomEvent[];
}

export async function appendTextMessage(
  client: SupabaseClient,
  input: {
    roomId: string;
    actingOrganizationId: string;
    text: string;
    clientMessageId?: string;
  },
): Promise<LiveRoomEvent> {
  const clientMessageId = input.clientMessageId ?? crypto.randomUUID();

  const { data, error } = await client.rpc('append_room_event', {
    p_room_id: input.roomId,
    p_client_msg_id: clientMessageId,
    p_actor_organization_id: input.actingOrganizationId,
    p_event_type: 'message.posted',
    p_payload: { text: input.text },
  });

  if (error) throw error;
  return data as LiveRoomEvent;
}

export function subscribeToRoomEventHints(
  client: SupabaseClient,
  roomId: string,
  onHint: (event: LiveRoomEvent) => void,
): RealtimeChannel {
  // P1 intentionally uses Postgres Changes because the managed realtime.messages
  // table cannot be policy-managed by the current migration role. Canonical data
  // remains protected by room_events RLS. Upgrade to private Broadcast when the
  // Realtime Authorization admin path is available.
  const channel = client
    .channel(`room-events:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'room_events',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        onHint(payload.new as LiveRoomEvent);
      },
    )
    .subscribe();

  return channel;
}

export async function removeRoomSubscription(
  client: SupabaseClient,
  channel: RealtimeChannel,
): Promise<void> {
  await client.removeChannel(channel);
}