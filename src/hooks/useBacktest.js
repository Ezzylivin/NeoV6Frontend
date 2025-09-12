import { useState, useEffect } from "react";
import axios from "axios";

// This is the real API base URL provided by your backend.
const API_BASE = "https://neov6backend.onrender.com/api/backtests";

export function useBacktest() {
  const [options, setOptions] = useState({
    symbols: ["BTC/USDT"],
    strategies: [{ name: "Default Strategy", params: {} }],
    timeframes: ["1h"],
    balances: [1000],
    risks: ["Medium"],
    positions: ["Both"],
    takeProfits: [0],
    stopLosses: [0],
    availableDates: {},
  });

  // A single loading state for all API calls
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentBacktest, setCurrentBacktest] = useState(null);
  const [batchResults, setBatchResults] = useState([]);

  // A default set of realism options
  const defaultRealism = {
    useNews: false,
    useSlippage: true,
    useSpread: true,
    useRandomEvents: false,
    slippage_bps: 5,
  };

  // Fetch options from the backend when the component mounts
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const { data: response } = await axios.get(`${API_BASE}/options`);
        const data = response.data;
        
        setOptions({
          symbols: data?.symbols?.length ? data.symbols : ["BTC/USDT"],
          strategies: data?.strategies?.length ? data.strategies : [{ name: "Default Strategy", params: {} }],
          timeframes: data?.timeframes?.length ? data.timeframes : ["1h"],
          balances: data?.balances?.length ? data.balances : [1000],
          risks: data?.risks?.length ? data.risks : ["Medium"],
          positions: data?.positions?.length ? data.positions : ["Both"],
          takeProfits: data?.takeProfits?.length ? data.takeProfits : [0],
          stopLosses: data?.stopLosses?.length ? data.stopLosses : [0],
          availableDates: data?.availableDates || {},
        });
        setError(null);
      } catch (err) {
        console.error("❌ fetchBacktestOptions failed:", err);
        setError("Failed to load backtest options, using defaults");
      }
    };
    loadOptions();
  }, []);

  // Run a single backtest
  const runBacktest = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data: response } = await axios.post(`${API_BASE}/run`, payload);
      const backtestData = response.data;
      
      setCurrentBacktest(backtestData);
      return backtestData;
    } catch (err) {
      console.error("❌ runBacktest failed:", err);
      const errorMessage = err.response?.data?.message || "Failed to run single backtest";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Run a batch of backtests
  const runBatchBacktests = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data: response } = await axios.post(`${API_BASE}/run-batch`, payload);
      const batchData = response.data;
      
      setBatchResults(batchData);
      return batchData;
    } catch (err) {
      console.error("❌ runBatchBacktests failed:", err);
      const errorMessage = err.response?.data?.message || "Failed to run batch backtests";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    options,
    loading,
    error,
    currentBacktest,
    runBacktest,
    batchResults,
    runBatchBacktests,
    defaultRealism,
  };
}
