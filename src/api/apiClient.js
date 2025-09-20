import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://neov6backend.onrender.com/api',
  headers: {
    "Content-Type": "application/json",
  },
});

export const setAuthToken = (token) => {
  // ✅ ADDED: This log will show the exact token value being used.
  console.log("Setting auth token:", token);

  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

export default api;
