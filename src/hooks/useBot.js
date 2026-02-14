// File: src/hooks/useBot.js
// 🚀 FIX: v14.4 - Fixed Return Value & Consolidated Log Sync

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

                // 1. Fetch Full Bot State (Status + Logs + Equity)
                const statusRes = await axios.get(`${BASE_URL}/bot/status`, {
                    params: { userId: activeUserId },
                    headers
                });

                if (statusRes.data) {
                    setBotStatus(statusRes.data);
                    
                    // 🟢 RESUME SESSION
                    if (statusRes.data.status === 'running') {
                        localStorage.setItem("neo_active_bot_id", activeUserId);
                    }

                    // 🟢 HYDRATE LOGS (From the main status payload)
                    // The backend main3.py now returns 'logs' in this response
                    if (statusRes.data.logs && Array.isArray(statusRes.data.logs)) {
                        // Map backend format to frontend format if needed
                        const formattedLogs = statusRes.data.logs.map(l => ({
                            message: l.message || l.msg,
                            time: l.time
                        }));
                        setLogs(formattedLogs.reverse()); // Show newest first
                    }
                }

            } catch (err) {
                console.error("Sync Error:", err.message);
            }
        };

        syncInitialState();
    }, [activeUserId]);

    // 🟢 WEBSOCKET CONNECTION
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
                // Prepend new log (Top of list)
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

            // 🟢 CRITICAL FIX: Capture the response
            const response = await axios.post(`${BASE_URL}/bot/start`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            toast.success("Start Command Sent");
            
            // 🟢 CRITICAL FIX: Return data so TradingBot.jsx doesn't crash
            return response.data; 

        } catch (error) {
            localStorage.removeItem("neo_active_bot_id");
            toast.error(error.response?.data?.message || "Failed to start bot");
            return null; // Return null on error so UI can handle it gracefully
        } finally {
            setLoading(false);
        }
    };

    const stopBot = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(`${BASE_URL}/bot/stop`, { userId: resolveActiveId() }, {
                headers: { Authorization: `Bearer ${token}` }
            });
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
