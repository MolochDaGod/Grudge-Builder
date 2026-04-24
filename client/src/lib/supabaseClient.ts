/**
 * supabaseClient — the one Supabase instance for the whole GrudgeBuilder app.
 * project_ref: rdbkhvrpavhptxrmmwrc
 *
 * Import this anywhere you need to call supabase.auth or supabase.from().
 * Do NOT create additional createClient() calls — RLS sessions live on the
 * one shared client.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // eslint-disable-next-line no-console
  console.error(
    '[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. ' +
    'Set these in .env (or .env.local) before building.'
  );
}

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL ?? '',
  SUPABASE_PUBLISHABLE_KEY ?? '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'grudge-supabase-auth',
    },
    global: {
      headers: { 'X-Client-Info': 'grudge-builder-web' },
    },
  }
);

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getCurrentAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Returns the profile row for the signed-in user (grudge_id + display_name + etc.)
 * Call this once on login to hydrate any UI that shows the user's handle.
 */
export async function getMyProfile() {
  const uid = await getCurrentUserId();
  if (!uid) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, grudge_id, display_name, avatar_url, email, wallet_address, puter_username')
    .eq('id', uid)
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[supabaseClient] profile fetch failed:', error.message);
    return null;
  }
  return data;
}
