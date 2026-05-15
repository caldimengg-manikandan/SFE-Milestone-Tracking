import axios from 'axios';

const api = axios.create({
  // Use /SFE-api/ for production proxying, fallback to localhost for dev
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/SFE-api/' : 'http://localhost:8000/api'),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the JWT token from sessionStorage
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Logic for session timeout could go here
    }
    return Promise.reject(error);
  }
);

/* ── Authentication API ── */
export const authAPI = {
  login: (data) => api.post('/auth/login/', data),
  register: (data) => api.post('/auth/register/', data),
  forgotPassword: (email) => api.post('/auth/forgot-password/', { email }),
  resetPassword: (data) => api.post('/auth/reset-password/', data),
  updateProfile: (data) => api.patch('/auth/profile/update/', data),
  changePassword: (data) => api.post('/auth/profile/change-password/', data),
  deleteAccount: () => api.delete('/auth/profile/delete/'),
  me: () => api.get('/auth/me/'),
};

/* ── Employee API ── */
export const employeeAPI = {
  getAll: (params = {}) => api.get('/employees/', { params }),
  getById: (id) => api.get(`/employees/${id}/`),
  create: (data) => api.post('/employees/', data),
  update: (id, data) => api.put(`/employees/${id}/`, data),
  delete: (id) => api.delete(`/employees/${id}/`),
};

/* ── Project API ── */
export const projectAPI = {
  getAll: () => api.get('/projects/'),
  getById: (id) => api.get(`/projects/${id}/`),
  create: (data) => api.post('/projects/', data),
  update: (id, data) => api.put(`/projects/${id}/`, data),
  delete: (id) => api.delete(`/projects/${id}/`),
};

/* ── Structural Schedule API ── */
export const scheduleAPI = {
  getAll: (params = {}) => api.get('/projects/structural-schedules/', { params }),
  create: (data) => api.post('/projects/structural-schedules/', data),
  update: (id, data) => api.put(`/projects/structural-schedules/${id}/`, data),
  delete: (id) => api.delete(`/projects/structural-schedules/${id}/`),
};

/* ── Fabrication Detail API ── */
export const fabricationAPI = {
  getAll: (params = {}) => api.get('/projects/fabrication-details/', { params }),
  create: (data) => api.post('/projects/fabrication-details/', data),
  update: (id, data) => api.put(`/projects/fabrication-details/${id}/`, data),
  delete: (id) => api.delete(`/projects/fabrication-details/${id}/`),
};


/* ── Production Schedule API ── */
export const productionAPI = {
  getSchedules: () => api.get('/production/schedules/'),
  getScheduleById: (id) => api.get(`/production/schedules/${id}/`),
  createSchedule: (data) => api.post('/production/schedules/', data),
  updateSchedule: (id, data) => api.put(`/production/schedules/${id}/`, data),
  deleteSchedule: (id) => api.delete(`/production/schedules/${id}/`),
  getItems: (params = {}) => api.get('/production/items/', { params }),
};

/* ── Production Priority API (Generic for Plate, Angle, Structural) ── */
export const priorityAPI = {
  getAll: (params = {}) => api.get('/production/priorities/', { params }),
  getById: (id) => api.get(`/production/priorities/${id}/`),
  create: (data) => api.post('/production/priorities/', data),
  update: (id, data) => api.put(`/production/priorities/${id}/`, data),
  delete: (id) => api.delete(`/production/priorities/${id}/`),
};

/* ── Dashboard API ── */
export const dashboardAPI = {
    getStats: (params) => api.get('/dashboard/stats/', { params }),
};

/* ── Capacity Mapping APIs ── */
export const machineAPI = {
  getAll: (params = {}) => api.get('/production/machines/', { params }),
  getById: (id) => api.get(`/production/machines/${id}/`),
  create: (data) => api.post('/production/machines/', data),
  update: (id, data) => api.put(`/production/machines/${id}/`, data),
  delete: (id) => api.delete(`/production/machines/${id}/`),
};

export const manpowerAPI = {
  getAll: (params = {}) => api.get('/production/manpower/', { params }),
  getById: (id) => api.get(`/production/manpower/${id}/`),
  create: (data) => api.post('/production/manpower/', data),
  update: (id, data) => api.put(`/production/manpower/${id}/`, data),
  delete: (id) => api.delete(`/production/manpower/${id}/`),
};

export const capacityAPI = {
  getAll: (params = {}) => api.get('/production/capacity/', { params }),
  getById: (id) => api.get(`/production/capacity/${id}/`),
  create: (data) => api.post('/production/capacity/', data),
  update: (id, data) => api.put(`/production/capacity/${id}/`, data),
  delete: (id) => api.delete(`/production/capacity/${id}/`),
};

export default api;

/* -- Customer API -- */
export const customerAPI = {
  getAll: (params = {}) => api.get('/projects/customers/', { params }),
  getById: (id) => api.get(`/projects/customers/${id}/`),
  create: (data) => api.post('/projects/customers/', data),
  update: (id, data) => api.put(`/projects/customers/${id}/`, data),
  delete: (id) => api.delete(`/projects/customers/${id}/`),
};

/* -- Detailer API -- */
export const detailerAPI = {
  getAll: (params = {}) => api.get('/projects/detailers/', { params }),
  getById: (id) => api.get(`/projects/detailers/${id}/`),
  create: (data) => api.post('/projects/detailers/', data),
  update: (id, data) => api.put(`/projects/detailers/${id}/`, data),
  delete: (id) => api.delete(`/projects/detailers/${id}/`),
};
