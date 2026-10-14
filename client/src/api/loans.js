import api from './client'

export const loansApi = {
  // admin
  list: (params = {}) => api.get('/loans', { params }),
  issue: (data) => api.post('/loans/issue', data), // { member_id, barcode | copy_id }
  return: (id) => api.post(`/loans/${id}/return`),
  lost: (id) => api.post(`/loans/${id}/lost`),
  pay: (id) => api.post(`/loans/${id}/pay`),
  // member
  mine: () => api.get('/loans/mine'),
}
