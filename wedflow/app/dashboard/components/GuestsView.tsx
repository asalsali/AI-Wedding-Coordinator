'use client'
import { useState, useEffect, useTransition, useRef, useMemo, useCallback } from 'react'
import { listGuestsAction, createGuestAction, updateGuestAction, deleteGuestAction, importGuestsCSVAction } from '../actions'
import type { CSVImportResult } from '../actions'
import type { Guest, GuestGroup, RsvpStatus } from '@/types'

const GL: Record<GuestGroup, string> = { bride_family: "Bride's Family", groom_family: "Groom's Family", bridal_party: 'Bridal Party', friends: 'Friends', other: 'Other', vendor_photo: 'Photographer', vendor_music: 'DJ / Band', vendor_floral: 'Florist', vendor_catering: 'Caterer', vendor_venue: 'Venue', vendor_other: 'Other Vendor' }
const RL: Record<RsvpStatus, string> = { pending: 'Pending', yes: 'Attending', no: 'Declined', maybe: 'Maybe' }
const RC: Record<RsvpStatus, string> = { yes: '#2D6A4F', no: '#C1292E', maybe: '#E59500', pending: '#8a8580' }
const AG: GuestGroup[] = ['bride_family', 'groom_family', 'bridal_party', 'friends', 'other', 'vendor_photo', 'vendor_music', 'vendor_floral', 'vendor_catering', 'vendor_venue', 'vendor_other']
const AR: RsvpStatus[] = ['pending', 'yes', 'no', 'maybe']
type FG = { name: string; phone: string; email: string; group_tag: GuestGroup; notes: string; rsvp_status: RsvpStatus; rsvp_guest_count: number; dietary_restrictions: string; plus_one: boolean; plus_one_name: string }
const EF: FG = { name: '', phone: '', email: '', group_tag: 'other', notes: '', rsvp_status: 'pending', rsvp_guest_count: 1, dietary_restrictions: '', plus_one: false, plus_one_name: '' }
const I: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--wf-line)', borderRadius: 10, fontSize: 13, fontFamily: 'var(--wf-sans)', background: 'var(--wf-paper)', color: 'var(--wf-forest)', outline: 'none', boxSizing: 'border-box' }
const S: React.CSSProperties = { ...I, appearance: 'none' as const, paddingRight: 32, backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238a8580' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }
const P: React.CSSProperties = { padding: '10px 20px', background: 'var(--wf-forest)', color: 'var(--wf-cream)', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'var(--wf-sans)', cursor: 'pointer', whiteSpace: 'nowrap' }
const B: React.CSSProperties = { padding: '10px 20px', background: 'transparent', color: 'var(--wf-forest)', border: '1px solid var(--wf-line)', borderRadius: 10, fontSize: 13, fontWeight: 500, fontFamily: 'var(--wf-sans)', cursor: 'pointer', whiteSpace: 'nowrap' }
const L: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, fontFamily: 'var(--wf-sans)', color: 'var(--wf-ink-60)', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }

function RB({ s: status }: { s: RsvpStatus }) { return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: 'var(--wf-sans)', color: '#fff', background: RC[status], lineHeight: 1.4 }}>{RL[status]}</span> }
function GB({ g }: { g: GuestGroup }) { return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500, fontFamily: 'var(--wf-sans)', color: 'var(--wf-forest)', background: 'var(--wf-sand)', lineHeight: 1.4 }}>{GL[g]}</span> }

