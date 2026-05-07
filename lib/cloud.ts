import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { AppState } from './types';

const TABLE_NAME = 'workspace_rooms';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

let supabaseClient: SupabaseClient | null = null;

function cloudEnabled() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function logCloudError(action: string, error: unknown) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[cloud-sync] ${action} failed`, error);
  }
}

export function hasCloudSync() {
  return cloudEnabled();
}

export function getSupabaseClient() {
  if (!cloudEnabled()) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return supabaseClient;
}

export function preferNewerState(current: AppState, candidate: AppState | null | undefined) {
  if (!candidate) return current;
  return candidate.lastSyncAt >= current.lastSyncAt ? candidate : current;
}

export async function loadCloudState(roomId: string): Promise<AppState | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from(TABLE_NAME)
    .select('state, updated_at')
    .eq('room_id', roomId)
    .maybeSingle();

  if (error) {
    logCloudError(`loading room ${roomId}`, error);
    return null;
  }

  return (data?.state as AppState | undefined) ?? null;
}

export async function saveCloudState(roomId: string, state: AppState): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client.from(TABLE_NAME).upsert(
    {
      room_id: roomId,
      state,
      updated_at: new Date(state.lastSyncAt).toISOString()
    },
    { onConflict: 'room_id' }
  );

  if (error) {
    logCloudError(`saving room ${roomId}`, error);
  }
}

export function subscribeToCloudRoom(roomId: string, onState: (state: AppState) => void): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  const channel: RealtimeChannel = client.channel(`prewire-plans:${roomId}`);
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: TABLE_NAME,
      filter: `room_id=eq.${roomId}`
    },
    async () => {
      const next = await loadCloudState(roomId);
      if (next) onState(next);
    }
  );
  channel.subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
