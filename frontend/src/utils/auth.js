// ===============================
// 1. utils/auth.js
// ===============================
// Improved token handling using a constant key reference
export const TOKEN_KEY = 'access_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);
export const isAuthenticated = () => !!getToken();
