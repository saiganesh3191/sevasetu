import { useEffect, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts'
import { api } from '../api/client.js'
import { PageHeader, StatCard, Loading, ErrorBox } from '../components/ui.jsx'

const PRIORITY_COLORS = { Low: '#94a3b8', Medium: '#3b82f6', High: '#f59e0b', Urgent: '#ef4444' }
const iso = (d) => d.toISOString().slice(0, 10)

export default function Reports() {
  const today = new Date()
  const [range, setRange] = useState({ date_from: iso(new Date(today.getTime() - 29 * 864e5)), date_to: iso(today) })
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setData(null)
    api.reports(range).then(setData).catch((e) => setError(e.message))
  }, [range])

  const preset = (days) => setRange({ date_from: iso(new Date(today.getTime() - (days - 1) * 864e5)), date_to: iso(today) })
  const s = data?.summary

  return (
    <>
      <PageHeader title="Reports" subtitle="District-wise, category-wise and volunteer performance reports">
        <a className="btn" href={api.exportUrl(range)}>⬇ Export CSV</a>
        <button className="btn" onClick={() => window.print()}>🖨 Print</button>
      </PageHeader>

      <div className="card filters">
        <label className="inline">From <input type="date" value={range.date_from} onChange={(e) => setRange({ ...range, date_from: e.target.value })} /></label>
        <label className="inline">To <input type="date" value={range.date_to} onChange={(e) => setRange({ ...range, date_to: e.target.value })} /></label>
        <div className="row gap-sm">
          <button className="btn sm" onClick={() => preset(7)}>7 days</button>
          <button className="btn sm" onClick={() => preset(30)}>30 days</button>
          <button className="btn sm" onClick={() => setRange({ date_from: '', date_to: '' })}>All time</button>
        </div>
      </div>

      <ErrorBox message={error} />
      {!data ? <Loading /> : (
        <>
          <div className="stats-grid">
            <StatCard label="Received" value={s.total} />
            <StatCard label="Resolved" value={s.resolved} tone="green" />
            <StatCard label="Pending" value={s.pending} tone="amber" />
            <StatCard label="Resolution Rate" value={`${s.resolution_rate}%`} tone="teal" />
            <StatCard label="Avg. Resolution" value={s.avg_resolution_days ? `${s.avg_resolution_days} days` : '–'} tone="indigo" />
          </div>

          <div className="grid-2">
            <div className="card">
              <h3>District wise</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.by_district.map((a) => ({ ...a, name: a.name.split(' - ')[1] || a.name }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="resolved" stackId="a" name="Resolved" fill="#10b981" />
                  <Bar dataKey="pending" stackId="a" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3>By Priority</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.by_priority} dataKey="value" nameKey="name" outerRadius={100} label>
                    {data.by_priority.map((p) => <Cell key={p.name} fill={PRIORITY_COLORS[p.name]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid-2">
            <div className="card no-pad">
              <h3 className="pad">Category wise</h3>
              <table className="table">
                <thead><tr><th>Category</th><th className="right">Total</th><th className="right">Resolved</th><th className="right">Rate</th></tr></thead>
                <tbody>
                  {data.by_category.map((c) => (
                    <tr key={c.name}><td>{c.name}</td><td className="right">{c.total}</td><td className="right">{c.resolved}</td>
                      <td className="right">{c.total ? Math.round((100 * c.resolved) / c.total) : 0}%</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card no-pad">
              <h3 className="pad">Volunteer Performance</h3>
              <table className="table">
                <thead><tr><th>Volunteer</th><th>District</th><th className="right">Assigned</th><th className="right">Resolved</th><th>Progress</th></tr></thead>
                <tbody>
                  {data.volunteer_performance.map((v) => {
                    const pct = v.assigned ? Math.round((100 * (v.resolved || 0)) / v.assigned) : 0
                    return (
                      <tr key={v.id}>
                        <td className="strong">{v.name}</td>
                        <td className="small">{v.district.split(' - ')[1] || v.district}</td>
                        <td className="right">{v.assigned}</td>
                        <td className="right">{v.resolved || 0}</td>
                        <td><div className="progress"><div style={{ width: pct + '%' }} /></div></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )
}
