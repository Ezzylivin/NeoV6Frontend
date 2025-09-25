// File: src/api/backtestSetup.js
// UPGRADED: Normalizes payload to match comboStrategy schema.

import apiClient from './apiClient.js';

/**
 * Creates and saves a new backtest setup "blueprint".
 * @param {object} setupData - The configuration data for the backtest setup.
 */
export const createSetup = async (setupData) => {
  try {
    // Normalize payload to match comboStrategy schema
    const normalized = {
      name: setupData.name,
      description: setupData.description || "",
      strategies: setupData.strategies || [], // array of ObjectIds
      params: {
        combinationRule: setupData.combinationRule,
        symbol: setupData.symbol,
        timeframe: setupData.timeframe,
        startDate: setupData.startDate,
        endDate: setupData.endDate,
        strategyParams: (setupData.strategyParams || []).map((s) => ({
          strategyId: s.strategyId,
          params: s.params || {},
        })),
      },
    };

    const { data } = await apiClient.post('/backtestSetups', normalized);
    return data;
  } catch (error) {
    console.error("createSetup(): failed", error);
    throw error;
  }
};

/**
 * Fetches all saved backtest setups for the current user.
 */
export const fetchSetups = async () => {
  try {
    const { data } = await apiClient.get('/backtestSetups');
    return data;
  } catch (error) {
    console.error("fetchSetups(): failed", error);
    throw error;
  }
};

/**
 * Fetches a single backtest setup by its ID.
 * @param {string} id - The ID of the setup to fetch.
 */
export const fetchSetupById = async (id) => {
  try {
    const { data } = await apiClient.get(`/backtestSetups/${id}`);
    return data;
  } catch (error) {
    console.error(`fetchSetupById(${id}): failed`, error);
    throw error;
  }
};

/**
 * Deletes a specific backtest setup by its ID.
 * @param {string} id - The ID of the setup to delete.
 */
export const deleteSetup = async (id) => {
  try {
    const { data } = await apiClient.delete(`/backtestSetups/${id}`);
    return data;
  } catch (error) {
    console.error(`deleteSetup(${id}): failed`, error);
    throw error;
  }
};
