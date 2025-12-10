import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// In-memory access token storage
let accessToken = null;

// Token management
export const tokenManager = {
  getAccessToken: () => accessToken,
  setAccessToken: (token) => {
    accessToken = token;
  },
  clearAccessToken: () => {
    accessToken = null;
  },
};

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Enable sending cookies
});

// Add access token to requests
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Handle auth errors and token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip interceptor for auth endpoints - these handle their own errors
    const skipRefreshFor = [
      "/api/auth/refresh",
      "/api/auth/login",
      "/api/auth/signup",
    ];
    if (skipRefreshFor.some((path) => originalRequest.url?.includes(path))) {
      return Promise.reject(error);
    }

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token
        const response = await axios.post(
          `${API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        if (response.data.success && response.data.accessToken) {
          accessToken = response.data.accessToken;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          processQueue(null, accessToken);
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear token and redirect to login
        processQueue(refreshError, null);
        accessToken = null;
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: async (username, email, password) => {
    const response = await api.post("/api/auth/signup", {
      username,
      email,
      password,
    });
    if (response.data.success && response.data.accessToken) {
      accessToken = response.data.accessToken;
    }
    return response.data;
  },

  login: async (username, password) => {
    const response = await api.post("/api/auth/login", { username, password });
    if (response.data.success && response.data.accessToken) {
      accessToken = response.data.accessToken;
    }
    return response.data;
  },

  logout: async () => {
    const response = await api.post("/api/auth/logout");
    accessToken = null;
    return response.data;
  },

  refresh: async () => {
    const response = await api.post(
      "/api/auth/refresh",
      {},
      {
        _skipAuthRefresh: true, // Mark to skip interceptor
      }
    );
    if (response.data.success && response.data.accessToken) {
      accessToken = response.data.accessToken;
    }
    return response.data;
  },

  getMe: async () => {
    const response = await api.get("/api/auth/me");
    return response.data;
  },
};

// Monitors API
export const monitorsAPI = {
  getAll: async () => {
    const response = await api.get("/api/monitors");
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/api/monitors/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/api/monitors", data);
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
  },
};

// Checks API
export const checksAPI = {
  getHistory: async (monitorId, limit = 50, offset = 0) => {
    const response = await api.get(`/api/checks/${monitorId}`, {
      params: { limit, offset },
    });
    return response.data;
  },

  getStats: async (monitorId, hours = 24) => {
    const response = await api.get(`/api/checks/${monitorId}/stats`, {
      params: { hours },
    });
    return response.data;
  },

  getChartData: async (monitorId, hours = 24) => {
    const response = await api.get(`/api/checks/${monitorId}/chart`, {
      params: { hours },
    });
    return response.data;
  },
};

// Settings API
export const settingsAPI = {
  getAll: async () => {
    const response = await api.get("/api/settings");
    return response.data;
  },

  get: async (key) => {
    const response = await api.get(`/api/settings/${key}`);
    return response.data;
  },

  update: async (key, value, description = "") => {
    const response = await api.put(`/api/settings/${key}`, {
      value,
      description,
    });
    return response.data;
  },
};

// Dashboard API
export const dashboardAPI = {
  getSummary: async () => {
    const response = await api.get("/api/dashboard/summary");
    return response.data;
  },
};

// Collections API
export const collectionsAPI = {
  getAll: async () => {
    const response = await api.get("/api/collections");
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/api/collections/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/api/collections", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/api/collections/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/collections/${id}`);
    return response.data;
  },

  getMonitors: async (id) => {
    const response = await api.get(`/api/collections/${id}/monitors`);
    return response.data;
  },

  checkAll: async (id) => {
    const response = await api.post(`/api/collections/${id}/check-all`);
    return response.data;
  },

  addMonitor: async (id, monitorId) => {
    const response = await api.post(`/api/collections/${id}/monitors`, {
      monitorId,
    });
    return response.data;
  },

  removeMonitor: async (id, monitorId) => {
    const response = await api.delete(
      `/api/collections/${id}/monitors/${monitorId}`
    );
    return response.data;
  },
};

// Logs API
export const logsAPI = {
  getAll: async (limit = 100, offset = 0) => {
    const response = await api.get("/api/logs", {
      params: { limit, offset },
    });
    return response.data;
  },

  getStats: async (hours = 24) => {
    const response = await api.get("/api/logs/stats", {
      params: { hours },
    });
    return response.data;
  },
};

export default api;
