// File: src/api/apiClient.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com/api",
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

export default api;
