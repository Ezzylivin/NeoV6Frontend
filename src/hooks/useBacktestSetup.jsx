// File: src/hooks/useBacktestSetup.js
import { useState, useEffect, useCallback } from "react";
import { fetchSetups as apiGetSetups, createSetup as apiCreateSetup, deleteSetup as apiDeleteSetup } from "../api/backtestSetup.js";

export function useBacktestSetupFunction() {
  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Fetch all saved backtest setups ---
  const getSetups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetSetups();
      setSetups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[useBacktestSetup] getSetups error:", err);
      setError(err.message || "Failed to fetch backtest setups.");
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Load setups on mount ---
  useEffect(() => {
    getSetups();
  }, [getSetups]);

  // --- Create a new setup ---
  const createSetup = async (setupData) => {
    setLoading(true);
    setError(null);
    try {
      const newSetup = await apiCreateSetup(setupData);
      setSetups(prev => [newSetup, ...prev]);
      return newSetup;
    } catch (err) {
      console.error("[useBacktestSetup] createSetup error:", err);
      setError(err.message || "Failed to create backtest setup.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- Delete a setup ---
  const deleteSetup = async (id) => {
    setLoading(true);
    setError(null);

    const previousSetups = [...setups];
    setSetups(prev => prev.filter(s => s._id !== id));

    try {
      await apiDeleteSetup(id);
    } catch (err) {
      console.error("[useBacktestSetup] deleteSetup error:", err);
      setError(err.message || "Failed to delete backtest setup.");
      setSetups(previousSetups); // rollback
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
