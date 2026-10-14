import { useEffect, useState } from 'react'
import { loansApi } from '../api/loans'

export default function MyLoans() {
  const [data, setData] = useState({ loans: [], currency: 'INR' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loansApi
      .mine()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const cur = data.currency
  const outstanding = data.loans
    .filter((l) => !l.fine_paid)
    .reduce((sum, l) => sum + Number(l.fine_amount || 0), 0)

  return (
    <div className="container py-4">
      <h1 className="h3 mb-4">My Loans</h1>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="text-muted">Loading…</p>}

      {outstanding > 0 && (
        <div className="alert alert-warning">
          Outstanding fines: <strong>{cur} {outstanding.toFixed(2)}</strong>
        </div>
      )}

      <table className="table align-middle">
        <thead>
          <tr>
            <th>Book</th><th>Barcode</th><th>Issued</th><th>Due</th>
            <th>Status</th><th>Fine</th>
          </tr>
        </thead>
        <tbody>
          {data.loans.map((l) => {
            const fineShown = l.status === 'issued' ? l.projected_fine : l.fine_amount
            return (
              <tr key={l.id}>
                <td>{l.title}</td>
                <td>{l.barcode}</td>
                <td>{l.issue_date}</td>
                <td>{l.due_date}</td>
                <td>
                  <span className={`badge ${
                    l.status === 'issued' ? 'text-bg-primary'
                      : l.status === 'returned' ? 'text-bg-success'
                      : 'text-bg-dark'
                  }`}>{l.status}</span>
                </td>
                <td>
                  {Number(fineShown) > 0 ? `${cur} ${fineShown}` : '—'}
                  {Number(l.fine_amount) > 0 && (l.fine_paid
                    ? <span className="badge text-bg-success ms-1">paid</span>
                    : <span className="badge text-bg-warning ms-1">unpaid</span>)}
                </td>
              </tr>
            )
          })}
          {!loading && data.loans.length === 0 && (
            <tr><td colSpan="6" className="text-muted">You have no loans yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
