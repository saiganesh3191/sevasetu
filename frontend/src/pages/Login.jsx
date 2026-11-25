import { useState } from 'react'
import { api, auth } from '../api/client.js'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) return setError('Username and password enter cheyandi')
    setLoading(true)
    setError('')
    try {
      const res = await api.login(username.trim(), password)
      auth.save(res.token, res.user)
      onLogin(res.user)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-art">
        <div className="login-art-inner">
          <div className="brand-logo lg">S</div>
          <h1>SevaSetu</h1>
          <p>Grievance &amp; Volunteer Management System</p>
          <ul>
            <li><span>✓</span> Citizen grievances register &amp; track</li>
            <li><span>✓</span> District &amp; constituency wise reports</li>
            <li><span>✓</span> Volunteer assignment &amp; follow-up</li>
          </ul>
        </div>
      </div>

      <div className="login-panel">
        <form className="login-box" onSubmit={submit} noValidate>
          <div className="login-mobile-brand"><div className="brand-logo">S</div><b>SevaSetu</b></div>
          <h2>Welcome back</h2>
          <p className="muted">Mee account tho login avvandi</p>

          {error && <div className="alert error">{error}</div>}

          <label className="field">
            <span>Username</span>
            <div className="login-input">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
              <input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" autoComplete="username" />
            </div>
          </label>

          <label className="field">
            <span>Password</span>
            <div className="login-input">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
              <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" autoComplete="current-password" />
              <button type="button" className="pw-toggle" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
            </div>
          </label>

          <button className="btn primary lg login-btn" disabled={loading}>{loading ? 'Signing in…' : 'Login'}</button>
          <p className="login-foot">© {new Date().getFullYear()} SevaSetu · Office Admin Portal</p>
        </form>
      </div>
    </div>
  )
}
