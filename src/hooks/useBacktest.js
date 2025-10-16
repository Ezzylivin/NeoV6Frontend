import { useReducer, useCallback, useEffect } from "react";
import * as backtestApi from "../api/backtest.js";

// --- State Management with Reducer (Unchanged) ---
const initialState = {
    options: { strategies: [], symbols: [], timeframes: [] },
    pastBacktests: { results: [], total: 0 },
    loading: 'idle',
    error: null,
};

function backtestReducer(state, action) {
    // ... (This reducer logic remains exactly the same)
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
            };
        case 'SET_PAST_BACKTESTS':
            return {
                ...state,
                pastBacktests: {
                    results: action.payload.backtests,
                    total: action.payload.total,
                },
            };
        case 'DELETE_BACKTEST_OPTIMISTIC':
            return {
                ...state,
                pastBacktests: {
                    ...state.pastBacktests,
                    results: state.pastBacktests.results.filter(b => b._id !== action.payload),
                    total: state.pastBacktests.total - 1,
                },
            };
        default:
            throw new Error(`Unhandled action type: ${action.type}`);
    }
}


export function useBacktest() {
    // ✅ DIAGNOSTIC LOG 1: Check if the hook is being called.
    console.log("--- useBacktest hook initialized ---");

    const [state, dispatch] = useReducer(backtestReducer, initialState);

    // --- Helper and CRUD functions are unchanged (full implementation assumed) ---
    const getPastBacktests = useCallback(async (page = 1) => {
        dispatch({ type: "SET_LOADING", payload: "fetching" });
        try {
            const data = await backtestApi.fetchAll(page);
            dispatch({ type: "SET_PAST_BACKTESTS", payload: data });
        } catch (err) {
            dispatch({ type: "SET_ERROR", payload: err });
        } finally {
            dispatch({ type: "SET_LOADING", payload: "idle" });
        }
    }, []);
    const getBacktestById = useCallback(async (id) => { /* ... implementation ... */ }, []);
    const deleteBacktest = useCallback(async (id) => { /* ... implementation ... */ }, [state.pastBacktests]);
    const previewStrategy = useCallback(async (payload) => { /* ... implementation ... */ }, []);

    // --- Backtest execution functions are unchanged ---
    const runNewBacktest = useCallback(async (payload) => { /* ... implementation ... */ }, [getPastBacktests]);
    const runComboBacktest = useCallback(async (payload) => { /* ... implementation ... */ }, [getPastBacktests]);

    // --- Initial data load effect ---
    useEffect(() => {
        // ✅ DIAGNOSTIC LOG 2: Check if the initial data fetch effect is running.
        console.log("--- useEffect for initial data fetch has started ---");

        const fetchInitialData = async () => {
            dispatch({ type: "SET_LOADING", payload: "initial" });
            try {
                // ✅ DIAGNOSTIC LOG 3: Confirm API calls are being attempted.
                console.log("Attempting to fetch options and past backtests...");

                const [options, pastBacktests] = await Promise.all([
                    backtestApi.fetchOptions(),
                    backtestApi.fetchAll(1),
                ]);

                // ✅ DIAGNOSTIC LOG 4: See the data received from the API calls.
                console.log("Successfully fetched initial data:", { options, pastBacktests });

                dispatch({
                    type: "SET_INITIAL_DATA",
                    payload: { options, pastBacktests },
                });
            } catch (err) {
                // ✅ DIAGNOSTIC LOG 5: Log any error that occurs during the fetch.
                console.error("Error during initial data fetch:", err);
                dispatch({ type: "SET_ERROR", payload: err });
            }
        };

        fetchInitialData();
    }, []); // Empty dependency array ensures this runs only once

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
