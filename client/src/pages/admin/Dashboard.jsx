import { useEffect, useState } from 'react'
import { reportsApi } from '../../api/reports'

function Kpi({ label, value, tone = 'primary' }) {
  return (
    <div className="col-6 col-md-3">
      <div className={`card text-bg-${tone} h-100 shadow-sm`}>
        <div className="card-body text-center">
          <div className="display-6 fw-bold">{value}</div>
          <div className="small">{label}</div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [popular, setPopular] = useState([])
  const [overdue, setOverdue] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([reportsApi.summary(), reportsApi.popular(), reportsApi.overdue()])
      .then(([s, p, o]) => {
        setSummary(s)
        setPopular(p)
        setOverdue(o)
      })
      .catch((e) => setError(e.message))
  }, [])

  const cur = summary?.currency || 'INR'

  return (
    <div className="container py-4">
      <h1 className="h3 mb-4">Admin Dashboard</h1>

      {error && <div className="alert alert-danger">{error}</div>}
      {!summary && !error && <p className="text-muted">Loading…</p>}

      {summary && (
        <>
          {/* KPI cards */}
          <div className="row g-3 mb-4">
            <Kpi label="Books" value={summary.total_books} tone="primary" />
            <Kpi label="Copies available" value={summary.available_copies} tone="success" />
            <Kpi label="Members" value={summary.total_members} tone="info" />
            <Kpi label="On loan" value={summary.active_loans} tone="secondary" />
            <Kpi label="Issued today" value={summary.issued_today} tone="primary" />
            <Kpi label="Overdue" value={summary.overdue_count} tone="warning" />
            <Kpi label="Lost" value={summary.lost_count} tone="dark" />
            <Kpi label="Outstanding fines" value={`${cur} ${summary.outstanding_fines}`} tone="danger" />
          </div>

          <div className="row g-4">
            {/* Most borrowed */}
            <div className="col-md-6">
              <div className="card shadow-sm h-100">
                <div className="card-header">Most borrowed</div>
                <ul className="list-group list-group-flush">
                  {popular.length === 0 && <li className="list-group-item text-muted">No loans yet.</li>}
                  {popular.map((b) => (
                    <li key={b.id} className="list-group-item d-flex justify-content-between">
                      <span>{b.title} <span className="text-muted">— {b.author}</span></span>
                      <span className="badge text-bg-primary rounded-pill">{b.times_borrowed}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Overdue list */}
            <div className="col-md-6">
              <div className="card shadow-sm h-100">
                <div className="card-header">Overdue books</div>
                <ul className="list-group list-group-flush">
                  {overdue.length === 0 && <li className="list-group-item text-muted">Nothing overdue. 🎉</li>}
                  {overdue.map((o) => (
                    <li key={o.id} className="list-group-item d-flex justify-content-between">
                      <span>{o.title} <span className="text-muted">— {o.member_name}</span></span>
                      <span className="badge text-bg-danger rounded-pill">{o.overdue_days}d</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
