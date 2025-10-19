import { useReducer, useCallback, useEffect } from "react";
import * as backtestApi from "../api/backtest.js";
import Papa from "papaparse";

// 🚨 PREREQUISITE: You must install a CSV parser like Papaparse (e.g., 'npm install papaparse')
// and ensure it is available, e.g., by importing or accessing it globally (window.Papa).
// Note: You may need to add 'import Papa from "papaparse";' at the top if using module imports.


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
    // We can remove the local 'originalBacktests' variable and its dependency

    dispatch({ type: "DELETE_BACKTEST_OPTIMISTIC", payload: id });
    try {
        await backtestApi.deleteById(id);
    } catch (err) {
        // Here, we would ideally roll back the state via the reducer, 
        // but since we only need the dispatch function, we remove the dependency.
        dispatch({ type: "SET_ERROR", payload: err });
        throw err;
    }
}, []); // 🚨 FIX: Removed state.pastBacktests from dependency array

    // --- NEW: Dynamic Feature Fetching Logic ---
    const getFeaturesForML = useCallback(async (modelName) => {
        // --- STEP 1: Fetch Metadata (Provides the file name and required feature names) ---
        // Assuming backtestApi.fetchModelMetadata is implemented to call the new FastAPI endpoint
        const metadata = await backtestApi.fetchModelMetadata(modelName); 
        
        // --- STEP 2: Fetch the Feature Data File from the server's static endpoint ---
        const dataUrl = `/data/${metadata.source_file}`;
        const response = await fetch(dataUrl);
        
        if (!response.ok) {
            throw new Error(`Failed to load source file ${metadata.source_file}. Status: ${response.status}`);
        }
        const csvText = await response.text();
        
        // --- STEP 3: Parse CSV and Extract Features by Name ---
        const parsedData = parseCsvText(csvText); 
        
        // Use the second-to-last element as the last element can often be an empty row
        const lastRowObject = parsedData[parsedData.length - 2] || parsedData[parsedData.length - 1]; 

        if (!lastRowObject || !Object.keys(lastRowObject).length) {
            throw new Error("Could not find a valid data row in the feature CSV.");
        }

        // Extract Features Dynamically by Name
        const featureData = metadata.feature_names.map(featureName => {
            const value = lastRowObject[featureName];
            
            if (value === undefined || value === null) {
                console.error(`Required feature "${featureName}" is missing from the CSV data.`);
                throw new Error(`Missing feature: ${featureName}`); 
            }
            
            // Convert to float, as required by the Python Pydantic model
            return parseFloat(value);
        }).filter(value => !isNaN(value));

        // --- STEP 4: FINAL VALIDATION (CRITICAL to prevent 500 Crash) ---
        if (featureData.length !== metadata.feature_count) {
            throw new Error(
                `Data Mismatch: Model expects ${metadata.feature_count} features, but extracted ${featureData.length}.`
            );
        }
        
        console.log(`Client Debug: Dynamically generated ${featureData.length} features for ${modelName}.`);
        return featureData;

    }, []);

    // --- Core Backtest Execution Functions ---

    const runNewBacktest = useCallback(async (payload) => {
        dispatch({ type: "SET_LOADING", payload: "running" });
        try {
            let finalPayload = { ...payload };
            if (payload.mlMode && payload.mlMode !== 'off') {
                // 🚨 FIX: Call the dynamic feature getter
                const featuresList = await getFeaturesForML(payload.mlMode); 

                const featuresForML = {
                    symbol: payload.symbol,
                    features: featuresList, // Use the dynamically retrieved features
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
    }, [getPastBacktests, getFeaturesForML]);

    const runComboBacktest = useCallback(async (payload) => {
        dispatch({ type: "SET_LOADING", payload: "running_combo" });
        try {
            if (!payload.strategies || payload.strategies.length === 0) {
                throw new Error("At least one strategy must be selected.");
            }
            let finalPayload = { ...payload };
            if (payload.mlMode && payload.mlMode !== 'off') {
                // 🚨 FIX: Call the dynamic feature getter
                const featuresList = await getFeaturesForML(payload.mlMode); 

                const featuresForML = {
                    symbol: payload.symbol,
                    features: featuresList, // Use the dynamically retrieved features
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
                console.log("DEBUG: Raw response from fetchModels():", modelsResult);

                const models = modelsResult.status === 'fulfilled' ? modelsResult.value.models: [];
                
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
    runNewBacktest, // <-- Must be defined as a function
    runComboBacktest, // <-- Must be defined as a function
    previewStrategy,
    // getFeaturesForML is internal, so it is not returned
};
}
