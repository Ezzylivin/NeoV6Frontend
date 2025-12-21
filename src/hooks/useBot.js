// File: src/hooks/useBot.js
// 🚀 UPGRADE: v10.3 - "The Circuit Breaker"
// 🛠 FIX: Removed infinite loop causing 500 Error Spam
// 🛠 FIX: Handles 404 (Idle) and 500 (Server Error) gracefully
// 🛠 FEATURE: Stable Polling (Does not reset on state change)

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAccount } from 'wagmi';

export const useBot = () => {
    const { address, isConnected } = useAccount();
    const [botStatus, setBotStatus] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // API Configuration
    const API_URL = "https://neov6backend.onrender.com/api";

    // 🔄 Core Polling Function
    const refreshBotData = useCallback(async () => {
        if (!isConnected || !address) return;

        try {
            const token = localStorage.getItem('token');
            
            // 🚀 PASS USER ID EXPLICITLY
            const res = await axios.get(`${API_URL}/bot/status`, {
                params: { userId: address },
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // 🛡️ DATA HYDRATION: Ensure critical arrays exist to prevent UI crashes
            const hydratedStatus = {
                ...res.data,
                candles: res.data.candles || [],
                trades: res.data.trades || [],
                logs: res.data.logs || [],
                // Ensure chart markers exist
                chartMarkers: res.data.chartMarkers || [],
                chartLines: res.data.chartLines || []
            };

            setBotStatus(hydratedStatus);
            
            // Update logs state separately for UI
            if (res.data.logs) setLogs(res.data.logs);
            setError(null); // Clear errors on success

        } catch (err) {
            // 🟢 HANDLE 404 (Bot Not Found/Stopped) - This is NOT an error, it's a state.
            if (err.response && err.response.status === 404) {
                setBotStatus((prev) => ({ 
                    ...prev, 
                    status: 'stopped', 
                    active: false,
                    candles: prev?.candles || [] // Keep old candles if possible
                }));
            } 
            // 🔴 HANDLE 500 (Server Crash) - Log it but don't crash app
            else if (err.response && err.response.status === 500) {
                console.warn("⚠️ Backend Logic Error (500). Retrying...");
            }
            else {
                // Network errors, etc.
                console.warn("Poll Error:", err.message);
            }
        }
    }, [address, isConnected]);

    // 🚀 Start Bot Action
    const startBot = async (config) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = { ...config, userId: address }; 
            
            const res = await axios.post(`${API_URL}/bot/start`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setBotStatus(res.data);
            // Wait 1s then refresh to confirm start
            setTimeout(refreshBotData, 1000); 
            return res.data;
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            setError(msg);
            throw new Error(msg);
        } finally {
            setLoading(false);
        }
    };

    // 🛑 Stop Bot Action
    const stopBot = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/bot/stop`, { userId: address }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Wait 1s then refresh to confirm stop
            setTimeout(refreshBotData, 1000); 
        } catch (err) {
            console.error("Stop Error:", err);
        } finally {
            setLoading(false);
        }
    };

    // ♻️ Reset Bot Action
    const resetBot = async (config) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = { ...config, userId: address };
            
            await axios.post(`${API_URL}/bot/reset`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Clear local state immediately
            setBotStatus(null);
            setLogs([]);
            setTimeout(refreshBotData, 1000);
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            console.error("Reset Error:", msg);
            throw new Error(msg);
        } finally {
            setLoading(false);
        }
    };

    // ⏱️ STABLE POLLING EFFECT
    // This is where the fix is. We REMOVED botStatus from dependencies.
    useEffect(() => {
        if (!isConnected || !address) return;
        
        // 1. Initial Fetch
        refreshBotData(); 

        // 2. Set Interval (Fixed 3 seconds)
        // We do NOT change the interval speed based on status anymore.
        // Changing interval speed causes the loop you were seeing.
        const intervalId = setInterval(refreshBotData, 3000);

        // 3. Cleanup on unmount
        return () => clearInterval(intervalId);
    }, [isConnected, address, refreshBotData]); 

    return { 
        botStatus, 
        logs, 
        loading, 
        error, 
        startBot, 
        stopBot,
        resetBot, 
        refreshBotData 
    };
};
