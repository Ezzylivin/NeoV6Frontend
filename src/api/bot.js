// File: src/api/bot.js
// UPGRADED: Renamed functions to follow the application's standard naming convention (e.g., fetch..., start...).

import apiClient from './apiClient.js';

/**
 * Starts the trading bot with a specific configuration.
 * @param {object} config - The bot configuration object.
 */
export const startBot = async (config) => {
  const { data } = await apiClient.post('/bot/start', config);
  return data;
};

/**
 * Stops the user's currently running trading bot.
 */
export const stopBot = async () => {
  const { data } = await apiClient.post('/bot/stop');
  return data;
};

/**
 * Gets the current status and configuration of the user's trading bot.
 */
export const fetchBotStatus = async () => {
  const { data } = await apiClient.get('/bot/status');
  return data;
};

/**
 * Gets the trading bot's most recent activity logs.
 */
export const fetchBotLogs = async () => {
  const { data } = await apiClient.get('/bot/logs');
  return data;
}

