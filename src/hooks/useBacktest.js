import { useReducer, useCallback, useEffect } from "react";
import * as backtestApi from "../api/backtest.js";

// --- CSV Parsing Utility (Native JS Version) ---
// This is still needed for getFeaturesForML (the "live bot" feature)
const parseCsvText = (csvText) => {
    const lines = csvText.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length <= 1) return [];
    const header = lines[0].split(',').map(h => h.trim());
    console.log("DEBUG: Parsed CSV Header:", header);
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const rowObject = {};
        for (let j = 0; j < header.length && j < values.length; j++) {
            const key = header[j];
            const value = values[j] ? values[j].trim() : null;
            const numValue = parseFloat(value);
            rowObject[key] = isNaN(numValue) ? value : numValue;
        }
        data.push(rowObject);
    }
    return data;
};

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
        case 'ROLLBACK_BACKTESTS':
            return {
                ...state,
                pastBacktests: action.payload,
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
        dispatch({ type: "DELETE_BACKTEST_OPTIMISTIC", payload: id });
        try {
            await backtestApi.deleteById(id);
        } catch (err) {
            await getPastBacktests(1);
            dispatch({ type: "SET_ERROR", payload: err });
            throw err;
        }
    }, [getPastBacktests]);

    // This function is still used for your "Live Bot" but NOT for backtesting
    const getFeaturesForML = useCallback(async (modelName) => {
        const lowercaseModelName = modelName.toLowerCase();
        const metadata = await backtestApi.fetchModelMetadata(lowercaseModelName);
        
        const API_BASE_URL = "https://74.208.28.77:8000"; 
        const dataUrl = `${API_BASE_URL}/data/${metadata.source_file}`;
        
        const response = await fetch(dataUrl);
        if (!response.ok) {
            if (response.status === 404) {
                 throw new Error(`File not found at ${dataUrl}. Check server path and CORS setup.`);
            }
            throw new Error(`Failed to load source file ${metadata.source_file}. Status: ${response.status}`);
        }
        
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("text/csv")) {
            console.warn(`Expected text/csv but got ${contentType}.`);
        }

        const csvText = await response.text();
        const parsedData = parseCsvText(csvText);

        if (!parsedData || parsedData.length === 0) {
            throw new Error("CSV file was empty or could not be parsed.");
        }

        const lastRowObject = parsedData[parsedData.length - 1];
        if (!lastRowObject || !Object.keys(lastRowObject).length) {
            throw new Error("Could not find a valid data row in the feature CSV.");
        }
        const featureData = metadata.feature_names.map(featureName => {
            const value = lastRowObject[featureName];
            if (value === undefined || value === null) {
                console.error(`Required feature "${featureName}" is missing from the CSV data.`);
                throw new Error(`Missing feature: ${featureName}`);
            }
            return parseFloat(value);
        }).filter(value => !isNaN(value));
        if (featureData.length !== metadata.feature_count) {
            throw new Error(
                `Data Mismatch: Model expects ${metadata.feature_count} features, but extracted ${featureData.length}.`
            );
        }
        console.log(`Client Debug: Dynamically generated ${featureData.length} features for ${lowercaseModelName}.`);
        return featureData;
    }, []);

    const runNewBacktest = useCallback(async (payload) => {
        // This check is only for TA strategies. ML strategies won't have 'code'.
        if (payload.mlMode !== 'on' && !payload?.code) {
            throw new Error("A strategy 'code' is required for non-ML backtests.");
        }
        
        dispatch({ type: "SET_LOADING", payload: "running" });

        try {
            // ✅ **THIS IS THE FIX**
            // We NO LONGER run the "getFeaturesForML" or "/api/ml/predict" logic here.
            // We simply pass the `payload` directly to the backtest server.
            // The payload already contains `mlMode: 'on'` and `mlModel: '...'`.
            // The *server* will see this and know how to run the ML backtest.
            
            dispatch({ type: "SET_LOADING", payload: "running_backtest" });
            
            // The 'payload' object is all we need to send.
            const result = await backtestApi.runBacktest(payload);

            await getPastBacktests(1);
            return result;

        } catch (err) {
            dispatch({ type: "SET_ERROR", payload: err });
            throw err;
        } finally {
            dispatch({ type: "SET_LOADING", payload: "idle" });
        }
    }, [getPastBacktests]); // Removed getFeaturesForML from dependencies

    const runComboBacktest = useCallback(async (payload) => {
        if (!payload?.strategies || payload.strategies.length === 0) {
            throw new Error("At least one strategy must be selected.");
        }
        
        dispatch({ type: "SET_LOADING", payload: "running" });

        try {
            // ✅ **THIS IS THE FIX**
            // Just like in runNewBacktest, we remove all client-side ML logic.
            // The server will handle the ML predictions for the *combo*.
            
            dispatch({ type: "SET_LOADING", payload: "running_backtest" });
            const result = await backtestApi.runComboBacktest(payload);

            await getPastBacktests(1);
            return result;

        } catch (err) {
            dispatch({ type: "SET_ERROR", payload: err });
            throw err;
        } finally {
            dispatch({ type: "SET_LOADING", payload: "idle" });
        }
    }, [getPastBacktests]); // Removed getFeaturesForML from dependencies

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
                    backtestApi.fetchModels(),
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
                const models = modelsResult.status === 'fulfilled' ? modelsResult.value.models : [];
                if (modelsResult.status === 'rejected') {
                    console.error("Failed to fetch ML models:", modelsResult.reason);
                }

                dispatch({
                    type: "SET_INITIAL_DATA",
                    payload: {
                        options: { ...optionsData, models },
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
        // You can still export this for your "live bot"
        getFeaturesForML, 
    };
}
