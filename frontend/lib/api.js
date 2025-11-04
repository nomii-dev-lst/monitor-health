import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login on auth error
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (username, password) => {
    const response = await api.post('/api/auth/login', { username, password });
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post('/api/auth/logout');
    localStorage.removeItem('token');
    return response.data;
  },
  
  getMe: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  }
};

// Monitors API
export const monitorsAPI = {
  getAll: async () => {
    const response = await api.get('/api/monitors');
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/api/monitors/${id}`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/api/monitors', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.put(`/api/monitors/${id}`, data);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/api/monitors/${id}`);
    return response.data;
  },
  
  triggerCheck: async (id) => {
    const response = await api.post(`/api/monitors/${id}/check`);
    return response.data;
  }
};

// Checks API
export const checksAPI = {
  getHistory: async (monitorId, limit = 50, offset = 0) => {
    const response = await api.get(`/api/checks/${monitorId}`, {
      params: { limit, offset }
    });
    return response.data;
  },
  
  getStats: async (monitorId, hours = 24) => {
    const response = await api.get(`/api/checks/${monitorId}/stats`, {
      params: { hours }
    });
    return response.data;
  },
  
  getChartData: async (monitorId, hours = 24) => {
    const response = await api.get(`/api/checks/${monitorId}/chart`, {
      params: { hours }
    });
    return response.data;
  }
};

// Settings API
export const settingsAPI = {
  getAll: async () => {
    const response = await api.get('/api/settings');
    return response.data;
  },
  
  update: async (key, value, description = '') => {
    const response = await api.put(`/api/settings/${key}`, { value, description });
    return response.data;
  },
  
  testEmail: async (email) => {
    const response = await api.post('/api/settings/test-email', { email });
    return response.data;
  },
  
  getSMTP: async () => {
    const response = await api.get('/api/settings/smtp');
    return response.data;
  }
};

// Dashboard API
export const dashboardAPI = {
  getSummary: async () => {
    const response = await api.get('/api/dashboard/summary');
    return response.data;
  }
};

export default api;
