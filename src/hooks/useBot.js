// File: src/hooks/useBot.js
// 🚀 FIX: v14.8 - Consolidated Hooks & Fixed Manual Exit Endpoint

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAccount } from 'wagmi'; 
import { io } from "socket.io-client"; 

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const SOCKET_URL = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
const BASE_URL = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;

export const useBot = () => {
    const [botStatus, setBotStatus] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [restoredConfig, setRestoredConfig] = useState(null);
    
    const { address, isConnected } = useAccount();
    const socketRef = useRef(null);

    const resolveActiveId = useCallback(() => {
        const savedId = localStorage.getItem("neo_active_bot_id");
        if (savedId) return savedId;
        if (isConnected && address) return address;
        const user = JSON.parse(localStorage.getItem("user"));
        return user?._id;
    }, [address, isConnected]);

    const activeUserId = resolveActiveId();

    const refreshState = useCallback(async () => {
        if (!activeUserId) return;
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const statusRes = await axios.get(`${BASE_URL}/bot/status`, {
                params: { userId: activeUserId }, headers
            });

            if (statusRes.data) {
                setBotStatus(statusRes.data);
                if (statusRes.data.config) setRestoredConfig(statusRes.data.config);
                if (statusRes.data.status === 'running') localStorage.setItem("neo_active_bot_id", activeUserId);
                if (statusRes.data.logs && Array.isArray(statusRes.data.logs)) setLogs(statusRes.data.logs); 
            }
        } catch (err) {
            console.error("Sync Error:", err.message);
        }
    }, [activeUserId]);

    useEffect(() => { refreshState(); }, [refreshState]);

    useEffect(() => {
        if (!activeUserId) return;
        if (!socketRef.current) {
            socketRef.current = io(SOCKET_URL, { query: { userId: activeUserId }, transports: ['websocket'], reconnectionAttempts: 5 });
            
            socketRef.current.on("bot_status_update", (data) => {
                if (data.status === 'stopped') {
                    setBotStatus(null);
                    localStorage.removeItem("neo_active_bot_id");
                    return;
                }
                setBotStatus(data);
                if (data.status === 'running' || data.status === 'initializing') {
                    localStorage.setItem("neo_active_bot_id", activeUserId);
                }
            });

            socketRef.current.on("bot_log", (newLog) => {
                const logObj = typeof newLog === 'string' ? { message: newLog, time: new Date().toISOString() } : newLog;
                setLogs(prev => [logObj, ...prev].slice(0, 200)); 
            });
        }
        return () => { if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; } };
    }, [activeUserId]);

    const startBot = async (configData) => {
        setLoading(true); setLogs([]); 
        try {
            const token = localStorage.getItem("token");
            const userId = activeUserId || address; 
            localStorage.setItem("neo_active_bot_id", userId);
            const payload = configData.config ? configData : { userId, config: { ...configData, userId } };
            const response = await axios.post(`${BASE_URL}/bot/start`, payload, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Start Command Sent");
            return response.data; 
        } catch (error) {
            localStorage.removeItem("neo_active_bot_id");
            toast.error(error.response?.data?.message || "Failed to start bot");
            return null; 
        } finally { setLoading(false); }
    };

    const stopBot = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(`${BASE_URL}/bot/stop`, { userId: resolveActiveId() }, { headers: { Authorization: `Bearer ${token}` } });
            localStorage.removeItem("neo_active_bot_id");
            toast.success("Stop Command Sent");
            return response.data;
        } catch (error) { toast.error("Failed to stop bot"); } finally { setLoading(false); }
    };

    const resetBot = async () => {
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${BASE_URL}/bot/reset`, { userId: resolveActiveId() }, { headers: { Authorization: `Bearer ${token}` } });
            setBotStatus(null); setLogs([]); localStorage.removeItem("neo_active_bot_id");
            toast.success("Bot Reset Complete");
        } catch (e) { console.error(e); }
    };

    const closePosition = async ({ userId, symbol }) => {
        try {
            const token = localStorage.getItem("token");
            // 🟢 FIXED ENDPOINT: Uses kebab-case to match Render backend standards
            const response = await axios.post(`${BASE_URL}/bot/close-position`, 
                { userId, symbol }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Manual Exit Protocol Executed");
            return response.data;
        } catch (error) {
            console.error("Exit Error:", error.response?.data);
            toast.error(error.response?.data?.detail || "Failed to close position");
            throw error;
        }
    };

    return { botStatus, logs, loading, restoredConfig, startBot, stopBot, resetBot, refreshState, closePosition };
}; // ✅ Closed correctly
