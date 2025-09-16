// File: src/hooks/useBacktest.js
import { useState, useEffect, useCallback } from "react";
import * as backtestApi from "../api/backtest.js";

export function useBacktest() {
  const [options, setOptions] = useState({ strategies: [], symbols: [], timeframes: [], takeProfits: [0.5,1,1.5,2,3], stopLosses: [0.5,1,1.5,2,3] });
  const [pastBacktests, setPastBacktests] = useState({ results: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getOptions = useCallback(async () => {
    try {
      const data = await backtestApi.fetchOptions();
      setOptions(prev => ({ ...prev, ...data }));
    } catch (err) {
      setError("Failed to load backtest options.");
    }
  }, []);

  const getPastBacktests = useCallback(async (page = 1) => {
    try {
      const data = await backtestApi.fetchAll(page);
      setPastBacktests({ results: data.backtests, total: data.total });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load past backtests.");
    }
  }, []);

  const runNewBacktest = useCallback(async (payload) => {
    setLoading(true); setError(null);
    try {
      const res = await backtestApi.runBacktest(payload);
      await getPastBacktests();
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to run backtest.");
      throw err;
    } finally { setLoading(false); }
  }, [getPastBacktests]);

  const runNewBatchBacktest = useCallback(async (configs) => {
    setLoading(true); setError(null);
    try {
      const res = await backtestApi.runBatch(configs);
      await getPastBacktests();
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to run batch backtests.");
      throw err;
    } finally { setLoading(false); }
  }, [getPastBacktests]);

  useEffect(() => { getOptions(); getPastBacktests(); }, [getOptions, getPastBacktests]);

  return { options, pastBacktests, loading, error, getPastBacktests, runNewBacktest, runNewBatchBacktest };
}
