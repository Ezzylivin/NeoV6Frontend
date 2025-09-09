// File: src/hooks/useBacktest.js
import { useState, useEffect } from "react";
import {
  fetchBacktestOptions,
  runBacktest as apiRunBacktest,
  runBatchBacktests as apiRunBatchBacktests,
} from "../api/backtest.js";

export function useBacktest() {
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentBacktest, setCurrentBacktest] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [defaultRealism, setDefaultRealism] = useState({
    useSlippage: true,
    useSpread: true,
    useNews: true,
    randomEventProb: 0.005,
    slippage_bps: 5,
  });

  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  // Fetch options on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const data = await fetchBacktestOptions();
        setOptions(data);
      } catch (err) {
        console.error("[Hook] fetchBacktestOptions failed:", err);
        setError("Failed to load backtest options.");
      }
    };
    fetchOptions();
  }, []);

  // Run single backtest
  const runBacktest = async (payload) => {
    setLoading(true);
    setError("");
    try {
      const cleanPayload = {
        ...payload,
        startDate: payload.startDate || undefined,
        endDate: payload.endDate || undefined,
      };
      console.log(
        "[Hook] runBacktest outgoing payload:",
        JSON.stringify(cleanPayload, null, 2)
      ); // 👈 log payload here
      const result = await apiRunBacktest(cleanPayload);
      setCurrentBacktest(result);
      return result;
    } catch (err) {
      console.error("[Hook] runBacktest failed:", err);
      setError(err.message || "Backtest failed");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Run batch backtests
  const runBatchBacktests = async (payload) => {
    setLoading(true);
    setError("");
    try {
      const cleanPayload = {
        ...payload,
        startDate: payload.startDate || undefined,
        endDate: payload.endDate || undefined,
      };
      console.log(
        "[Hook] runBatchBacktests outgoing payload:",
        JSON.stringify(cleanPayload, null, 2)
      ); // 👈 log payload here
      const { results } = await apiRunBatchBacktests(cleanPayload);
      setBatchResults(results);
      return results;
    } catch (err) {
      console.error("[Hook] runBatchBacktests failed:", err);
      setError(err.message || "Batch backtests failed");
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Optional: utility to update date range in state
  const updateDateRange = (startDate, endDate) => {
    setDateRange({
      startDate: startDate || "",
      endDate: endDate || "",
    });
  };

  return {
    options,
    loading,
    error,
    currentBacktest,
    batchResults,
    defaultRealism,
    dateRange,
    runBacktest,
    runBatchBacktests,
    updateDateRange,
  };
}
