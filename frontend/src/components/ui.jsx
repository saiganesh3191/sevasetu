export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      <div className="row gap">{children}</div>
    </div>
  )
}

export function StatCard({ label, value, tone = 'blue', hint }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? '–'}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  )
}

const statusTone = {
  Open: 'blue', 'In Progress': 'amber', 'On Hold': 'purple', Completed: 'green', Rejected: 'red',
  Active: 'green', 'On Leave': 'amber', Inactive: 'gray',
  Low: 'gray', Medium: 'blue', High: 'amber', Urgent: 'red',
}

export function Badge({ children }) {
  return <span className={`badge tone-${statusTone[children] || 'gray'}`}>{children}</span>
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={'modal' + (wide ? ' wide' : '')} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children, error }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <small className="error-text">{error}</small>}
    </label>
  )
}

export function Loading() {
  return <div className="loading">Loading…</div>
}

export function ErrorBox({ message }) {
  return message ? <div className="alert error">{message}</div> : null
}

export const fmtDate = (s) =>
  s ? new Date(s.replace(' ', 'T')).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–'
