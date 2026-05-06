import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000/api'
    : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — auto redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

/* ── Auth ── */
export const authAPI = {
  login: (creds) => api.post('/auth/login/', creds),
  register: (data) => api.post('/auth/register/', data),
  forgotPassword: (email) => api.post('/auth/forgot-password/', { email }),
  resetPassword: (data) => api.post('/auth/reset-password/', data),
  me: () => api.get('/auth/me/'),
};

/* ── Employees ── */
export const employeeAPI = {
  getAll: (params = {}) => api.get('/employees/', { params }),
  getById: (id) => api.get(`/employees/${id}/`),
  create: (data) => api.post('/employees/', data),
  update: (id, data) => api.put(`/employees/${id}/`, data),
  delete: (id) => api.delete(`/employees/${id}/`),
};

/* ── Projects ── */
export const projectAPI = {
  getAll: (params = {}) => api.get('/projects/', { params }),
  getById: (id) => api.get(`/projects/${id}/`),
  create: (data) => api.post('/projects/', data),
  update: (id, data) => api.put(`/projects/${id}/`, data),
  delete: (id) => api.delete(`/projects/${id}/`),
};

/* ── Milestones ── */
export const milestoneAPI = {
  getAll: (params = {}) => api.get('/milestones/', { params }),
  getById: (id) => api.get(`/milestones/${id}/`),
  create: (data) => api.post('/milestones/', data),
  update: (id, data) => api.put(`/milestones/${id}/`, data),
  delete: (id) => api.delete(`/milestones/${id}/`),
};

/* ── Dashboard ── */
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats/'),
};

export default api;
