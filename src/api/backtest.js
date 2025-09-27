// File: src/services/backtestService.js
import api from "./apiClient.js";

/**
 * Normalizes the API response for backtest options.
 * @param {object} raw - The raw data from the API.
 * @returns {object} The normalized options object.
 */
const normalizeOptions = (raw) => ({
    strategies: raw?.strategies || [],
    symbols: raw?.symbols || [],
    timeframes: raw?.timeframes || [],
});

/**
 * Normalizes the API response for a list of past backtests.
 * @param {object} raw - The raw data from the API.
 * @returns {object} The normalized backtests object with total count.
 */
const normalizePastBacktests = (raw) => ({
    backtests: raw?.backtests || [],
    total: raw?.total || 0,
});

/**
 * A consistent error handler for API calls.
 * @param {Error} error - The error object from the catch block.
 * @param {string} functionName - The name of the function where the error occurred.
 */
const handleError = (error, functionName) => {
    console.error(`${functionName}(): failed`, error.response?.data?.message || error.message);
    throw error;
};


// --- API Service Functions ---

/**
 * Fetches available options for running a backtest.
 * Matches: `fetchBacktestOptionsController`
 */
export async function fetchOptions() {
    try {
        const response = await api.get("/backtest/options");
        return normalizeOptions(response.data);
    } catch (error) {
        handleError(error, "fetchOptions");
    }
}

/**
 * Fetches a paginated list of previously run backtests.
 * Matches: `fetchPastBacktestsController`
 * @param {number} [page=1] - The page number to fetch.
 */
export async function fetchAll(page = 1) {
    try {
        const response = await api.get(`/backtest?page=${page}`);
        return normalizePastBacktests(response.data);
    } catch (error) {
        handleError(error, "fetchAll");
    }
}

/**
 * Fetches a single backtest by its ID.
 * Matches: `getBacktestById`
 * @param {string} id - The MongoDB ObjectId of the backtest.
 */
export async function fetchById(id) {
    try {
        const { data } = await api.get(`/backtest/${id}`);
        return data;
    } catch (error) {
        handleError(error, "fetchById");
    }
}

/**
 * Deletes a single backtest by its ID.
 * Matches: `deleteBacktestController`
 * @param {string} id - The MongoDB ObjectId of the backtest.
 */
export async function deleteById(id) {
    try {
        const { data } = await api.delete(`/backtest/${id}`);
        return data;
    } catch (error) {
        handleError(error, "deleteById");
    }
}

/**
 * Runs a backtest for a single strategy.
 * Matches: `runBacktestController`
 * @param {{code: string, symbol: string, timeframe: string, startDate?: string, endDate?: string, tp?: number, sl?: number, params?: object}} payload
 */
export async function runBacktest(payload) {
    if (!payload.code) throw new Error("A strategy 'code' is required.");
    try {
        const { data } = await api.post("/backtest/run", payload);
        return data;
    } catch (error) {
        handleError(error, "runBacktest");
    }
}

/**
 * Previews a strategy without saving the result.
 * Matches: `previewStrategyController`
 * @param {{code: string, symbol: string, timeframe: string, params?: object}} payload
 */
export async function previewStrategy(payload) {
    if (!payload.code) throw new Error("A strategy 'code' is required.");
    try {
        const { data } = await api.post("/backtest/preview", payload);
        return data;
    } catch (error) {
        handleError(error, "previewStrategy");
    }
}

/**
 * Runs a combined backtest for multiple strategies.
 * Matches: `runComboBacktest`
 * @param {{strategyCodes: string[], symbol?: string, symbols?: string[], timeframe: string, startDate?: string, endDate?: string, initial_balance?: number}} payload
 */
export async function runComboBacktest(payload) {
    // This is the critical transformation to match the backend controller.
    const { strategyCodes, ...restOfConfig } = payload;
    const apiPayload = {
        strategies: strategyCodes, // Rename `strategyCodes` to `strategies`
        ...restOfConfig
    };

    try {
        const { data } = await api.post("/backtest/combo", apiPayload);
        return data;
    } catch (error) {
        handleError(error, "runComboBacktest");
    }
}
