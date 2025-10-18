import { useReducer, useCallback, useEffect } from "react";
import * as backtestApi from "../api/backtest.js";

// --- State Management with Reducer ---
const initialState = {
    options: {
        strategies: [],
        symbols: [],
        timeframes: [],
        models: []
    },
    pastBacktests: { results: [], total: 0 },
    loading: 'idle',
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

    const deleteBacktest = useCallback(async (id) => {
        const originalBacktests = state.pastBacktests;
        dispatch({ type: "DELETE_BACKTEST_OPTIMISTIC", payload: id });
        try {
            await backtestApi.deleteById(id);
        } catch (err) {
            dispatch({ type: "SET_PAST_BACKTESTS", payload: originalBacktests });
            dispatch({ type: "SET_ERROR", payload: err });
            throw err;
        }
    }, [state.pastBacktests]);

    const runNewBacktest = useCallback(async (payload) => {
        dispatch({ type: "SET_LOADING", payload: "running" });
        try {
            let finalPayload = { ...payload };
            if (payload.mlMode && payload.mlMode !== 'off') {
                const featuresForML = {
                    symbol: payload.symbol,
                    features: [/* IMPORTANT: Replace with your actual feature data */]
                };
                const mlResult = await backtestApi.getMlPredictions(featuresForML);
                finalPayload.mlPredictions = mlResult.predictions;
            }
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
            if (payload.mlMode && payload.mlMode !== 'off') {
                const featuresForML = {
                    symbol: payload.symbol,
                    features: [/* IMPORTANT: Replace with your actual feature data */]
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

    useEffect(() => {
        const fetchInitialData = async () => {
            dispatch({ type: "SET_LOADING", payload: "initial" });
            try {
                const results = await Promise.allSettled([
                    backtestApi.fetchOptions(),
                    backtestApi.fetchAll(1),
                    backtestApi.fetchModels(), // Fetch the models
                ]);

                const optionsResult = results[0];
                const optionsData = optionsResult.status === 'fulfilled' ? optionsResult.value : { strategies: [], symbols: [], timeframes: [] };
                if (optionsResult.status === 'rejected') {
                    console.error("Failed to fetch options:", optionsResult.reason);
                }

                const pastBacktestsResult = results[1];
                const pastBacktests = pastBacktestsResult.status === 'fulfilled' ? pastBacktestsResult.value : { backtests: [], total: 0 };
                if (pastBacktestsResult.status === 'rejected') {
                    console.error("Failed to fetch past backtests:", pastBacktestsResult.reason);
                }

                const modelsResult = results[2];
                
                // --- 🐞 DEBUGGING LOG ---
                // Log the raw result from the fetchModels() API call.
                // Check your browser's developer console to see this output.
                console.log("DEBUG: Raw response from fetchModels():", modelsResult);

                // --- POTENTIAL FIX ---
                // The API sends back an object like { models: [...] }. We need the array inside.
                // Check the logged object. The data is in the 'value' property.
                const models = modelsResult.status === 'fulfilled' ? modelsResult.value :{ models: [] };
                
                if (modelsResult.status === 'rejected') {
                    console.error("Failed to fetch ML models:", modelsResult.reason);
                }

                dispatch({
                    type: "SET_INITIAL_DATA",
                    payload: {
                        options: { ...optionsData, models }, // Use the extracted 'models' array
                        pastBacktests
                    },
                });

            } catch (err) {
                console.error("A critical error occurred during initial data fetch:", err);
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
        runNewBacktest,
        runComboBacktest,
        previewStrategy,
    };
}
