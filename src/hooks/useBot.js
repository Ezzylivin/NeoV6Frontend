// File: src/hooks/useBot.js
// 🚀 FIX: v14.8 - Production Engine Sync & Auth Alignment

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
    const [restoredConfig, setRestoredConfig] = useState(null);
    
    const { address, isConnected } = useAccount();
    const socketRef = useRef(null);

    // Identifies the current active session ID
    const resolveActiveId = useCallback(() => {
        const savedId = localStorage.getItem("neo_active_bot_id");
        if (savedId) return savedId;
        if (isConnected && address) return address;
        const user = JSON.parse(localStorage.getItem("user"));
        return user?._id;
    }, [address, isConnected]);

    const activeUserId = resolveActiveId();

    // 🟢 REFRESH FUNCTION: Full sync with Backend DB
    // Specifically fixes the "Standby" freeze by force-checking status
    const refreshState = useCallback(async () => {
        if (!activeUserId) return;
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const headers = { Authorization: `Bearer ${token}` };

            const statusRes = await axios.get(`${BASE_URL}/bot/status`, {
                params: { userId: activeUserId }, 
                headers // 🟢 Critical: Included for auth gate
            });

            if (statusRes.data && statusRes.data.status !== 'inactive') {
                console.log("📥 Syncing Engine State:", statusRes.data);
                setBotStatus(statusRes.data);
                if (statusRes.data.config) setRestoredConfig(statusRes.data.config);
                if (statusRes.data.status === 'running') localStorage.setItem("neo_active_bot_id", activeUserId);
                if (statusRes.data.logs) setLogs(statusRes.data.logs); 
            }
        } catch (err) {
            console.error("Engine Sync Error:", err.message);
        }
    }, [activeUserId]);

    // Initial sync on mount
    useEffect(() => { if (isConnected) refreshState(); }, [refreshState, isConnected]);

    // WebSocket Logic: Real-time UI Updates
    useEffect(() => {
        if (!activeUserId || !isConnected) return;
        
        if (!socketRef.current) {
            socketRef.current = io(SOCKET_URL, { 
                query: { userId: activeUserId }, 
                transports: ['websocket'], 
                reconnectionAttempts: 5 
            });

            // Inside the socket logic of useBot.js
// 🟢 FIX: Persistent State Merging
socketRef.current.on("bot_status_update", (data) => {
    if (data.status === 'stopped') {
        setBotStatus(null);
        localStorage.removeItem("neo_active_bot_id");
    } else {
        setBotStatus(prev => ({
            ...prev,    // Keep existing data (candles, logs, etc)
            ...data,    // Overwrite with fresh updates (PnL, Status)
            // 🚀 CRITICAL: Prevent candles from being wiped if missing in this packet
            candles: data.candles || prev?.candles || [],
            equityCurve: data.equityCurve || prev?.equityCurve || [],
            tradeMarkers: data.tradeMarkers || prev?.tradeMarkers || []
        }));
        localStorage.setItem("neo_active_bot_id", activeUserId);
    }
});
            socketRef.current.on("bot_log", (newLog) => {
                const logObj = typeof newLog === 'string' ? { message: newLog, time: new Date().toISOString() } : newLog;
                setLogs(prev => {
                    // Prevent duplicate log entry if it already exists
                    if (prev.length > 0 && prev[0].message === logObj.message) return prev;
                    return [logObj, ...prev].slice(0, 300);
                }); 
            });
        }

        return () => { 
            if (socketRef.current) { 
                socketRef.current.disconnect(); 
                socketRef.current = null; 
            } 
        };
    }, [activeUserId, isConnected]);

    // 🚀 START ENGINE: Now includes headers to pass the Python Auth Gate
    const startBot = async (configData) => {
        setLoading(true); 
        try {
            const token = localStorage.getItem("token");
            const userId = activeUserId || address; 
            
            // Build consistent payload for FastAPI
            const payload = configData.config 
                ? configData 
                : { userId, config: { ...configData, userId } };

            const response = await axios.post(`${BASE_URL}/bot/start`, payload, { 
                headers: { Authorization: `Bearer ${token}` } // 🟢 Fixes 401 Unauthorized
            });

            if (response.data.status === 'running') {
                localStorage.setItem("neo_active_bot_id", userId);
                toast.success("Engine Ignition Successful");
                await refreshState(); // Instant sync
            }
            return response.data; 
        } catch (error) {
            console.error("Ignition Error:", error);
            const msg = error.response?.data?.message || "Failed to start bot";
            toast.error(`Engine Failure: ${msg}`);
            return null; 
        } finally { setLoading(false); }
    };

    // 🛑 STOP ENGINE
    const stopBot = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(`${BASE_URL}/bot/stop`, 
                { userId: resolveActiveId() }, 
                { headers: { Authorization: `Bearer ${token}` } } // 🟢 Header included
            );
            localStorage.removeItem("neo_active_bot_id");
            setBotStatus(null);
            toast.success("Engine Deactivated");
            return response.data;
        } catch (error) { 
            toast.error("Halt Command Rejected"); 
        } finally { setLoading(false); }
    };

    // 🧹 RESET ENGINE
    const resetBot = async () => {
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${BASE_URL}/bot/reset`, 
                { userId: resolveActiveId() }, 
                { headers: { Authorization: `Bearer ${token}` } } // 🟢 Header included
            );
            setBotStatus(null); 
            setLogs([]); 
            localStorage.removeItem("neo_active_bot_id");
            toast.success("Factory Reset Complete");
        } catch (e) { 
            toast.error("Reset Failed"); 
        }
    };

    return { 
        botStatus, 
        logs, 
        loading, 
        restoredConfig, 
        startBot, 
        stopBot, 
        resetBot, 
        refreshState 
    };
};