function Ff({ form, set, edit, m }: { form: FG; set: (f: FG) => void; edit: boolean; m: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : '1fr 1fr', gap: 14 }}>
      <div style={{ gridColumn: m ? '1' : '1 / -1' }}><label style={L}>Name *</label><input style={I} value={form.name} onChange={(e) => set({ ...form, name: e.target.value })} placeholder="Full name" /></div>
      <div><label style={L}>Phone</label><input style={I} value={form.phone} onChange={(e) => set({ ...form, phone: e.target.value })} placeholder="+1 (555) 123-4567" /></div>
      <div><label style={L}>Email</label><input style={I} value={form.email} onChange={(e) => set({ ...form, email: e.target.value })} placeholder="guest@example.com" /></div>
      <div><label style={L}>Group</label><select style={S} value={form.group_tag} onChange={(e) => set({ ...form, group_tag: e.target.value as GuestGroup })}>{AG.slice(0, 5).map((g) => <option key={g} value={g}>{GL[g]}</option>)}<option disabled>---</option>{AG.slice(5).map((g) => <option key={g} value={g}>{GL[g]}</option>)}</select></div>
      {edit && (<>
        <div><label style={L}>RSVP Status</label><select style={S} value={form.rsvp_status} onChange={(e) => set({ ...form, rsvp_status: e.target.value as RsvpStatus })}>{AR.map((s) => <option key={s} value={s}>{RL[s]}</option>)}</select></div>
        <div><label style={L}>Guest Count</label><input style={I} type="number" min={0} max={20} value={form.rsvp_guest_count} onChange={(e) => set({ ...form, rsvp_guest_count: Math.max(0, Math.min(20, parseInt(e.target.value) || 0)) })} /></div>
        <div><label style={L}>Dietary Restrictions</label><input style={I} value={form.dietary_restrictions} onChange={(e) => set({ ...form, dietary_restrictions: e.target.value })} placeholder="Vegetarian, nut allergy, etc." /></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ ...L, marginBottom: 0 }}>Plus One</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" onClick={() => set({ ...form, plus_one: !form.plus_one, plus_one_name: !form.plus_one ? form.plus_one_name : '' })} style={{ width: 38, height: 22, borderRadius: 11, border: 'none', background: form.plus_one ? 'var(--wf-forest)' : 'var(--wf-sand)', cursor: 'pointer', position: 'relative', transition: 'background 0.15s', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: form.plus_one ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
            </button>
            {form.plus_one && <input style={{ ...I, flex: 1 }} value={form.plus_one_name} onChange={(e) => set({ ...form, plus_one_name: e.target.value })} placeholder="Plus one name" />}
          </div>
        </div>
      </>)}
      <div style={{ gridColumn: '1 / -1' }}><label style={L}>Notes</label><textarea style={{ ...I, resize: 'vertical', minHeight: 56 }} value={form.notes} onChange={(e) => set({ ...form, notes: e.target.value })} placeholder="Any notes about this guest" /></div>
    </div>
  )
}

function maskPhone(phone: string | null, plan: string | null): string {
  if (!phone) return '\u2014'
  if (plan === 'concierge') return phone
  const last4 = phone.replace(/\D/g, '').slice(-4)
  return `***-***-${last4}`
}

