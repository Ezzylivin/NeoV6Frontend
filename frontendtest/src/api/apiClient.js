// File: src/api/apiClient.js (Corrected and Final)

import axios from 'axios';
// 1. Fixed the missing closing brace in the import.
import { API_BASE_URL } from "../components/config.js";

// Create the Axios instance.
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 2. Use an interceptor to dynamically add the auth token to every request.
//    Correctly reference `apiClient`, not `api`.
apiClient.interceptors.request.use(
  (config) => {
    // 3. Get the token from localStorage and assign it to a correctly named variable.
    const token = localStorage.getItem("token");
    
    // 4. Check if the token exists (and fix the typo).
    if (token) {
      // 5. Use backticks (`) for the template literal string.
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    // This part is optional but good practice for handling request errors.
    return Promise.reject(error);
  }
); // 6. Correctly close the .use() function call.

export default apiClient;
