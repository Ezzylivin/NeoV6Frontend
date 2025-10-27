// File: src/services/backtestApiService.js
// FINAL VERSION V5.2: Complete file with separate ML URLs and full function definitions.

import api from "./apiClient.js"; // Your main configured Axios client for Render backend
import axios from "axios";       // Import axios directly for external calls
import https from 'https';         // For HTTPS calls

// --- Base URLs ---
// ✅ URL for the Flask API server (listing models, config, predictions, data files)
const ML_API_BASE_URL_8001 = "https://74.208.28.77:8001";
// ✅ URL for the other service running on port 8000 (Usage TBD)
const ML_API_BASE_URL_8000 = "https://74.208.28.77:8000";
// --------------------


/**
 * Normalizes the API response for backtest options.
 */
const normalizeOptions = (raw) => ({
    strategies: raw?.strategies || [],
    symbols: raw?.symbols || [],
    timeframes: raw?.timeframes || [],
    models: raw?.models || [], // Ensure models is included
});

/**
 * Normalizes the API response for a list of past backtests.
 */
const normalizePastBacktests = (raw) => ({
    backtests: raw?.backtests || [],
    total: raw?.total || 0,
});

/**
 * A consistent error handler for all API calls.
 */
const handleError = (error, functionName) => {
    // Log detailed error information
    console.error(`Error in ${functionName}():`, error.message);
    if (error.response) {
        console.error('Error Response Data:', error.response.data);
        console.error('Error Response Status:', error.response.status);
    } else if (error.request) {
        console.error('Error Request Data:', error.request); // Log request if no response
    } else {
        // Log anything else (e.g., setup errors)
        console.error('Error Config:', error.config);
    }

    const message = error.response?.data?.detail || error.response?.data?.message || error.message || "An unknown error occurred.";
    // Throw a standard Error object for better stack traces and handling
    throw new Error(message);
};

/**
 * Safely retrieves the authentication token from localStorage.
 */
const getAuthToken = () => {
    try {
        // Check if localStorage is available
        if (typeof window !== 'undefined' && window.localStorage) {
            return localStorage.getItem('token');
        }
    } catch (e) {
        console.error("localStorage not available or accessible:", e);
    }
    return null; // Return null if not found or not accessible
};


// --- Main Backend API Functions (Render Backend - Calls using 'api' client) ---

/**
 * Fetches initial options for backtesting (strategies, symbols, timeframes, models).
 */
export async function fetchOptions() {
    try {
        // Endpoint in Render backend controller that aggregates options
        const response = await api.get("/backtest/options");
        return normalizeOptions(response.data); // Normalize ensures structure
    } catch (error) {
        handleError(error, "fetchOptions");
    }
}

/**
 * Fetches a paginated list of past backtest results.
 * @param {number} [page=1] - The page number to fetch.
 */
export async function fetchAll(page = 1) {
    try {
        const response = await api.get(`/backtest?page=${page}`);
        return normalizePastBacktests(response.data); // Normalize ensures structure
    } catch (error) {
        handleError(error, "fetchAll");
    }
}

/**
 * Fetches the detailed results of a specific backtest by its ID.
 * @param {string} id - The ID of the backtest to fetch.
 */
export async function fetchById(id) {
    if (!id) throw new Error("An ID is required to fetch a backtest.");
    try {
        const { data } = await api.get(`/backtest/${id}`);
        return data; // Assumes backend returns the full backtest object
    } catch (error) {
        handleError(error, "fetchById");
    }
}

/**
 * Deletes a specific backtest by its ID.
 * @param {string} id - The ID of the backtest to delete.
 */
export async function deleteById(id) {
    if (!id) throw new Error("An ID is required to delete a backtest.");
    try {
        const { data } = await api.delete(`/backtest/${id}`);
        return data; // Assumes backend returns { success: true, message: "..." }
    } catch (error) {
        handleError(error, "deleteById");
    }
}

/**
 * Submits a configuration to run a new single-strategy backtest.
 * @param {object} payload - The backtest configuration object.
 */
