import { useReducer, useCallback, useEffect } from "react";
import * as backtestApi from "../api/backtest.js";

// --- CSV Parsing Utility (Native JS Version) ---
const parseCsvText = (csvText) => {
    const lines = csvText.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length <= 1) return [];
    const header = lines[0].split(',').map(h => h.trim());
    console.log("DEBUG: Parsed CSV Header:", header);
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const rowObject = {};

        // 🛑 FIX 1: This line caused the ReferenceError.
        // 'lastRowObject' doesn't exist here. It's now commented out.
        // console.log("DEBUG: Keys in lastRowObject:", Object.keys(lastRowObject)); 

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

    const getFeaturesForML = useCallback(async (modelName) => {
        // ✅ ADD THIS LINE to ensure the model name is always lowercase
        const lowercaseModelName = modelName.toLowerCase();
    
        // Use the new lowercase variable in the API call
        const metadata = await backtestApi.fetchModelMetadata(lowercaseModelName);
        
        // 🛑 FIX 2: Point to your ML server's IP and port.
        // We define the base URL for your ML server here.
        const API_BASE_URL = "https://74.208.28.77:8000"; 
        // We construct the full URL to fetch the CSV file.
        const dataUrl = `${API_BASE_URL}/data/${metadata.source_file}`;
        
        const response = await fetch(dataUrl);
        if (!response.ok) {
            // Check for 404 specifically
            if (response.status === 404) {
                 throw new Error(`File not found at ${dataUrl}. Check server path and CORS setup.`);
            }
            throw new Error(`Failed to load source file ${metadata.source_file}. Status: ${response.status}`);
        }
        
        // Check content-type to make sure we got a CSV, not an HTML error page
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("text/csv")) {
            console.warn(`Expected text/csv but got ${contentType}.`);
            // We'll still try to parse it, but this is a good warning.
        }

        const csvText = await response.text();
        const parsedData = parseCsvText(csvText);

        // This check is important in case the CSV is empty or parsing failed
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
        if (!payload?.code) {
            throw new Error("A strategy 'code' is required.");
        }
        
        dispatch({ type: "SET_LOADING", payload: "running" });

        try {
            let finalPayload = { ...payload };

            // --- Safe ML Integration Block ---
            if (payload.mlMode && payload.mlMode !== 'off') {
                // 1. Set a specific loading state for user feedback
                dispatch({ type: "SET_LOADING", payload: "running_ml" });

                // 2. Fetch predictions in a separate try/catch to isolate ML errors
                try {
                    // FIX: Pass the correct 'mlModel' property
                    const featuresList = await getFeaturesForML(payload.mlModel);
                    const mlResult = await backtestApi.getMlPredictions({
                        model_name: payload.mlModel
                        symbol: payload.symbol,
                        features: featuresList,
                    });
                    
                    // 3. Add predictions to the payload if successful
                    finalPayload.mlPredictions = mlResult.predictions;

                } catch (mlError) {
                    // If ML fails, stop the process and show a specific error
                    console.error("ML Prediction step failed:", mlError);
                    throw new Error(`ML Prediction failed: ${mlError.message}`);
                }
            }

            // 4. Proceed with the backtest using the potentially modified payload
            dispatch({ type: "SET_LOADING", payload: "running_backtest" });
            const result = await backtestApi.runBacktest(finalPayload);

            await getPastBacktests(1);
            return result;

        } catch (err) {
            dispatch({ type: "SET_ERROR", payload: err });
            throw err;
        } finally {
            dispatch({ type: "SET_LOADING", payload: "idle" });
        }
    }, [getPastBacktests, getFeaturesForML]);

    const runComboBacktest = useCallback(async (payload) => {
        if (!payload?.strategies || payload.strategies.length === 0) {
            throw new Error("At least one strategy must be selected.");
        }
        
        dispatch({ type: "SET_LOADING", payload: "running" });

        try {
            let finalPayload = { ...payload };

            // --- Safe ML Integration Block ---
            if (payload.mlMode && payload.mlMode !== 'off') {
                // 1. Set a specific loading state for user feedback
                dispatch({ type: "SET_LOADING", payload: "running_ml" });

                // 2. Fetch predictions in a separate try/catch to isolate ML errors
                try {
                    // FIX: Pass the correct 'mlModel' property
                    const featuresList = await getFeaturesForML(payload.mlModel);
                    const mlResult = await backtestApi.getMlPredictions({
                        model_name: payload.mlModel
                        symbol: payload.symbol,
                        features: featuresList,
                    });

                    // 3. Add predictions to the payload if successful
                    finalPayload.mlPredictions = mlResult.predictions;
                
                } catch (mlError) {
                    // If ML fails, stop the process and show a specific error
                    console.error("ML Prediction step failed:", mlError);
                    throw new Error(`ML Prediction failed: ${mlError.message}`);
                }
            }
            
            // 4. Proceed with the backtest using the potentially modified payload
            dispatch({ type: "SET_LOADING", payload: "running_backtest" });
            const result = await backtestApi.runComboBacktest(finalPayload);

            await getPastBacktests(1);
            return result;

        } catch (err) {
            dispatch({ type: "SET_ERROR", payload: err });
            throw err;
        } finally {
            dispatch({ type: "SET_LOADING", payload: "idle" });
        }
    }, [getPastBacktests, getFeaturesForML]);

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
    };
}
