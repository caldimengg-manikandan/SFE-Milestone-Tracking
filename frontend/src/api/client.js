import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/SFE-api/' : '/api')

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token || sessionStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const { refreshToken, updateToken, logout } = useAuthStore.getState()
      const base = import.meta.env.BASE_URL || '/';
      const loginPath = base.endsWith('/') ? `${base}login` : `${base}/login`;
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/api/auth/token/refresh/`, {
            refresh: refreshToken,
          })
          updateToken(data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          logout()
          window.location.href = loginPath
        }
      } else {
        logout()
        window.location.href = loginPath
      }
    }
    return Promise.reject(error)
  }
)

// ── API Methods ──────────────────────────────────────────────────────────────

// Auth
export const authAPI = {
  login: (credentials) => api.post('/rfq/accounts/login/', credentials),
  logout: () => api.post('/rfq/accounts/logout/'),
  me: () => api.get('/rfq/accounts/me/'),
}

// RFQ
export const rfqAPI = {
  list: (params) => api.get('/rfq/rfq/', { params }),
  get: (id) => api.get(`/rfq/rfq/${id}/`),
  create: (data) => api.post('/rfq/rfq/', data),
  update: (id, data) => api.put(`/rfq/rfq/${id}/`, data),
  patch: (id, data) => api.patch(`/rfq/rfq/${id}/`, data),
  delete: (id) => api.delete(`/rfq/rfq/${id}/`),
  printView: (params) => api.get('/rfq/rfq/print/', { params }),
  nextQuoteNo: (bid_date) => api.get('/rfq/rfq/next-quote-no/', { params: { bid_date } }),
  // SEBW Sync — patch exactly 5 SEBW output fields
  sebwSync: (id, data) => api.patch(`/rfq/rfq/${id}/sebw-sync/`, data),
  // Duplicate — clone as Rebid with auto R-suffix quote_no
  duplicate: (id) => api.post(`/rfq/rfq/${id}/duplicate/`),
  // Send email notifications
  sendEmail: (id, data) => api.post(`/rfq/rfq/${id}/send-email/`, data),
  sendBulkEmails: () => api.post('/rfq/rfq/send-bulk-emails/'),
  // Excel Upload — preview or commit import
  uploadExcel: (formData) => api.post('/rfq/rfq/upload-excel/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  // Sync quote emails
  syncQuoteMails: () => api.post('/rfq/rfq/sync-quote-mails/'),
}

// Lookups
export const customersAPI = {
  list: (params) => api.get('/rfq/customers/', { params }),
  create: (data) => api.post('/rfq/customers/', data),
}

export const estimatorsAPI = {
  list: () => api.get('/rfq/estimators/'),
}

export const goalsAPI = {
  list: () => api.get('/rfq/goals/'),
  currentYear: () => api.get('/rfq/goals/current_year/'),
  update: (id, data) => api.patch(`/rfq/goals/${id}/`, data),
}

// Dashboards
export const dashboardAPI = {
  bidPerformance: () => api.get('/rfq-dashboard/bid-performance/'),
  dollar: () => api.get('/rfq-dashboard/dollar/'),
  jobAnalytics: () => api.get('/rfq-dashboard/job-analytics/'),
  salesCycle: (year) => api.get('/rfq-dashboard/sales-cycle/', { params: year ? { year } : {} }),
  futureCapacity: () => api.get('/rfq-dashboard/future-capacity/'),
  bidEstimationSummary: () => api.get('/rfq-dashboard/bid-estimation-summary/'),
}

export const systemSettingsAPI = {
  list: () => api.get('/rfq/settings/'),
  update: (id, data) => api.patch(`/rfq/settings/${id}/`, data),
  create: (data) => api.post('/rfq/settings/', data),
}

