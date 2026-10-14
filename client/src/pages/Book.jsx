import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { booksApi } from "../api/books";

export default function Book() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    booksApi
      .get(id)
      .then((d) => setBook(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container py-4">Loading…</div>;
  if (error)
    return <div className="container py-4 alert alert-danger">{error}</div>;
  if (!book) return null;

  return (
    <div className="container py-4">
      <button className="btn btn-link mb-3" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <h1 className="h3">{book.title}</h1>
      <h6 className="text-muted">{book.author}</h6>
      <p className="mt-2">{book.description}</p>

      <h5 className="mt-4">Copies</h5>
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Barcode</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {book.copies.map((c) => (
            <tr key={c.id}>
              <td>{c.barcode}</td>
              <td>
                {c.status === "available" ? (
                  <span className="text-success">Available</span>
                ) : (
                  <span className="text-muted">{c.status}</span>
                )}
              </td>
              <td>
                {c.status === "available" ? (
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => navigator.clipboard?.writeText(c.barcode)}
                    title="Copy barcode to clipboard"
                  >
                    Copy barcode
                  </button>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="alert alert-info">
        To borrow a book: take this barcode to the circulation desk or contact
        staff.
      </div>
    </div>
  );
}
