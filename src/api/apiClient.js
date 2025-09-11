import axios from "axios";

// Base URL for API calls (from VITE_API_URL)
const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // ensures cookies / credentials are sent
});

// Utility to set/remove JWT auth token
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

// Optional: intercept requests to handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Example: auto-logout or redirect to login
      console.warn("Unauthorized, token may be invalid or expired");
      // Optionally remove token
      setAuthToken(null);
    }
    return Promise.reject(error);
  }
);

export default api;
