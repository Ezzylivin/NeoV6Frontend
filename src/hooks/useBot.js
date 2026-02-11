// File: src/hooks/useBot.js
// 🚀 UPGRADE: v14.0 - Persisted Identity (Survives Refreshes & Wallet Flickers)
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
    const shouldPoll = useRef(false);
    
    const { address, isConnected } = useAccount();

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

    // 2. Fetch Status
    const fetchStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const targetId = resolveActiveId(); // 🟢 Use Resolved ID
            
            if (!targetId || !token) return;

            const res = await axios.get(`${BASE_URL}/bot/status`, {
                params: { userId: targetId },
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

            // 🟢 PERSISTENCE LOGIC
            if (data.status === 'running' || data.status === 'initializing') {
                shouldPoll.current = true;
                // Remember this ID so we don't lose it on refresh
                if (targetId !== localStorage.getItem("neo_active_bot_id")) {
                    localStorage.setItem("neo_active_bot_id", targetId);
                }
            } else {
                shouldPoll.current = false;
                // Only clear if we were previously polling and it stopped cleanly
                if (!loading && data.status === 'stopped') {
                     localStorage.removeItem("neo_active_bot_id");
                }
            }

        } catch (error) {
            // Silent fail
        }
    }, [resolveActiveId, loading]);

    // 3. Start Bot
    const startBot = async (flatConfig) => {
        setLoading(true);
        setLogs([]);
        try {
            const token = localStorage.getItem("token");
            
            // Determine Identity (Prefer Wallet)
            const userId = address || JSON.parse(localStorage.getItem("user"))?._id;
            
            // 🟢 FORCE SAVE ID
            localStorage.setItem("neo_active_bot_id", userId);

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
            localStorage.removeItem("neo_active_bot_id"); // Clear on fail
            const msg = error.response?.data?.message || "Failed to start bot";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // 4. Stop Bot
    const stopBot = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const userId = resolveActiveId();
            
            await axios.post(`${BASE_URL}/bot/stop`, { userId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            shouldPoll.current = false;
            
            // 🟢 CLEAR SAVED ID
            localStorage.removeItem("neo_active_bot_id");
            
            toast.success("Bot Stopped");
            await fetchStatus(); 
        } catch (error) {
            toast.error("Failed to stop bot");
        } finally {
            setLoading(false);
        }
    };

    // 5. Reset Bot
    const resetBot = async () => {
        try {
            const token = localStorage.getItem("token");
            const userId = resolveActiveId();
            
            await axios.post(`${BASE_URL}/bot/reset`, { userId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBotStatus(null);
            setLogs([]);
            shouldPoll.current = false;
            localStorage.removeItem("neo_active_bot_id");
        } catch (e) { console.error(e); }
    };

    // 6. Polling Loop
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
