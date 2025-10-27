// File: src/hooks/useBacktest.js
// UPDATED: Removed getFeaturesForML function as it's not needed for historical backtests.

import { useReducer, useCallback, useEffect } from "react";
// Assumes fetchModels is exported from backtestApiService
import * as backtestApi from "../api/backtest.js";
import { fetchModels } from "../api/backtest.js"; // Import fetchModels specifically

// --- State Management with Reducer ---
const initialState = {
    options: {
        strategies: [],
        symbols: [],
        timeframes: [],
        models: [] // Initialize models as empty
    },
    pastBacktests: { results: [], total: 0 },
    loading: 'idle', // 'initial', 'idle', 'loading_options', 'fetching', 'running', 'running_backtest'
    error: null,
};

function backtestReducer(state, action) {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, loading: action.payload, error: null };
        case 'SET_ERROR':
            // Prevent clearing error if loading state changes right after
            if (state.loading !== 'idle') {
                 console.warn("SET_ERROR called while loading:", action.payload?.message);
            }
            return { ...state, loading: 'idle', error: action.payload };
        case 'SET_INITIAL_DATA':
            return {
                ...state,
                options: action.payload.options,
                pastBacktests: {
                    results: action.payload.pastBacktests.backtests,
                    total: action.payload.pastBacktests.total,
                },
                loading: 'idle', // Transition to idle after initial load
                error: null, // Clear error on successful load
            };
        case 'SET_PAST_BACKTESTS':
            return {
                ...state,
                pastBacktests: {
                    results: action.payload.backtests,
                    total: action.payload.total,
                },
                loading: 'idle', // Ensure loading stops after fetching past tests
                error: null,
            };
        case 'DELETE_BACKTEST_OPTIMISTIC': { // Use block scope for const
            const newState = {
                ...state,
                pastBacktests: {
                    ...state.pastBacktests,
                    results: state.pastBacktests.results.filter(b => b._id !== action.payload),
                    total: Math.max(0, state.pastBacktests.total - 1), // Ensure total doesn't go below 0
                },
            };
            // Keep original state for potential rollback
            action.meta = { originalPastBacktests: state.pastBacktests };
            return newState;
         }
        case 'ROLLBACK_DELETE': // New action type for rollback
             console.warn("Rolling back optimistic delete for backtest:", action.meta.deletedId);
             return {
                 ...state,
                 pastBacktests: action.meta.originalPastBacktests, // Restore previous state
                 error: action.payload // Set the error that caused the rollback
             };
        default:
            console.error(`Unhandled action type: ${action.type}`);
            return state; // Return current state for unhandled actions
    }
}

