// File: src/hooks/useBot.js

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAccount } from 'wagmi';
import { BACKEND_URL } from '../config/api.js';

const BASE_URL = `${BACKEND_URL}/api`;

// ============================================================
// 🔧 Socket removed from this hook entirely
// ============================================================
// useBot is HTTP-only. TradingBot.jsx owns the single socket.
// This hook handles: start, stop, reset, close, and REST-based refresh.

export const useBot = () => {
    const [botStatus, setBotStatus] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [restoredConfig, setRestoredConfig] = useState(null);

    const { address, isConnected } = useAccount();

    // FE#2: identity is the AUTHENTICATED user (JWT _id) — that's what the backend
    // controllers (req.user.id) and the socket room key on. The wallet address is
    // only a fallback for wallet-first flows; it must never gate whether the bot
    // or socket works, or live events emit to a room the client never joined.
    const resolveActiveId = useCallback(() => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "null");
            if (user?._id) return user._id;
        } catch { /* malformed user json in storage */ }
        if (isConnected && address) return address;
        return localStorage.getItem("neo_active_bot_id") || null;
    }, [address, isConnected]);

    const activeUserId = resolveActiveId();

    // FE#15: never send "Bearer null" — omit the header when there is no token.
    const authHeaders = () => {
        const t = localStorage.getItem("token");
        return t ? { Authorization: `Bearer ${t}` } : {};
    };

    const refreshState = useCallback(async () => {
        if (!activeUserId) return;
        try {
            const statusRes = await axios.get(`${BASE_URL}/bot/status`, {
                params: { userId: activeUserId }, headers: authHeaders()
            });

            if (statusRes.data) {
                setBotStatus(statusRes.data);
                if (statusRes.data.config) setRestoredConfig(statusRes.data.config);
                if (statusRes.data.status === 'running') {
                    localStorage.setItem("neo_active_bot_id", activeUserId);
                }
                if (statusRes.data.logs && Array.isArray(statusRes.data.logs)) {
                    setLogs(statusRes.data.logs);
                }
            }
        } catch (err) {
            console.error("Sync Error:", err.message);
        }
    }, [activeUserId]);

    // Fetch initial state on mount
    useEffect(() => { refreshState(); }, [refreshState]);

    const startBot = async (configData) => {
        setLoading(true);
        setLogs([]);
        try {
            const userId = activeUserId || address;
            if (userId) localStorage.setItem("neo_active_bot_id", userId);

            const payload = configData.config
                ? configData
                : { userId, config: { ...configData, userId } };

            const response = await axios.post(`${BASE_URL}/bot/start`, payload, {
                headers: authHeaders()
            });
            toast.success("Start Command Sent");
            return response.data;
        } catch (error) {
            localStorage.removeItem("neo_active_bot_id");
            toast.error(error.response?.data?.message || "Failed to start bot");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const stopBot = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${BASE_URL}/bot/stop`,
                { userId: resolveActiveId() },
                { headers: authHeaders() }
            );
            localStorage.removeItem("neo_active_bot_id");
            toast.success("Stop Command Sent");
            return response.data;
        } catch (error) {
            toast.error("Failed to stop bot");
        } finally {
            setLoading(false);
        }
    };

    const resetBot = async () => {
        try {
            await axios.post(`${BASE_URL}/bot/reset`,
                { userId: resolveActiveId() },
                { headers: authHeaders() }
            );
            setBotStatus(null);
            setLogs([]);
            localStorage.removeItem("neo_active_bot_id");
            toast.success("Bot Reset Complete");
        } catch (e) {
            console.error(e);
        }
    };

    // The Node route is /api/bot/close-position (kebab) — see botRoutes.js. The
    // Node service then forwards to the engine's /api/bot/close_position.
    const closePosition = async ({ userId, symbol }) => {
        try {
            const response = await axios.post(`${BASE_URL}/bot/close-position`,
                {
                    userId: userId,
                    user_id: userId,
                    symbol: symbol
                },
                { headers: authHeaders() }
            );

            toast.success("Manual Exit Protocol Executed");
            return response.data;
        } catch (error) {
            console.error("Exit Error:", error.response?.data);
            toast.error(error.response?.data?.detail || "Failed to close position");
            throw error;
        }
    };

    return {
        botStatus, logs, loading, restoredConfig,
        startBot, stopBot, resetBot, refreshState, closePosition
    };
};
