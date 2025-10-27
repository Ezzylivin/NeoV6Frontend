// File: src/services/backtestApiService.js (or similar)
// UPDATED: ML_API_BASE_URL set to HTTP and port 8001.
// UPDATED: fetchModels now calls the Render backend endpoint.

import api from "./apiClient.js"; // Your main configured Axios client for Render backend
import axios from "axios";       // Import axios directly for potential external calls (though fetchModels now uses 'api')

// --- UPDATED: Use HTTP and port 8001 ---
const ML_API_BASE_URL = "http://74.208.28.77:8001";

/**
 * Normalizes the API response for backtest options.
 */
const normalizeOptions = (raw) => ({
    strategies: raw?.strategies || [],
    symbols: raw?.symbols || [],
    timeframes: raw?.timeframes || [],
    models: raw?.models || [], // Ensure models is included here
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
    const message = error.response?.data?.detail || error.response?.data?.message || error.message || "An unknown error occurred.";
    console.error(`${functionName}(): failed`, message);
    // Rethrow a structured error or the original message for UI handling
    throw new Error(message); // Throwing Error object is often better
};

/**
 * Safely retrieves the authentication token from localStorage.
 */
const getAuthToken = () => {
    // Assumption: The token is stored in localStorage under the key 'token'
    return localStorage.getItem('token');
};


// --- Main Backend API Functions (Render Backend) ---

export async function fetchOptions() {
    try {
        // This endpoint in your backend controller should now return models too
        const response = await api.get("/backtest/options");
        return normalizeOptions(response.data); // Make sure normalize handles models
    } catch (error) {
        handleError(error, "fetchOptions");
    }
}

export async function fetchAll(page = 1) {
    try {
        const response = await api.get(`/backtest?page=${page}`);
        return normalizePastBacktests(response.data);
    } catch (error) {
        handleError(error, "fetchAll");
    }
}

export async function fetchById(id) {
    try {
        const { data } = await api.get(`/backtest/${id}`);
        return data;
    } catch (error) {
        handleError(error, "fetchById");
    }
}

export async function deleteById(id) {
    try {
        const { data } = await api.delete(`/backtest/${id}`);
        return data;
    } catch (error) {
        handleError(error, "deleteById");
    }
}

export async function runBacktest(payload) {
    if (!payload.code && payload.mlMode !== 'on') { // code not needed for Pure ML
         throw new Error("A strategy 'code' is required unless using Pure ML mode.");
     }
    try {
        const { data } = await api.post("/backtest/run", payload);
        return data;
    } catch (error) {
        handleError(error, "runBacktest");
    }
}

export async function previewStrategy(payload) {
     if (!payload.code && payload.mlMode !== 'on') { // code not needed for Pure ML
         throw new Error("A strategy 'code' is required unless using Pure ML mode.");
     }
    try {
        const { data } = await api.post("/backtest/preview", payload);
        return data;
    } catch (error) {
        handleError(error, "previewStrategy");
    }
}

export async function runComboBacktest(payload) {
    if (!payload.strategies || payload.strategies.length === 0) {
        throw new Error("Payload must contain a non-empty 'strategies' array.");
    }
    try {
        const { data } = await api.post("/backtest/combo", payload);
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
        // --- UPDATED: Call the Render backend endpoint ---
        const response = await api.get("/api/ml/available-models");
        return response.data || []; // Ensure it returns an array even if empty
    } catch (error) {
        handleError(error, "fetchModels");
    }
}

/**
 * Fetches the metadata (expected features) for a specific ML model via the ML server.
 * NOTE: This still calls the ML server directly, which might be okay,
 * or you could proxy it through the Render backend if preferred for consistency/security.
 * @param {string} modelName - The name of the model to get metadata for.
 */
export async function fetchModelMetadata(modelName) {
    if (!modelName) throw new Error("A model name is required to fetch metadata.");
    try {
        // This call still goes directly to the ML server
        const response = await axios.get(`${ML_API_BASE_URL}/api/ml/config/${modelName}`); // Use config endpoint
        return response.data; // Expects { features: [...] }
    } catch (error) {
        handleError(error, "fetchModelMetadata");
    }
}


/**
 * Calls the external ML server to get LIVE predictions.
 * NOTE: This should likely be called BY THE RENDER BACKEND, not directly from frontend.
 * If the frontend needs a live signal, it should ask the Render backend,
 * which then asks the ML server. This keeps secrets/logic secure.
 *
 * For now, this function assumes direct frontend-to-ML call if needed.
 * @param {object} predictionData - The data required by your model (e.g., { model_name, features }).
 */
export async function getMlPredictions(predictionData) {
    const token = getAuthToken(); // Assuming ML server might need auth

    // Removed token check - ML server might not need it for basic prediction
    // if (!token) {
    //     throw new Error("Authentication token not found. Please log in.");
    // }

    try {
        // This call still goes directly to the ML server
        const response = await axios.post(
            `${ML_API_BASE_URL}/api/ml/predict_bulk`, // Assuming bulk endpoint can handle single predictions too
            predictionData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    // Conditionally add Auth header if needed by ML server
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            }
        );
        // Assuming the bulk endpoint returns a list, take the first element for a single prediction
        return response.data?.predictions?.[0] || response.data;
    } catch (error) {
        handleError(error, "getMlPredictions");
    }
}
