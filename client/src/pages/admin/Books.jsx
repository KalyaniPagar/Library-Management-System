import { useEffect, useState } from 'react'
import { booksApi, categoriesApi } from '../../api/books'

const EMPTY = {
  title: '', author: '', category_id: '',
  year: '', replacement_cost: '', description: '',
}

export default function Books() {
  const [books, setBooks] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state: null = closed, otherwise the book being added/edited.
  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null) // null = creating

  // Copies panel: the book id whose copies are expanded.
  const [copiesFor, setCopiesFor] = useState(null)
  const [copies, setCopies] = useState([])
  const [newBarcode, setNewBarcode] = useState('')

  function loadBooks() {
    setLoading(true)
    setError('')
    booksApi
      .list({ page: 1 })
      .then((d) => setBooks(d.books))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadBooks()
    categoriesApi.list().then(setCategories).catch(() => {})
  }, [])

  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY })
  }

  async function openEdit(id) {
    setError('')
    try {
      const b = await booksApi.get(id)
      setEditingId(id)
      setForm({
        title: b.title || '', author: b.author || '',
        category_id: b.category_id || '',
        year: b.year || '', replacement_cost: b.replacement_cost || '',
        description: b.description || '',
      })
    } catch (e) {
      setError(e.message)
    }
  }

  async function saveForm(e) {
    e.preventDefault()
    setError('')
    try {
      if (editingId) {
        await booksApi.update(editingId, form)
      } else {
        await booksApi.create(form)
      }
      setForm(null)
      setEditingId(null)
      loadBooks()
    } catch (e) {
      setError(e.message)
    }
  }

  async function removeBook(id) {
    if (!window.confirm('Delete this book and all its copies?')) return
    setError('')
    try {
      await booksApi.remove(id)
      loadBooks()
    } catch (e) {
      setError(e.message)
    }
  }

  async function toggleCopies(id) {
    if (copiesFor === id) {
      setCopiesFor(null)
      return
    }
    try {
      const b = await booksApi.get(id)
      setCopies(b.copies)
      setCopiesFor(id)
      setNewBarcode('')
    } catch (e) {
      setError(e.message)
    }
  }

  async function addCopy() {
    if (!newBarcode.trim()) return
    setError('')
    try {
      await booksApi.addCopy(copiesFor, newBarcode.trim())
      const b = await booksApi.get(copiesFor)
      setCopies(b.copies)
      setNewBarcode('')
      loadBooks()
    } catch (e) {
      setError(e.message)
    }
  }

  async function removeCopy(copyId) {
    setError('')
    try {
      await booksApi.removeCopy(copyId)
      const b = await booksApi.get(copiesFor)
      setCopies(b.copies)
      loadBooks()
    } catch (e) {
      setError(e.message)
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="container py-4">
      <h1 className="h3 mb-4">Manage Books</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      {!form && (
        <button className="btn btn-primary mb-3" onClick={openCreate}>
          + Add Book
        </button>
      )}

      {/* Add / edit form */}
      {form && (
        <form className="card card-body mb-4" onSubmit={saveForm}>
          <h5 className="mb-3">{editingId ? 'Edit Book' : 'New Book'}</h5>
          <div className="row g-2">
            <div className="col-md-6">
              <label className="form-label">Title *</label>
              <input className="form-control" value={form.title} onChange={set('title')} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Author *</label>
              <input className="form-control" value={form.author} onChange={set('author')} required />
            </div>
            <div className="col-md-4">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category_id} onChange={set('category_id')}>
                <option value="">— none —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Year</label>
              <input type="number" className="form-control" value={form.year} onChange={set('year')} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Replacement cost</label>
              <input type="number" step="0.01" className="form-control" value={form.replacement_cost} onChange={set('replacement_cost')} />
            </div>
            <div className="col-12">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows="2" value={form.description} onChange={set('description')} />
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

      {/* Books table */}
      <table className="table table-hover align-middle">
        <thead>
          <tr>
            <th>Title</th>
            <th>Author</th>
            <th>Category</th>
            <th>Copies</th>
            <th className="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {books.map((b) => (
            <FragmentRow
              key={b.id}
              book={b}
              expanded={copiesFor === b.id}
              copies={copies}
              newBarcode={newBarcode}
              setNewBarcode={setNewBarcode}
              onEdit={() => openEdit(b.id)}
              onDelete={() => removeBook(b.id)}
              onToggleCopies={() => toggleCopies(b.id)}
              onAddCopy={addCopy}
              onRemoveCopy={removeCopy}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// One book row + an optional expanded copies panel beneath it.
function FragmentRow({
  book, expanded, copies, newBarcode, setNewBarcode,
  onEdit, onDelete, onToggleCopies, onAddCopy, onRemoveCopy,
}) {
  return (
    <>
      <tr>
        <td>{book.title}</td>
        <td>{book.author}</td>
        <td>{book.category_name || '—'}</td>
        <td>{book.available} / {book.total_copies}</td>
        <td className="text-end">
          <button className="btn btn-sm btn-outline-secondary me-1" onClick={onToggleCopies}>Copies</button>
          <button className="btn btn-sm btn-outline-primary me-1" onClick={onEdit}>Edit</button>
          <button className="btn btn-sm btn-outline-danger" onClick={onDelete}>Delete</button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan="5" className="bg-light">
            <div className="d-flex flex-wrap gap-2 mb-2">
              {copies.length === 0 && <span className="text-muted">No copies yet.</span>}
              {copies.map((c) => (
                <span key={c.id} className="badge text-bg-secondary d-flex align-items-center gap-2">
                  {c.barcode} ({c.status})
                  {c.status === 'available' && (
                    <button
                      className="btn-close btn-close-white"
                      style={{ fontSize: '.6rem' }}
                      title="Remove copy"
                      onClick={() => onRemoveCopy(c.id)}
                    />
                  )}
                </span>
              ))}
            </div>
            <div className="input-group" style={{ maxWidth: 360 }}>
              <input
                className="form-control form-control-sm"
                placeholder="New barcode"
                value={newBarcode}
                onChange={(e) => setNewBarcode(e.target.value)}
              />
              <button className="btn btn-sm btn-primary" onClick={onAddCopy}>Add copy</button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
