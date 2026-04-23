'use server'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import type { CircleMember, CircleRole, TaskAssignment, TaskStatus } from '@/types'

// ----------------------------------------------------------------
// Supabase helpers (same pattern as dashboard/actions.ts)
// ----------------------------------------------------------------

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getAuthedUserId(): Promise<string> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: unknown }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as Record<string, unknown>)
            })
          } catch { /* Server Component context */ }
        },
      },
    }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return user.id
}

async function getCoupleId(userId: string): Promise<string> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('couples')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()
  if (error || !data) throw new Error('Couple not found')
  return data.id as string
}

// ----------------------------------------------------------------
// Invite a circle member (couple action)
// ----------------------------------------------------------------

const InviteSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['moh', 'best_man', 'family_lead', 'bridesmaid', 'groomsman']),
})

export async function createCircleInvite(
  input: { name: string; email: string; role: CircleRole }
): Promise<{ success: boolean; inviteToken?: string; error?: string }> {
  const parsed = InviteSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input: name, email, and role are required.' }
  }

  const userId = await getAuthedUserId()
  const coupleId = await getCoupleId(userId)
  const supabase = getServiceClient()

  // Check for existing invite to same email
  const { data: existing } = await supabase
    .from('circle_members')
    .select('id, status')
    .eq('couple_id', coupleId)
    .eq('email', parsed.data.email)
    .neq('status', 'removed')
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'This person has already been invited.' }
  }

  const { data: member, error } = await supabase
    .from('circle_members')
    .insert({
      couple_id: coupleId,
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
    })
    .select('invite_token')
    .single()

  if (error || !member) {
    return { success: false, error: 'Failed to create invite.' }
  }

  return { success: true, inviteToken: member.invite_token as string }
}

// ----------------------------------------------------------------
// Get invite details by token (public, for /join/[token] page)
// ----------------------------------------------------------------

export async function getInviteByToken(
  token: string
): Promise<{
  valid: boolean
  expired?: boolean
  member?: { name: string; email: string; role: CircleRole; coupleName: string }
}> {
  const supabase = getServiceClient()

  const { data: member, error } = await supabase
    .from('circle_members')
    .select('id, name, email, role, status, invite_expires_at, couple_id, user_id')
    .eq('invite_token', token)
    .maybeSingle()

  if (error || !member) {
    return { valid: false }
  }

  // Already accepted
  if (member.status === 'active' && member.user_id) {
    return { valid: false }
  }

  // Expired
  const expiresAt = new Date(member.invite_expires_at as string)
  if (expiresAt < new Date()) {
    return { valid: false, expired: true }
  }

  // Get couple name for the welcome message
  const { data: couple } = await supabase
    .from('couples')
    .select('your_name, partner_name')
    .eq('id', member.couple_id)
    .single()

  const coupleName = couple
    ? `${couple.your_name} and ${couple.partner_name}`
    : 'the couple'

  return {
    valid: true,
    member: {
      name: member.name as string,
      email: member.email as string,
      role: member.role as CircleRole,
      coupleName,
    },
  }
}

// ----------------------------------------------------------------
// Accept invite (binds auth user to circle member)
// ----------------------------------------------------------------

