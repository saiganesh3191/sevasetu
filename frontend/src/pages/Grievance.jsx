import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api, DISTRICTS, CATEGORIES, PRIORITIES, STATUSES, SOURCES, CATEGORY_META, getConstituencyMap } from '../api/client.js'
import { PageHeader, Field, ErrorBox, Badge, Modal, Loading, StatCard, fmtDate } from '../components/ui.jsx'

const PAGE_SIZE = 12

const empty = {
  voter_id: '', citizen_name: '', phone: '', district: DISTRICTS[0], constituency: '', mandal: '', village: '',
  category: '', subject: '', description: '', priority: 'Medium', source: 'Walk-in',
}

const PRIORITY_HELP = {
  Low: 'General request, no hurry',
  Medium: 'Normal – within a week',
  High: 'Affecting many people',
  Urgent: 'Health / safety risk',
}

export default function Grievance() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ search: '', district: '', category: '', status: '' })
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null) // 'add' | 'voter' | {receipt}
  const [prefill, setPrefill] = useState(null)
  const [toast, setToast] = useState(null)

  const load = useCallback(() => {
    api.complaints(filters).then((r) => { setRows(r); setPage(1) }).catch((e) => setError(e.message))
  }, [filters])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  const setF = (k) => (e) => setFilters({ ...filters, [k]: e.target.value })

  const onSaved = (c) => {
    setModal({ receipt: c })
    setToast(`${c.ticket_no} registered successfully`)
    setTimeout(() => setToast(null), 4000)
    load()
  }

  const today = new Date().toISOString().slice(0, 10)
  const all = rows || []
  const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE))
  const shown = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <PageHeader title="Grievances" subtitle="Citizen firyadulu – register chesina anni records ikkada">
        <button className="btn voter-btn" onClick={() => setModal('voter')}>🪪 Add by Voter Card</button>
        <button className="btn primary" onClick={() => { setPrefill(null); setModal('add') }}>+ Add Grievance</button>
      </PageHeader>
      <ErrorBox message={error} />

      <div className="stats-grid small-stats">
        <StatCard label="Total Records" value={all.length} />
        <StatCard label="Registered Today" value={all.filter((r) => r.created_at.slice(0, 10) === today).length} tone="teal" />
        <StatCard label="Pending" value={all.filter((r) => ['Open', 'In Progress', 'On Hold'].includes(r.status)).length} tone="amber" />
        <StatCard label="Completed" value={all.filter((r) => r.status === 'Completed').length} tone="green" />
      </div>

      <div className="card filters">
        <input className="grow" placeholder="🔎 Search ticket / name / mobile / voter ID / subject…" value={filters.search} onChange={setF('search')} />
        <select value={filters.district} onChange={setF('district')}><option value="">All Districts</option>{DISTRICTS.map((s) => <option key={s}>{s}</option>)}</select>
        <select value={filters.category} onChange={setF('category')}><option value="">All Categories</option>{CATEGORIES.map((s) => <option key={s}>{s}</option>)}</select>
        <select value={filters.status} onChange={setF('status')}><option value="">All Status</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
      </div>

      <div className="card no-pad">
        {!rows ? <Loading /> : all.length === 0 ? (
          <div className="empty">
            No grievances found.<br />
            <button className="btn primary" style={{ marginTop: 12 }} onClick={() => setModal('add')}>+ Add Grievance</button>
          </div>
        ) : (
          <table className="table grv-table">
            <thead>
              <tr>
                <th>S.No</th><th>Ticket</th><th>Citizen</th><th>Location</th><th>Category</th><th>Subject</th>
                <th>Priority</th><th>Status</th><th>Registered</th><th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={r.id}>
                  <td data-label="#" className="muted">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td data-label="Ticket" className="mono strong">{r.ticket_no}</td>
                  <td data-label="Citizen">
                    <div className="strong">{r.citizen_name}</div>
                    <div className="muted small">+91 {r.phone}{r.voter_id ? ` · ${r.voter_id}` : ''}</div>
                  </td>
                  <td data-label="Location" className="small">
                    <div>{r.district}</div>
                    {r.constituency && <div className="muted">🏛️ {r.constituency}</div>}
                    <div className="muted">{r.village}</div>
                  </td>
                  <td data-label="Category" className="small nowrap">{CATEGORY_META[r.category]?.icon} {r.category}</td>
                  <td data-label="Subject">{r.subject}</td>
                  <td data-label="Priority"><Badge>{r.priority}</Badge></td>
                  <td data-label="Status"><Badge>{r.status}</Badge></td>
                  <td data-label="Registered" className="small nowrap">{fmtDate(r.created_at)}<div className="muted">via {r.source || '–'}</div></td>
                  <td data-label=""><button className="grv-view" onClick={() => setModal({ receipt: r })}>VIEW</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {rows && all.length > PAGE_SIZE && (
        <div className="row between">
          <span className="muted small">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, all.length)} of {all.length}</span>
          <div className="row gap-sm">
            <button className="btn sm" disabled={page === 1} onClick={() => setPage(page - 1)}>← Prev</button>
            <span className="small">Page {page} / {pages}</span>
            <button className="btn sm" disabled={page === pages} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        </div>
      )}

      {modal === 'add' && <GrievanceForm initial={prefill} onClose={() => setModal(null)} onSaved={onSaved} onVoter={() => setModal('voter')} />}
      {modal === 'voter' && (
        <VoterCardModal
          onClose={() => setModal(null)}
          onContinue={(voterId) => { setPrefill({ voter_id: voterId }); setModal('add') }}
        />
      )}
      {modal?.receipt && <ReceiptModal c={modal.receipt} onClose={() => setModal(null)} onNew={() => { setPrefill(null); setModal('add') }} />}

      {toast && <div className="toast">✅ {toast}</div>}
    </>
  )
}

