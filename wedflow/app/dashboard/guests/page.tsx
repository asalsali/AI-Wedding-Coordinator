import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import GuestListClient from './GuestListClient'
import type { Guest } from '@/types'

// ----------------------------------------------------------------
// Supabase server helpers
// ----------------------------------------------------------------

async function getAuthedUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Ignore errors from Server Components
          }
        },
      },
    }
  )
  
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

export default async function GuestListPage() {
  const userId = await getAuthedUserId()
  if (!userId) redirect('/sign-in')

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  const { data: couple } = await serviceClient
    .from('couples')
    .select('id, your_name, partner_name')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (!couple) redirect('/onboarding')

  const coupleId = couple.id as string

  const { data: guests, error } = await serviceClient
    .from('guests')
    .select('*')
    .eq('couple_id', coupleId)
    .order('name')

  if (error) {
    console.error('Failed to load guests:', error)
  }

  return (
    <GuestListClient
      coupleName={[couple.your_name, couple.partner_name].filter(Boolean).join(' & ') || 'Your Wedding'}
      initialGuests={(guests ?? []) as Guest[]}
    />
  )
}