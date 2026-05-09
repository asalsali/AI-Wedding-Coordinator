import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? ''
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  if (code) {
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
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing sessions.
            }
          },
        },
      }
    )
    
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // If the authenticated user has a pending partner invite, claim it
      const userEmail = sessionData.user?.email
      if (userEmail) {
        try {
          const { createClient: createSupabaseAdmin } = await import('@supabase/supabase-js')
          const svc = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
          )
          const PLACEHOLDER = '00000000-0000-0000-0000-000000000000'
          const { data: partner } = await svc
            .from('partners')
            .select('id, user_id')
            .eq('contact_email', userEmail)
            .maybeSingle()

          if (
            partner &&
            (!partner.user_id || (partner.user_id as string) === PLACEHOLDER)
          ) {
            await svc
              .from('partners')
              .update({ user_id: sessionData.user.id })
              .eq('id', partner.id)
            // Redirect to partner dashboard instead of default
            return NextResponse.redirect(new URL('/partner', request.url))
          }
        } catch {
          // Partner claim failed silently — user still gets redirected normally
        }
      }

      return NextResponse.redirect(new URL(next, request.url))
    }
    
    console.error('auth/callback exchange failed', { code: error.code ?? 'unknown' })
  }

  return NextResponse.redirect(new URL('/sign-in?error=auth_failed', request.url))
}
