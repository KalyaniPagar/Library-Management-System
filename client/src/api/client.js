import axios from 'axios'

// Single axios instance for the whole app.
// - baseURL points at the PHP API under Apache.
// - withCredentials: true sends the PHPSESSID cookie so the session works.
const api = axios.create({
  baseURL: 'http://localhost/LMS/api',
  withCredentials: true,
})

// The API always replies with { ok: true, data } or { ok: false, error }.
// Unwrap that here so callers just get `data`, and turn ok:false into a throw.
api.interceptors.response.use(
  (response) => {
    const body = response.data
    if (body && body.ok === false) {
      return Promise.reject(new Error(body.error || 'Request failed'))
    }
    return body?.data
  },
  (error) => {
    const body = error.response?.data
    const message = body?.error || error.message || 'Network error'
    return Promise.reject(new Error(message))
  },
)

export default api
