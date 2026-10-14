import api from './client'

export const membersApi = {
  list: (q) => api.get('/members', { params: q ? { q } : {} }),
  get: (id) => api.get(`/members/${id}`),
  create: (data) => api.post('/members', data),
  update: (id, data) => api.put(`/members/${id}`, data),
}
