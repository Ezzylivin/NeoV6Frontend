// File: src/hooks/useBacktest.js
import { useState } from "react";
import api from "../utils/api.js"; // Axios instance

export const useBacktest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // --- Single backtest ---
  const runSingleBacktest = async ({ strategyId, symbol, timeframe, startDate, endDate }) => {
    setLoading(true);
    setError(null);
    try {
      if (!strategyId || !symbol || !timeframe || !startDate || !endDate) {
        throw new Error("Missing required parameters for single backtest");
      }

      const response = await api.post("/api/backtest/single", {
        strategyId,
        symbol,
        timeframe,
        startDate,
        endDate,
      });

      setResult(response.data);
      return response.data;
    } catch (err) {
      console.error("runSingleBacktest error:", err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- Combo backtest ---
  const runComboBacktest = async ({ combinationRule, symbol, timeframe, startDate, endDate, strategyParams }) => {
    setLoading(true);
    setError(null);
    try {
      if (!combinationRule || !symbol || !timeframe || !startDate || !endDate) {
        throw new Error("Missing required parameters for combo backtest");
      }
      if (!Array.isArray(strategyParams) || strategyParams.length < 2) {
        throw new Error("At least 2 strategies are required for a combined backtest");
      }

      // --- Prepare payload exactly for backend ---
      const payload = {
        params: {
          combinationRule,
          symbol,
          timeframe,
          startDate,
          endDate,
          strategyParams: strategyParams.map((s) => ({
            strategyId: s._id || s.strategyId,
            params: s.params || {},
          })),
        },
      };

      const response = await api.post("/api/backtest/combo", payload);

      setResult(response.data);
      return response.data;
    } catch (err) {
      console.error("runComboBacktest() failed", err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    result,
    runSingleBacktest,
    runComboBacktest,
  };
};
