// File: src/hooks/useBot.js
// 🚀 UPGRADE: v12.0 - Wallet-Aware Polling (Fixes ID Mismatch)
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAccount } from 'wagmi'; // 🟢 NEW: Import Wagmi

const API_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com";
const BASE_URL = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;

export const useBot = () => {
    const [botStatus, setBotStatus] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const shouldPoll = useRef(false);
    
    // 🟢 1. Get Wallet Address
    const { address } = useAccount();

    // 🟢 2. Determine Active ID (Prioritize Wallet -> then DB ID)
    const getActiveUserId = useCallback(() => {
        if (address) return address; // Use Wallet if connected
        const user = JSON.parse(localStorage.getItem("user"));
        return user?._id; // Fallback to DB ID
    }, [address]);

    // 3. Fetch Status (The Pulse)
    const fetchStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const userId = getActiveUserId(); // 🟢 Use Dynamic ID
            
            if (!userId) return;

            const res = await axios.get(`${BASE_URL}/bot/status`, {
                params: { userId },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data;
            setBotStatus(data);
            
            // Merge Logs
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

            // Keep polling if running OR initializing
            shouldPoll.current = (data.status === 'running' || data.status === 'initializing');

        } catch (error) {
            // Silent fail
        }
    }, [getActiveUserId]); // Re-create if ID changes

    // 4. Start Bot
    const startBot = async (flatConfig) => {
        setLoading(true);
        setLogs([]);
        try {
            const token = localStorage.getItem("token");
            const userId = getActiveUserId();

            // Wrapped Payload
            const payload = {
                userId: userId, 
                config: { ...flatConfig, userId } // Ensure ID matches
            };

            await axios.post(`${BASE_URL}/bot/start`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            shouldPoll.current = true;
            toast.success("Bot Started Successfully");
            
            // Aggressive initial polling
            setTimeout(fetchStatus, 500); 
            setTimeout(fetchStatus, 1500); 
            setTimeout(fetchStatus, 3000); 
            
        } catch (error) {
            console.error("Start Error:", error);
            const msg = error.response?.data?.message || "Failed to start bot";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // 5. Stop Bot
    const stopBot = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const userId = getActiveUserId();
            
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

    // 6. Reset Bot
    const resetBot = async () => {
        try {
            const token = localStorage.getItem("token");
            const userId = getActiveUserId();
            
            await axios.post(`${BASE_URL}/bot/reset`, { userId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBotStatus(null);
            setLogs([]);
            shouldPoll.current = false;
        } catch (e) { console.error(e); }
    };

    // 7. Polling Effect
    useEffect(() => {
        fetchStatus();
        const interval = setInterval(() => {
            if (shouldPoll.current) {
                fetchStatus();
            }
        }, 2000); 

        return () => clearInterval(interval);
    }, [fetchStatus]);

    return { botStatus, logs, loading, startBot, stopBot, resetBot, refresh: fetchStatus };
};
