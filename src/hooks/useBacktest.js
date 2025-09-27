// File: src/hooks/useBacktest.js
import { useReducer, useCallback, useEffect } from "react";
import * as backtestApi from "../api/backtest.js";

// --- State Management with Reducer ---
const initialState = {
  options: { strategies: [], symbols: [], timeframes: [] },
  pastBacktests: { results: [], total: 0 },
  loading: "idle", // 'idle', 'initial', 'fetching', 'running', 'running_combo'
  error: null, // Will store { status, message }
};

function backtestReducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload, error: null };
    case "SET_ERROR":
      return { ...state, loading: "idle", error: action.payload };
    case "SET_INITIAL_DATA":
      return {
        ...state,
        options: action.payload.options,
        pastBacktests: {
          results: action.payload.pastBacktests.backtests,
          total: action.payload.pastBacktests.total,
        },
        loading: "idle",
      };
    case "SET_PAST_BACKTESTS":
      return {
        ...state,
        pastBacktests: {
          results: action.payload.backtests,
          total: action.payload.total,
        },
        loading: "idle",
      };
    case "DELETE_BACKTEST_OPTIMISTIC":
      return {
        ...state,
        pastBacktests: {
          ...state.pastBacktests,
          results: state.pastBacktests.results.filter(
            (b) => b._id !== action.payload
          ),
        },
      };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

export function useBacktest() {
  const [state, dispatch] = useReducer(backtestReducer, initialState);

  const getPastBacktests = useCallback(async (page = 1) => {
    dispatch({ type: "SET_LOADING", payload: "fetching" });
    try {
      const data = await backtestApi.fetchAll(page);
      dispatch({ type: "SET_PAST_BACKTESTS", payload: data });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err });
    }
  }, []);

  const getBacktestById = useCallback(async (id) => {
    dispatch({ type: "SET_LOADING", payload: "fetching" });
    try {
      return await backtestApi.fetchById(id);
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err });
      throw err;
    } finally {
      dispatch({ type: "SET_LOADING", payload: "idle" });
    }
  }, []);

  const deleteBacktest = useCallback(
    async (id) => {
      const originalBacktests = state.pastBacktests;
      dispatch({ type: "DELETE_BACKTEST_OPTIMISTIC", payload: id });

      try {
        await backtestApi.deleteById(id);
      } catch (err) {
        // Revert on failure
        dispatch({ type: "SET_PAST_BACKTESTS", payload: originalBacktests });
        dispatch({ type: "SET_ERROR", payload: err });
        throw err;
      }
    },
    [state.pastBacktests]
  );

  // ✅ Added: runNewBacktest for single-strategy execution
  const runNewBacktest = useCallback(async (payload) => {
    dispatch({ type: "SET_LOADING", payload: "running" });
    try {
      if (!payload.strategy) {
        throw new Error("A strategy must be provided.");
      }

      const correctedPayload = {
        ...payload,
        strategy: {
          code:
            typeof payload.strategy === "string"
              ? payload.strategy
              : payload.strategy.code,
          params:
            typeof payload.strategy === "string"
              ? {}
              : payload.strategy.params || {},
        },
        initialBalance: payload.initialBalance || 1000,
      };

      console.log(
        "👉 Final single backtest payload sent:",
        JSON.stringify(correctedPayload, null, 2)
      );

      return await backtestApi.runNewBacktest(correctedPayload);
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err });
      throw err;
    } finally {
      dispatch({ type: "SET_LOADING", payload: "idle" });
    }
  }, []);

 const runComboBacktest = useCallback(async (payload) => {
  dispatch({ type: 'SET_LOADING', payload: 'running_combo' });
  try {
    if (!payload.strategies || payload.strategies.length === 0) {
      throw new Error("At least one strategy must be selected.");
    }

    // ✅ Ensure each strategy has a valid strategyType
    const normalizedStrategies = payload.strategies.map(s => {
      const params = s.params || {};
      if (!params.strategyType) {
        if (s.code === "atrtest1") {
          params.strategyType = "ATR";
          params.period = params.period || 14;
          params.multiplier = params.multiplier || 2;
        }
        if (s.code === "test_for_single") {
          params.strategyType = "Moving Average Crossover";
          params.shortPeriod = params.shortPeriod || 10;
          params.longPeriod = params.longPeriod || 50;
        }
      }
      return { code: s.code, params };
    });

    const correctedPayload = {
      ...payload,
      strategies: normalizedStrategies,
      initialBalance: payload.initialBalance || 1000
    };

    console.log("👉 Final combo payload sent:", JSON.stringify(correctedPayload, null, 2));

    return await backtestApi.runComboBacktest(correctedPayload);
  } catch (err) {
    dispatch({ type: 'SET_ERROR', payload: err });
    throw err;
  } finally {
    dispatch({ type: 'SET_LOADING', payload: 'idle' });
  }
}, []);


  const previewStrategy = useCallback(async (payload) => {
    dispatch({ type: "SET_LOADING", payload: "running" });
    try {
      return await backtestApi.previewStrategy(payload);
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err });
      throw err;
    } finally {
      dispatch({ type: "SET_LOADING", payload: "idle" });
    }
  }, []);

  // Initial data load effect
  useEffect(() => {
    const fetchInitialData = async () => {
      dispatch({ type: "SET_LOADING", payload: "initial" });
      try {
        const [options, pastBacktests] = await Promise.all([
          backtestApi.fetchOptions(),
          backtestApi.fetchAll(1),
        ]);
        dispatch({
          type: "SET_INITIAL_DATA",
          payload: { options, pastBacktests },
        });
      } catch (err) {
        dispatch({ type: "SET_ERROR", payload: err });
      }
    };
    fetchInitialData();
  }, []);

  return {
    state,
    getPastBacktests,
    getBacktestById,
    deleteBacktest,
    runNewBacktest, // ✅ Now properly defined
    runComboBacktest,
    previewStrategy,
  };
}
