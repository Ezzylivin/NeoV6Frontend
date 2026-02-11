// File: src/hooks/useBot.js
// 🚀 UPGRADE: v9.6 - Fixes 422 Start Error (Correct Payload Structure)
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com";
const BASE_URL = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;

export const useBot = () => {
    const [botStatus, setBotStatus] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // We use a ref to track if we should be polling
    const shouldPoll = useRef(false);

    // 1. Fetch Status (The Pulse)
    const fetchStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const userId = JSON.parse(localStorage.getItem("user"))?._id;
            
            if (!token || !userId) return;

            const res = await axios.get(`${BASE_URL}/bot/status`, {
                params: { userId },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data;
            
            // Update State
            setBotStatus(data);
            
            // Merge Logs (avoid duplicates)
            if (data.logs && Array.isArray(data.logs)) {
                setLogs(prev => {
                    const newLogs = data.logs.filter(
                        newLog => !prev.some(prevLog => 
                            prevLog.timestamp === newLog.timestamp || 
                            prevLog.message === newLog.message
                        )
                    );
                    return [...newLogs, ...prev].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 100);
                });
            }

            // Decide if we should keep polling
            if (data.status === 'running') {
                shouldPoll.current = true;
            } else {
                shouldPoll.current = false;
            }

        } catch (error) {
            // Silent fail for heartbeat to avoid console spam
        }
    }, []);

    // 2. Start/Stop Handlers
    const startBot = async (flatConfig) => {
        setLoading(true);
        setLogs([]); // Clear old logs on start
        try {
            const token = localStorage.getItem("token");
            
            // 🟢 FIX: Wrap the config to match Python's Schema
            const payload = {
                userId: flatConfig.userId,
                config: flatConfig
            };

            await axios.post(`${BASE_URL}/bot/start`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            shouldPoll.current = true;
            toast.success("Bot Started Successfully");
            
            // Immediate fetch to populate UI
            setTimeout(fetchStatus, 1000); 
            setTimeout(fetchStatus, 3000); 
            
        } catch (error) {
            console.error("Start Error:", error);
            toast.error("Failed to start: " + (error.response?.data?.detail?.[0]?.msg || error.message));
        } finally {
            setLoading(false);
        }
    };

    const stopBot = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const userId = JSON.parse(localStorage.getItem("user"))?._id;
            await axios.post(`${BASE_URL}/bot/stop`, { userId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            shouldPoll.current = false;
            toast.success("Bot Stopped");
            await fetchStatus(); 
        } catch (error) {
            toast.error("Failed to stop bot");
        } finally {
            setLoading(false);
        }
    };

    const resetBot = async () => {
        try {
            const token = localStorage.getItem("token");
            const userId = JSON.parse(localStorage.getItem("user"))?._id;
            await axios.post(`${BASE_URL}/bot/reset`, { userId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBotStatus(null);
            setLogs([]);
            shouldPoll.current = false;
        } catch (e) {
            console.error(e);
        }
    };

    // 3. The Heartbeat Effect (Polls every 2 seconds)
    useEffect(() => {
        fetchStatus(); // Initial fetch
        const interval = setInterval(() => {
            if (shouldPoll.current) {
                fetchStatus();
            }
        }, 2000); 

        return () => clearInterval(interval);
    }, [fetchStatus]);

    return { 
        botStatus, 
        logs, 
        loading, 
        startBot, 
        stopBot,
        resetBot,
        refresh: fetchStatus 
    };
};
