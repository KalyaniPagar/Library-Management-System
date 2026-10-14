import { useEffect, useState } from 'react'
import { loansApi } from '../../api/loans'
import { membersApi } from '../../api/members'

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'issued', label: 'Issued' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'returned', label: 'Returned' },
  { key: 'lost', label: 'Lost' },
]

export default function Circulation() {
  const [members, setMembers] = useState([])
  const [memberId, setMemberId] = useState('')
  const [barcode, setBarcode] = useState('')

  const [filter, setFilter] = useState('')
  const [data, setData] = useState({ loans: [], currency: 'INR' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    membersApi.list().then(setMembers).catch(() => {})
  }, [])

  function loadLoans() {
    setLoading(true)
    setError('')
    loansApi
      .list(filter ? { status: filter } : {})
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(loadLoans, [filter])

  async function issue(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    try {
      const res = await loansApi.issue({
        member_id: Number(memberId),
        barcode: barcode.trim(),
      })
      setNotice(`Issued. Due ${res.due_date}.`)
      setBarcode('')
      loadLoans()
    } catch (e) {
      setError(e.message)
    }
  }

  async function act(fn, id, confirmMsg) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setError('')
    setNotice('')
    try {
      const res = await fn(id)
      if (res?.fine_amount != null) {
        setNotice(`Done. Fine: ${data.currency} ${res.fine_amount}`)
      }
      loadLoans()
    } catch (e) {
      setError(e.message)
    }
  }

  const cur = data.currency

  return (
    <div className="container py-4">
      <h1 className="h3 mb-4">Circulation</h1>

      {error && <div className="alert alert-danger">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      {/* Issue a book */}
      <form className="card card-body mb-4" onSubmit={issue}>
        <h5 className="mb-3">Issue a book</h5>
        <div className="row g-2 align-items-end">
          <div className="col-md-5">
            <label className="form-label">Member</label>
            <select className="form-select" value={memberId} onChange={(e) => setMemberId(e.target.value)} required>
              <option value="">— choose member —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Copy barcode</label>
            <input className="form-control" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="e.g. CC-c01" required />
          </div>
          <div className="col-md-3">
            <button className="btn btn-primary w-100" type="submit">Issue</button>
          </div>
        </div>
      </form>

      {/* Filters */}
      <div className="btn-group mb-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-muted">Loading…</p>}

      <table className="table table-hover align-middle">
        <thead>
          <tr>
            <th>Book</th><th>Barcode</th><th>Member</th>
            <th>Issued</th><th>Due</th><th>Status</th><th>Fine</th>
            <th className="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.loans.map((l) => {
            const isOpen = l.status === 'issued'
            const overdue = isOpen && l.overdue_days > 0
            const fineShown = isOpen ? l.projected_fine : l.fine_amount
            return (
              <tr key={l.id} className={overdue ? 'table-warning' : ''}>
                <td>{l.title}</td>
                <td>{l.barcode}</td>
                <td>{l.member_name}</td>
                <td>{l.issue_date}</td>
                <td>
                  {l.due_date}
                  {overdue && <span className="badge text-bg-danger ms-1">{l.overdue_days}d late</span>}
                </td>
                <td>
                  <span className={`badge ${
                    l.status === 'issued' ? 'text-bg-primary'
                      : l.status === 'returned' ? 'text-bg-success'
                      : 'text-bg-dark'
                  }`}>{l.status}</span>
                </td>
                <td>
                  {Number(fineShown) > 0 ? `${cur} ${fineShown}` : '—'}
                  {Number(l.fine_amount) > 0 && (
                    l.fine_paid ? <span className="badge text-bg-success ms-1">paid</span>
                      : <span className="badge text-bg-warning ms-1">unpaid</span>
                  )}
                </td>
                <td className="text-end">
                  {isOpen && (
                    <>
                      <button className="btn btn-sm btn-outline-success me-1"
                        onClick={() => act(loansApi.return, l.id)}>Return</button>
                      <button className="btn btn-sm btn-outline-dark me-1"
                        onClick={() => act(loansApi.lost, l.id, 'Mark this book lost and charge the replacement fee?')}>Lost</button>
                    </>
                  )}
                  {!isOpen && Number(l.fine_amount) > 0 && !l.fine_paid && (
                    <button className="btn btn-sm btn-outline-primary"
                      onClick={() => act(loansApi.pay, l.id)}>Mark paid</button>
                  )}
                </td>
              </tr>
            )
          })}
          {!loading && data.loans.length === 0 && (
            <tr><td colSpan="8" className="text-muted">No loans.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
