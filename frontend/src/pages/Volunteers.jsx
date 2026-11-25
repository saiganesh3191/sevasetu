import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, DISTRICTS, VOL_STATUSES } from '../api/client.js'
import { PageHeader, Badge, Modal, Field, Loading, ErrorBox, StatCard, fmtDate } from '../components/ui.jsx'

const empty = { name: '', phone: '', email: '', district: DISTRICTS[0], skills: '', status: 'Active' }

export default function Volunteers() {
  const [rows, setRows] = useState(null)
  const [params] = useSearchParams()
  const [filters, setFilters] = useState({ search: '', status: '', district: params.get('district') || '' })
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null | {} (new) | volunteer
  const [viewing, setViewing] = useState(null)

  const load = useCallback(() => {
    api.volunteers(filters).then(setRows).catch((e) => setError(e.message))
  }, [filters])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  const setF = (k) => (e) => setFilters({ ...filters, [k]: e.target.value })
  const all = rows || []

  return (
    <>
      <PageHeader title="Volunteer Management" subtitle="Volunteers ni add / edit cheyandi, workload track cheyandi">
        <button className="btn primary" onClick={() => setEditing({})}>+ Add Volunteer</button>
      </PageHeader>
      <ErrorBox message={error} />

      <div className="stats-grid small-stats">
        <StatCard label="Listed" value={all.length} />
        <StatCard label="Active" value={all.filter((v) => v.status === 'Active').length} tone="green" />
        <StatCard label="Active Cases" value={all.reduce((s, v) => s + v.active_cases, 0)} tone="amber" />
        <StatCard label="Cases Resolved" value={all.reduce((s, v) => s + v.resolved_cases, 0)} tone="teal" />
      </div>

      <div className="card filters">
        <input className="grow" placeholder="Search name / phone / skills…" value={filters.search} onChange={setF('search')} />
        <select value={filters.status} onChange={setF('status')}><option value="">All Status</option>{VOL_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        <select value={filters.district} onChange={setF('district')}><option value="">All Districts</option>{DISTRICTS.map((s) => <option key={s}>{s}</option>)}</select>
      </div>

      <div className="card no-pad">
        {!rows ? <Loading /> : rows.length === 0 ? <div className="empty">No volunteers found</div> : (
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Contact</th><th>District</th><th>Skills</th><th>Status</th><th className="right">Active</th><th className="right">Resolved</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id}>
                  <td data-label="Name">
                    <div className="row gap-sm">
                      <div className="avatar">{v.name[0]}</div>
                      <div><div className="strong">{v.name}</div><div className="muted small">Since {fmtDate(v.joined_at).split(',')[0]}</div></div>
                    </div>
                  </td>
                  <td data-label="Contact"><div>{v.phone}</div><div className="muted small">{v.email}</div></td>
                  <td data-label="District" className="small">{v.district}</td>
                  <td data-label="Skills" className="small">{v.skills}</td>
                  <td data-label="Status"><Badge>{v.status}</Badge></td>
                  <td data-label="Active" className="right">{v.active_cases}</td>
                  <td data-label="Resolved" className="right">{v.resolved_cases}</td>
                  <td data-label="" className="right nowrap">
                    <button className="btn sm" onClick={() => setViewing(v.id)}>Cases</button>{' '}
                    <button className="btn sm" onClick={() => setEditing(v)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && <VolunteerForm vol={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      {viewing && <VolunteerCases id={viewing} onClose={() => setViewing(null)} />}
    </>
  )
}

function VolunteerForm({ vol, onClose, onSaved }) {
  const isNew = !vol.id
  const [form, setForm] = useState(isNew ? empty : { ...empty, ...vol })
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const save = async (e) => {
    e.preventDefault()
    if (!/^\d{10}$/.test(form.phone)) return setError('10 digit mobile number kavali')
    try {
      const { name, phone, email, district, skills, status } = form
      const data = { name, phone, email, district, skills, status }
      isNew ? await api.createVolunteer(data) : await api.updateVolunteer(vol.id, data)
      onSaved()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Remove ${vol.name}? Assigned cases unassigned avthayi.`)) return
    await api.deleteVolunteer(vol.id)
    onSaved()
  }

  return (
    <Modal title={isNew ? 'Add Volunteer' : `Edit – ${vol.name}`} onClose={onClose}>
      <ErrorBox message={error} />
      <form onSubmit={save}>
        <div className="form-grid two">
          <Field label="Name *"><input required minLength={2} value={form.name} onChange={set('name')} /></Field>
          <Field label="Mobile *"><input required maxLength={10} value={form.phone} onChange={set('phone')} /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={set('email')} /></Field>
          <Field label="District *"><select value={form.district} onChange={set('district')}>{DISTRICTS.map((a) => <option key={a}>{a}</option>)}</select></Field>
          <Field label="Status"><select value={form.status} onChange={set('status')}>{VOL_STATUSES.map((a) => <option key={a}>{a}</option>)}</select></Field>
          <Field label="Skills"><input value={form.skills} onChange={set('skills')} placeholder="e.g. Field work, Data entry" /></Field>
        </div>
        <div className="row between">
          {!isNew ? <button type="button" className="btn danger-ghost" onClick={remove}>Remove</button> : <span />}
          <div className="row gap">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary">{isNew ? 'Add Volunteer' : 'Save'}</button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

function VolunteerCases({ id, onClose }) {
  const [v, setV] = useState(null)
  useEffect(() => { api.volunteer(id).then(setV) }, [id])
  return (
    <Modal title={v ? `${v.name} – Assigned Cases` : 'Loading…'} onClose={onClose} wide>
      {!v ? <Loading /> : v.cases.length === 0 ? <div className="empty">No cases assigned yet</div> : (
        <table className="table">
          <thead><tr><th>Ticket</th><th>Subject</th><th>Priority</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {v.cases.map((c) => (
              <tr key={c.id}><td className="mono">{c.ticket_no}</td><td>{c.subject}</td><td><Badge>{c.priority}</Badge></td><td><Badge>{c.status}</Badge></td><td className="small">{fmtDate(c.created_at)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  )
}