/* ------------ Add Grievance form (modal) ------------ */
function GrievanceForm({ initial, onClose, onSaved, onVoter }) {
  const [form, setForm] = useState({ ...empty, ...(initial || {}) })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [constMap, setConstMap] = useState({})
  useEffect(() => { getConstituencyMap().then(setConstMap).catch(() => {}) }, [])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const pick = (k, v) => setForm({ ...form, [k]: v })
  const meta = CATEGORY_META[form.category]
  const constOptions = constMap[form.district] || []

  const validate = () => {
    const e = {}
    if (form.citizen_name.trim().length < 2) e.citizen_name = 'Citizen name enter cheyandi'
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Valid 10 digit mobile number kavali'
    if (!form.category) e.category = 'Category select cheyandi'
    if (form.subject.trim().length < 3) e.subject = 'Subject enter cheyandi'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setError('')
    try {
      onSaved(await api.createComplaint(form))
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal title="Add Grievance" onClose={onClose} wide>
      <ErrorBox message={error} />
      <form onSubmit={submit} noValidate className="grv-form">
        <section>
          <div className="row between">
            <h3><span className="sec-num">1</span> Citizen Details</h3>
            <button type="button" className="btn sm voter-btn" onClick={onVoter}>🪪 Add by Voter Card</button>
          </div>
          <div className="form-grid four">
            <Field label="Voter ID (EPIC No.)">
              <input value={form.voter_id} onChange={(e) => pick('voter_id', e.target.value.toUpperCase())} placeholder="ABC1234567" maxLength={12} />
            </Field>
            <Field label="Citizen Name *" error={errors.citizen_name}>
              <input value={form.citizen_name} onChange={set('citizen_name')} placeholder="Full name" className={errors.citizen_name ? 'invalid' : ''} />
            </Field>
            <Field label="Mobile Number *" error={errors.phone}>
              <div className="input-prefix">
                <span>+91</span>
                <input value={form.phone} onChange={(e) => pick('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98xxxxxxxx" inputMode="numeric" className={errors.phone ? 'invalid' : ''} />
              </div>
            </Field>
            <Field label="Received Through">
              <select value={form.source} onChange={set('source')}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select>
            </Field>
          </div>
        </section>

        <section>
          <h3><span className="sec-num">2</span> Location</h3>
          <div className="form-grid four">
            <Field label="District *">
              <select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value, constituency: '' })}>
                {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Constituency">
              <select value={form.constituency} onChange={set('constituency')}>
                <option value="">— Select —</option>
                {constOptions.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Mandal"><input value={form.mandal} onChange={set('mandal')} placeholder="Mandal name" /></Field>
            <Field label="Village / Colony"><input value={form.village} onChange={set('village')} placeholder="Village, colony or street" /></Field>
          </div>
        </section>

        <section>
          <h3><span className="sec-num">3</span> Complaint Details</h3>
          <div className="field-label">Category * {errors.category && <small className="error-text">– {errors.category}</small>}</div>
          <div className="cat-pick">
            {CATEGORIES.map((c) => {
              const m = CATEGORY_META[c]
              return (
                <button type="button" key={c} className={'cat-opt' + (form.category === c ? ' selected' : '')}
                  style={{ '--c': m.color }} onClick={() => pick('category', c)}>
                  <span className="cat-opt-icon">{m.icon}</span><span>{c}</span>
                </button>
              )
            })}
          </div>

          <Field label="Subject *" error={errors.subject}>
            <input value={form.subject} onChange={set('subject')} placeholder="Short title of the problem" className={errors.subject ? 'invalid' : ''} />
          </Field>
          {meta && (
            <div className="chips">
              <span className="muted small">Quick pick:</span>
              {meta.suggestions.map((s) => (
                <button type="button" key={s} className={'chip' + (form.subject === s ? ' on' : '')} onClick={() => pick('subject', s)}>{s}</button>
              ))}
            </div>
          )}

          <Field label="Description">
            <textarea rows={3} value={form.description} onChange={set('description')} maxLength={1000}
              placeholder="Full details – landmark, eppati nunchi problem undi, enni families affected…" />
          </Field>

          <div className="field-label">Priority</div>
          <div className="prio-pick">
            {PRIORITIES.map((p) => (
              <button type="button" key={p} className={`prio-opt prio-${p.toLowerCase()}` + (form.priority === p ? ' selected' : '')} onClick={() => pick('priority', p)}>
                <b>{p}</b><small>{PRIORITY_HELP[p]}</small>
              </button>
            ))}
          </div>
        </section>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary lg" disabled={saving}>{saving ? 'Saving…' : 'Save Grievance'}</button>
        </div>
      </form>
    </Modal>
  )
}

/* ------------ Voter card (placeholder – auto-fill later) ------------ */
function VoterCardModal({ onClose, onContinue }) {
  const [voterId, setVoterId] = useState('')
  const [msg, setMsg] = useState('')
  const valid = /^[A-Z]{3}\d{7}$/.test(voterId)

  return (
    <Modal title="🪪 Add by Voter Card" onClose={onClose}>
      <p className="muted" style={{ margin: 0 }}>
        Voter ID (EPIC number) enter cheyandi – citizen name, address, district details automatic ga fill avthay.
      </p>
      <Field label="Voter ID / EPIC Number">
        <input autoFocus value={voterId} maxLength={10} placeholder="e.g. ABC1234567"
          onChange={(e) => { setVoterId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setMsg('') }}
          className="voter-input" />
        <small className="muted">Format: 3 letters + 7 numbers</small>
      </Field>
      {msg && <div className="alert info">{msg}</div>}
      <div className="row between">
        <span className="coming-soon">⏳ Auto-fill – coming soon</span>
        <div className="row gap">
          <button className="btn" disabled={!valid} onClick={() => setMsg('Voter details fetch feature inka implement cheyaledu. "Continue" click chesi details manual ga enter cheyandi – Voter ID form lo save avthundi.')}>
            Fetch Details
          </button>
          <button className="btn primary" disabled={!valid} onClick={() => onContinue(voterId)}>Continue →</button>
        </div>
      </div>
    </Modal>
  )
}

/* ------------ Receipt / view ------------ */
function ReceiptModal({ c, onClose, onNew }) {
  const meta = CATEGORY_META[c.category] || {}
  return (
    <Modal title="Grievance Receipt" onClose={onClose}>
      <div className="receipt-inner">
        <div className="ticket-no">{c.ticket_no}</div>
        <dl className="dl receipt-dl">
          <dt>Citizen</dt><dd>{c.citizen_name} · +91 {c.phone}</dd>
          {c.voter_id && (<><dt>Voter ID</dt><dd className="mono">{c.voter_id}</dd></>)}
          <dt>Location</dt><dd>{[c.village, c.mandal, c.district].filter(Boolean).join(', ')}</dd>
          {c.constituency && (<><dt>Constituency</dt><dd>{c.constituency}</dd></>)}
          <dt>Category</dt><dd>{meta.icon} {c.category}</dd>
          <dt>Subject</dt><dd>{c.subject}</dd>
          {c.description && (<><dt>Description</dt><dd>{c.description}</dd></>)}
          <dt>Priority</dt><dd><Badge>{c.priority}</Badge></dd>
          <dt>Status</dt><dd><Badge>{c.status}</Badge></dd>
          <dt>Received via</dt><dd>{c.source || '–'}</dd>
          <dt>Registered on</dt><dd>{fmtDate(c.created_at)}</dd>
        </dl>
        <div className="row gap center no-print">
          <button className="btn" onClick={() => window.print()}>🖨 Print</button>
          <Link to={`/complaints?search=${c.ticket_no}`} className="btn">Open in Complaints</Link>
          <button className="btn primary" onClick={onNew}>+ Add Another</button>
        </div>
      </div>
    </Modal>
  )
}
