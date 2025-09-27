import api from "./apiClient.js";

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
 * A consistent error handler for API calls.
 */
const handleError = (error, functionName) => {
    const message = error.response?.data?.message || error.message || "An unknown error occurred.";
    console.error(`${functionName}(): failed`, message);
    throw {
        status: error.response?.status || null,
        message: message,
    };
};

// --- API Service Functions ---

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

// Renamed for consistency with the controller it calls (`runBacktestController`)
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

/**
 * Runs a combined backtest for multiple strategies.
 * @param {object} payload - The complete configuration from the combo form.
 * The payload MUST contain `strategies: [{code, params}, ...]`.
 */
export async function runComboBacktest(payload) {
    // ✅ FIX: The payload from the frontend component is now perfectly shaped.
    // No transformation is needed. We just pass the payload directly.
    try {
        if (!payload.strategies || payload.strategies.length === 0) {
            throw new Error("Payload must contain a non-empty 'strategies' array.");
        }
        const { data } = await api.post("/backtest/combo", payload);
        return data;
    } catch (error) {
        handleError(error, "runComboBacktest");
    }
}
