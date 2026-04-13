// File: src/api/backtest.js

import api from "./apiClient.js";

const handleError = (error, functionName) => {
    console.error(`Error in ${functionName}():`, error.message);
    if (error.response) console.error('Error Response Data:', error.response.data);
    let message = error.response?.data?.detail || error.response?.data?.message || error.message || "An unknown error occurred.";
    if (typeof message === 'string' && message.includes('class_indices')) {
        message = "Symbol/Timeframe Mismatch: The selected model doesn't match the backtest configuration.";
    }
    throw new Error(message);
};

// ============================================================
// 🔧 FIX #1: Stream handler checks for "success" (not "complete")
// ============================================================
// OLD: Checked for update.status === "complete"
//      Backend sends update.status === "success"
//      Result was NEVER captured — stream finished with null
// NEW: Checks both "success" and "complete" for safety
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
        let buffer = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete last line

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const update = JSON.parse(line);
                    if (update.status === "progress") {
                        if (onUpdate) onUpdate(update);
                    } else if (update.status === "success" || update.status === "complete") {
                        // 🔧 FIX: Backend sends "success", not "complete"
                        finalResult = update.result || update;
                    } else if (update.status === "error") {
                        throw new Error(update.message);
                    }
                } catch (e) {
                    // Partial JSON chunk — will be completed on next read
                    if (e.message && !e.message.includes("Unexpected")) throw e;
                }
            }
        }
        return finalResult;
    } catch (error) {
        handleError(error, "runStreamedBacktest");
    }
}

// ============================================================
// 🔧 FIX #2: Endpoint matches backend route
// ============================================================
export async function fetchModels() {
    try {
        // OLD: /ml/models — doesn't exist
        // NEW: /ml/available-models — matches main4.py
        const response = await api.get("/ml/available-models");
        return response.data?.models || [];
    } catch (error) {
        handleError(error, "fetchModels");
    }
}

// ============================================================
// 🔧 FIX #3: Standard backtest runner (non-streaming)
// ============================================================
export async function runBacktest(payload) {
    try {
        const res = await api.post("/backtest/run", payload);
        return res.data;
    } catch (error) {
        handleError(error, "runBacktest");
    }
}

export async function runComboBacktest(payload) {
    try {
        const res = await api.post("/backtest/combo", payload);
        return res.data;
    } catch (error) {
        handleError(error, "runComboBacktest");
    }
}

// ============================================================
// 🔧 FIX #4 (Tier 4): Removed dead functions
// ============================================================
// REMOVED: fetchOptions()    — /backtest/options doesn't exist
// REMOVED: fetchAll()        — /backtest?page=X doesn't exist
// REMOVED: fetchById()       — /backtest/:id doesn't exist
// REMOVED: deleteById()      — DELETE /backtest/:id doesn't exist
// REMOVED: fetchWinners()    — /bot/winners doesn't exist
//
// These were called by useBacktest hook on mount, all failed silently.
// If you add these backend endpoints later, re-add the functions.
//
// Kept: normalizers in case you need them later
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
