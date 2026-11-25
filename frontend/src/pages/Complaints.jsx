import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, DISTRICTS, CATEGORIES, PRIORITIES, STATUSES } from '../api/client.js'
import { PageHeader, Badge, Modal, Field, Loading, ErrorBox, fmtDate } from '../components/ui.jsx'

export default function Complaints() {
  const [params] = useSearchParams()
  const [filters, setFilters] = useState({ search: params.get('search') || '', status: params.get('status') || '', category: params.get('category') || '', priority: '', district: params.get('district') || '', constituency: params.get('constituency') || '' })
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  const load = useCallback(() => {
    api.complaints(filters).then(setRows).catch((e) => setError(e.message))
  }, [filters])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  const setF = (k) => (e) => setFilters({ ...filters, [k]: e.target.value })

  return (
    <>
      <PageHeader title="Complaints" subtitle="All grievances – filter, assign volunteers and update status" />
      <ErrorBox message={error} />
      {filters.constituency && (
        <div className="filter-chip">
          🏛️ Constituency: <b>{filters.constituency}</b>
          <button onClick={() => setFilters({ ...filters, constituency: '' })} aria-label="Clear">✕</button>
        </div>
      )}

      <div className="card filters">
        <input className="grow" placeholder="Search ticket / name / phone / subject…" value={filters.search} onChange={setF('search')} />
        <select value={filters.status} onChange={setF('status')}><option value="">All Status</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        <select value={filters.category} onChange={setF('category')}><option value="">All Categories</option>{CATEGORIES.map((s) => <option key={s}>{s}</option>)}</select>
        <select value={filters.priority} onChange={setF('priority')}><option value="">All Priority</option>{PRIORITIES.map((s) => <option key={s}>{s}</option>)}</select>
        <select value={filters.district} onChange={setF('district')}><option value="">All Districts</option>{DISTRICTS.map((s) => <option key={s}>{s}</option>)}</select>
      </div>

      <div className="card no-pad">
        {!rows ? <Loading /> : rows.length === 0 ? <div className="empty">No complaints found</div> : (
          <table className="table">
            <thead>
              <tr><th>Ticket</th><th>Citizen</th><th>Subject</th><th>Category</th><th>District</th><th>Priority</th><th>Status</th><th>Volunteer</th><th>Date</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="clickable" onClick={() => setSelected(r.id)}>
                  <td data-label="Ticket" className="mono">{r.ticket_no}</td>
                  <td data-label="Citizen"><div className="strong">{r.citizen_name}</div><div className="muted small">{r.phone}</div></td>
                  <td data-label="Subject">{r.subject}</td>
                  <td data-label="Category">{r.category}</td>
                  <td data-label="District" className="small">{r.district}</td>
                  <td data-label="Priority"><Badge>{r.priority}</Badge></td>
                  <td data-label="Status"><Badge>{r.status}</Badge></td>
                  <td data-label="Volunteer">{r.volunteer_name || <span className="muted">Unassigned</span>}</td>
                  <td data-label="Date" className="small nowrap">{fmtDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {rows && <div className="muted small">{rows.length} complaints</div>}

      {selected && <ComplaintDetail id={selected} onClose={() => setSelected(null)} onChanged={load} />}
    </>
  )
}

function ComplaintDetail({ id, onClose, onChanged }) {
  const [c, setC] = useState(null)
  const [vols, setVols] = useState([])
  const [edit, setEdit] = useState({ status: '', priority: '', volunteer_id: '', note: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.complaint(id).then((d) => {
      setC(d)
      setEdit({ status: d.status, priority: d.priority, volunteer_id: d.volunteer_id ?? '', note: '' })
    }).catch((e) => setError(e.message))
    api.volunteers({ status: 'Active' }).then(setVols).catch(() => {})
  }, [id])

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = { status: edit.status, priority: edit.priority, note: edit.note || null,
        volunteer_id: edit.volunteer_id === '' ? 0 : Number(edit.volunteer_id) }
      const d = await api.updateComplaint(id, payload)
      setC(d)
      setEdit((e) => ({ ...e, note: '' }))
      onChanged()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Delete ${c.ticket_no}? Idi undo cheyalem.`)) return
    await api.deleteComplaint(id)
    onChanged()
    onClose()
  }

  return (
    <Modal title={c ? `${c.ticket_no} – ${c.subject}` : 'Loading…'} onClose={onClose} wide>
      <ErrorBox message={error} />
      {!c ? <Loading /> : (
        <div className="detail-grid">
          <div>
            <dl className="dl">
              <dt>Citizen</dt><dd>{c.citizen_name} ({c.phone})</dd>
              <dt>Location</dt><dd>{[c.village, c.mandal, c.district].filter(Boolean).join(", ")}</dd>
              <dt>Constituency</dt><dd>{c.constituency || "–"}</dd>
              <dt>Received via</dt><dd>{c.source || "–"}</dd>
              <dt>Category</dt><dd>{c.category}</dd>
              <dt>Registered</dt><dd>{fmtDate(c.created_at)}</dd>
              <dt>Description</dt><dd>{c.description || '–'}</dd>
            </dl>

            <h3>Update</h3>
            <div className="form-grid">
              <Field label="Status">
                <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
              </Field>
              <Field label="Priority">
                <select value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: e.target.value })}>{PRIORITIES.map((s) => <option key={s}>{s}</option>)}</select>
              </Field>
              <Field label="Assign Volunteer">
                <select value={edit.volunteer_id} onChange={(e) => setEdit({ ...edit, volunteer_id: e.target.value })}>
                  <option value="">— Unassigned —</option>
                  {vols.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.district.split(' - ')[0]} ({v.active_cases} active)</option>)}
                </select>
              </Field>
            </div>
            <Field label="Note (optional)">
              <textarea rows={2} value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} placeholder="Action taken, follow-up details…" />
            </Field>
            <div className="row between">
              <button className="btn danger-ghost" onClick={remove}>Delete</button>
              <button className="btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
          <div>
            <h3>Timeline</h3>
            <ul className="timeline">
              {c.updates.map((u) => (
                <li key={u.id}>
                  <div className="strong">{u.note}</div>
                  <div className="muted small">{fmtDate(u.created_at)}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Modal>
  )
}
