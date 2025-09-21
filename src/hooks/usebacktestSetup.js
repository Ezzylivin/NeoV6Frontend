// File: src/hooks/useBacktestSetup.js
// NEW: This hook manages the state and logic for fetching, creating, and deleting saved backtest setups.

import { useState, useEffect, useCallback } from "react";
import * as backtestSetupApi from '../api/backtestSetup.js'; // Import the new API service

export function useBacktestSetup() {
  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Fetches all saved backtest setups ---
  const fetchSetups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await backtestSetupApi.fetchSetups();
      setSetups(data);
    } catch (err) {
      setError(err.message || "Failed to fetch setups.");
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Initial data load when the hook is first used ---
  useEffect(() => {
    fetchSetups();
  }, [fetchSetups]);

  // --- Creates a new backtest setup ---
  const createSetup = async (setupData) => {
    setLoading(true);
    setError(null);
    try {
      const newSetup = await backtestSetupApi.createSetup(setupData);
      // Add the new setup to the top of the list for immediate UI update
      setSetups(prev => [newSetup, ...prev]);
    } catch (err) {
      setError(err.message || "Failed to create setup.");
      throw err; // Re-throw so the component can catch it (e.g., to show an alert)
    } finally {
      setLoading(false);
    }
  };

  // --- Deletes a backtest setup ---
  const deleteSetup = async (id) => {
    setLoading(true);
    setError(null);
    try {
      await backtestSetupApi.deleteSetup(id);
      // Remove the deleted setup from the list for immediate UI update
      setSetups(prev => prev.filter(setup => setup._id !== id));
    } catch (err) {
      setError(err.message || "Failed to delete setup.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- Return all state and functions needed by the UI ---
  return { 
    setups, 
    loading, 
    error, 
    createSetup, 
    deleteSetup,
    refreshSetups: fetchSetups // Expose a manual refresh function
  };
}
