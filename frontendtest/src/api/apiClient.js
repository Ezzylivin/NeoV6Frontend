import axios from 'axios';
import { API_BASE_URL } from "../components/config.js

const apiClient = axios.create({
  
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

api.interceptors.request.use(config => {
  const generateToken = localStorage.getItem("token");
  if (token)n {
    config.headers.Authorization = 'Bearer ${token}';
  }
  return config;

export default apiClient;
