// File: src/api/backtest.js
//
// 🚀 UPGRADED:
// - The 'handleError' function now specifically looks for the 'class_indices'
//   error and replaces it with your user-friendly message.

import api from "./apiClient.js"; // Your main configured Axios client

/**
 * A consistent error handler for all API calls.
 */
const handleError = (error, functionName) => {
    console.error(`Error in ${functionName}():`, error.message);
    if (error.response) {
        console.error('Error Response Data:', error.response.data);
    }
    
    // Get the raw message from the backend
    let message = error.response?.data?.message || error.message || "An unknown error occurred.";

    // 🚀 START OF UPGRADE
    // Check if this is the specific Python error we're looking for
    if (typeof message === 'string' && message.includes('class_indices')) {
        // 🚀 Replace the cryptic error with the user-friendly one
        message = "Symbol and Timeframe Mismatch: The selected model does not match the backtest timeframe. Please choose a matching model.";
    }
    // 🚀 END OF UPGRADE

    throw new Error(message);
};

/**
 * Normalizes the API response for backtest options.
 */
const normalizeOptions = (raw) => ({
    strategies: raw?.strategies || [],
    symbols: raw?.symbols || [],
    timeframes: raw?.timeframes || [],
    models: raw?.models || [], // This is populated by fetchModels, not fetchOptions
});

/**
 * Normalizes the API response for a list of past backtests.
 */
const normalizePastBacktests = (raw) => ({
    backtests: raw?.backtests || [],
    total: raw?.total || 0,
});


// --- Main API Functions ---

export async function fetchOptions() {
    try {
        const res = await api.get("/backtest/options");
        return normalizeOptions(res.data); // { strategies: [...], symbols: [...], timeframes: [...] }
    } catch (error) {
        handleError(error, "fetchOptions");
    }
}

// 🚀 ADDED: This function was missing, causing the TypeError
export async function fetchModels() {
    try {
        const url = 'https://74.208.28.77:8001/api/ml/models'; // Calls Node.js backend
        return response.data || [];
    } catch (error) {
        handleError(error, "fetchModels");
    }
}

export async function fetchAll(page = 1) {
    try {
        const res = await api.get(`/backtest?page=${page}`);
        return normalizePastBacktests(res.data); // { backtests: [...], total: N }
    } catch (error) {
        handleError(error, "fetchAll");
    }
}

export async function fetchById(id) {
    if (!id) throw new Error("An ID is required to fetch a backtest.");
    try {
        const res = await api.get(`/backtest/${id}`);
        return res.data;
    } catch (error) {
        handleError(error, "fetchById");
    }
}

export async function deleteById(id) {
    if (!id) throw new Error("An ID is required to delete a backtest.");
    try {
        const res = await api.delete(`/backtest/${id}`);
        return res.data;
    } catch (error) {
        handleError(error, "deleteById");
    }
}

export async function runBacktest(payload) {
    if (!payload) throw new Error("Backtest payload is required.");
    try {
        // 🚀 FIXED: Endpoint corrected
        const res = await api.post("/backtest/run", payload);
        return res.data;
    } catch (error) {
        handleError(error, "runBacktest");
    }
}

export async function runComboBacktest(payload) {
    if (!payload) throw new Error("Combo payload is required.");
    try {
        // 🚀 FIXED: Endpoint corrected
        const res = await api.post("/backtest/combo", payload);
        return res.data;
    } catch (error) {
        handleError(error, "runComboBacktest");
    }
}

export async function previewStrategy(payload) {
    if (!payload) throw new Error("Preview payload is required.");
    try {
        const res = await api.post("/backtest/preview", payload);
        return res.data;
    } catch (error) {
        handleError(error, "previewStrategy");
    }
}
