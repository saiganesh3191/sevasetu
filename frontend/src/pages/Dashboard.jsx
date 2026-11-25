import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts'
import { api, CATEGORY_META as CATEGORY_STYLE } from '../api/client.js'
import { PageHeader, Badge, Loading, ErrorBox, Modal, fmtDate } from '../components/ui.jsx'

const STATUS_COLORS = { Open: '#3b82f6', 'In Progress': '#f59e0b', 'On Hold': '#a855f7', Completed: '#10b981', Rejected: '#ef4444' }


export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [chartCat, setChartCat] = useState(null)

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <ErrorBox message={`${error} – backend running ga undha? (uvicorn app.main:app --reload)`} />
  if (!data) return <Loading />

  const maxVol = Math.max(1, ...data.volunteers_by_district.map((d) => d.total))

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Overview of grievances and volunteer activity">
        <Link to="/grievance" className="btn primary">+ New Grievance</Link>
      </PageHeader>


      {/* Category cards */}
      <section>
        <div className="section-title">Complaints by Category <span className="muted">· {data.complaints.total} total</span></div>
        <div className="cat-grid">
          {data.by_category.map((cat) => {
            const st = CATEGORY_STYLE[cat.name] || { icon: '📌', color: '#64748b' }
            const pct = cat.total ? Math.round((100 * cat.completed) / cat.total) : 0
            return (
              <div key={cat.name} className="cat-card" style={{ '--c': st.color }}>
                <div className="row between">
                  <div className="cat-icon">{st.icon}</div>
                  <div className="row gap-sm">
                    <div className="cat-total">{cat.total}</div>
                    <button className="chart-btn" title="District wise graph" onClick={() => setChartCat(cat.name)}>📊</button>
                  </div>
                </div>
                <div className="cat-name">{cat.name}</div>
                <div className="cat-meta">
                  <span><b>{cat.pending}</b> pending</span>
                  <span><b>{cat.completed}</b> completed</span>
                </div>
                <div className="progress"><div style={{ width: pct + '%' }} /></div>
                <Link to={`/complaints?category=${encodeURIComponent(cat.name)}`} className="link small">View complaints →</Link>
              </div>
            )
          })}
        </div>
      </section>

      {/* Constituency view */}
      <ConstituencyView />

      <div className="grid-2">
        <div className="card">
          <h3>District-wise Complaints</h3>
          <p className="chart-sub">Prathi district lo enni complaints vachayi – pending vs completed</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.by_district || []} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="name" fontSize={12} interval={0} angle={-30} textAnchor="end" />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Legend verticalAlign="top" />
              <Bar dataKey="completed" stackId="a" name="Completed" fill="#10b981" />
              <Bar dataKey="pending" stackId="a" name="Pending" fill="#f59e0b" />
              <Bar dataKey="rejected" stackId="a" name="Rejected" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <StatusPie allRows={data.by_status || []} byDistrict={data.status_by_district || {}} />
      </div>

      {/* Volunteers by district */}
      <section>
        <div className="row between">
          <div className="section-title">Volunteers by District <span className="muted">· {data.volunteers.total} total, {data.volunteers.active} active</span></div>
          <Link to="/volunteers" className="link">Manage →</Link>
        </div>
        <div className="dist-grid">
          {data.volunteers_by_district.map((d) => (
            <Link key={d.name} to={`/volunteers?district=${encodeURIComponent(d.name)}`} className="dist-card">
              <div className="dist-name">📍 {d.name}</div>
              <div className="dist-count">{d.total}<span> volunteers</span></div>
              <div className="dist-bar"><div style={{ width: (100 * d.total) / maxVol + '%' }} /></div>
              <div className="muted small">{d.active} active</div>
            </Link>
          ))}
        </div>
      </section>

      <div className="card">
        <div className="row between">
          <h3>Recent Complaints</h3>
          <Link to="/complaints" className="link">View all →</Link>
        </div>
        <table className="table compact">
          <tbody>
            {data.recent.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="strong">{r.subject}</div>
                  <div className="muted small">{r.ticket_no} · {r.citizen_name} · {fmtDate(r.created_at)}</div>
                </td>
                <td className="right"><Badge>{r.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {chartCat && (
        <CategoryDistrictModal
          name={chartCat}
          rows={(data.category_district || {})[chartCat] || []}
          onClose={() => setChartCat(null)}
        />
      )}
    </>
  )
}