export async function acceptCircleInvite(
  token: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getAuthedUserId()
  const supabase = getServiceClient()

  // Get the authed user's email for binding check
  const { data: { user } } = await supabase.auth.admin.getUserById(userId)
  if (!user) {
    return { success: false, error: 'User not found.' }
  }

  const { data: member, error } = await supabase
    .from('circle_members')
    .select('id, email, status, invite_expires_at, user_id')
    .eq('invite_token', token)
    .maybeSingle()

  if (error || !member) {
    return { success: false, error: 'Invite not found.' }
  }

  if (member.status === 'active' && member.user_id) {
    return { success: false, error: 'This invite has already been accepted.' }
  }

  // Expired check
  const expiresAt = new Date(member.invite_expires_at as string)
  if (expiresAt < new Date()) {
    return { success: false, error: 'This invite has expired. Ask the couple to send a new one.' }
  }

  // Auth binding: email must match
  if (user.email?.toLowerCase() !== (member.email as string).toLowerCase()) {
    return {
      success: false,
      error: `This invite was sent to ${member.email}. Please sign in with that email address.`,
    }
  }

  // Bind user_id and activate
  const { error: updateError } = await supabase
    .from('circle_members')
    .update({
      user_id: userId,
      status: 'active',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', member.id)

  if (updateError) {
    return { success: false, error: 'Failed to accept invite.' }
  }

  return { success: true }
}

// ----------------------------------------------------------------
// Get portal context (circle member action)
// ----------------------------------------------------------------

export async function getPortalContext(): Promise<{
  member: CircleMember
  coupleName: string
  tasks: TaskAssignment[]
  conversations: Array<{
    id: string
    guestName: string | null
    lastMessageAt: string
    lastMessageBody: string
    messageCount: number
  }>
} | null> {
  const userId = await getAuthedUserId()
  const supabase = getServiceClient()

  // Find the circle member record for this user
  const { data: member, error: memberError } = await supabase
    .from('circle_members')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (memberError || !member) return null

  // Get couple name
  const { data: couple } = await supabase
    .from('couples')
    .select('your_name, partner_name')
    .eq('id', member.couple_id)
    .single()

  const coupleName = couple
    ? `${couple.your_name} and ${couple.partner_name}`
    : 'the couple'

  // Get assigned tasks
  const { data: tasks } = await supabase
    .from('task_assignments')
    .select('id, couple_id, assigned_to, message_id, title, description, status, created_at, completed_at')
    .eq('assigned_to', member.id)
    .order('created_at', { ascending: false })

  // Get role-filtered conversations
  const roleGroupMap: Record<string, string[]> = {
    moh: ['bridal_party'],
    bridesmaid: ['bridal_party'],
    best_man: ['bridal_party'],
    groomsman: ['bridal_party'],
    family_lead: ['bride_family', 'groom_family'],
  }

  const groups = roleGroupMap[member.role as string] ?? []

  let conversations: Array<{
    id: string
    guestName: string | null
    lastMessageAt: string
    lastMessageBody: string
    messageCount: number
  }> = []

  if (groups.length > 0) {
    // Get guests in matching groups for this couple
    const { data: guests } = await supabase
      .from('guests')
      .select('conversation_id, name')
      .eq('couple_id', member.couple_id)
      .in('group_tag', groups)
      .not('conversation_id', 'is', null)

    if (guests && guests.length > 0) {
      const convIds = guests
        .map(g => g.conversation_id)
        .filter((id): id is string => id !== null)

      if (convIds.length > 0) {
        const { data: convs } = await supabase
          .from('conversations')
          .select('id, guest_name, last_message_at')
          .in('id', convIds)
          .order('last_message_at', { ascending: false })
          .limit(20)

        if (convs) {
          // Get last message for each conversation
          for (const conv of convs) {
            const { data: msgs, count } = await supabase
              .from('messages')
              .select('body', { count: 'exact' })
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)

            conversations.push({
              id: conv.id as string,
              guestName: conv.guest_name as string | null,
              lastMessageAt: conv.last_message_at as string,
              lastMessageBody: msgs?.[0]?.body as string ?? '',
              messageCount: count ?? 0,
            })
          }
        }
      }
    }
  }

  return {
    member: member as unknown as CircleMember,
    coupleName,
    tasks: (tasks ?? []) as unknown as TaskAssignment[],
    conversations,
  }
}

// ----------------------------------------------------------------
// Update task status (circle member action)
// ----------------------------------------------------------------

export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus
): Promise<{ success: boolean; error?: string }> {
  const userId = await getAuthedUserId()
  const supabase = getServiceClient()

  // Verify this task belongs to the authed circle member
  const { data: task } = await supabase
    .from('task_assignments')
    .select('id, assigned_to')
    .eq('id', taskId)
    .single()

  if (!task) return { success: false, error: 'Task not found.' }

  const { data: member } = await supabase
    .from('circle_members')
    .select('id')
    .eq('id', task.assigned_to)
    .eq('user_id', userId)
    .maybeSingle()

  if (!member) return { success: false, error: 'Not authorized.' }

  const { error } = await supabase
    .from('task_assignments')
    .update({
      status: newStatus,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    })
    .eq('id', taskId)

  if (error) return { success: false, error: 'Failed to update task.' }
  return { success: true }
}

// ----------------------------------------------------------------
// Get circle members for couple dashboard
// ----------------------------------------------------------------

export async function getCircleMembers(): Promise<CircleMember[]> {
  const userId = await getAuthedUserId()
  const coupleId = await getCoupleId(userId)
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('circle_members')
    .select('*')
    .eq('couple_id', coupleId)
    .neq('status', 'removed')
    .order('created_at', { ascending: true })

  if (error) return []
  return (data ?? []) as unknown as CircleMember[]
}
