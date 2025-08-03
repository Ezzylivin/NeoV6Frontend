// File: frontend/src/api.js
import axios from 'axios';
import { getToken } from './utils/auth';

const api = axios.create({ baseURL: process.env.REACT_APP_API_URL });

// Interceptor to add the authentication token to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
