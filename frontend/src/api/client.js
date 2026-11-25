// All calls go to /api, which Vite proxies to the Python backend (http://127.0.0.1:8000)
const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body.detail) msg = typeof body.detail === 'string' ? body.detail : body.detail.map((d) => d.msg).join(', ')
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  return res.status === 204 ? null : res.json()
}

const qs = (params = {}) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  return q.toString() ? `?${q}` : ''
}

export const api = {
  dashboard: () => request('/dashboard'),

  complaints: (filters) => request('/complaints' + qs(filters)),
  complaint: (id) => request(`/complaints/${id}`),
  track: (ticket) => request(`/complaints/track/${encodeURIComponent(ticket)}`),
  createComplaint: (data) => request('/complaints', { method: 'POST', body: JSON.stringify(data) }),
  updateComplaint: (id, data) => request(`/complaints/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteComplaint: (id) => request(`/complaints/${id}`, { method: 'DELETE' }),

  volunteers: (filters) => request('/volunteers' + qs(filters)),
  volunteer: (id) => request(`/volunteers/${id}`),
  createVolunteer: (data) => request('/volunteers', { method: 'POST', body: JSON.stringify(data) }),
  updateVolunteer: (id, data) => request(`/volunteers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteVolunteer: (id) => request(`/volunteers/${id}`, { method: 'DELETE' }),

  constituencies: () => request('/constituencies'),

  reports: (range) => request('/reports' + qs(range)),
  exportUrl: (range) => BASE + '/reports/export' + qs(range),
}

export const DISTRICTS = ['Hyderabad', 'Rangareddy', 'Medchal-Malkajgiri', 'Warangal', 'Karimnagar', 'Khammam', 'Nalgonda', 'Nizamabad']
export const CATEGORIES = ['Roads & Drainage', 'Drinking Water', 'Education', 'Healthcare', 'Employment & Skill Development', 'Agriculture', 'Public Transport', 'Municipal Services']
export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
export const STATUSES = ['Open', 'In Progress', 'On Hold', 'Completed', 'Rejected']
export const VOL_STATUSES = ['Active', 'On Leave', 'Inactive']
export const SOURCES = ['Walk-in', 'Phone', 'WhatsApp', 'Email', 'Field Visit']

// Icon, colour and quick subject suggestions for each category
export const CATEGORY_META = {
  'Roads & Drainage': { icon: '🛣️', color: '#64748b', suggestions: ['Potholes on main road', 'Drainage overflow in colony', 'Road damaged after rains', 'CC road needed'] },
  'Drinking Water': { icon: '💧', color: '#0ea5e9', suggestions: ['No drinking water supply', 'Pipeline leakage', 'Contaminated water', 'Bore well repair'] },
  Education: { icon: '🎓', color: '#6366f1', suggestions: ['School building repair', 'Teacher shortage', 'Scholarship not received', 'Mid-day meal issue'] },
  Healthcare: { icon: '🏥', color: '#ef4444', suggestions: ['PHC doctor unavailable', 'Ambulance delay', 'Medicines not available', 'Aarogyasri help needed'] },
  'Employment & Skill Development': { icon: '💼', color: '#f59e0b', suggestions: ['Skill training request', 'Job mela request', 'Self-employment loan', 'MGNREGA wages pending'] },
  Agriculture: { icon: '🌾', color: '#16a34a', suggestions: ['Crop loss compensation', 'Fertilizer shortage', 'Irrigation canal repair', 'Rythu Bandhu not received'] },
  'Public Transport': { icon: '🚌', color: '#d946ef', suggestions: ['Bus service stopped', 'Bus shelter needed', 'More buses for students', 'Bus pass issue'] },
  'Municipal Services': { icon: '🏛️', color: '#14b8a6', suggestions: ['Garbage not collected', 'Street light not working', 'Stray dog menace', 'Property tax issue'] },
}

// District -> constituency names (loaded once from the backend)
let _constMap = null
export async function getConstituencyMap() {
  if (!_constMap) {
    const data = await api.constituencies()
    _constMap = Object.fromEntries(data.districts.map((d) => [d.name, d.constituencies.map((c) => c.name)]))
  }
  return _constMap
}
