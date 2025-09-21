// File: src/api/bot.js
// UPGRADED: This file is now fully synchronized with the backend bot routes and services.

import apiClient, { setAuthToken } from './apiClient.js';

/**
 * Starts the trading bot with a specific configuration.
 * @param {object} config - The bot configuration object.
 * @param {string} config.strategyId - The ID of the strategy to run.
 * @param {string} config.symbol - The symbol to trade (e.g., 'BTC-USD').
 * @param {string} config.timeframe - The timeframe to trade on (e.g., '1h').
 * @param {number} config.capitalAllocation - The amount of capital to allocate.
 */
export const start = async (config) => {
  // Ensure the request is authenticated
  setAuthToken(localStorage.getItem('userToken'));
  // Send the correct payload to the backend
  const { data } = await apiClient.post('/bot/start', config);
  return data; // The backend returns the full bot object on success
};

/**
 * Stops the user's currently running trading bot.
 */
export const stop = async () => {
  setAuthToken(localStorage.getItem('userToken'));
  const { data } = await apiClient.post('/bot/stop');
  return data;
};

/**
 * Gets the current status and configuration of the user's trading bot.
 */
export const getStatus = async () => {
  setAuthToken(localStorage.getItem('userToken'));
  const { data } = await apiClient.get('/bot/status');
  return data;
};

/**
 * Gets the trading bot's most recent activity logs.
 * ✅ RENAMED and UPGRADED to match the backend.
 */
export const getLogs = async () => {
  setAuthToken(localStorage.getItem('userToken'));
  // Calls the correct '/bot/logs' endpoint
  const { data } = await apiClient.get('/bot/logs');
  return data;
}
