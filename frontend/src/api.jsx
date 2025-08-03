// File: frontend/src/api.js
import axios from 'axios';
import { getToken } from './utils/auth';

// File: frontend/src/api.js
const api = axios.create({ 
  baseURL: `${import.meta.env.VITE_API_URL}/api` 
});

// Interceptor to add the authentication token to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
