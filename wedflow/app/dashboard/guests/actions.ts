'use server'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Guest, GuestGroup, RsvpStatus } from '@/types'

// ----------------------------------------------------------------
// Supabase server helpers
// ----------------------------------------------------------------

async function getAuthedUserId(): Promise<string> {
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
  if (error || !user) throw new Error('Not authenticated')
  return user.id
}

async function getAuthedCoupleId(): Promise<{ coupleId: string; error?: string }> {
  const userId = await getAuthedUserId()
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  const { data: couple, error } = await serviceClient
    .from('couples')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (error || !couple) {
    return { coupleId: '', error: error?.message || 'Couple not found' }
  }

  return { coupleId: couple.id as string }
}

export async function addGuest(formData: FormData): Promise<{ guest?: Guest; error?: string }> {
  const { coupleId, error: authError } = await getAuthedCoupleId()
  if (authError) return { error: authError }

  const name = formData.get('name') as string | null
  const phone = formData.get('phone') as string | null
  const plusOne = formData.get('plusOne') === 'on'
  const dietary = formData.get('dietary') as string | null
  const notes = formData.get('notes') as string | null
  const groupId = formData.get('groupId') as string | null

  if (!name) return { error: 'Name is required' }

  // Normalize phone to E.164
  let normalizedPhone: string | null = null
  if (phone) {
    const digits = phone.replace(/[^\d]/g, '')
    if (digits.length === 10) {
      normalizedPhone = `+1${digits}` // Assume US/Canada
    } else if (digits.length === 11 && digits.startsWith('1')) {
      normalizedPhone = `+${digits}`
    } else if (phone.startsWith('+')) {
      normalizedPhone = phone
    } else {
      normalizedPhone = digits.length >= 10 ? `+${digits}` : null
    }
  }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  // Check if phone number is already assigned to another couple
  if (normalizedPhone) {
    const { data: existingGuest, error: phoneError } = await serviceClient
      .from('guests')
      .select('id, couple_id')
      .eq('phone', normalizedPhone)
      .maybeSingle()

    if (phoneError) {
      return { error: `Error checking phone number: ${phoneError.message}` }
    }

    if (existingGuest && existingGuest.couple_id !== coupleId) {
      return { error: 'This phone number is already assigned to a guest at another wedding' }
    }
  }

  const { data: guest, error } = await serviceClient
    .from('guests')
    .insert({
      couple_id: coupleId,
      name,
      phone: normalizedPhone,
      plus_one: plusOne,
      dietary_restrictions: dietary,
      notes,
      group_id: groupId || null,
      status: 'invited',
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  return { guest: guest as Guest }
}

export async function updateRsvpStatus(
  guestId: string,
  status: RsvpStatus
): Promise<{ success?: boolean; error?: string }> {
  const { coupleId, error: authError } = await getAuthedCoupleId()
  if (authError) return { error: authError }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  // Verify guest belongs to this couple
  const { data: guest } = await serviceClient
    .from('guests')
    .select('id')
    .eq('id', guestId)
    .eq('couple_id', coupleId)
    .maybeSingle()

  if (!guest) {
    return { error: 'Guest not found' }
  }

  const { error } = await serviceClient
    .from('guests')
    .update({ status })
    .eq('id', guestId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function updateGuest(
  guestId: string,
  updates: Partial<Guest>
): Promise<{ guest?: Guest; error?: string }> {
  const { coupleId, error: authError } = await getAuthedCoupleId()
  if (authError) return { error: authError }

  const { name, phone, plus_one, dietary_restrictions, notes } = updates

  if (!name) return { error: 'Name is required' }

  // Normalize phone to E.164
  let normalizedPhone: string | null = null
  if (phone) {
    const digits = phone.replace(/[^\d]/g, '')
    if (digits.length === 10) {
      normalizedPhone = `+1${digits}` // Assume US/Canada
    } else if (digits.length === 11 && digits.startsWith('1')) {
      normalizedPhone = `+${digits}`
    } else if (phone.startsWith('+')) {
      normalizedPhone = phone
    } else {
      normalizedPhone = digits.length >= 10 ? `+${digits}` : null
    }
  }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  // Verify guest belongs to this couple
  const { data: existingGuest } = await serviceClient
    .from('guests')
    .select('id')
    .eq('id', guestId)
    .eq('couple_id', coupleId)
    .maybeSingle()

  if (!existingGuest) {
    return { error: 'Guest not found or access denied' }
  }

  // Check if phone number is already assigned to another couple
  if (normalizedPhone) {
    const { data: phoneConflict, error: phoneError } = await serviceClient
      .from('guests')
      .select('id, couple_id')
      .eq('phone', normalizedPhone)
      .neq('id', guestId)
      .maybeSingle()

    if (phoneError) {
      return { error: `Error checking phone number: ${phoneError.message}` }
    }

    if (phoneConflict && phoneConflict.couple_id !== coupleId) {
      return { error: 'This phone number is already assigned to a guest at another wedding' }
    }
  }

  const { data: guest, error } = await serviceClient
    .from('guests')
    .update({
      name,
      phone: normalizedPhone,
      plus_one,
      dietary_restrictions,
      notes,
    })
    .eq('id', guestId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  return { guest: guest as Guest }
}

export async function deleteGuest(guestId: string): Promise<{ success?: boolean; error?: string }> {
  const { coupleId, error: authError } = await getAuthedCoupleId()
  if (authError) return { error: authError }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  // Verify guest belongs to this couple before deleting
  const { data: guest } = await serviceClient
    .from('guests')
    .select('id')
    .eq('id', guestId)
    .eq('couple_id', coupleId)
    .maybeSingle()

  if (!guest) {
    return { error: 'Guest not found or access denied' }
  }

  const { error } = await serviceClient
    .from('guests')
    .delete()
    .eq('id', guestId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function bulkImportGuests(
  csvText: string
): Promise<{ guests?: Guest[]; error?: string }> {
  const { coupleId, error: authError } = await getAuthedCoupleId()
  if (authError) return { error: authError }

  if (!csvText.trim()) {
    return { error: 'No CSV data provided' }
  }

  // Parse CSV
  const lines = csvText.trim().split('\n')
  const guests: { name: string; phone: string | null; email: string | null; plus_one: boolean; group_tag: string }[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const parts = line.split(',').map(p => p.trim())
    const name = parts[0]
    const phone = parts[1] || null
    const email = parts[2] || null
    const group = parts[3] || 'other'
    
    if (!name) continue
    
    // Normalize phone
    let normalizedPhone: string | null = null
    if (phone) {
      const digits = phone.replace(/[^\d]/g, '')
      if (digits.length === 10) {
        normalizedPhone = `+1${digits}`
      } else if (digits.length === 11 && digits.startsWith('1')) {
        normalizedPhone = `+${digits}`
      } else if (phone.startsWith('+')) {
        normalizedPhone = phone
      } else {
        normalizedPhone = digits.length >= 10 ? `+${digits}` : null
      }
    }
    
    guests.push({
      name,
      phone: normalizedPhone,
      email,
      plus_one: false,
      group_tag: group,
    })
  }

  if (guests.length === 0) {
    return { error: 'No valid guests found in CSV' }
  }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  // Normalize all guests
  const normalizedGuests = guests.map((g) => ({
    couple_id: coupleId,
    name: g.name,
    phone: g.phone,
    email: g.email,
    plus_one: g.plus_one,
    group_tag: g.group_tag,
    status: 'invited',
  }))

  const { data, error } = await serviceClient
    .from('guests')
    .insert(normalizedGuests)
    .select()

  if (error) {
    return { error: error.message }
  }

  return { guests: data as Guest[] }
}