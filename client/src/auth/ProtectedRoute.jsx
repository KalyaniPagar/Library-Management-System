import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

// Requires any logged-in user. Optionally requires a specific role.
export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="container py-5">Loading…</div>
  if (!user) return <Navigate to="/login" replace />

  // Wrong role (e.g. a member hitting an admin page) -> send to catalog.
  if (role && user.role !== role) return <Navigate to="/catalog" replace />

  return children
}
