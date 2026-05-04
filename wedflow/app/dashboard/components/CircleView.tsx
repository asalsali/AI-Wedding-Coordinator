import { useState, useEffect, useTransition } from 'react'
import { Icon } from './Icon'
import {
  createCircleInvite,
  getCircleMembers,
  getCircleTasks,
  createTaskAssignment,
  removeCircleMember,
} from '@/app/circle/actions'
import type { CircleMember, CircleRole, TaskAssignment } from '@/types'

const ROLE_LABELS: Record<CircleRole, string> = {
  moh: 'Maid of Honor',
  best_man: 'Best Man',
  family_lead: 'Family Lead',
  bridesmaid: 'Bridesmaid',
  groomsman: 'Groomsman',
}

const ROLE_SHORT: Record<CircleRole, string> = {
  moh: 'MOH',
  best_man: 'BM',
  family_lead: 'FL',
  bridesmaid: 'BM',
  groomsman: 'GM',
}

function memberInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function timeAgoShort(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function CircleView() {
  const [members, setMembers] = useState<CircleMember[]>([])
  const [tasks, setTasks] = useState<TaskAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // Invite form
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<CircleRole>('bridesmaid')
  const [isInviting, startInvite] = useTransition()
  const [inviteResult, setInviteResult] = useState<{ type: 'success' | 'error'; text: string; link?: string } | null>(null)

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskAssignee, setTaskAssignee] = useState('')
  const [isCreatingTask, startCreateTask] = useTransition()

  // Remove member
  const [isRemoving, startRemove] = useTransition()

  function loadCircleData() {
    setLoading(true)
    setLoadError(false)
    Promise.all([getCircleMembers(), getCircleTasks()])
      .then(([m, t]) => {
        setMembers(m)
        setTasks(t)
      })
      .catch(() => {
        setLoadError(true)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadCircleData()
  }, [])

  function handleInvite() {
    startInvite(async () => {
      const result = await createCircleInvite({ name: inviteName, email: inviteEmail, role: inviteRole })
      if (result.success && result.inviteToken) {
        const link = `${window.location.origin}/join/${result.inviteToken}`
        setInviteResult({ type: 'success', text: `Invite created for ${inviteName}.`, link })
        setInviteName('')
        setInviteEmail('')
        setInviteRole('bridesmaid')
        setShowInviteForm(false)
        const fresh = await getCircleMembers()
        setMembers(fresh)
      } else {
        setInviteResult({ type: 'error', text: result.error ?? 'Failed to create invite.' })
      }
    })
  }

  function handleCreateTask() {
    if (!taskAssignee || !taskTitle.trim()) return
    startCreateTask(async () => {
      const result = await createTaskAssignment({
        assignedTo: taskAssignee,
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
      })
      if (result.success) {
        setTaskTitle('')
        setTaskDescription('')
        setTaskAssignee('')
        setShowTaskForm(false)
        const fresh = await getCircleTasks()
        setTasks(fresh)
      }
    })
  }

  function handleRemoveMember(memberId: string) {
    startRemove(async () => {
      const result = await removeCircleMember(memberId)
      if (result.success) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId))
      }
    })
  }

  function copyInviteLink(link: string) {
    navigator.clipboard.writeText(link)
    setInviteResult((prev) => prev ? { ...prev, text: 'Link copied!' } : null)
  }

  const activeMembers = members.filter((m) => m.status === 'active')
  const pendingMembers = members.filter((m) => m.status === 'invited')
  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress')
  const doneTasks = tasks.filter((t) => t.status === 'done' || t.status === 'dismissed')

  if (loading) {
    return (
      <div style={{ padding: isMobile ? '24px 16px 80px' : '40px 48px 80px', maxWidth: 900, margin: '0 auto' }}>
        <span className="wf-eyebrow">Your circle</span>
        <h1 className="wf-serif" style={{ fontSize: 'clamp(28px, 3.4vw, 42px)', color: 'var(--wf-forest)', fontWeight: 600, margin: '14px 0 32px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Loading...
        </h1>
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={{ padding: isMobile ? '24px 16px 80px' : '40px 48px 80px', maxWidth: 900, margin: '0 auto' }}>
        <span className="wf-eyebrow">Your circle</span>
        <h1 className="wf-serif" style={{ fontSize: 'clamp(28px, 3.4vw, 42px)', color: 'var(--wf-forest)', fontWeight: 600, margin: '14px 0 16px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Something went wrong.
        </h1>
        <p className="wf-sans" style={{ color: 'var(--wf-ink-60)', fontSize: 15, marginBottom: 20 }}>
          Could not load circle members. Try again.
        </p>
        <button onClick={loadCircleData} className="wf-btn wf-btn-forest">
          <Icon name="refresh" size={14} /> Retry
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? '24px 16px 80px' : '40px 48px 80px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: isMobile ? 16 : 24, marginBottom: isMobile ? 24 : 32, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <span className="wf-eyebrow">Your circle</span>
          <h1 className="wf-serif" style={{ fontSize: 'clamp(28px, 3.4vw, 42px)', color: 'var(--wf-forest)', fontWeight: 600, margin: '14px 0 6px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            The people who <em style={{ fontWeight: 500 }}>hold it together.</em>
          </h1>
          <p className="wf-sans" style={{ color: 'var(--wf-ink-60)', fontSize: 15 }}>
            {members.length === 0
              ? 'Invite your wedding party to help tend your guests.'
              : `${activeMembers.length} active, ${pendingMembers.length} pending`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={() => setShowTaskForm(true)} disabled={activeMembers.length === 0} className="wf-btn wf-btn-ghost" style={{ opacity: activeMembers.length === 0 ? 0.5 : 1 }}>
            <Icon name="check" size={14} /> Assign task
          </button>
          <button onClick={() => { setShowInviteForm(true); setInviteResult(null) }} className="wf-btn wf-btn-forest">
            <Icon name="users" size={14} /> Invite
          </button>
        </div>
      </div>

      {/* Invite result banner */}
      {inviteResult && (
        <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 14, background: inviteResult.type === 'success' ? 'rgba(106,162,96,0.1)' : 'rgba(180,84,78,0.08)', border: `1px solid ${inviteResult.type === 'success' ? 'rgba(106,162,96,0.25)' : 'rgba(180,84,78,0.2)'}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="wf-sans" style={{ fontSize: 13, color: inviteResult.type === 'success' ? 'var(--wf-forest)' : 'var(--wf-rose)', flex: 1 }}>{inviteResult.text}</span>
          {inviteResult.link && (
            <>
              <button onClick={() => copyInviteLink(inviteResult.link!)} className="wf-btn wf-btn-ghost wf-btn-sm">
                <Icon name="copy" size={12} /> Copy link
              </button>
              <a href={`sms:?body=${encodeURIComponent(`You're invited to our wedding circle on WedFlow! Join here: ${inviteResult.link}`)}`} className="wf-btn wf-btn-ghost wf-btn-sm" style={{ textDecoration: 'none' }}>
                <Icon name="send" size={12} /> Text link
              </a>
            </>
          )}
          <button onClick={() => setInviteResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wf-ink-45)', padding: 2 }}>
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      {/* Invite form */}
      {showInviteForm && (
        <div style={{ marginBottom: 28, background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 20, padding: isMobile ? '20px 16px' : '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 className="wf-serif" style={{ fontSize: isMobile ? 18 : 20, fontWeight: 600, color: 'var(--wf-forest)', margin: 0 }}>Invite to your circle</h3>
            <button onClick={() => setShowInviteForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wf-ink-45)', padding: 4 }}>
              <Icon name="x" size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Name</label>
              <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Chloe" className="wf-sans" style={{ width: '100%', fontSize: 13, border: '1px solid var(--wf-line)', borderRadius: 10, padding: '10px 14px', outline: 'none', fontFamily: 'var(--wf-sans)', background: 'var(--wf-cream)' }} />
            </div>
            <div>
              <label className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Email</label>
              <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="chloe@example.com" type="email" className="wf-sans" style={{ width: '100%', fontSize: 13, border: '1px solid var(--wf-line)', borderRadius: 10, padding: '10px 14px', outline: 'none', fontFamily: 'var(--wf-sans)', background: 'var(--wf-cream)' }} />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Role</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(Object.entries(ROLE_LABELS) as [CircleRole, string][]).map(([value, label]) => (
                <button key={value} onClick={() => setInviteRole(value)} className="wf-sans" style={{ padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500, border: inviteRole === value ? '1.5px solid var(--wf-forest)' : '1px solid var(--wf-line)', background: inviteRole === value ? 'var(--wf-forest)' : 'var(--wf-cream)', color: inviteRole === value ? 'var(--wf-cream)' : 'var(--wf-ink-60)', cursor: 'pointer', fontFamily: 'var(--wf-sans)', transition: 'all 0.15s' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowInviteForm(false)} className="wf-btn wf-btn-ghost">Cancel</button>
            <button onClick={handleInvite} disabled={isInviting || !inviteName.trim() || !inviteEmail.trim()} className="wf-btn wf-btn-forest">
              {isInviting ? 'Sending...' : 'Send invite'}
            </button>
          </div>
        </div>
      )}

      {/* Task form */}
      {showTaskForm && (
        <div style={{ marginBottom: 28, background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 20, padding: isMobile ? '20px 16px' : '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 className="wf-serif" style={{ fontSize: isMobile ? 18 : 20, fontWeight: 600, color: 'var(--wf-forest)', margin: 0 }}>Assign a task</h3>
            <button onClick={() => setShowTaskForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wf-ink-45)', padding: 4 }}>
              <Icon name="x" size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Task</label>
              <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Pick up flowers from venue" className="wf-sans" style={{ width: '100%', fontSize: 13, border: '1px solid var(--wf-line)', borderRadius: 10, padding: '10px 14px', outline: 'none', fontFamily: 'var(--wf-sans)', background: 'var(--wf-cream)' }} />
            </div>
            <div>
              <label className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Assign to</label>
              <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} className="wf-sans" style={{ width: '100%', fontSize: 13, border: '1px solid var(--wf-line)', borderRadius: 10, padding: '10px 14px', outline: 'none', fontFamily: 'var(--wf-sans)', background: 'var(--wf-cream)' }}>
                <option value="">Select a person</option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({ROLE_LABELS[m.role]})</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Description (optional)</label>
            <textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} rows={2} placeholder="Any extra details..." className="wf-sans" style={{ width: '100%', fontSize: 13, border: '1px solid var(--wf-line)', borderRadius: 10, padding: '10px 14px', outline: 'none', resize: 'none', fontFamily: 'var(--wf-sans)', background: 'var(--wf-cream)' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowTaskForm(false)} className="wf-btn wf-btn-ghost">Cancel</button>
            <button onClick={handleCreateTask} disabled={isCreatingTask || !taskTitle.trim() || !taskAssignee} className="wf-btn wf-btn-forest">
              {isCreatingTask ? 'Creating...' : 'Create task'}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {members.length === 0 && !showInviteForm && (
        <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 20, padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(28,59,43,0.06)', color: 'var(--wf-forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Icon name="users" size={26} />
          </div>
          <h3 className="wf-serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--wf-forest)', margin: '0 0 8px' }}>Your circle is empty</h3>
          <p className="wf-sans" style={{ fontSize: 14, color: 'var(--wf-ink-60)', margin: '0 0 20px', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
            Invite your maid of honor, best man, or family leads. They will see tasks you assign and conversations relevant to their role.
          </p>
          <button onClick={() => setShowInviteForm(true)} className="wf-btn wf-btn-forest">
            <Icon name="users" size={14} /> Invite your first circle member
          </button>
        </div>
      )}

      {/* Members list */}
      {members.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(196,113,74,0.12)', color: 'var(--wf-terracotta-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="users" size={15} />
            </div>
            <h2 className="wf-serif" style={{ fontSize: 22, color: 'var(--wf-forest)', fontWeight: 600, margin: 0 }}>Circle members</h2>
            <span style={{ flex: 1, height: 1, background: 'var(--wf-line)', marginLeft: 12 }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {members.map((member) => {
              const isActive = member.status === 'active'
              const memberTasks = tasks.filter((t) => t.assigned_to === member.id)
              const pendingCount = memberTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length
              const doneCount = memberTasks.filter((t) => t.status === 'done').length

              return (
                <div key={member.id} style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 16, padding: '18px 20px', position: 'relative', transition: 'border-color 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--wf-line-strong)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--wf-line)'}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: isActive ? 'rgba(28,59,43,0.1)' : 'rgba(28,59,43,0.05)', color: isActive ? 'var(--wf-forest)' : 'var(--wf-ink-45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                      {memberInitials(member.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span className="wf-sans" style={{ fontSize: 14, fontWeight: 600, color: 'var(--wf-forest)' }}>{member.name}</span>
                        <span className="wf-sans" style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: isActive ? 'rgba(28,59,43,0.08)' : 'rgba(196,113,74,0.1)', color: isActive ? 'var(--wf-forest)' : 'var(--wf-terracotta-deep)' }}>
                          {ROLE_SHORT[member.role]}
                        </span>
                      </div>
                      <div className="wf-sans" style={{ fontSize: 12, color: 'var(--wf-ink-45)', marginBottom: 4 }}>{member.email}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#6ea260' : 'var(--wf-terracotta)' }} />
                        <span className="wf-sans" style={{ fontSize: 11, color: 'var(--wf-ink-60)' }}>
                          {isActive ? 'Active' : 'Invite pending'}
                        </span>
                        {memberTasks.length > 0 && (
                          <span className="wf-sans" style={{ fontSize: 11, color: 'var(--wf-ink-45)' }}>
                            · {pendingCount} pending, {doneCount} done
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={isRemoving}
                    style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wf-ink-25)', padding: 4, borderRadius: 6, transition: 'all 0.15s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--wf-rose)'; e.currentTarget.style.background = 'rgba(180,84,78,0.06)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--wf-ink-25)'; e.currentTarget.style.background = 'none' }}
                    title="Remove from circle"
                  >
                    <Icon name="x" size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tasks section */}
      {tasks.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(196,113,74,0.12)', color: 'var(--wf-terracotta-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={15} />
            </div>
            <h2 className="wf-serif" style={{ fontSize: 22, color: 'var(--wf-forest)', fontWeight: 600, margin: 0 }}>Tasks</h2>
            <span className="wf-sans" style={{ fontSize: 12, color: 'var(--wf-ink-45)', marginLeft: 4 }}>
              {pendingTasks.length} pending, {doneTasks.length} done
            </span>
            <span style={{ flex: 1, height: 1, background: 'var(--wf-line)', marginLeft: 12 }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingTasks.map((task) => {
              const assignee = members.find((m) => m.id === task.assigned_to)
              return (
                <div key={task.id} style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: task.status === 'in_progress' ? 'var(--wf-terracotta)' : 'var(--wf-ink-25)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="wf-sans" style={{ fontSize: 13, fontWeight: 500, color: 'var(--wf-forest)' }}>{task.title}</div>
                    {task.description && <div className="wf-sans" style={{ fontSize: 12, color: 'var(--wf-ink-45)', marginTop: 2 }}>{task.description}</div>}
                  </div>
                  {assignee && (
                    <span className="wf-sans" style={{ fontSize: 11, color: 'var(--wf-ink-60)', flexShrink: 0 }}>
                      {assignee.name}
                    </span>
                  )}
                  <span className="wf-sans" style={{ fontSize: 10, color: 'var(--wf-ink-25)', flexShrink: 0 }}>
                    {timeAgoShort(task.created_at)}
                  </span>
                </div>
              )
            })}

            {doneTasks.length > 0 && pendingTasks.length > 0 && (
              <div style={{ height: 1, background: 'var(--wf-line)', margin: '4px 0' }} />
            )}

            {doneTasks.map((task) => {
              const assignee = members.find((m) => m.id === task.assigned_to)
              return (
                <div key={task.id} style={{ background: 'var(--wf-cream)', border: '1px solid var(--wf-line)', borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', opacity: 0.6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6ea260', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="wf-sans" style={{ fontSize: 13, fontWeight: 500, color: 'var(--wf-ink-60)', textDecoration: 'line-through' }}>{task.title}</div>
                  </div>
                  {assignee && (
                    <span className="wf-sans" style={{ fontSize: 11, color: 'var(--wf-ink-45)', flexShrink: 0 }}>
                      {assignee.name}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
