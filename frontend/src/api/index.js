// frontend/src/api/index.js

import axios from 'axios';
import { getToken } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// Add JWT token to every request if available
axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const login = (email, password) =>
  axiosInstance.post('/auth/login', { email, password });

export const register = (email, password) =>
  axiosInstance.post('/auth/register', { email, password });

// User APIs
export const saveApiKeys = (apiKey, apiSecret) =>
  axiosInstance.post('/user/keys', { apiKey, apiSecret });

// Bot APIs
export const startBot = (symbol, amount, timeframes) =>
  axiosInstance.post('/bot/start', { symbol, amount, timeframes });

export const stopBot = () =>
  axiosInstance.post('/bot/stop');

// Backtest API
export const runBacktest = () =>
  axiosInstance.get('/backtest'); // You might need to add this route in backend if not exists

// Add more APIs as needed
