// File: src/hooks/useBot.js
// 🚀 UPGRADE: v14.3 - Neural History Sync (Persistent Logs Recovery)

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAccount } from 'wagmi'; 
import { io } from "socket.io-client"; 

const API_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com";
const SOCKET_URL = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
const BASE_URL = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;

export const useBot = () => {
    const [botStatus, setBotStatus] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    
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

    // 🟢 INITIAL STATUS & LOG HISTORY SYNC
    useEffect(() => {
        if (!activeUserId) return;

        const syncInitialState = async () => {
            try {
                const token = localStorage.getItem("token");
                const headers = { Authorization: `Bearer ${token}` };

                // 1. Fetch Basic Bot Status (Balance, Positions, State)
                const statusRes = await axios.get(`${BASE_URL}/bot/status`, {
                    params: { userId: activeUserId },
                    headers
                });

                if (statusRes.data) {
                    setBotStatus(statusRes.data);
                    if (statusRes.data.status === 'running') {
                        localStorage.setItem("neo_active_bot_id", activeUserId);
                    }
                }

                // 2. 🟢 CATCH-UP: Fetch Persistent Log History from MongoDB
                // This ensures the stream is full even if the user just logged in
                const logsRes = await axios.get(`${BASE_URL}/bot/logs/${activeUserId}`, { headers });
                
                if (Array.isArray(logsRes.data)) {
                    // Logs from API are already sorted/formatted by the backend
                    setLogs(logsRes.data); 
                } else if (statusRes.data.logs) {
                    // Fallback to memory logs if DB history is empty
                    setLogs(statusRes.data.logs.slice(0, 100));
                }

            } catch (err) {
                console.error("Sync Error:", err.message);
            }
        };

        syncInitialState();
    }, [activeUserId]);

    // 🟢 WEBSOCKET CONNECTION (Real-time updates)
    useEffect(() => {
        if (!activeUserId) return;

        if (!socketRef.current) {
            socketRef.current = io(SOCKET_URL, {
                query: { userId: activeUserId },
                transports: ['websocket'],
                reconnectionAttempts: 5
            });

            socketRef.current.on("bot_status_update", (data) => {
                setBotStatus(data);
                if (data.status === 'running' || data.status === 'initializing') {
                    localStorage.setItem("neo_active_bot_id", activeUserId);
                } else if (data.status === 'stopped') {
                    localStorage.removeItem("neo_active_bot_id");
                }
            });

            socketRef.current.on("bot_log", (newLog) => {
                setLogs(prev => [newLog, ...prev].slice(0, 100));
            });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [activeUserId]);

    const startBot = async (configData) => {
        setLoading(true);
        setLogs([]); 
        try {
            const token = localStorage.getItem("token");
            const userId = activeUserId || address; 
            localStorage.setItem("neo_active_bot_id", userId);

            const payload = configData.config ? configData : { userId, config: { ...configData, userId } };

            await axios.post(`${BASE_URL}/bot/start`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Start Command Sent");
        } catch (error) {
            localStorage.removeItem("neo_active_bot_id");
            toast.error(error.response?.data?.message || "Failed to start bot");
        } finally {
            setLoading(false);
        }
    };

    const stopBot = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${BASE_URL}/bot/stop`, { userId: resolveActiveId() }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            localStorage.removeItem("neo_active_bot_id");
            toast.success("Stop Command Sent");
        } catch (error) {
            toast.error("Failed to stop bot");
        } finally {
            setLoading(false);
        }
    };

    const resetBot = async () => {
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${BASE_URL}/bot/reset`, { userId: resolveActiveId() }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBotStatus(null);
            setLogs([]);
            localStorage.removeItem("neo_active_bot_id");
            toast.success("Bot Reset Complete");
        } catch (e) { console.error(e); }
    };

    return { botStatus, logs, loading, startBot, stopBot, resetBot };
};
