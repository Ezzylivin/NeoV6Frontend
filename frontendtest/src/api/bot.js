// File: src/api/bot.js
import apiClient from './apiClient.js'; // axios instance with baseURL & headers pre-configured

// Start the trading bot
export const startBot = async (symbol, amount, timeframes) => {
  try {
    const response = await apiClient.post('/bot/start', { symbol, amount, timeframes });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to start bot');
  }
};

// Stop the trading bot
export const stopBot = async () => {
  try {
    const response = await apiClient.post('/bot/stop');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to stop bot');
  }
};

// Get the current status of the trading bot
export const getBotStatus = async () => {
  try {
    const response = await apiClient.get('/bot/status');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to get bot status');
  }
};
