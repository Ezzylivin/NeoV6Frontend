// File: src/hooks/useStrategies.js
import { useState, useEffect, useCallback } from "react";
import api from "../api/apiClient.js";

export function useStrategies() {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Fetch all strategies for the user
  const getStrategies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/strategy");
      setStrategies(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to fetch strategies.");
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Initial load
  useEffect(() => {
    getStrategies();
  }, [getStrategies]);

  // --- Create a new strategy
  const createStrategy = async (strategyData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/strategy", strategyData);
      const newStrategy = res.data;
      setStrategies(prev => [newStrategy, ...prev]);
      return newStrategy;
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to create strategy.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- Delete a strategy
  const deleteStrategy = async (id) => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/strategy/${id}`);
      setStrategies(prev => prev.filter(s => s._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to delete strategy.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    strategies,
    loading,
    error,
    createStrategy,
    deleteStrategy,
    refreshStrategies: getStrategies
  };
}