export function GuestsView({ plan = null }: { plan?: string | null }) {
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [gf, setGf] = useState<GuestGroup | 'all'>('all')
  const [rf, setRf] = useState<RsvpStatus | 'all'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [af, setAf] = useState<FG>({ ...EF })
  const [creating, startCreate] = useTransition()
  const [eid, setEid] = useState<string | null>(null)
  const [ef, setEf] = useState<FG>({ ...EF })
  const [saving, startSave] = useTransition()
  const [cdi, setCdi] = useState<string | null>(null)
  const [deleting, startDel] = useTransition()
  const [showCsv, setShowCsv] = useState(false)
  const [csvRes, setCsvRes] = useState<CSVImportResult | null>(null)
  const [importing, startImp] = useTransition()
  const fRef = useRef<HTMLInputElement>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [m, setM] = useState(false)

  useEffect(() => { const q = window.matchMedia('(max-width: 767px)'); setM(q.matches); const h = (e: MediaQueryListEvent) => setM(e.matches); q.addEventListener('change', h); return () => q.removeEventListener('change', h) }, [])
  useEffect(() => { let c = false; setLoading(true); listGuestsAction().then((d) => { if (!c) { setGuests(d); setLoading(false) } }).catch((e) => { if (!c) { setErr(e instanceof Error ? e.message : 'Failed to load guests'); setLoading(false) } }); return () => { c = true } }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t) }, [toast])

  const fl = useMemo(() => {
    let l = guests
    if (gf !== 'all') l = l.filter((g) => g.group_tag === gf)
    if (rf !== 'all') l = l.filter((g) => g.rsvp_status === rf)
    if (search.trim()) { const q = search.trim().toLowerCase(); l = l.filter((g) => g.name.toLowerCase().includes(q) || (g.phone && g.phone.toLowerCase().includes(q)) || (g.email && g.email.toLowerCase().includes(q))) }
    return l
  }, [guests, gf, rf, search])

  const st = useMemo(() => {
    const t = guests.length, y = guests.filter((g) => g.rsvp_status === 'yes').length, n = guests.filter((g) => g.rsvp_status === 'no').length, mb = guests.filter((g) => g.rsvp_status === 'maybe').length, p = guests.filter((g) => g.rsvp_status === 'pending').length
    return { total: t, yes: y, no: n, maybe: mb, pending: p, headcount: guests.filter((g) => g.rsvp_status === 'yes' || g.rsvp_status === 'maybe').reduce((s, g) => s + g.rsvp_guest_count, 0) }
  }, [guests])

  const doCreate = useCallback(() => {
    if (!af.name.trim()) return
    startCreate(async () => { try { const ng = await createGuestAction({ name: af.name.trim(), phone: af.phone.trim() || null, email: af.email.trim() || null, group_tag: af.group_tag, notes: af.notes.trim() || null }); setGuests((p) => [...p, ng].sort((a, b) => a.name.localeCompare(b.name))); setAf({ ...EF }); setShowAdd(false); setToast({ type: 'success', text: `${ng.name} added.` }) } catch (e) { setToast({ type: 'error', text: e instanceof Error ? e.message : 'Failed to add guest.' }) } })
  }, [af])

  const doEdit = useCallback((g: Guest) => { setEid(g.id); setEf({ name: g.name, phone: g.phone || '', email: g.email || '', group_tag: g.group_tag, notes: g.notes || '', rsvp_status: g.rsvp_status, rsvp_guest_count: g.rsvp_guest_count, dietary_restrictions: g.dietary_restrictions || '', plus_one: g.plus_one, plus_one_name: g.plus_one_name || '' }) }, [])

  const doSave = useCallback(() => {
    if (!eid || !ef.name.trim()) return
    startSave(async () => { try { const u = await updateGuestAction({ id: eid, name: ef.name.trim(), phone: ef.phone.trim() || null, email: ef.email.trim() || null, group_tag: ef.group_tag, notes: ef.notes.trim() || null, rsvp_status: ef.rsvp_status, rsvp_guest_count: ef.rsvp_guest_count, dietary_restrictions: ef.dietary_restrictions.trim() || null, plus_one: ef.plus_one, plus_one_name: ef.plus_one ? (ef.plus_one_name.trim() || null) : null }); setGuests((p) => p.map((g) => g.id === u.id ? u : g).sort((a, b) => a.name.localeCompare(b.name))); setEid(null); setToast({ type: 'success', text: `${u.name} updated.` }) } catch (e) { setToast({ type: 'error', text: e instanceof Error ? e.message : 'Failed to update guest.' }) } })
  }, [eid, ef])

  const doDel = useCallback((id: string) => {
    const g = guests.find((x) => x.id === id)
    startDel(async () => { try { await deleteGuestAction(id); setGuests((p) => p.filter((x) => x.id !== id)); setCdi(null); setEid(null); setToast({ type: 'success', text: `${g?.name || 'Guest'} removed.` }) } catch (e) { setToast({ type: 'error', text: e instanceof Error ? e.message : 'Failed to delete guest.' }) } })
  }, [guests])

  const doCsv = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = (ev) => { const t = ev.target?.result as string; if (!t) return; startImp(async () => { try { const res = await importGuestsCSVAction(t); setCsvRes(res); const fresh = await listGuestsAction(); setGuests(fresh); if (res.imported > 0) setToast({ type: 'success', text: `Imported ${res.imported} guest${res.imported !== 1 ? 's' : ''}.` }) } catch (x) { setToast({ type: 'error', text: x instanceof Error ? x.message : 'CSV import failed.' }) } }) }
    r.readAsText(f); e.target.value = ''
  }, [])

  const dc = (gid: string, gn: string) => (
    <div style={{ marginTop: 14, padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 13, color: '#991b1b' }}>Remove {gn}?</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ ...B, padding: '6px 14px', fontSize: 12 }} onClick={() => setCdi(null)}>Keep</button>
        <button style={{ ...P, padding: '6px 14px', fontSize: 12, background: '#C1292E', opacity: deleting ? 0.5 : 1 }} onClick={() => doDel(gid)} disabled={deleting}>{deleting ? 'Removing...' : 'Remove'}</button>
      </div>
    </div>
  )

  return (
    <div style={{ padding: m ? '24px 16px 80px' : '40px 48px 80px', maxWidth: 960, margin: '0 auto' }}>
      <span className="wf-eyebrow">Contacts</span>
      <h1 className="wf-serif" style={{ fontSize: 'clamp(28px, 3.4vw, 42px)', color: 'var(--wf-forest)', fontWeight: 600, margin: '14px 0 28px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Everyone in your <em style={{ fontWeight: 500 }}>wedding.</em></h1>

      {loading && <div style={{ textAlign: 'center', padding: 48, color: 'var(--wf-ink-60)', fontFamily: 'var(--wf-sans)', fontSize: 14 }}>Loading contacts...</div>}
      {err && !loading && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px', color: '#991b1b', fontFamily: 'var(--wf-sans)', fontSize: 13, marginBottom: 20 }}>{err}</div>}

      {!loading && !err && (<>
        {guests.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: m ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)', gap: 10, marginBottom: 24 }}>
            {[{ l: 'Total', v: st.total, c: 'var(--wf-forest)' }, { l: 'Attending', v: st.yes, c: RC.yes }, { l: 'Declined', v: st.no, c: RC.no }, { l: 'Maybe', v: st.maybe, c: RC.maybe }, { l: 'Pending', v: st.pending, c: RC.pending }, { l: 'Headcount', v: st.headcount, c: 'var(--wf-forest)' }].map((s) => (
              <div key={s.l} style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--wf-serif)', color: s.c, lineHeight: 1.2 }}>{s.v}</div>
                <div style={{ fontSize: 10, fontWeight: 600, fontFamily: 'var(--wf-sans)', color: 'var(--wf-ink-60)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>{s.l}</div>
              </div>))}
          </div>)}

        {plan !== 'concierge' && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--wf-sand)', border: '1px solid var(--wf-line)', borderRadius: 10, fontSize: 12, fontFamily: 'var(--wf-sans)', color: 'var(--wf-ink-60)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span>Phone numbers are masked on your current plan.</span>
            <a href="/pricing" style={{ color: 'var(--wf-forest)', fontWeight: 600, whiteSpace: 'nowrap', textDecoration: 'none' }}>Upgrade to Concierge</a>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: m ? 'column' : 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20, alignItems: m ? 'stretch' : 'center' }}>
          <input style={{ ...I, maxWidth: m ? '100%' : 240, flex: m ? '1 1 auto' : undefined, minHeight: m ? 44 : undefined }} placeholder="Search by name, phone, or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div style={{ display: 'flex', gap: 10 }}>
            <select style={{ ...S, flex: 1, maxWidth: m ? '100%' : 180, minHeight: m ? 44 : undefined }} value={gf} onChange={(e) => setGf(e.target.value as GuestGroup | 'all')}><option value="all">All groups</option>{AG.slice(0, 5).map((g) => <option key={g} value={g}>{GL[g]}</option>)}<option disabled>---</option>{AG.slice(5).map((g) => <option key={g} value={g}>{GL[g]}</option>)}</select>
            <select style={{ ...S, flex: 1, maxWidth: m ? '100%' : 160, minHeight: m ? 44 : undefined }} value={rf} onChange={(e) => setRf(e.target.value as RsvpStatus | 'all')}><option value="all">All RSVP</option>{AR.map((s) => <option key={s} value={s}>{RL[s]}</option>)}</select>
          </div>
          {!m && <div style={{ flex: 1 }} />}
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ ...B, flex: m ? 1 : undefined, minHeight: m ? 44 : undefined }} onClick={() => { setShowCsv(true); setCsvRes(null) }}>Import CSV</button>
            <button style={{ ...P, flex: m ? 1 : undefined, minHeight: m ? 44 : undefined }} onClick={() => { setShowAdd(true); setAf({ ...EF }) }}>Add contact</button>
          </div>
        </div>

        {showCsv && (
          <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 14, padding: m ? '20px 16px' : '24px 28px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 className="wf-serif" style={{ fontSize: 16, fontWeight: 600, color: 'var(--wf-forest)', margin: 0 }}>Import from CSV</h3>
              <button onClick={() => setShowCsv(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--wf-ink-60)', lineHeight: 1 }}>x</button>
            </div>
            <p className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)', margin: '0 0 14px' }}>Upload a CSV with columns: Name (required), Phone, Email, Group.</p>
            <input ref={fRef} type="file" accept=".csv,text/csv" onChange={doCsv} style={{ display: 'none' }} />
            <button style={P} onClick={() => fRef.current?.click()} disabled={importing}>{importing ? 'Importing...' : 'Choose CSV file'}</button>
            {csvRes && <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10, background: csvRes.failed > 0 ? '#fef3cd' : '#d4edda', fontSize: 13, fontFamily: 'var(--wf-sans)' }}><strong>Imported {csvRes.imported} guest{csvRes.imported !== 1 ? 's' : ''}.</strong>{csvRes.failed > 0 && <> {csvRes.failed} failed.<ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 12, color: '#856404' }}>{csvRes.errors.map((e, i) => <li key={i}>{e}</li>)}</ul></>}</div>}
          </div>)}

        {showAdd && (
          <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 14, padding: m ? '20px 16px' : '24px 28px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 className="wf-serif" style={{ fontSize: 16, fontWeight: 600, color: 'var(--wf-forest)', margin: 0 }}>Add a contact</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--wf-ink-60)', lineHeight: 1 }}>x</button>
            </div>
            <Ff form={af} set={setAf} edit={false} m={m} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button style={B} onClick={() => setShowAdd(false)}>Cancel</button>
              <button style={{ ...P, opacity: creating || !af.name.trim() ? 0.5 : 1 }} onClick={doCreate} disabled={creating || !af.name.trim()}>{creating ? 'Adding...' : 'Add contact'}</button>
            </div>
          </div>)}

        {guests.length === 0 && (
          <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 20, padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ marginBottom: 16, opacity: 0.3 }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--wf-forest)' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg></div>
            <h3 className="wf-serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--wf-forest)', margin: '0 0 8px' }}>No contacts added yet</h3>
            <p className="wf-sans" style={{ fontSize: 14, color: 'var(--wf-ink-60)', margin: '0 0 20px' }}>Add your first guest or vendor, or import a CSV to get started.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}><button style={B} onClick={() => { setShowCsv(true); setCsvRes(null) }}>Import CSV</button><button style={P} onClick={() => { setShowAdd(true); setAf({ ...EF }) }}>Add contact</button></div>
          </div>)}

        {guests.length > 0 && fl.length === 0 && <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 14, padding: '32px 24px', textAlign: 'center', fontFamily: 'var(--wf-sans)', fontSize: 14, color: 'var(--wf-ink-60)' }}>No contacts match your current filters.</div>}

        {fl.length > 0 && !m && (
          <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--wf-sans)', fontSize: 13 }}>
              <thead><tr style={{ borderBottom: '1px solid var(--wf-line)' }}>{['Name', 'Phone', 'Email', 'RSVP', 'Group', 'Plus One', ''].map((c) => <th key={c} style={{ textAlign: 'left', padding: '12px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--wf-ink-60)' }}>{c}</th>)}</tr></thead>
              <tbody>{fl.map((g) => {
                if (eid === g.id) return (
                  <tr key={g.id} style={{ borderBottom: '1px solid var(--wf-line)', background: 'rgba(28,59,43,0.03)' }}><td colSpan={7} style={{ padding: '20px 18px' }}>
                    <h4 className="wf-serif" style={{ fontSize: 15, fontWeight: 600, color: 'var(--wf-forest)', margin: '0 0 16px' }}>Editing {g.name}</h4>
                    <Ff form={ef} set={setEf} edit={true} m={m} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
                      <button style={{ ...B, color: '#C1292E', borderColor: '#C1292E' }} onClick={() => setCdi(g.id)}>Remove guest</button>
                      <div style={{ display: 'flex', gap: 10 }}><button style={B} onClick={() => setEid(null)}>Cancel</button><button style={{ ...P, opacity: saving || !ef.name.trim() ? 0.5 : 1 }} onClick={doSave} disabled={saving || !ef.name.trim()}>{saving ? 'Saving...' : 'Save changes'}</button></div>
                    </div>
                    {cdi === g.id && dc(g.id, g.name)}
                  </td></tr>)
                return (
                  <tr key={g.id} onClick={() => doEdit(g)} style={{ borderBottom: '1px solid var(--wf-line)', cursor: 'pointer', transition: 'background 0.1s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(28,59,43,0.02)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--wf-forest)' }}>{g.name}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--wf-ink-60)' }}>{maskPhone(g.phone, plan)}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--wf-ink-60)' }}>{g.email || '\u2014'}</td>
                    <td style={{ padding: '12px 14px' }}><RB s={g.rsvp_status} /></td>
                    <td style={{ padding: '12px 14px' }}><GB g={g.group_tag} /></td>
                    <td style={{ padding: '12px 14px', color: 'var(--wf-ink-60)' }}>{g.plus_one ? (g.plus_one_name || 'Yes') : '\u2014'}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--wf-ink-60)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><path d="M9 18l6-6-6-6" /></svg></td>
                  </tr>)
              })}</tbody>
            </table>
          </div>)}

        {fl.length > 0 && m && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fl.map((g) => {
              if (eid === g.id) return (
                <div key={g.id} style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 14, padding: '20px 16px' }}>
                  <h4 className="wf-serif" style={{ fontSize: 15, fontWeight: 600, color: 'var(--wf-forest)', margin: '0 0 16px' }}>Editing {g.name}</h4>
                  <Ff form={ef} set={setEf} edit={true} m={m} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
                    <div style={{ display: 'flex', gap: 10 }}><button style={{ ...B, flex: 1 }} onClick={() => setEid(null)}>Cancel</button><button style={{ ...P, flex: 1, opacity: saving || !ef.name.trim() ? 0.5 : 1 }} onClick={doSave} disabled={saving || !ef.name.trim()}>{saving ? 'Saving...' : 'Save'}</button></div>
                    <button style={{ ...B, color: '#C1292E', borderColor: '#C1292E', width: '100%' }} onClick={() => setCdi(g.id)}>Remove guest</button>
                  </div>
                  {cdi === g.id && dc(g.id, g.name)}
                </div>)
              return (
                <div key={g.id} onClick={() => doEdit(g)} style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 14, padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--wf-forest)', fontFamily: 'var(--wf-sans)' }}>{g.name}</div>
                      {g.phone && <div style={{ fontSize: 12, color: 'var(--wf-ink-60)', fontFamily: 'var(--wf-sans)', marginTop: 2 }}>{maskPhone(g.phone, plan)}</div>}
                      {g.email && <div style={{ fontSize: 12, color: 'var(--wf-ink-60)', fontFamily: 'var(--wf-sans)', marginTop: 1 }}>{g.email}</div>}
                    </div>
                    <RB s={g.rsvp_status} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <GB g={g.group_tag} />
                    {g.plus_one && <span style={{ fontSize: 11, fontFamily: 'var(--wf-sans)', color: 'var(--wf-ink-60)', padding: '3px 8px', background: 'var(--wf-sand)', borderRadius: 999 }}>+1{g.plus_one_name ? ` ${g.plus_one_name}` : ''}</span>}
                  </div>
                </div>)
            })}
          </div>)}

        {guests.length > 0 && <div style={{ marginTop: 16, fontSize: 12, fontFamily: 'var(--wf-sans)', color: 'var(--wf-ink-60)', textAlign: 'center' }}>Showing {fl.length} of {guests.length} contact{guests.length !== 1 ? 's' : ''}</div>}
      </>)}

      {toast && <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '12px 16px', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 500, color: 'var(--wf-cream)', background: toast.type === 'success' ? '#4a6141' : '#C1292E', zIndex: 50, fontFamily: 'var(--wf-sans)' }}>{toast.text}</div>}
    </div>
  )
}
