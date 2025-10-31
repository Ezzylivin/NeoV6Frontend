// File: src/hooks/useBacktest.js
//
// 🚀 UN-MOCKED: This file is now 100% functional.
// It correctly calls the restored `backtestApiService.js`
// to fetch, run, and delete backtests from your Node.js backend.

import { useReducer, useCallback, useEffect } from "react";
// 🚀 Import the full, correct API service
import * as backtestApi from "../services/backtestApiService.js";

// --- State Management with Reducer ---
const initialState = {
    options: {
        strategies: [],
        symbols: [],
        timeframes: [],
        models: []
    },
    pastBacktests: { results: [], total: 0 },
    loading: 'initial', // 'initial', 'idle', 'fetching', 'running_backtest', 'running_ml'
    error: null,
};

function backtestReducer(state, action) {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, loading: action.payload, error: null };
        case 'SET_ERROR':
            return { ...state, loading: 'idle', error: action.payload };
        case 'SET_INITIAL_DATA':
            return {
                ...state,
                options: action.payload.options,
                pastBacktests: {
                    results: action.payload.pastBacktests.backtests,
                    total: action.payload.pastBacktests.total,
                },
                loading: 'idle',
                error: null,
            };
        case 'SET_PAST_BACKTESTS':
            return {
                ...state,
                pastBacktests: {
                    results: action.payload.backtests,
                    total: action.payload.total,
                },
                loading: 'idle',
                error: null,
            };
        case 'DELETE_BACKTEST_OPTIMISTIC': { 
            const newState = {
                ...state,
                pastBacktests: {
                    ...state.pastBacktests,
                    results: state.pastBacktests.results.filter(b => b._id !== action.payload),
                    total: Math.max(0, state.pastBacktests.total - 1),
                },
            };
            action.meta = { originalPastBacktests: state.pastBacktests };
            return newState;
         }
        case 'ROLLBACK_DELETE':
             console.warn("Rolling back optimistic delete for backtest:", action.meta.deletedId);
             return {
                 ...state,
                 pastBacktests: action.meta.originalPastBacktests,
                 error: action.payload
             };
        default:
            console.error(`Unhandled action type: ${action.type}`);
            return state;
    }
}

