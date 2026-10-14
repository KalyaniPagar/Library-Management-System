import api from './client'

export const reportsApi = {
  summary: () => api.get('/reports/summary'),
  popular: () => api.get('/reports/popular'),
  overdue: () => api.get('/reports/overdue'),
}
