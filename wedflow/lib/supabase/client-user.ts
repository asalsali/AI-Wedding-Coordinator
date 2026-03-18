import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a per-request Supabase client that authenticates as the current Clerk user.
 * Passes the Clerk JWT as the Authorization header so Supabase RLS policies fire.
 *
 * NOT a singleton — call once per request/action and discard.
 * Never use this in app/api/webhooks/twilio or Inngest functions (use service role there).
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
export function getSupabaseUserClient(clerkToken: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY',
    )
  }

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
