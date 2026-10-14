import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../api/auth'

// Holds the current user across the whole app.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // true until first /auth/me resolves

  // On app load, ask the server who we are (session cookie may already exist).
  useEffect(() => {
    authApi
      .me()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const u = await authApi.login(email, password)
    setUser(u)
    return u
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }

  const value = { user, loading, login, logout, isAdmin: user?.role === 'admin' }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Convenience hook.
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
