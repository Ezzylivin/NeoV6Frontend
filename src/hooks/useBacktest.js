// File: src/hooks/useBacktest.js
import { useState } from "react";
import axios from "axios";

// Adjust to your backend URL
const API_BASE = import.meta.env.VITE_API_BASE || "https://neov6backend.onrender.com/api";

export function useBacktest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Get available backtest options ---
  const fetchOptions = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/backtests/options`);
      return data;
    } catch (err) {
      console.error("Fetch options failed", err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- Run a single backtest ---
  const runBacktest = async (config) => {
    try {
      setLoading(true);
      const { data } = await axios.post(`${API_BASE}/backtests/run`, config);
      return data;
    } catch (err) {
      console.error("Run backtest failed", err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- Run batch backtests ---
  const runBatchBacktests = async (userId, configs) => {
    try {
      setLoading(true);
      const { data } = await axios.post(`${API_BASE}/backtests/batch`, {
        userId,   // required by backend
        configs,  // must be an array of config objects
      });
      return data;
    } catch (err) {
      console.error("Run batch backtests failed", err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- Get all backtests for a user ---
  const fetchUserBacktests = async (userId) => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/backtests`, {
        params: { userId },
      });
      return data;
    } catch (err) {
      console.error("Fetch user backtests failed", err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    fetchOptions,
    runBacktest,
    runBatchBacktests,
    fetchUserBacktests,
  };
}
