import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: '/api/bot', // Proxy in vite.config.js handles the redirect to localhost:5000
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to inject the JWT token
api.interceptors.request.use(
  (config) => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const { token } = JSON.parse(userInfo);
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- API Functions ---

export const startBot = async (config) => {
  const response = await api.post('/start', config);
  return response.data;
};

export const stopBot = async () => {
  const response = await api.post('/stop');
  return response.data;
};

export const fetchBotStatus = async () => {
  const response = await api.get('/status');
  return response.data;
};

export const fetchBotLogs = async (limit = 100) => {
  const response = await api.get(`/logs?limit=${limit}`);
  return response.data;
};

// 🚀 NEW: Fetch the "Certified Golden" strategies from Python
export const fetchWinners = async () => {
  const response = await api.get('/winners');
  return response.data;
};
