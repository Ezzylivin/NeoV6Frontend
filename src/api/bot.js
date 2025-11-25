// File: src/api/bot.js
// 🚀 UPGRADED: Matches the robust structure of backtest.js
// Uses centralized apiClient for automatic Auth/Token handling.

import api from "./apiClient.js"; 

/**
 * Consistent Error Handler
 */
const handleError = (error, functionName) => {
    console.error(`Error in ${functionName}():`, error.message);
    if (error.response) {
        console.error('Error Response Data:', error.response.data);
    }
    
    const message = error.response?.data?.message || error.message || "An unknown bot error occurred.";
    throw new Error(message);
};

// --- Main Bot API Functions ---

export async function startBot(config) {
    if (!config) throw new Error("Bot configuration is required.");
    try {
        const res = await api.post("/bot/start", config);
        return res.data;
    } catch (error) {
        handleError(error, "startBot");
    }
}

export async function stopBot() {
    try {
        const res = await api.post("/bot/stop");
        return res.data;
    } catch (error) {
        handleError(error, "stopBot");
    }
}

export async function fetchBotStatus() {
    try {
        const res = await api.get("/bot/status");
        return res.data;
    } catch (error) {
        handleError(error, "fetchBotStatus");
    }
}

export async function fetchBotLogs(limit = 100) {
    try {
        const res = await api.get(`/bot/logs?limit=${limit}`);
        return res.data;
    } catch (error) {
        handleError(error, "fetchBotLogs");
    }
}

// 🚀 THE WINNERS ENDPOINT
export async function fetchWinners() {
    try {
        const res = await api.get("/bot/winners");
        return res.data || [];
    } catch (error) {
        // Graceful fail: Return empty array if server is offline/error
        console.warn("Could not fetch winners:", error.message);
        return [];
    }
}
