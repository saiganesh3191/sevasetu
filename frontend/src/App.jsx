import { Component, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Grievance from './pages/Grievance.jsx'
import Complaints from './pages/Complaints.jsx'
import Volunteers from './pages/Volunteers.jsx'
import Reports from './pages/Reports.jsx'
import Constituencies from './pages/Constituencies.jsx'
import Login from './pages/Login.jsx'
import { api, auth } from './api/client.js'

export default function App() {
  const [user, setUser] = useState(() => (auth.token() ? auth.user() : null))

  // any 401 from the API (expired / invalid session) sends the user back to login
  useEffect(() => {
    const onLogout = () => setUser(null)
    window.addEventListener('sevasetu:logout', onLogout)
    return () => window.removeEventListener('sevasetu:logout', onLogout)
  }, [])

  const logout = async () => {
    try { await api.logout() } catch { /* ignore */ }
    auth.clear()
    setUser(null)
  }

  const updateProfile = async (data) => {
    const updated = await api.updateProfile(data)
    auth.save(auth.token(), updated)
    setUser(updated)
  }

  if (!user) return <Login onLogin={setUser} />

  return (
    <div className="layout">
      <Sidebar user={user} onLogout={logout} onProfileUpdate={updateProfile} />
      <main className="main">
        <PageGuard>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/grievance" element={<Grievance />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/volunteers" element={<Volunteers />} />
          <Route path="/constituencies" element={<Constituencies />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        </PageGuard>
      </main>
    </div>
  )
}

// If a page crashes, show a message instead of a blank white screen
class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="alert error">
          Ee page load avvaledu: {String(this.state.error.message || this.state.error)}.<br />
          Backend restart chesi page refresh cheyandi.
        </div>
      )
    }
    return this.props.children
  }
}

function PageGuard({ children }) {
  const { pathname } = useLocation()
  return <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
}
