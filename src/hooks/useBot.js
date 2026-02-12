// File: src/hooks/useBot.js
// 🚀 UPGRADE: v14.1 - WebSocket Enabled (Real-Time Data, No Polling)

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAccount } from 'wagmi'; 
import { io } from "socket.io-client"; // 🟢 1. Import Socket Client

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

    // 🟢 2. INTELLIGENT ID RESOLVER
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

    // 🟢 3. WEBSOCKET CONNECTION (Replaces Polling Loop)
    useEffect(() => {
        if (!activeUserId) return;

        // Initialize Socket only if not already active
        if (!socketRef.current) {
            console.log("🔌 Connecting Hook Socket for:", activeUserId);
            
            socketRef.current = io(SOCKET_URL, {
                query: { userId: activeUserId },
                transports: ['websocket'], // Force WebSocket to prevent polling fallbacks
                reconnectionAttempts: 5
            });

            // --- LISTENERS ---
            socketRef.current.on("connect", () => {
                console.log("✅ Bot Hook Connected");
            });

            socketRef.current.on("bot_status_update", (data) => {
                setBotStatus(data);
                
                // Smart Persistence: Keep ID if running, clear if stopped
                if (data.status === 'running' || data.status === 'initializing') {
                    if (activeUserId !== localStorage.getItem("neo_active_bot_id")) {
                        localStorage.setItem("neo_active_bot_id", activeUserId);
                    }
                } else if (data.status === 'stopped') {
                    localStorage.removeItem("neo_active_bot_id");
                }
            });

            socketRef.current.on("bot_log", (newLog) => {
                setLogs(prev => {
                    // Add new log to top, keep list size manageable (100 items)
                    return [newLog, ...prev].slice(0, 100);
                });
            });

            socketRef.current.on("disconnect", () => {
                console.log("❌ Bot Hook Disconnected");
            });
        }

        // Cleanup on unmount or ID change
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [activeUserId]);

    // 🟢 4. ACTIONS (Commands still use HTTP REST)
    
    const startBot = async (configData) => {
        setLoading(true);
        setLogs([]); // Clear logs for fresh start
        try {
            const token = localStorage.getItem("token");
            const userId = activeUserId || address; 
            
            // Persist intent immediately
            localStorage.setItem("neo_active_bot_id", userId);

            // Handle both flat config and pre-structured payload
            let payload;
            if (configData.config) {
                payload = configData; // Already structured
            } else {
                payload = { userId, config: { ...configData, userId } }; // Auto-structure
            }

            await axios.post(`${BASE_URL}/bot/start`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            toast.success("Start Command Sent");
            // No need to fetchStatus(), socket will push the update
            
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
            
            // Clear persistence
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

    // Manual refresh is rarely needed with Sockets, but kept for compatibility
    const refresh = useCallback(() => {
        if (socketRef.current && socketRef.current.connected) {
            // We could emit a "request_status" event here if backend supports it
            // For now, we rely on the push updates
        }
    }, []);

    return { botStatus, logs, loading, startBot, stopBot, resetBot, refresh };
};
