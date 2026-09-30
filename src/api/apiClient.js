// File: src/api/apiClient.js
import axios from "axios";
import { API_BASE } from "../config/api.js";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Auto-attach token from localStorage.token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // read token directly
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// FE#4: global 401 handling. When a token expires or is revoked mid-session,
// clear auth and send the user to the login page instead of leaving the UI
// showing stale data with silently-failing requests forever.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch { /* storage unavailable */ }
      // Avoid a redirect loop if we're already on the auth page (e.g. a failed login).
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.assign("/");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
