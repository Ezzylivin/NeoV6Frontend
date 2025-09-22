// File: src/hooks/useBacktestSetup.js
// FIXED: Properly return setups so they appear in dropdowns

import { useState, useEffect, useCallback } from "react";
import * as backtestSetupApi from '../api/backtestSetup.js';

export function useBacktestSetupFunction() {
  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Fetch all setups for the user
  const getSetups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await backtestSetupApi.getSetups();
      setSetups(Array.isArray(data) ? data : []); // Ensure array
    } catch (err) {
      setError(err.message || "Failed to fetch setups.");
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Initial load
  useEffect(() => {
    getSetups();
  }, [getSetups]);

  // --- Create a new setup
  const createSetup = async (setupData) => {
    setLoading(true);
    setError(null);
    try {
      const newSetup = await backtestSetupApi.createSetup(setupData);
      setSetups(prev => [newSetup, ...prev]); // Add to top
    } catch (err) {
      setError(err.message || "Failed to create setup.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- Delete a setup
  const deleteSetup = async (id) => {
    setLoading(true);
    setError(null);
    try {
      await backtestSetupApi.deleteSetup(id);
      setSetups(prev => prev.filter(s => s._id !== id));
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
    refreshSetups: getSetups
  };
}
