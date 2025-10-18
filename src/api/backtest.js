import api from "./apiClient.js"; // Your main configured Axios client
import axios from "axios";       // Import axios directly for the external ML call

// The URL for your Python ML server, pulled from environment variables
const ML_API_BASE_URL = process.env.REACT_APP_ML_API_URL;

/**
 * Normalizes the API response for backtest options.
 */
const normalizeOptions = (raw) => ({
    strategies: raw?.strategies || [],
    symbols: raw?.symbols || [],
    timeframes: raw?.timeframes || [],
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
    throw {
        status: error.response?.status || 500,
        message: message,
    };
};

// --- Main Backend API Functions ---

export async function fetchOptions() {
    try {
        const response = await api.get("/backtest/options");
        return normalizeOptions(response.data);
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
    if (!payload.code) throw new Error("A strategy 'code' is required.");
    try {
        const { data } = await api.post("/backtest/run", payload);
        return data;
    } catch (error) {
        handleError(error, "runBacktest");
    }
}

export async function previewStrategy(payload) {
    if (!payload.code) throw new Error("A strategy 'code' is required.");
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

// --- Machine Learning Server API Functions ---

/**
 * ✅ NEW: Fetches the list of available ML model names from the server.
 */
export async function fetchModels() {
    try {
        // We use axios to call the ML server, which may be different from the main API.
        const response = await axios.get(`${ML_API_BASE_URL}/api/models`);
        return response.data.models || [];
    } catch (error) {
        handleError(error, "fetchModels");
    }
}

/**
 * Calls the external ML server to get predictions.
 * @param {object} featuresPayload - The data required by your model (e.g., { symbol, features }).
 */
export async function getMlPredictions(featuresPayload) {
    try {
        const response = await axios.post(`${ML_API_BASE_URL}/api/predict`, featuresPayload);
        return response.data;
    } catch (error) {
        handleError(error, "getMlPredictions");
    }
}
