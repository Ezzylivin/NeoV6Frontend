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
    const [state, dispatch] = useReducer(backtestReducer, initialState);

    // --- Helper and CRUD functions are unchanged ---
    const getPastBacktests = useCallback(async (page = 1) => { /* ... same implementation ... */ }, []);
    const getBacktestById = useCallback(async (id) => { /* ... same implementation ... */ }, []);
    const deleteBacktest = useCallback(async (id) => { /* ... same implementation ... */ }, [state.pastBacktests]);
    const previewStrategy = useCallback(async (payload) => { /* ... same implementation ... */ }, []);

    // --- UPGRADED BACKTEST EXECUTION FUNCTIONS ---

    const runNewBacktest = useCallback(async (payload) => {
        dispatch({ type: "SET_LOADING", payload: "running" });
        try {
            let finalPayload = { ...payload };

            // ✅ UPGRADE: Check if an ML mode is active
            if (payload.mlMode && payload.mlMode !== 'off') {
                console.log("ML Mode enabled. Fetching predictions from server...");

                // IMPORTANT: You must gather the actual features your model needs.
                // This will likely involve fetching historical price data and calculating indicators.
                // The structure below is a placeholder for that data.
                const featuresForML = {
                    symbol: payload.symbol,
                    features: [
                        // Replace this with your actual feature data for each candlestick
                        { "feature_1": 0.5, "feature_2": 120 },
                        { "feature_1": 0.6, "feature_2": 125 },
                    ]
                };

                // Call the ML server to get predictions
                const mlResult = await backtestApi.getMlPredictions(featuresForML);
                console.log("Received ML predictions:", mlResult);

                // Add the predictions to the payload for the main backtest server
                finalPayload.mlPredictions = mlResult.predictions;
            }

            // Run the backtest with the final payload (which may or may not have predictions)
            const result = await backtestApi.runBacktest(finalPayload);
            await getPastBacktests(1);
            return result;
        } catch (err) {
            dispatch({ type: "SET_ERROR", payload: err });
            throw err;
        } finally {
            dispatch({ type: "SET_LOADING", payload: "idle" });
        }
    }, [getPastBacktests]);

    const runComboBacktest = useCallback(async (payload) => {
        dispatch({ type: "SET_LOADING", payload: "running_combo" });
        try {
            if (!payload.strategies || payload.strategies.length === 0) {
                throw new Error("At least one strategy must be selected.");
            }
            
            let finalPayload = { ...payload };

            // ✅ UPGRADE: Same ML logic as the single backtest function
            if (payload.mlMode && payload.mlMode !== 'off') {
                console.log("ML Mode enabled for combo. Fetching predictions...");
                const featuresForML = {
                    symbol: payload.symbol,
                    features: [ /* Replace with your actual feature data */ ]
                };
                const mlResult = await backtestApi.getMlPredictions(featuresForML);
                finalPayload.mlPredictions = mlResult.predictions;
            }

            const result = await backtestApi.runComboBacktest(finalPayload);
            await getPastBacktests(1);
            return result;
        } catch (err) {
            dispatch({ type: "SET_ERROR", payload: err });
            throw err;
        } finally {
            dispatch({ type: "SET_LOADING", payload: "idle" });
        }
    }, [getPastBacktests]);

    // --- Initial data load effect (Unchanged) ---
    useEffect(() => {
        const fetchInitialData = async () => { /* ... same implementation ... */ };
        fetchInitialData();
    }, []);

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
