// File: src/services/backtestApiService.js (or similar)
// FINAL VERSION V5:
// - ML_API_BASE_URL set to HTTPS and port 8001.
// - fetchModels calls the Render backend (correct).
// - fetchModelMetadata and getMlPredictions call ML server DIRECTLY using HTTPS and httpsAgent.

import api from "./apiClient.js"; // Your main configured Axios client for Render backend
import axios from "axios";       // Import axios directly for external calls
import https from 'https';         // <-- 1. RESTORE HTTPS IMPORT

// --- UPDATED: Use HTTPS and port 8001 ---
const ML_API_BASE_URL = "https://74.208.28.77:8001";

// ✅ ADDED: Agent to handle self-signed certificates for direct HTTPS calls to ML server
const httpsAgent = new https.Agent({ rejectUnauthorized: false });


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
    const message = error.response?.data?.detail || error.response?.data?.message || error.message || "An unknown error occurred.";
    console.error(`${functionName}(): failed`, message);
    throw new Error(message);
};

/**
 * Safely retrieves the authentication token from localStorage.
 */
const getAuthToken = () => {
    return localStorage.getItem('token');
};


// --- Main Backend API Functions (Render Backend - Calls using 'api' client) ---

export async function fetchOptions() {
    try {
        const response = await api.get("/backtest/options");
        return normalizeOptions(response.data);
    } catch (error) {
        handleError(error, "fetchOptions");
    }
}

export async function fetchAll(page = 1) { /* ... unchanged ... */ }
export async function fetchById(id) { /* ... unchanged ... */ }
export async function deleteById(id) { /* ... unchanged ... */ }
export async function runBacktest(payload) { /* ... unchanged ... */ }
export async function previewStrategy(payload) { /* ... unchanged ... */ }
export async function runComboBacktest(payload) { /* ... unchanged ... */ }


// --- Machine Learning Server Related Functions ---

/**
 * Fetches the list of available ML model names FROM THE RENDER BACKEND.
 */
export async function fetchModels() {
    try {
        // Correctly calls Render backend endpoint via 'api' client
        const response = await api.get("/api/ml/available-models");
        return response.data || [];
    } catch (error) {
        handleError(error, "fetchModels");
    }
}

/**
 * Fetches the metadata (expected features) for a specific ML model via the ML server (HTTPS).
 */
export async function fetchModelMetadata(modelName) {
    if (!modelName) throw new Error("A model name is required to fetch metadata.");
    try {
        // ✅ Direct call uses HTTPS and httpsAgent
        const response = await axios.get(`${ML_API_BASE_URL}/api/ml/config/${modelName}`, { httpsAgent: httpsAgent });
        return response.data; // Expects { features: [...] }
    } catch (error) {
        handleError(error, "fetchModelMetadata");
    }
}


/**
 * Calls the external ML server (HTTPS) to get LIVE predictions.
 * NOTE: Still recommend backend calls this, but function is here if needed directly.
 */
export async function getMlPredictions(predictionData) {
    const token = getAuthToken(); // Auth token if ML server requires it

    try {
        // ✅ Direct call uses HTTPS and httpsAgent
        const response = await axios.post(
            `${ML_API_BASE_URL}/api/ml/predict_bulk`, // Assuming bulk handles single
            predictionData,
            {
                httpsAgent: httpsAgent, // <-- ADDED AGENT
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }) // Conditionally add Auth
                }
            }
        );
        return response.data?.predictions?.[0] || response.data; // Handle single/bulk response
    } catch (error) {
        handleError(error, "getMlPredictions");
    }
}
