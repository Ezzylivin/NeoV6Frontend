// File: src/hooks/useBot.js
// 🚀 UPGRADE: v14.2 - Immediate State Sync (Fixes "Standby" Ghosting)

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAccount } from 'wagmi'; 
import { io } from "socket.io-client"; 

const API_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com";
// Ensure Socket connects to root, not /api
const SOCKET_URL = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
const BASE_URL = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;

export const useBot = () => {
    const [botStatus, setBotStatus] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const { address, isConnected } = useAccount();
    const socketRef = useRef(null);

    // 🟢 1. INTELLIGENT ID RESOLVER
    const resolveActiveId = useCallback(() => {
        // A. Priority: The ID explicitly saved as "Running"
        const savedId = localStorage.getItem("neo_active_bot_id");
        if (savedId) return savedId;

        // B. Secondary: Connected Wallet
        if (isConnected && address) return address;

        // C. Fallback: Database User
        const user = JSON.parse(localStorage.getItem("user"));
        return user?._id;
    }, [address, isConnected]);

    const activeUserId = resolveActiveId();

    // 🟢 2. INITIAL STATUS SYNC (The Fix)
    // We fetch status via HTTP REST immediately to see if bot is already running
    useEffect(() => {
        if (!activeUserId) return;

        const syncInitialState = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(`${BASE_URL}/bot/status`, {
                    params: { userId: activeUserId },
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.data) {
                    setBotStatus(res.data); // 🟢 Syncs "Operational" state immediately
                    
                    // Restore logs if they exist
                    if (res.data.logs && Array.isArray(res.data.logs)) {
                        setLogs(res.data.logs.slice(0, 100));
                    }

                    // Re-persist ID if running
                    if (res.data.status === 'running') {
                        localStorage.setItem("neo_active_bot_id", activeUserId);
                    }
                }
            } catch (err) {
                // Silent fail (bot might just be stopped, which is fine)
            }
        };

        syncInitialState();
    }, [activeUserId]);

    // 🟢 3. WEBSOCKET CONNECTION
    useEffect(() => {
        if (!activeUserId) return;

        if (!socketRef.current) {
            console.log("🔌 Connecting Hook Socket for:", activeUserId);
            
            socketRef.current = io(SOCKET_URL, {
                query: { userId: activeUserId },
                transports: ['websocket'],
                reconnectionAttempts: 5
            });

            socketRef.current.on("connect", () => {
                console.log("✅ Bot Hook Connected");
            });

            socketRef.current.on("bot_status_update", (data) => {
                setBotStatus(data);
                
                if (data.status === 'running' || data.status === 'initializing') {
                    if (activeUserId !== localStorage.getItem("neo_active_bot_id")) {
                        localStorage.setItem("neo_active_bot_id", activeUserId);
                    }
                } else if (data.status === 'stopped') {
                    localStorage.removeItem("neo_active_bot_id");
                }
            });

            socketRef.current.on("bot_log", (newLog) => {
                setLogs(prev => [newLog, ...prev].slice(0, 100));
            });

            socketRef.current.on("disconnect", () => {
                console.log("❌ Bot Hook Disconnected");
            });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [activeUserId]);

    // 🟢 4. ACTIONS
    const startBot = async (configData) => {
        setLoading(true);
        setLogs([]); 
        try {
            const token = localStorage.getItem("token");
            const userId = activeUserId || address; 
            
            localStorage.setItem("neo_active_bot_id", userId);

            let payload;
            if (configData.config) {
                payload = configData; 
            } else {
                payload = { userId, config: { ...configData, userId } }; 
            }

            await axios.post(`${BASE_URL}/bot/start`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            toast.success("Start Command Sent");
        } catch (error) {
            console.error("Start Error:", error);
            localStorage.removeItem("neo_active_bot_id");
            const msg = error.response?.data?.message || "Failed to start bot";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const stopBot = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const userId = resolveActiveId();
            
            await axios.post(`${BASE_URL}/bot/stop`, { userId }, {
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
            const userId = resolveActiveId();
            
            await axios.post(`${BASE_URL}/bot/reset`, { userId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setBotStatus(null);
            setLogs([]);
            localStorage.removeItem("neo_active_bot_id");
            toast.success("Bot Reset Complete");
        } catch (e) { console.error(e); }
    };

    const refresh = useCallback(() => {
        // Optional manual refresh hook
    }, []);

    return { botStatus, logs, loading, startBot, stopBot, resetBot, refresh };
};
