import api from './client'

export const booksApi = {
  // list/search: { q, category, page } -> { books, page, pages, total }
  list: (params = {}) => api.get('/books', { params }),
  get: (id) => api.get(`/books/${id}`),
  create: (data) => api.post('/books', data),
  update: (id, data) => api.put(`/books/${id}`, data),
  remove: (id) => api.delete(`/books/${id}`),
  addCopy: (id, barcode) => api.post(`/books/${id}/copies`, { barcode }),
  removeCopy: (copyId) => api.delete(`/copies/${copyId}`),
}

export const categoriesApi = {
  list: () => api.get('/categories'),
  create: (name) => api.post('/categories', { name }),
}
