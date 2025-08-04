// File: src/api/index.js
import axios from 'axios';
import { getToken } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