function CategoryDistrictModal({ name, rows, onClose }) {
  const st = CATEGORY_STYLE[name] || { icon: '📌', color: '#64748b' }
  const total = rows.reduce((a, r) => a + r.total, 0)
  const sorted = [...rows].sort((a, b) => b.total - a.total)
  const top = sorted[0]
  return (
    <Modal title={`${st.icon} ${name} – District wise`} onClose={onClose} wide>
      <div className="row gap wrap">
        <div className="mini-stat"><span>Total</span><b>{total}</b></div>
        <div className="mini-stat"><span>Pending</span><b style={{ color: '#f59e0b' }}>{rows.reduce((a, r) => a + r.pending, 0)}</b></div>
        <div className="mini-stat"><span>Completed</span><b style={{ color: '#10b981' }}>{rows.reduce((a, r) => a + r.completed, 0)}</b></div>
        {top && top.total > 0 && <div className="mini-stat"><span>Highest</span><b>{top.name} ({top.total})</b></div>}
      </div>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={rows} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="name" fontSize={12} interval={0} angle={-30} textAnchor="end" />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip />
            <Legend verticalAlign="top" />
            <Bar dataKey="completed" stackId="a" name="Completed" fill="#10b981" />
            <Bar dataKey="pending" stackId="a" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="table compact-dist">
        <thead><tr><th>District</th><th className="right">Total</th><th className="right">Pending</th><th className="right">Completed</th><th></th></tr></thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.name}>
              <td className="strong">{r.name}</td>
              <td className="right">{r.total}</td>
              <td className="right">{r.pending}</td>
              <td className="right">{r.completed}</td>
              <td className="right">
                {r.total > 0 && (
                  <Link className="link small" to={`/complaints?category=${encodeURIComponent(name)}&district=${encodeURIComponent(r.name)}`}>View →</Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  )
}

const STATUS_HELP = {
  Open: 'Register ayyindi, inka evariki assign avvaledu',
  'In Progress': 'Volunteer pani chestunnaru',
  'On Hold': 'Konni reasons valla aapesaru',
  Completed: 'Problem solve ayyindi',
  Rejected: 'Valid kaadu / duplicate',
}
const STATUS_ORDER = ['Open', 'In Progress', 'On Hold', 'Completed', 'Rejected']

function StatusPie({ allRows, byDistrict }) {
  const [district, setDistrict] = useState('')
  const rows = district ? byDistrict[district] || [] : allRows
  const total = rows.reduce((a, r) => a + r.value, 0)
  const data = STATUS_ORDER.map((n) => ({ name: n, value: rows.find((r) => r.name === n)?.value || 0 }))
  return (
    <div className="card">
      <div className="row between gap card-head">
        <h3>Complaints by Status</h3>
        <select className="mini-select" value={district} onChange={(e) => setDistrict(e.target.value)}>
          <option value="">All Districts</option>
          {Object.keys(byDistrict).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <p className="chart-sub">
        {district ? <><b>{district}</b> district lo</> : 'Anni districts lo'} mottam {total} complaints – ippudu e stage lo unnayi
      </p>
      <div className="status-wrap">
        <div className="pie-box">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.filter((d) => d.value)} dataKey="value" nameKey="name" innerRadius={62} outerRadius={95} paddingAngle={2}>
                {data.filter((d) => d.value).map((s) => <Cell key={s.name} fill={STATUS_COLORS[s.name]} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} complaints`, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pie-center"><b>{total}</b><span>{district || 'Complaints'}</span></div>
          {total === 0 && <div className="pie-empty">Ee district lo complaints levu</div>}
        </div>
        <ul className="status-legend">
          {data.map((d) => (
            <li key={d.name}>
              <Link to={`/complaints?status=${encodeURIComponent(d.name)}${district ? `&district=${encodeURIComponent(district)}` : ''}`}>
                <span className="dot" style={{ background: STATUS_COLORS[d.name] }} />
                <div className="grow0">
                  <div className="strong">{d.name}</div>
                  <div className="muted small">{STATUS_HELP[d.name]}</div>
                </div>
                <div className="right">
                  <div className="strong">{d.value}</div>
                  <div className="muted small">{total ? Math.round((100 * d.value) / total) : 0}%</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ConstituencyView() {
  const [list, setList] = useState([])
  const [sel, setSel] = useState('')
  useEffect(() => {
    api.constituencies().then((d) => { setList(d.districts); setSel(d.districts[0]?.name || '') }).catch(() => {})
  }, [])
  const c = list.find((x) => x.name === sel)
  if (!c) return null
  return (
    <section className="card const-card">
      <div className="row between wrap gap">
        <div>
          <h3 style={{ marginBottom: 4 }}>🏛️ Constituency View</h3>
          <p className="chart-sub" style={{ margin: 0 }}>District select cheyandi – andulo constituencies and vaati complaints kanipisthay</p>
        </div>
        <div className="row gap">
          <select className="const-select" value={sel} onChange={(e) => setSel(e.target.value)}>
            {list.map((x) => <option key={x.name} value={x.name}>{x.name} District</option>)}
          </select>
          <Link to="/constituencies" className="link small nowrap">All →</Link>
        </div>
      </div>

      <div className="const-tabs">
        {list.map((x) => (
          <button key={x.name} className={'const-tab' + (x.name === sel ? ' on' : '')} onClick={() => setSel(x.name)}>
            {x.name}<span>{x.count}</span>
          </button>
        ))}
      </div>

      <div className="const-stats">
        <div className="mini-stat"><span>Constituencies</span><b>{c.count}</b></div>
        <div className="mini-stat"><span>Total Complaints</span><b>{c.total}</b></div>
        <div className="mini-stat"><span>Pending</span><b style={{ color: '#f59e0b' }}>{c.pending}</b></div>
        <div className="mini-stat"><span>Completed</span><b style={{ color: '#10b981' }}>{c.completed}</b></div>
      </div>

      <div className="const-body">
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={c.constituencies} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="name" fontSize={11} interval={0} angle={-20} textAnchor="end" />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} />
              <Legend verticalAlign="top" />
              <Bar dataKey="completed" stackId="a" name="Completed" fill="#10b981" maxBarSize={60} />
              <Bar dataKey="pending" stackId="a" name="Pending" fill="#f59e0b" maxBarSize={60} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <table className="table compact-dist">
          <thead><tr><th>Constituency</th><th className="right">Total</th><th className="right">Pending</th><th className="right">Completed</th><th></th></tr></thead>
          <tbody>
            {c.constituencies.map((d) => (
              <tr key={d.name}>
                <td className="strong">🏛️ {d.name}</td>
                <td className="right">{d.total}</td>
                <td className="right">{d.pending}</td>
                <td className="right">{d.completed}</td>
                <td className="right"><Link className="link small" to={`/complaints?constituency=${encodeURIComponent(d.name)}`}>View →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