export function useBacktest() {
    const [state, dispatch] = useReducer(backtestReducer, initialState);

    // 🚀 Fetch past backtests (paginated) - UN-MOCKED
    const getPastBacktests = useCallback(async (page = 1) => {
        dispatch({ type: "SET_LOADING", payload: "fetching" });
        try {
            // ✅ This now correctly calls your API service
            const data = await backtestApi.fetchAll(page); 
            dispatch({ type: "SET_PAST_BACKTESTS", payload: data });
        } catch (err) {
            dispatch({ type: "SET_ERROR", payload: err });
        }
    }, []);

    // 🚀 Fetch details of a single backtest - UN-MOCKED
    const getBacktestById = useCallback(async (id) => {
        dispatch({ type: "SET_LOADING", payload: "fetching" });
        try {
            // ✅ This now correctly calls your API service
            const data = await backtestApi.fetchById(id);
            dispatch({ type: "SET_LOADING", payload: "idle" });
            return data;
        } catch (err) {
            dispatch({ type: "SET_ERROR", payload: err });
            throw err;
        }
    }, []);

    // 🚀 Delete a backtest - UN-MOCKED
    const deleteBacktest = useCallback(async (id) => {
         const originalState = state.pastBacktests;
         dispatch({ type: "DELETE_BACKTEST_OPTIMISTIC", payload: id, meta: { originalPastBacktests: originalState } });
         try {
            // ✅ This now correctly calls your API service
            await backtestApi.deleteById(id);
         } catch (err) {
             dispatch({ type: "ROLLBACK_DELETE", payload: err, meta: { originalPastBacktests: originalState, deletedId: id } });
             throw err;
         }
    }, [state.pastBacktests]);


    // --- BACKTEST EXECUTION FUNCTIONS ---

    // Run a new single-strategy backtest
    const runNewBacktest = useCallback(async (payload) => {
        if (payload.mlMode !== 'on' && !payload?.code) {
             const error = new Error("A strategy 'code' is required for non-ML backtests.");
             dispatch({ type: "SET_ERROR", payload: error });
             throw error;
         }
        const loadingState = payload.mlMode !== 'off' ? 'running_ml' : 'running_backtest';
        dispatch({ type: "SET_LOADING", payload: loadingState });

        try {
            // ✅ This correctly calls your API service
            const result = await backtestApi.runBacktest(payload);
            await getPastBacktests(1); // Refresh the list
            dispatch({ type: "SET_LOADING", payload: "idle" });
            return result;
        } catch (err) {
            dispatch({ type: "SET_ERROR", payload: err });
            throw err;
        }
    }, [getPastBacktests]);

    // Run a new combo-strategy backtest
    const runComboBacktest = useCallback(async (payload) => {
         if (!payload?.strategies || payload.strategies.filter(s => s.code).length === 0) {
             const error = new Error("At least one strategy must be selected for a combo backtest.");
             dispatch({ type: "SET_ERROR", payload: error });
             throw error;
         }
        const loadingState = payload.mlMode !== 'off' ? 'running_ml' : 'running_combo';
        dispatch({ type: "SET_LOADING", payload: loadingState });

        try {
            // ✅ This correctly calls your API service
            const result = await backtestApi.runComboBacktest(payload);
            await getPastBacktests(1); // Refresh list
            dispatch({ type: "SET_LOADING", payload: "idle" });
            return result;
        } catch (err) {
            dispatch({ type: "SET_ERROR", payload: err });
            throw err;
        }
    }, [getPastBacktests]);

    // Run a strategy preview (simulation only)
    const previewStrategy = useCallback(async (payload) => {
        if (payload.mlMode !== 'on' && !payload?.code) {
             const error = new Error("A strategy 'code' is required for non-ML previews.");
             dispatch({ type: "SET_ERROR", payload: err });
             throw error;
         }
        dispatch({ type: "SET_LOADING", payload: "running_backtest" });
        try {
            // ✅ This correctly calls your API service
            const result = await backtestApi.previewStrategy(payload);
            dispatch({ type: "SET_LOADING", payload: "idle" });
            return result;
        } catch (err) {
            dispatch({ type: "SET_ERROR", payload: err });
            throw err;
        }
    }, []);

    
    // 🚀 Effect to fetch initial dropdown options AND past backtests
    useEffect(() => {
        const fetchInitialData = async () => {
            dispatch({ type: "SET_LOADING", payload: "initial" });
            try {
                // Fetch options and first page of backtests concurrently
                const results = await Promise.allSettled([
                    backtestApi.fetchOptions(), // Fetches strategies, symbols, timeframes, AND models
                    backtestApi.fetchAll(1),    // Fetches past backtests page 1
                ]);

                const optionsResult = results[0];
                let optionsData = { strategies: [], symbols: [], timeframes: [], models: [] };
                if (optionsResult.status === 'fulfilled' && optionsResult.value) {
                    optionsData = { ...optionsData, ...optionsResult.value };
                } else if (optionsResult.status === 'rejected'){
                    console.error("Failed to fetch options:", optionsResult.reason?.message || optionsResult.reason);
                }

                const pastBacktestsResult = results[1];
                const pastBacktests = pastBacktestsResult.status === 'fulfilled' && pastBacktestsResult.value
                    ? pastBacktestsResult.value
                    : { backtests: [], total: 0 }; // Default if fetch fails
                if (pastBacktestsResult.status === 'rejected') {
                    console.error("Failed to fetch past backtests:", pastBacktestsResult.reason?.message || pastBacktestsResult.reason);
                }

                dispatch({
                    type: "SET_INITIAL_DATA",
                    payload: {
                        options: optionsData,
                        pastBacktests: { // Ensure correct structure for reducer
                            backtests: pastBacktests.backtests,
                            total: pastBacktests.total
                        }
                    },
                });

            } catch (err) {
                console.error("A critical error occurred during initial data fetch:", err);
                dispatch({ type: "SET_ERROR", payload: err });
            }
        };

        fetchInitialData();
    }, []); // Empty dependency array ensures this runs only once on mount

    // Return state and action functions
    return {
        state,
        getPastBacktests,
        getBacktestById,
        deleteBacktest,
        runNewBacktest,
        runComboBacktest,
        previewStrategy,
    };
}
