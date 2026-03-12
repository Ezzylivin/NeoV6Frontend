// File: src/api/backtest.js
// 🚀 UPGRADED: Added real-time Stream support and robust data normalization

import api from "./apiClient.js";

/**
 * A consistent error handler for all API calls.
 */
const handleError = (error, functionName) => {
    console.error(`Error in ${functionName}():`, error.message);
    if (error.response) {
        console.error('Error Response Data:', error.response.data);
    }
    
    let message = error.response?.data?.detail || error.response?.data?.message || error.message || "An unknown error occurred.";

    // 🛡️ Error Masking: Convert cryptic Python errors into user-friendly instructions
    if (typeof message === 'string' && message.includes('class_indices')) {
        message = "Symbol and Timeframe Mismatch: The selected model does not match the backtest timeframe. Please choose a matching model.";
    }

    throw new Error(message);
};

// --- Normalizers ---
const normalizeOptions = (raw) => ({
    strategies: raw?.strategies || [],
    symbols: raw?.symbols || [],
    timeframes: raw?.timeframes || [],
    models: raw?.models || [],
});

const normalizePastBacktests = (raw) => ({
    backtests: raw?.backtests || [],
    total: raw?.total || 0,
});

// --- 🚀 NEW: THE STREAM HANDLER ---
/**
 * Handles the low-level fetch stream for real-time progress updates.
 * This is the "glue" that powers your progress bar.
 */
export async function runStreamedBacktest(type, payload, onUpdate) {
    const endpoint = type === 'combo' ? "/backtest/combo" : "/backtest/run";
    const token = localStorage.getItem('token');
    const baseURL = api.defaults.baseURL;

    try {
        const response = await fetch(`${baseURL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Server Error");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let finalResult = null;

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const update = JSON.parse(line);
                    if (update.status === "progress") {
                        if (onUpdate) onUpdate(update);
                    } else if (update.status === "complete") {
                        finalResult = update.result;
                    } else if (update.status === "error") {
                        throw new Error(update.message);
                    }
                } catch (e) {
                    // Silently catch partial JSON chunks
                }
            }
        }
        return finalResult;
    } catch (error) {
        handleError(error, "runStreamedBacktest");
    }
}

// --- Main API Functions ---

export async function fetchOptions() {
    try {
        const res = await api.get("/backtest/options");
        return normalizeOptions(res.data);
    } catch (error) {
        handleError(error, "fetchOptions");
    }
}

export async function fetchModels() {
    try {
        const response = await api.get("/ml/models");
        return response.data || [];
    } catch (error) {
        handleError(error, "fetchModels");
    }
}

export async function fetchAll(page = 1) {
    try {
        const res = await api.get(`/backtest?page=${page}`);
        return normalizePastBacktests(res.data);
    } catch (error) {
        handleError(error, "fetchAll");
    }
}

export async function fetchById(id) {
    if (!id) throw new Error("An ID is required.");
    try {
        const res = await api.get(`/backtest/${id}`);
        return res.data;
    } catch (error) {
        handleError(error, "fetchById");
    }
}

export async function deleteById(id) {
    if (!id) throw new Error("An ID is required.");
    try {
        const res = await api.delete(`/backtest/${id}`);
        return res.data;
    } catch (error) {
        handleError(error, "deleteById");
    }
}

export async function runBacktest(payload) {
    // Fallback if component doesn't use the streamer
    try {
        const res = await api.post("/backtest/run", payload);
        return res.data;
    } catch (error) {
        handleError(error, "runBacktest");
    }
}

export async function runComboBacktest(payload) {
    // Fallback if component doesn't use the streamer
    try {
        const res = await api.post("/backtest/combo", payload);
        return res.data;
    } catch (error) {
        handleError(error, "runComboBacktest");
    }
}

export async function fetchWinners() {
    try {
        const res = await api.get("/bot/winners"); 
        return res.data || [];
    } catch (error) {
        console.warn("Could not fetch winners:", error.message);
        return [];
    }
}
