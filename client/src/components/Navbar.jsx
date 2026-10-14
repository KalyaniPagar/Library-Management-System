import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  // Active link styling via NavLink's isActive.
  const cls = ({ isActive }) =>
    'nav-link' + (isActive ? ' active fw-semibold' : '')

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
      <div className="container">
        <NavLink className="navbar-brand" to={isAdmin ? '/admin' : '/catalog'}>
          📚 Library
        </NavLink>

        <div className="navbar-nav me-auto">
          {isAdmin ? (
            <>
              <NavLink className={cls} to="/admin">Dashboard</NavLink>
              <NavLink className={cls} to="/admin/books">Books</NavLink>
              <NavLink className={cls} to="/admin/members">Members</NavLink>
              <NavLink className={cls} to="/admin/circulation">Circulation</NavLink>
              <NavLink className={cls} to="/catalog">Catalog</NavLink>
            </>
          ) : (
            <>
              <NavLink className={cls} to="/catalog">Catalog</NavLink>
              <NavLink className={cls} to="/my-loans">My Loans</NavLink>
            </>
          )}
        </div>

        <div className="navbar-nav align-items-lg-center">
          <NavLink className={cls} to="/change-password">Password</NavLink>
          <span className="navbar-text me-3">
            {user?.name} <span className="badge text-bg-secondary">{user?.role}</span>
          </span>
          <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>
    </nav>
  )
}
