// File: src/hooks/useBacktestSetup.js
// UPGRADED: Handles fetching, creating, deleting, and refreshing saved backtest setups with optimistic UI updates.

import { useState, useEffect, useCallback } from "react";
import * as backtestSetupApi from '../api/backtestSetup.js';

export function useBacktestSetupFunction() {
  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Fetch all saved backtest setups from the backend ---
  const getSetups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await backtestSetupApi.getSetups();
      // Ensure we always have an array
      setSetups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[useBacktestSetup] getSetups error:", err);
      setError(err.message || "Failed to fetch backtest setups.");
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Initial load ---
  useEffect(() => {
    getSetups();
  }, [getSetups]);

  // --- Create a new backtest setup ---
  const createSetup = async (setupData) => {
    setLoading(true);
    setError(null);
    try {
      const newSetup = await backtestSetupApi.createSetup(setupData);

      // Optimistic UI update: prepend the new setup
      setSetups(prev => [newSetup, ...prev]);
      return newSetup; // Return the created setup for immediate use in UI
    } catch (err) {
      console.error("[useBacktestSetup] createSetup error:", err);
      setError(err.message || "Failed to create backtest setup.");
      throw err; // allow component to handle it (alerts/toasts)
    } finally {
      setLoading(false);
    }
  };

  // --- Delete a backtest setup ---
  const deleteSetup = async (id) => {
    setLoading(true);
    setError(null);
    // Optimistically remove it from UI
    const previousSetups = [...setups];
    setSetups(prev => prev.filter(s => s._id !== id));

    try {
      await backtestSetupApi.deleteSetup(id);
    } catch (err) {
      console.error("[useBacktestSetup] deleteSetup error:", err);
      setError(err.message || "Failed to delete backtest setup.");
      // Rollback in case of failure
      setSetups(previousSetups);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- Expose all state and functions for the component ---
  return {
    setups,
    loading,
    error,
    createSetup,
    deleteSetup,
    refreshSetups: getSetups
  };
}
