// File: src/api/bot.js
import api from './apiClient';

// 🚀 API DEFINITIONS
export const getBotStatus = async () => {
    const res = await api.get('/bot/status');
    return res.data;
};

export const getBotLogs = async (limit = 100) => {
    const res = await api.get(`/bot/logs?limit=${limit}`);
    return res.data;
};

export const getWinners = async () => {
    const res = await api.get('/bot/winners');
    return res.data;
};

export const startBot = async (config) => {
    const res = await api.post('/bot/start', config);
    return res.data;
};

export const stopBot = async () => {
    const res = await api.post('/bot/stop');
    return res.data;
};
