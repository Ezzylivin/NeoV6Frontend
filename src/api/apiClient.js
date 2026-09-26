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

export default api;
