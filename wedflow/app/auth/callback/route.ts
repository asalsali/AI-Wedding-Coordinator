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

    // Determine redirect destination before exchanging code so we can
    // build a NextResponse.redirect and set cookies directly on it.
    // This avoids the SSR cookie-timing bug where cookieStore.set() in
    // a Route Handler does not propagate to subsequent server-side
    // getUser() calls on the redirected page.
    let redirectTo = next

    // We need to collect cookies during exchange, then apply them to
    // the final redirect response. Use an intermediate array.
    const pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
            cookiesToSet.forEach((cookie) => {
              pendingCookies.push(cookie)
            })
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

          if (partner) {
            if (!partner.user_id || (partner.user_id as string) === PLACEHOLDER) {
              await svc
                .from('partners')
                .update({ user_id: sessionData.user.id })
                .eq('id', partner.id)
            }
            // Redirect to partner dashboard for both new and returning partners
            redirectTo = '/partner'
          }
        } catch {
          // Partner claim failed silently — user still gets redirected normally
        }
      }

      // Build the redirect response and attach all session cookies to it
      const response = NextResponse.redirect(new URL(redirectTo, request.url))
      for (const { name, value, options } of pendingCookies) {
        response.cookies.set(name, value, options)
      }
      return response
    }

    console.error('auth/callback exchange failed', { code: error.code ?? 'unknown' })
  }

  return NextResponse.redirect(new URL('/sign-in?error=auth_failed', request.url))
}
