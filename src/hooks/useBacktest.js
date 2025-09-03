// File: src/hooks/useBacktest.js
import { useState } from "react";
import axios from "axios";

export function useBacktest() {
  const API_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com/api";

  const [results, setResults] = useState([]);
  const [best, setBest] = useState(null);
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch available backtest options from backend
  const fetchOptions = async () => {
    try {
      const res = await axios.get(`${API_URL}/backtests/options`);
      if (res.data.success) {
        setOptions(res.data.options);
      }
    } catch (err) {
      console.error("Fetch options failed:", err);
      setError(err.message);
    }
  };

  // Fetch all backtests for the current user
  const fetchBacktests = async (userId) => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API_URL}/backtests`, { params: { userId } });
      if (res.data.success) {
        setResults(res.data.backtests);
      }
    } catch (err) {
      console.error("Fetch backtests failed:", err);
      setError(err.message);
    }
  };

  // Run single backtest
  const runBacktest = async (userId, formData) => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/backtests/run`, { userId, ...formData });
      setLoading(false);
      return res.data;
    } catch (err) {
      setLoading(false);
      console.error("Run backtest failed:", err);
      setError(err.message);
      throw err;
    }
  };

  // Run batch backtests
  const runBatchBacktests = async (combos, userId) => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/backtests/batch`, { userId, combos });
      setLoading(false);
      if (res.data.success) setBest(res.data.best);
      return res.data;
    } catch (err) {
      setLoading(false);
      console.error("Run batch backtests failed:", err);
      setError(err.message);
      throw err;
    }
  };

  return {
    results,
    best,
    options,
    loading,
    error,
    fetchOptions,
    fetchBacktests,
    runBacktest,
    runBatchBacktests
  };
}
