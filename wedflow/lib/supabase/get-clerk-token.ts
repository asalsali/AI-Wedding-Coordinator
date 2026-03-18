import { auth } from '@clerk/nextjs/server'

/**
 * Returns a short-lived Supabase JWT issued by Clerk.
 * Requires a JWT template named "supabase" configured in the Clerk dashboard.
 * Use this token with getSupabaseUserClient() so RLS policies are enforced.
 */
export async function getClerkToken(): Promise<string> {
  const { getToken } = await auth()
  const token = await getToken({ template: 'supabase' })

  if (!token) {
    throw new Error(
      'No Supabase JWT from Clerk — ensure the "supabase" JWT template is configured in your Clerk dashboard.',
    )
  }

  return token
}
