import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: '/api/bot', // Proxy in vite.config.js handles the redirect
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- REQUEST INTERCEPTOR (Inject Token) ---
api.interceptors.request.use(
  (config) => {
    // 1. Get raw data from storage
    const userInfo = localStorage.getItem('userInfo');
    
    // 🔍 DEBUG LOGS (Check your browser console for these!)
    // console.log("🔐 [Auth Debug] Raw Storage:", userInfo); 

    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo);
        // 2. Extract token (Adjust this if your object structure is different)
        const token = parsed.token; 

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          // console.log("✅ [Auth Debug] Token attached."); 
        } else {
          console.warn("⚠️ [Auth Debug] UserInfo found, but NO TOKEN property.");
        }
      } catch (err) {
        console.error("❌ [Auth Debug] Failed to parse userInfo:", err);
      }
    } else {
      console.warn("⚠️ [Auth Debug] No userInfo in localStorage. Are you logged in?");
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- RESPONSE INTERCEPTOR (Handle 401s) ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.error("🔒 [Auth Error] 401 Unauthorized. Your session may have expired.");
      // Optional: Redirect to login if this happens consistently
      // window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
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

// 🚀 Fetch the "Certified Golden" strategies
export const fetchWinners = async () => {
  const response = await api.get('/winners');
  return response.data;
};
