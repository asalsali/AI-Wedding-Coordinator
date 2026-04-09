import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Browser client for client-side auth
export const createBrowserClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Server client for server-side auth
export const createServerClient = async () => {
  const cookieStore = await cookies()
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: {
          cookie: cookieStore.toString(),
        },
      },
    }
  )
}

// Middleware auth check
export async function updateSession(request: NextRequest) {
  const cookieStore = request.cookies
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          cookie: cookieStore.toString(),
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  return {
    user,
    error,
    supabase,
    response: NextResponse.next({
      request: {
        headers: request.headers,
      },
    }),
  }
}

// Get current user (replaces Clerk's currentUser)
export async function getCurrentUser() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}
