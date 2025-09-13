// File: src/api/bot.js
import apiClient from './apiClient.js';

/**
 * Start the trading bot.
 * The backend gets the userId from the auth token.
 * @param {object} config - { symbol, amount, timeframes, strategy, risk }
 */
export const start = async (config) => {
  // CORRECT: We no longer pass userId in the body.
  const { data } = await apiClient.post('/bot/start', config);
  return data.data;
};

/** Stop the trading bot. */
export const stop = async () => {
  const { data } = await apiClient.post('/bot/stop');
  return data.data;
};

/** Get the current status of the trading bot. */
export const getStatus = async () => {
  const { data } = await apiClient.get('/bot/status');
  return data.data;
};

/** Get the trading bot's performance history. */
export const getHistory = async () => {
    const { data } = await apiClient.get('/bot/history');
    return data.data;
}
