// File: src/api/bot.js
import api from './index';

export const startBot = (symbol, amount, timeframes) =>
  api.post('/bot/start', { symbol, amount, timeframes });

export const stopBot = () => api.post('/bot/stop');

export const getBotStatus = () => api.get('/bot/status'); // Optional: Bot live status
