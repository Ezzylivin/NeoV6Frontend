// File: src/api/bot.js
// 🚀 UPGRADE: v2.1 - Added Reset & User Context Support
// 🛠 Fixes: Adds resetBot() function.
// 🛠 Fixes: Updates other functions to accept 'params' or 'data' (required for passing userId).

import api from './apiClient';

// 🚀 API DEFINITIONS

// GET /api/bot/status
// Now accepts params (e.g., { userId: "0x123..." })
export const getBotStatus = async (params = {}) => {
    const res = await api.get('/bot/status', { params });
    return res.data;
};

// GET /api/bot/logs
// Now accepts params (e.g., { userId: "0x123...", limit: 100 })
export const getBotLogs = async (params = {}) => {
    const res = await api.get('/bot/logs', { params });
    return res.data;
};

// GET /api/bot/winners
export const getWinners = async () => {
    const res = await api.get('/bot/winners');
    return res.data;
};

// POST /api/bot/start
export const startBot = async (config) => {
    const res = await api.post('/bot/start', config);
    return res.data;
};

// POST /api/bot/stop
// Now accepts data (e.g., { userId: "0x123..." })
export const stopBot = async (data = {}) => {
    const res = await api.post('/bot/stop', data);
    return res.data;
};

// 🆕 POST /api/bot/reset (Wipes History)
export const resetBot = async (config) => {
    const res = await api.post('/bot/reset', config);
    return res.data;
};

export const closePosition = async (data = {}) => {
    const res = await api.post('/bot/close-position', data);
    return res.data;
};
