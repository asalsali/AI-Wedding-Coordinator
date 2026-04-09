'use client'

import { useState, useTransition, useCallback } from 'react'
import { addGuest, updateGuest, deleteGuest, bulkImportGuests } from './actions'
import type { Guest, GuestGroup, RsvpStatus } from '@/types'

const COLORS = {
  forest: '#1C3B2B',
  cream: '#FDFBF7',
  terracotta: '#C4714A',
  text: '#1A1A1A',
}

const GROUP_LABELS: Record<GuestGroup, string> = {
  bride_family: "Bride's Family",
  groom_family: "Groom's Family",
  bridal_party: 'Bridal Party',
  friends: 'Friends',
  other: 'Other',
}

const RSVP_LABELS: Record<RsvpStatus, string> = {
  pending: 'Pending',
  yes: 'Yes',
  no: 'No',
  maybe: 'Maybe',
}

interface Props {
  coupleName: string
  initialGuests: Guest[]
}

export default function GuestListClient({ coupleName, initialGuests }: Props) {
  const [guests, setGuests] = useState<Guest[]>(initialGuests)
  const [filterGroup, setFilterGroup] = useState<GuestGroup | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [csvText, setCsvText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const filteredGuests = guests.filter((g) => {
    const matchesGroup = filterGroup === 'all' || g.group_tag === filterGroup
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (g.phone?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    return matchesGroup && matchesSearch
  })

  const stats = {
    total: guests.length,
    yes: guests.filter(g => g.rsvp_status === 'yes').length,
    no: guests.filter(g => g.rsvp_status === 'no').length,
    pending: guests.filter(g => g.rsvp_status === 'pending').length,
    maybe: guests.filter(g => g.rsvp_status === 'maybe').length,
  }

  const handleAddGuest = useCallback((formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = await addGuest(formData)
      if (result.error) {
        setError(result.error)
      } else if (result.guest) {
        setGuests(prev => [...prev, result.guest!])
        setShowAddForm(false)
      }
    })
  }, [])

  const handleUpdateGuest = useCallback((id: string, updates: Partial<Guest>) => {
    setError(null)
    startTransition(async () => {
      const result = await updateGuest(id, updates)
      if (result.error) {
        setError(result.error)
      } else if (result.guest) {
        setGuests(prev => prev.map(g => g.id === id ? result.guest! : g))
        setEditingId(null)
      }
    })
  }, [])

  const handleDeleteGuest = useCallback((id: string) => {
    if (!confirm('Are you sure you want to delete this guest?')) return
    setError(null)
    startTransition(async () => {
      const result = await deleteGuest(id)
      if (result.error) {
        setError(result.error)
      } else {
        setGuests(prev => prev.filter(g => g.id !== id))
      }
    })
  }, [])

  const handleImportCsv = useCallback(() => {
    setError(null)
    if (!csvText.trim()) {
      setError('Please paste CSV data')
      return
    }
    startTransition(async () => {
      const result = await bulkImportGuests(csvText)
      if (result.error) {
        setError(result.error)
      } else if (result.guests) {
        setGuests(prev => [...prev, ...result.guests!])
        setCsvText('')
        setShowImport(false)
      }
    })
  }, [csvText])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.cream }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: COLORS.forest, 
        color: COLORS.cream,
        padding: '24px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>{coupleName}</h1>
          <p style={{ opacity: 0.8, margin: '4px 0 0 0' }}>Guest List</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowImport(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              border: `1px solid ${COLORS.cream}`,
              color: COLORS.cream,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Import CSV
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: COLORS.terracotta,
              border: 'none',
              color: 'white',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            + Add Guest
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div style={{ 
        padding: '20px 32px',
        display: 'flex',
        gap: '32px',
        borderBottom: '1px solid #E5E5E5'
      }}>
        <StatBox label="Total" value={stats.total} />
        <StatBox label="Yes" value={stats.yes} color={COLORS.forest} />
        <StatBox label="No" value={stats.no} />
        <StatBox label="Pending" value={stats.pending} />
        <StatBox label="Maybe" value={stats.maybe} />
      </div>

      {/* Filters */}
      <div style={{ padding: '20px 32px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <select
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value as GuestGroup | 'all')}
          style={{
            padding: '10px 16px',
            borderRadius: '6px',
            border: '1px solid #D1D5DB',
            fontSize: '14px',
            backgroundColor: 'white',
          }}
        >
          <option value="all">All Groups</option>
          <option value="bride_family">Bride&apos;s Family</option>
          <option value="groom_family">Groom&apos;s Family</option>
          <option value="bridal_party">Bridal Party</option>
          <option value="friends">Friends</option>
          <option value="other">Other</option>
        </select>
        <input
          type="text"
          placeholder="Search guests..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '6px',
            border: '1px solid #D1D5DB',
            fontSize: '14px',
            flex: 1,
            maxWidth: '400px',
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '0 32px', marginBottom: '16px' }}>
          <div style={{ 
            padding: '12px 16px', 
            backgroundColor: '#FEE2E2', 
            color: '#DC2626',
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        </div>
      )}

      {/* Guest Table */}
      <div style={{ padding: '0 32px 32px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E5E5E5', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Name</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Contact</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Group</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>RSVP</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Guests</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Dietary</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredGuests.map((guest) => (
              <tr key={guest.id} style={{ borderBottom: '1px solid #E5E5E5' }}>
                <td style={{ padding: '12px 16px' }}>
                  {editingId === guest.id ? (
                    <input
                      type="text"
                      defaultValue={guest.name}
                      onBlur={(e) => handleUpdateGuest(guest.id, { name: e.target.value })}
                      autoFocus
                      style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                    />
                  ) : (
                    <span style={{ fontWeight: 500 }}>{guest.name}</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6B7280' }}>
                  {guest.email && <div>{guest.email}</div>}
                  {guest.phone && <div>{guest.phone}</div>}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <select
                    value={guest.group_tag}
                    onChange={(e) => handleUpdateGuest(guest.id, { group_tag: e.target.value as GuestGroup })}
                    style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                  >
                    {Object.entries(GROUP_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <select
                    value={guest.rsvp_status}
                    onChange={(e) => handleUpdateGuest(guest.id, { rsvp_status: e.target.value as RsvpStatus })}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '4px',
                      border: '1px solid #D1D5DB',
                      fontSize: '13px',
                      backgroundColor: guest.rsvp_status === 'yes' ? '#D1FAE5' : 
                                      guest.rsvp_status === 'no' ? '#FEE2E2' : 
                                      guest.rsvp_status === 'maybe' ? '#FEF3C7' : 'white',
                    }}
                  >
                    {Object.entries(RSVP_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={guest.rsvp_guest_count}
                    onChange={(e) => handleUpdateGuest(guest.id, { rsvp_guest_count: parseInt(e.target.value) || 0 })}
                    style={{ width: '50px', padding: '6px', borderRadius: '4px', border: '1px solid #D1D5DB', textAlign: 'center' }}
                  />
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6B7280', maxWidth: '200px' }}>
                  {guest.dietary_restrictions || '-'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setEditingId(editingId === guest.id ? null : guest.id)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '13px',
                        backgroundColor: 'transparent',
                        border: '1px solid #D1D5DB',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteGuest(guest.id)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '13px',
                        backgroundColor: '#FEE2E2',
                        border: '1px solid #EF4444',
                        color: '#DC2626',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredGuests.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
                  No guests found. Add your first guest above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Guest Modal */}
      {showAddForm && (
        <Modal onClose={() => setShowAddForm(false)} title="Add Guest">
          <form action={handleAddGuest}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="text" name="name" placeholder="Guest name *" required style={inputStyle} />
              <input type="email" name="email" placeholder="Email" style={inputStyle} />
              <input type="tel" name="phone" placeholder="Phone (e.g., +1234567890)" style={inputStyle} />
              <select name="group_tag" defaultValue="other" style={inputStyle}>
                {Object.entries(GROUP_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <textarea name="dietary_restrictions" placeholder="Dietary restrictions" rows={3} style={inputStyle} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <input type="checkbox" name="plus_one" />
                Has plus one
              </label>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{ padding: '10px 20px', border: '1px solid #D1D5DB', borderRadius: '6px', background: 'white', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: COLORS.forest,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.7 : 1,
                  }}
                >
                  {isPending ? 'Saving...' : 'Add Guest'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Import CSV Modal */}
      {showImport && (
        <Modal onClose={() => setShowImport(false)} title="Import Guests from CSV">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
              Paste CSV data with headers: name, email, phone, group_tag, dietary_restrictions
            </p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="name,email,phone,group_tag,dietary_restrictions&#10;John Doe,john@example.com,+1234567890,friends,Vegetarian&#10;Jane Smith,jane@example.com,+1234567891,bride_family,None"
              rows={10}
              style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '13px' }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowImport(false)}
                style={{ padding: '10px 20px', border: '1px solid #D1D5DB', borderRadius: '6px', background: 'white', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleImportCsv}
                disabled={isPending}
                style={{
                  padding: '10px 20px',
                  backgroundColor: COLORS.forest,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  opacity: isPending ? 0.7 : 1,
                }}
              >
                {isPending ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: color || COLORS.text }}>{value}</div>
      <div style={{ fontSize: '14px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  )
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6B7280' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const inputStyle = {
  padding: '12px 16px',
  borderRadius: '6px',
  border: '1px solid #D1D5DB',
  fontSize: '14px',
  width: '100%',
  boxSizing: 'border-box' as const,
}
