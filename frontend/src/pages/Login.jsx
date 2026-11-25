import { useState } from 'react'
import { api, auth } from '../api/client.js'

// Background video files live in frontend/public/brand/ (login-bg.mp4, login-bg-720.mp4, login-poster.jpg).
// If they are missing, the page simply shows the maroon/navy gradient instead.
const isSmall = typeof window !== 'undefined' && window.innerWidth < 900

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [videoOk, setVideoOk] = useState(true)

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
    <div className="lp">
      {/* full-screen background video */}
      <div className="lp-bg">
        {videoOk && (
          <video
            className="lp-video"
            autoPlay muted loop playsInline preload="auto"
            poster="/brand/login-poster.jpg"
            src={isSmall ? '/brand/login-bg-720.mp4' : '/brand/login-bg.mp4'}
            onError={() => setVideoOk(false)}
          />
        )}
        <div className="lp-overlay" />
      </div>

      <div className="lp-content">
        {/* left: organisation branding */}
        <section className="lp-brand">
          <div className="lp-logo-frame">
            <img src="/brand/logo.png" alt="Telangana Rakshana Sena logo" />
          </div>
          <div className="lp-names">
            <div className="lp-te">తెలంగాణ రక్షణ సేన</div>
            <div className="lp-en">TELANGANA RAKSHANA SENA</div>
            <div className="lp-rule"><span /><span /><span /></div>
            <div className="lp-tag">Grievance &amp; Volunteer Management Portal</div>
          </div>
          <ul className="lp-points">
            <li>Citizen grievances – register &amp; track</li>
            <li>District &amp; constituency wise monitoring</li>
            <li>Volunteer assignment &amp; follow-up</li>
          </ul>
        </section>

        {/* right: login card */}
        <form className="lp-card" onSubmit={submit} noValidate>
          <div className="lp-card-head">
            <img src="/brand/logo-sm.png" alt="" className="lp-card-logo" />
            <div>
              <div className="lp-card-te">తెలంగాణ రక్షణ సేన</div>
              <div className="lp-card-en">Grievance Portal</div>
            </div>
          </div>

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
          <p className="login-foot">© {new Date().getFullYear()} Telangana Rakshana Sena · Authorised staff only</p>
        </form>
      </div>
    </div>
  )
}
