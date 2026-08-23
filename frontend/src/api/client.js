import axios from "axios";

const baseURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("devshare_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired/invalid and not already on auth page
      if (
        !window.location.pathname.includes("/login") &&
        !window.location.pathname.includes("/register") &&
        window.location.pathname !== "/"
      ) {
        localStorage.removeItem("devshare_token");
        localStorage.removeItem("devshare_user");
      }
    }
    return Promise.reject(error);
  }
);
