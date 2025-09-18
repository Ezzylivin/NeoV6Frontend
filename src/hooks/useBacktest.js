// File: src/hooks/useBacktest.js
import { useState, useEffect, useCallback } from "react";
import * as backtestApi from "../api/backtest.js";
import { setAuthToken } from '../api/apiClient.js';

export function useBacktest() {
  const [options, setOptions] = useState({
    strategies: [],
    symbols: [],
    timeframes: [],
    takeProfits: [],
    stopLosses: [],
  });

  const [pastBacktests, setPastBacktests] = useState({ results: [], total: 0 });
  const [initialLoading, setInitialLoading] = useState(true);
  const [singleLoading, setSingleLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Fetch backtest options ---
  const getOptions = useCallback(async () => {
    setError(null);
    try {
      const fetchedOptions = await backtestApi.fetchOptions();
      setOptions(fetchedOptions);
    } catch (err) {
      console.error("Error fetching options:", err);
      setError(err.message || "Failed to fetch options.");
    }
  }, []);

  // --- Fetch past backtests ---
  const getPastBacktests = useCallback(async (page = 1) => {
    setError(null);
    try {
      const data = await backtestApi.fetchAll(page);
      setPastBacktests({ results: data.backtests, total: data.total });
    } catch (err) {
      console.error("Failed to load past backtests:", err);
      setError(err.message || "Failed to load past backtests.");
    }
  }, []);

  // --- Helper: format payload for backend ---
  const formatPayload = (payload, previewOnly = false) => {
    const {
      code,
      pair,
      timeframe,
      startDate,
      endDate,
      tp,
      sl,
      params = {}
    } = payload;

    return {
      code,
      pair,
      timeframe,
      startDate: startDate || null,
      endDate: endDate || null,
      tp: tp ?? null,
      sl: sl ?? null,
      simulateOnly: previewOnly,
      params
    };
  };

  // --- Run single backtest ---
  const runNewBacktest = useCallback(
    async (payload) => {
      setSingleLoading(true);
      setError(null);
      try {
        const formattedPayload = formatPayload(payload, false); // full backtest
        const result = await backtestApi.runBacktest(formattedPayload);
        await getPastBacktests();
        return result;
      } catch (err) {
        console.error("Single backtest failed:", err);
        setError(err.message || "Failed to run backtest.");
        throw err;
      } finally {
        setSingleLoading(false);
      }
    },
    [getPastBacktests]
  );



  // --- Preview strategy ---
  const previewStrategy = useCallback(
    async (payload) => {
      setSingleLoading(true);
      setError(null);
      try {
        const formattedPayload = formatPayload(payload, true); // previewOnly
        return await backtestApi.previewStrategy(formattedPayload);
      } catch (err) {
        console.error("Preview failed:", err);
        setError(err.message || "Failed to preview strategy.");
        throw err;
      } finally {
        setSingleLoading(false);
      }
    },
    []
  );

  // --- Load initial data ---
  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (token) setAuthToken(token);

    setInitialLoading(true);
    Promise.all([getOptions(), getPastBacktests()]).finally(() => setInitialLoading(false));
  }, [getOptions, getPastBacktests]);

  return {
    options,
    pastBacktests,
    initialLoading,
    singleLoading,
    batchLoading,
    error,
    getPastBacktests,
    runNewBacktest,
    runNewBatchBacktest,
    previewStrategy,
  };
}
