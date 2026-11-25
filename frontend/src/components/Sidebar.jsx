import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

// Simple line icons (no emoji) so the rail looks clean and professional
const I = {
  dashboard: <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />,
  grievance: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></>,
  complaints: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
  volunteers: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.2A5 5 0 0 1 21.5 19" /></>,
  constituencies: <><path d="M3 21h18M5 21V10M19 21V10M9 21v-7M15 21v-7M12 3 3 8h18z" /></>,
  reports: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
}
const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{I[name]}</svg>
)

const links = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/grievance', label: 'Grievance', icon: 'grievance' },
  { to: '/complaints', label: 'Complaints', icon: 'complaints' },
  { to: '/volunteers', label: 'Volunteers', icon: 'volunteers' },
  { to: '/constituencies', label: 'Constituencies', icon: 'constituencies' },
  { to: '/reports', label: 'Reports', icon: 'reports' },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // close the expanded menu whenever the page changes
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Esc key closes the menu
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const current = links.find((l) => (l.to === '/' ? location.pathname === '/' : location.pathname.startsWith(l.to)))

  return (
    <>
      <header className="topbar">
        <button className="menu-btn" onClick={() => setOpen(!open)} aria-label="Toggle menu">☰</button>
        <div className="brand-logo sm">S</div>
        <div className="topbar-brand">SevaSetu</div>
        <span className="topbar-sep">/</span>
        <div className="topbar-title">{current?.label || 'Dashboard'}</div>
      </header>

      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}

      <aside className={'rail' + (open ? ' open' : '')}>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} title={l.label}
              className={({ isActive }) => 'rail-link' + (isActive ? ' active' : '')}>
              <span className="rail-icon"><Icon name={l.icon} /></span>
              <span className="rail-label">{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="rail-foot">v1.0 · Office Admin</div>
      </aside>
    </>
  )
}