export async function runBacktest(payload) {
    if (!payload) throw new Error("Backtest payload is required.");
    // code is not needed for Pure ML, only validate if not Pure ML
    if (payload.mlMode !== 'on' && !payload.code) {
        throw new Error("A strategy 'code' is required unless using Pure ML mode.");
    }
    if (!payload.symbol || !payload.timeframe || !payload.startDate || !payload.endDate) {
         throw new Error("Missing required fields in payload (symbol, timeframe, startDate, endDate).");
     }
    try {
        // Calls the endpoint handled by runBacktestController
        const { data } = await api.post("/backtest/run", payload);
        return data; // Returns the full backtest result object after saving
    } catch (error) {
        handleError(error, "runBacktest");
    }
}

/**
 * Submits a configuration to preview a single strategy (simulate only).
 * @param {object} payload - The backtest configuration object.
 */
export async function previewStrategy(payload) {
     if (!payload) throw new Error("Preview payload is required.");
     // code not needed for Pure ML, only validate if not Pure ML
     if (payload.mlMode !== 'on' && !payload.code) {
        throw new Error("A strategy 'code' is required unless using Pure ML mode.");
     }
     if (!payload.symbol || !payload.timeframe || !payload.startDate || !payload.endDate) {
         throw new Error("Missing required fields in payload (symbol, timeframe, startDate, endDate).");
     }
    try {
        // Calls the endpoint handled by previewStrategyController
        const { data } = await api.post("/backtest/preview", payload);
        return data; // Returns the full backtest result object without saving
    } catch (error) {
        handleError(error, "previewStrategy");
    }
}

/**
 * Submits a configuration to run a new combo-strategy backtest.
 * @param {object} payload - The combo backtest configuration object.
 */
export async function runComboBacktest(payload) {
    // Basic validation
    if (!payload || !payload.strategies || payload.strategies.filter(s => s.code).length === 0) {
        throw new Error("Payload must contain at least one strategy with a 'code'.");
    }
    if (!payload.symbol || !payload.timeframe || !payload.startDate || !payload.endDate) {
         throw new Error("Missing required fields in payload (symbol, timeframe, startDate, endDate).");
     }
    try {
        // Calls the endpoint handled by runComboBacktestController
        const { data } = await api.post("/backtest/combo", payload);
        // Expects { combinedResult: ..., individualResults: [...] }
        return data;
    } catch (error) {
        handleError(error, "runComboBacktest");
    }
}

// --- Machine Learning Server Related Functions ---

/**
 * Fetches the list of available ML model names FROM THE RENDER BACKEND.
 */
export async function fetchModels() {
    try {
        const response = await api.get("/api/ml/available-models"); // Calls Render backend
        return response.data || [];
    } catch (error) {
        handleError(error, "fetchModels");
    }
}

/**
 * Fetches model metadata.
 * NOTE: Ideally, proxy this through Render backend too.
 * If calling directly, browser must trust the cert or CORS must allow.
 */
export async function fetchModelMetadata(modelName) {
    if (!modelName) throw new Error("Model name required.");
    try {
        // REMOVED httpsAgent
        const response = await axios.get(`${ML_API_BASE_URL}/api/ml/config/${modelName}`);
        return response.data;
    } catch (error) {
        handleError(error, "fetchModelMetadata");
    }
}

/**
 * Gets LIVE predictions.
 * NOTE: STRONGLY recommend backend calls this, not frontend.
 */
export async function getMlPredictions(predictionData) {
    const token = getAuthToken();
    if (!predictionData?.model_name || !predictionData?.features) {
         throw new Error("Requires 'model_name' and 'features'.");
     }
    try {
        // REMOVED httpsAgent
        const response = await axios.post(
            `${ML_API_BASE_URL}/api/ml/predict_bulk`,
            predictionData,
            {
                // NO httpsAgent here
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            }
        );
        return response.data?.predictions?.[0] || null;
    } catch (error) {
        handleError(error, "getMlPredictions");
    }
}
