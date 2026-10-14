import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { booksApi, categoriesApi } from "../api/books";

export default function Catalog() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState({ books: [], page: 1, pages: 1, total: 0 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load categories once (for the filter dropdown).
  useEffect(() => {
    categoriesApi
      .list()
      .then(setCategories)
      .catch(() => {});
  }, []);

  // Load books whenever the filters or page change.
  useEffect(() => {
    setLoading(true);
    setError("");
    const params = { page };
    if (q.trim()) params.q = q.trim();
    if (category) params.category = category;
    booksApi
      .list(params)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [q, category, page]);

  return (
    <div className="container py-4">
      <h1 className="h3 mb-4">Catalog</h1>

      {/* Search + filter */}
      <div className="row g-2 mb-4">
        <div className="col-sm-8">
          <input
            className="form-control"
            placeholder="Search by title or author…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
        </div>
        <div className="col-sm-4">
          <select
            className="form-select"
            value={category}
            onChange={(e) => {
              setPage(1);
              setCategory(e.target.value);
            }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="text-muted">Loading…</p>}

      {!loading && data.books.length === 0 && (
        <p className="text-muted">No books found.</p>
      )}

      {/* Book grid */}
      <div className="row g-3">
        {data.books.map((b) => (
          <div className="col-sm-6 col-lg-4" key={b.id}>
            <div
              className="card h-100 shadow-sm"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/catalog/${b.id}`)}
            >
              <div className="card-body">
                <h5 className="card-title mb-1">{b.title}</h5>
                <h6 className="card-subtitle text-muted mb-2">{b.author}</h6>
                {b.category_name && (
                  <span className="badge text-bg-light me-1">
                    {b.category_name}
                  </span>
                )}
                {b.year && (
                  <span className="badge text-bg-light">{b.year}</span>
                )}
                <p className="mb-0 mt-2">
                  {b.available > 0 ? (
                    <span className="text-success fw-semibold">
                      {b.available} of {b.total_copies} available
                    </span>
                  ) : (
                    <span className="text-danger fw-semibold">
                      Not available
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {data.pages > 1 && (
        <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span className="text-muted">
            Page {data.page} of {data.pages}
          </span>
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
