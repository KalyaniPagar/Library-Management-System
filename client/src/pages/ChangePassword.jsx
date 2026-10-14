import { useState } from 'react'
import { authApi } from '../api/auth'

export default function ChangePassword() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setDone(false)
    if (next !== confirm) {
      setError('New passwords do not match')
      return
    }
    if (next.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }
    setBusy(true)
    try {
      await authApi.changePassword(current, next)
      setDone(true)
      setCurrent(''); setNext(''); setConfirm('')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <h1 className="h3 mb-4">Change Password</h1>

      {error && <div className="alert alert-danger">{error}</div>}
      {done && <div className="alert alert-success">Password updated.</div>}

      <form onSubmit={submit} className="card card-body">
        <div className="mb-3">
          <label className="form-label">Current password</label>
          <input type="password" className="form-control" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="form-label">New password</label>
          <input type="password" className="form-control" value={next} onChange={(e) => setNext(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Confirm new password</label>
          <input type="password" className="form-control" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
