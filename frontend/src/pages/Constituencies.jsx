import { useEffect, useMemo, useState } from 'react'
const PAGE_SIZE = 10
import { Link } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { api } from '../api/client.js'
import { PageHeader, StatCard, Loading, ErrorBox } from '../components/ui.jsx'

export default function Constituencies() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [district, setDistrict] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    api.constituencies().then(setData).catch((e) => setError(e.message))
  }, [])

  const filtered = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.districts
      .filter((d) => !district || d.name === district)
      .map((d) => ({ ...d, constituencies: d.constituencies.filter((c) => !q || c.name.toLowerCase().includes(q) || d.name.toLowerCase().includes(q)) }))
      .filter((d) => d.constituencies.length > 0)
  }, [data, district, search])

  if (error) return <ErrorBox message={error} />
  if (!data) return <Loading />

  const flat = filtered.flatMap((d) => d.constituencies.map((c) => ({ ...c, district: d.name })))
  const totalComplaints = data.districts.reduce((a, d) => a + d.total, 0)
  const busiest = [...data.districts.flatMap((d) => d.constituencies.map((c) => ({ ...c, district: d.name })))].sort((a, b) => b.total - a.total)[0]

  return (
    <>
      <PageHeader title="Constituencies" subtitle="Ae constituency ae district lo undi – prathi constituency lo enni complaints unnayi" />

      <div className="stats-grid">
        <StatCard label="Total Constituencies" value={data.total_constituencies} tone="indigo" />
        <StatCard label="Districts" value={data.total_districts} tone="teal" />
        <StatCard label="Complaints (mapped)" value={totalComplaints} hint={data.unmapped_complaints ? `${data.unmapped_complaints} without constituency` : ''} />
        <StatCard label="Most Complaints" value={busiest?.total ? busiest.name : '–'} tone="amber" hint={busiest?.total ? `${busiest.total} complaints · ${busiest.district}` : ''} />
      </div>

      <div className="card">
        <h3>Constituencies per District</h3>
        <p className="chart-sub">Prathi district lo enni constituencies unnayi, vaatilo mottam complaints</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.districts} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
            <XAxis dataKey="name" fontSize={12} interval={0} angle={-25} textAnchor="end" />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip cursor={{ fill: '#f1f5f9' }} />
            <Legend verticalAlign="top" />
            <Bar dataKey="count" name="Constituencies" fill="#6366f1" maxBarSize={44} radius={[6, 6, 0, 0]} />
            <Bar dataKey="total" name="Complaints" fill="#f59e0b" maxBarSize={44} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card ref-card">
        <h2 className="ref-title">Constituency-wise Complaints</h2>

        <div className="ref-toolbar">
          <div className="ref-search">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input placeholder="Search Constituency / District" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <button className="ref-btn" onClick={() => exportCsv(flat)}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></svg>
            Export
          </button>
        </div>

        <div className="ref-radios">
          {[{ name: '' }, ...data.districts].map((d) => (
            <label key={d.name || 'all'} className={district === d.name ? 'on' : ''}>
              <input type="radio" name="dist" checked={district === d.name} onChange={() => { setDistrict(d.name); setPage(1) }} />
              {d.name || 'All Districts'}
            </label>
          ))}
        </div>

        <div className="ref-scroll">
          <table className="ref-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>S.No</th>
                <th>Constituency</th>
                <th>District</th>
                <th className="c">Total</th>
                <th className="c">Pending</th>
                <th className="c">Completed</th>
                <th className="c">Rejected</th>
                <th className="c" style={{ width: 120 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {flat.length === 0 && (
                <tr><td colSpan={8} className="c muted" style={{ padding: 30 }}>No constituencies found</td></tr>
              )}
              {flat.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((c, i) => (
                <tr key={c.district + c.name} className={c.pending >= 3 ? 'hl' : ''}>
                  <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td><Link className="ref-link" to={`/complaints?constituency=${encodeURIComponent(c.name)}`}>{c.name}</Link></td>
                  <td>{c.district}</td>
                  <td className="c b">{c.total}</td>
                  <td className="c">{c.pending ? <span className="t-pend">{c.pending}</span> : '–'}</td>
                  <td className="c">{c.completed ? <span className="t-done">{c.completed}</span> : '–'}</td>
                  <td className="c">{c.rejected ? <span className="t-rej">{c.rejected}</span> : '–'}</td>
                  <td className="c">
                    <Link className="ref-view" to={`/complaints?constituency=${encodeURIComponent(c.name)}`}>
                      VIEW
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pager page={page} total={flat.length} size={PAGE_SIZE} onPage={setPage} />
      </div>
    </>
  )
}

function Num({ v, tone }) {
  return v ? <span className={`badge-num ${tone}`}>{v}</span> : <span className="num-zero">–</span>
}

function Pager({ page, total, size, onPage }) {
  const pages = Math.max(1, Math.ceil(total / size))
  const from = total ? (page - 1) * size + 1 : 0
  const to = Math.min(page * size, total)
  const go = (n) => onPage(Math.min(pages, Math.max(1, n)))
  return (
    <div className="ref-pager">
      <span>Showing <b>{from} - {to}</b> of <b>{total}</b></span>
      <button onClick={() => go(1)} disabled={page === 1} aria-label="First">|‹</button>
      <button onClick={() => go(page - 1)} disabled={page === 1} aria-label="Previous">‹</button>
      <input value={page} onChange={(e) => go(Number(e.target.value) || 1)} />
      <span className="pg-total">/ {pages}</span>
      <button onClick={() => go(page + 1)} disabled={page === pages} aria-label="Next">›</button>
      <button onClick={() => go(pages)} disabled={page === pages} aria-label="Last">›|</button>
    </div>
  )
}

function exportCsv(rows) {
  const head = ['S.No', 'Constituency', 'District', 'Total', 'Pending', 'Completed', 'Rejected']
  const lines = rows.map((r, i) => [i + 1, r.name, r.district, r.total, r.pending, r.completed, r.rejected].join(','))
  const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'constituencies.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}
