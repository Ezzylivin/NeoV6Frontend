// File: src/hooks/useBacktestSetup.js
import { useState, useEffect, useCallback } from "react";
import * as backtestSetupApi from '../api/backtestSetup.js'; // API service

export function useBacktestSetup() { 
  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Fetch all saved backtest setups ---
  const getSetups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await backtestSetupApi.getSetups();
      setSetups(data); // update state with all setups
    } catch (err) {
      setError(err.message || "Failed to fetch setups.");
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
      // Add new setup to top of list
      setSetups(prev => [newSetup, ...prev]);
    } catch (err) {
      setError(err.message || "Failed to create setup.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- Delete a backtest setup ---
  const deleteSetup = async (id) => {
    setLoading(true);
    setError(null);
    try {
      await backtestSetupApi.deleteSetup(id);
      setSetups(prev => prev.filter(setup => setup._id !== id));
    } catch (err) {
      setError(err.message || "Failed to delete setup.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    setups,
    loading,
    error,
    createSetup,
    deleteSetup,
    refreshSetups: getSetups // manual refresh
  };
}