export function useBacktest() {
    const [state, dispatch] = useReducer(backtestReducer, initialState);

    // Fetch past backtests (paginated)
    const getPastBacktests = useCallback(async (page = 1) => {
        dispatch({ type: "SET_LOADING", payload: "fetching" });
        try {
            const data = await backtestApi.fetchAll(page);
            dispatch({ type: "SET_PAST_BACKTESTS", payload: data });
        } catch (err) {
            dispatch({ type: "SET_ERROR", payload: err });
            // Optionally re-throw if the component needs to know about the error
            // throw err;
        }
        // SET_LOADING 'idle' is handled within SET_PAST_BACKTESTS and SET_ERROR
    }, []);

    // Fetch details of a single backtest
    const getBacktestById = useCallback(async (id) => {
        dispatch({ type: "SET_LOADING", payload: "fetching" });
        try {
            const data = await backtestApi.fetchById(id);
            dispatch({ type: "SET_LOADING", payload: "idle" }); // Stop loading after fetch
            return data;
        } catch (err) {
            dispatch({ type: "SET_ERROR", payload: err });
            throw err; // Re-throw for component handling
        }
    }, []);

    // Delete a backtest (with optimistic UI update and rollback)
    const deleteBacktest = useCallback(async (id) => {
         // Store original state before optimistic update for rollback
         const originalState = state.pastBacktests;
        dispatch({ type: "DELETE_BACKTEST_OPTIMISTIC", payload: id, meta: { originalPastBacktests: originalState } });
        try {
            await backtestApi.deleteById(id);
            // No need to refetch if delete was successful
        } catch (err) {
            // Rollback optimistic update on failure
            dispatch({ type: "ROLLBACK_DELETE", payload: err, meta: { originalPastBacktests: originalState, deletedId: id } });
            // Let the component know deletion failed
             throw err;
        }
    }, [state.pastBacktests]); // Depend on pastBacktests for rollback state


    // Run a new single-strategy backtest
    const runNewBacktest = useCallback(async (payload) => {
        // Validation moved slightly earlier
        if (payload.mlMode !== 'on' && !payload?.code) {
             const error = new Error("A strategy 'code' is required for non-ML backtests.");
             dispatch({ type: "SET_ERROR", payload: error });
             throw error;
         }

        // Determine appropriate loading state based on mode
        const loadingState = payload.mlMode !== 'off' ? 'running_ml' : 'running_backtest';
        dispatch({ type: "SET_LOADING", payload: loadingState });

        try {
            // Simply pass the payload to the backend API.
            // The backend service handles logic based on mlMode.
            const result = await backtestApi.runBacktest(payload);
            await getPastBacktests(1); // Refresh the list after a successful run
            dispatch({ type: "SET_LOADING", payload: "idle" }); // Set loading to idle *after* success
            return result; // Return result to the component
        } catch (err) {
            dispatch({ type: "SET_ERROR", payload: err });
            throw err; // Re-throw for component error handling
        }
        // No finally block needed here as SET_ERROR handles idle state on failure
    }, [getPastBacktests]);

    // Run a new combo-strategy backtest
    const runComboBacktest = useCallback(async (payload) => {
         // Basic validation
         if (!payload?.strategies || payload.strategies.filter(s => s.code).length === 0) {
             const error = new Error("At least one strategy must be selected for a combo backtest.");
             dispatch({ type: "SET_ERROR", payload: error });
             throw error;
         }

        const loadingState = payload.mlMode !== 'off' ? 'running_ml' : 'running_combo'; // Use 'running_combo' for TA combo
        dispatch({ type: "SET_LOADING", payload: loadingState });

        try {
            // Pass payload directly to the backend API.
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
             dispatch({ type: "SET_ERROR", payload: error });
             throw error;
         }
        dispatch({ type: "SET_LOADING", payload: "running" }); // Generic running state
        try {
            const result = await backtestApi.previewStrategy(payload);
            dispatch({ type: "SET_LOADING", payload: "idle" });
            return result;
        } catch (err) {
            dispatch({ type: "SET_ERROR", payload: err });
            throw err;
        }
    }, []);

    // Effect to fetch initial dropdown options and first page of past backtests
    useEffect(() => {
        const fetchInitialData = async () => {
            dispatch({ type: "SET_LOADING", payload: "initial" });
            try {
                // Fetch options and first page of backtests concurrently
                const results = await Promise.allSettled([
                    backtestApi.fetchOptions(), // Fetches strategies, symbols, timeframes, AND models from backend
                    backtestApi.fetchAll(1),    // Fetches past backtests page 1
                    // Removed fetchModels() call here as it's included in fetchOptions now
                ]);

                const optionsResult = results[0];
                // Initialize with empty arrays, then populate
                let optionsData = { strategies: [], symbols: [], timeframes: [], models: [] };
                if (optionsResult.status === 'fulfilled' && optionsResult.value) {
                    optionsData = { ...optionsData, ...optionsResult.value }; // Spread fetched options
                } else if (optionsResult.status === 'rejected'){
                    console.error("Failed to fetch options:", optionsResult.reason?.message || optionsResult.reason);
                    // Decide if this is a critical error or if the app can proceed partially
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
                        options: optionsData, // Contains all options including models
                        pastBacktests: { // Ensure correct structure for reducer
                            backtests: pastBacktests.backtests,
                            total: pastBacktests.total
                        }
                    },
                });

            } catch (err) { // Catch errors not handled by Promise.allSettled (e.g., network issues)
                console.error("A critical error occurred during initial data fetch:", err);
                dispatch({ type: "SET_ERROR", payload: err });
            }
            // Loading state is set to 'idle' within SET_INITIAL_DATA or SET_ERROR
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
        // getFeaturesForML is REMOVED from the returned object
    };
}
