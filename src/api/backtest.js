// File: src/services/backtestApiService.js
//
// 🚀 RESTORED: This file now correctly talks ONLY to your
// Node.js backend (via the 'api' client). It no longer
// calls the Python server directly.

import api from "./apiClient.js"; // Your main configured Axios client for your Node.js backend

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
    console.error(`Error in ${functionName}():`, error.message);
    if (error.response) {
        console.error('Error Response Data:', error.response.data);
    }
    const message = error.response?.data?.message || error.message || "An unknown error occurred.";
    throw new Error(message);
};

// --- Main Backend API Functions (All point to your Node.js server) ---

/**
 * Fetches initial options for backtesting (strategies, symbols, timeframes, models).
 */
export async function fetchOptions() {
    try {
        // Calls your Node.js backend
        const response = await api.get("/backtest/options");
        return normalizeOptions(response.data);
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
        // Calls your Node.js backend
        const response = await api.get(`/backtest?page=${page}`);
        return normalizePastBacktests(response.data);
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
        // Calls your Node.js backend
        const { data } = await api.get(`/backtest/${id}`);
        return data;
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
        // Calls your Node.js backend
        const { data } = await api.delete(`/backtest/${id}`);
        return data;
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
    if (payload.mlMode !== 'on' && !payload.code) {
         throw new Error("A strategy 'code' is required unless using Pure ML mode.");
    }
    if (!payload.symbol || !payload.timeframe || !payload.startDate || !payload.endDate) {
         throw new Error("Missing required fields in payload (symbol, timeframe, startDate, endDate).");
     }
    try {
        // Calls your Node.js backend
        const { data } = await api.post("/backtest/run", payload);
        return data;
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
     if (payload.mlMode !== 'on' && !payload.code) {
         throw new Error("A strategy 'code' is required unless using Pure ML mode.");
     }
     if (!payload.symbol || !payload.timeframe || !payload.startDate || !payload.endDate) {
         throw new Error("Missing required fields in payload (symbol, timeframe, startDate, endDate).");
     }
    try {
        // Calls your Node.js backend
        const { data } = await api.post("/backtest/preview", payload);
        return data;
    } catch (error) {
        handleError(error, "previewStrategy");
    }
}

/**
 * Submits a configuration to run a new combo-strategy backtest.
 * @param {object} payload - The combo backtest configuration object.
 */
export async function runComboBacktest(payload) {
    if (!payload || !payload.strategies || payload.strategies.filter(s => s.code).length === 0) {
        throw new Error("Payload must contain at least one strategy with a 'code'.");
    }
    if (!payload.symbol || !payload.timeframe || !payload.startDate || !payload.endDate) {
         throw new Error("Missing required fields in payload (symbol, timeframe, startDate, endDate).");
     }
    try {
        // Calls your Node.js backend
        const { data } = await api.post("/backtest/combo", payload);
        return data;
    } catch (error) {
        handleError(error, "runComboBacktest");
    }
}
