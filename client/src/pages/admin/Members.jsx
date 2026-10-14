import { useEffect, useState } from 'react'
import { membersApi } from '../../api/members'

const EMPTY = { name: '', email: '', member_code: '', password: '', status: 'active' }

export default function Members() {
  const [members, setMembers] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null)

  function load() {
    setLoading(true)
    setError('')
    membersApi
      .list(q.trim())
      .then(setMembers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  // Reload when the search term changes.
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY })
  }

  function openEdit(m) {
    setEditingId(m.id)
    setForm({
      name: m.name || '', email: m.email || '',
      member_code: m.member_code || '', password: '', status: m.status || 'active',
    })
  }

  async function save(e) {
    e.preventDefault()
    setError('')
    try {
      if (editingId) {
        // Only send password if the admin typed a new one.
        const payload = { ...form }
        if (!payload.password) delete payload.password
        await membersApi.update(editingId, payload)
      } else {
        await membersApi.create(form)
      }
      setForm(null)
      setEditingId(null)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function toggleStatus(m) {
    setError('')
    try {
      await membersApi.update(m.id, { status: m.status === 'active' ? 'inactive' : 'active' })
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="container py-4">
      <h1 className="h3 mb-4">Manage Members</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="d-flex gap-2 mb-3">
        {!form && <button className="btn btn-primary" onClick={openCreate}>+ Add Member</button>}
        <input
          className="form-control"
          style={{ maxWidth: 300 }}
          placeholder="Search members…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Add / edit form */}
      {form && (
        <form className="card card-body mb-4" onSubmit={save}>
          <h5 className="mb-3">{editingId ? 'Edit Member' : 'New Member'}</h5>
          <div className="row g-2">
            <div className="col-md-6">
              <label className="form-label">Name *</label>
              <input className="form-control" value={form.name} onChange={set('name')} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Email *</label>
              <input type="email" className="form-control" value={form.email} onChange={set('email')} required />
            </div>
            <div className="col-md-4">
              <label className="form-label">Member code</label>
              <input className="form-control" value={form.member_code} onChange={set('member_code')} />
            </div>
            <div className="col-md-4">
              <label className="form-label">
                Password {editingId && <span className="text-muted">(leave blank to keep)</span>}
              </label>
              <input
                type="text"
                className="form-control"
                value={form.password}
                onChange={set('password')}
                placeholder={editingId ? '••••••' : 'min 6 characters'}
                {...(!editingId ? { required: true } : {})}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={set('status')}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <button className="btn btn-primary me-2" type="submit">Save</button>
            <button className="btn btn-outline-secondary" type="button" onClick={() => { setForm(null); setEditingId(null) }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <p className="text-muted">Loading…</p>}

      <table className="table table-hover align-middle">
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Code</th><th>Status</th>
            <th className="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td>{m.email}</td>
              <td>{m.member_code || '—'}</td>
              <td>
                <span className={`badge ${m.status === 'active' ? 'text-bg-success' : 'text-bg-secondary'}`}>
                  {m.status}
                </span>
              </td>
              <td className="text-end">
                <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(m)}>Edit</button>
                <button className="btn btn-sm btn-outline-warning" onClick={() => toggleStatus(m)}>
                  {m.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
          {!loading && members.length === 0 && (
            <tr><td colSpan="5" className="text-muted">No members found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
