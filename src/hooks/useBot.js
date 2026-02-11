// File: src/hooks/useBot.js
// 🚀 UPGRADE: v13.0 - Sticky Identity (Prevents ID switching mid-trade)
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAccount } from 'wagmi'; 

const API_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com";
const BASE_URL = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;

export const useBot = () => {
    const [botStatus, setBotStatus] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // 🟢 STICKY ID: Remembers who started the bot
    const activeUserId = useRef(null); 
    const shouldPoll = useRef(false);
    
    const { address } = useAccount();

    // Helper to get the best available ID
    const getCurrentId = useCallback(() => {
        // 1. If we are running, use the ID that started it (STICKY)
        if (activeUserId.current) return activeUserId.current;
        // 2. Else, prefer Wallet
        if (address) return address;
        // 3. Fallback to Database ID
        const user = JSON.parse(localStorage.getItem("user"));
        return user?._id;
    }, [address]);

    // 1. Fetch Status
    const fetchStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const userId = getCurrentId(); 
            
            if (!token || !userId) return;

            const res = await axios.get(`${BASE_URL}/bot/status`, {
                params: { userId },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data;
            setBotStatus(data);
            
            // Log Merging
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

            // Logic: If running, LOCK the ID and keep polling
            if (data.status === 'running' || data.status === 'initializing') {
                shouldPoll.current = true;
                activeUserId.current = userId; // <--- LOCK ID
            } else {
                shouldPoll.current = false;
                // Only unlock if we were previously polling
                if (!loading) activeUserId.current = null; 
            }

        } catch (error) {
            // Silent fail
        }
    }, [getCurrentId, loading]);

    // 2. Start Bot
    const startBot = async (flatConfig) => {
        setLoading(true);
        setLogs([]);
        try {
            const token = localStorage.getItem("token");
            
            // Determine who is starting this
            const userId = address || JSON.parse(localStorage.getItem("user"))?._id;
            
            // 🟢 LOCK ID IMMEDIATELY
            activeUserId.current = userId;

            const payload = { userId, config: { ...flatConfig, userId } };

            await axios.post(`${BASE_URL}/bot/start`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            shouldPoll.current = true;
            toast.success("Bot Started Successfully");
            
            setTimeout(fetchStatus, 500); 
            setTimeout(fetchStatus, 1500); 
            setTimeout(fetchStatus, 3000); 
            
        } catch (error) {
            console.error("Start Error:", error);
            activeUserId.current = null; // Unlock on fail
            const msg = error.response?.data?.message || "Failed to start bot";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // 3. Stop Bot
    const stopBot = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const userId = activeUserId.current || getCurrentId(); // Use Locked ID
            
            await axios.post(`${BASE_URL}/bot/stop`, { userId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            shouldPoll.current = false;
            activeUserId.current = null; // Unlock
            toast.success("Bot Stopped");
            await fetchStatus(); 
        } catch (error) {
            toast.error("Failed to stop bot");
        } finally {
            setLoading(false);
        }
    };

    // 4. Reset Bot
    const resetBot = async () => {
        try {
            const token = localStorage.getItem("token");
            const userId = activeUserId.current || getCurrentId();
            
            await axios.post(`${BASE_URL}/bot/reset`, { userId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBotStatus(null);
            setLogs([]);
            shouldPoll.current = false;
            activeUserId.current = null; // Unlock
        } catch (e) { console.error(e); }
    };

    // 5. Polling Loop
    useEffect(() => {
        fetchStatus();
        const interval = setInterval(() => {
            if (shouldPoll.current) fetchStatus();
        }, 2000); 
        return () => clearInterval(interval);
    }, [fetchStatus]);

    return { botStatus, logs, loading, startBot, stopBot, resetBot, refresh: fetchStatus };
};
