// File: src/api/backtestSetup.js
// NEW: This file provides the frontend functions to interact with the backtest setup API.

import apiClient from './apiClient.js';

/**
 * Creates and saves a new backtest setup "blueprint".
 * @param {object} setupData - The configuration data for the backtest setup.
 */
export const createSetup = async (setupData) => {
  try {
    const { data } = await apiClient.post('/backtest-setups', setupData);
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
    const { data } = await apiClient.get('/backtest-setups');
    return data;
  } catch (error) {
    console.error("fetchSetups(): failed", error);
    throw error;
  }
};

/**
 * Deletes a specific backtest setup by its ID.
 * @param {string} id - The ID of the setup to delete.
 */
export const deleteSetup = async (id) => {
  try {
    const { data } = await apiClient.delete(`/backtest-setups/${id}`);
    return data;
  } catch (error) {
    console.error(`deleteSetup(${id}): failed`, error);
    throw error;
  }
};
