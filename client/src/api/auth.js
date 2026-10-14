import api from './client'

// Thin wrappers around the /auth/* endpoints.
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (current, next) =>
    api.post('/auth/password', { current, new: next }),
}
