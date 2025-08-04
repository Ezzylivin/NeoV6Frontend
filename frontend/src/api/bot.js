// File: src/api/bot.js
import api from './index';

export const startBot = async (symbol, amount, timeframes) => {
  const response = await api.post('/bot/start', { symbol, amount, timeframes });
  return response.data;
};

export const stopBot = async () => {
  const response = await api.post('/bot/stop');
  return response.data;
};
