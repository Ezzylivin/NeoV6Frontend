// File: src/hooks/useBot.js
// 🚀 UPGRADE: v10.5 - "Smart Polling & Active Position Sync"
// 🛠 FEATURE: Only polls when bot is 'running' or 'starting'
// 🛠 FIX: Maps 'activePosition' correctly for the UI
// 🛠 FIX: Handles 404/500 errors gracefully

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAccount } from 'wagmi';

export const useBot = () => {
    const { address, isConnected } = useAccount();
    const [botStatus, setBotStatus] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Ref to track status without triggering re-renders or effect resets
    const statusRef = useRef('idle');

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
            
            // 🛡️ DATA HYDRATION
            const hydratedStatus = {
                ...res.data,
                candles: res.data.candles || [],
                trades: res.data.trades || [],
                logs: res.data.logs || [],
                chartMarkers: res.data.chartMarkers || [],
                chartLines: res.data.chartLines || [],
                
                // 🟢 CRITICAL: Sync 'activePosition' for the UI
                activePosition: res.data.activePosition || null,
                
                // Legacy compatibility (just in case UI still checks it)
                currentPosition: res.data.activePosition || null 
            };

            setBotStatus(hydratedStatus);
            statusRef.current = hydratedStatus.status; // Update Ref
            
            // Update logs state
            if (res.data.logs) setLogs(res.data.logs);
            setError(null);

        } catch (err) {
            // 🟢 HANDLE 404 (Bot Not Found/Stopped)
            if (err.response && err.response.status === 404) {
                const stoppedState = { 
                    status: 'stopped', 
                    active: false,
                    candles: [],
                    activePosition: null 
                };
                setBotStatus((prev) => ({ ...prev, ...stoppedState }));
                statusRef.current = 'stopped';
            } 
            // 🔴 HANDLE 500 (Server Crash)
            else if (err.response && err.response.status === 500) {
                console.warn("⚠️ Backend Logic Error (500). Skipping this poll...");
            }
            else {
                console.warn("Poll Error:", err.message);
            }
        }
    }, [address, isConnected]);

    // 🚀 Start Bot Action
    const startBot = async (config) => {
        setLoading(true);
        try {
            statusRef.current = 'starting'; // Enable polling immediately
            const token = localStorage.getItem('token');
            const payload = { ...config, userId: address }; 
            
            const res = await axios.post(`${API_URL}/bot/start`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setBotStatus(res.data);
            statusRef.current = 'running';
            
            // Immediate refresh
            setTimeout(refreshBotData, 500); 
            return res.data;
        } catch (err) {
            statusRef.current = 'stopped'; // Revert on failure
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
            
            statusRef.current = 'stopped'; // Disable polling
            await refreshBotData(); // One last fetch to see "Stopped" status
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
            
            // Clear local state
            setBotStatus(null);
            setLogs([]);
            statusRef.current = 'stopped';
            setTimeout(refreshBotData, 1000);
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            console.error("Reset Error:", msg);
            throw new Error(msg);
        } finally {
            setLoading(false);
        }
    };

    // ⏱️ SMART POLLING EFFECT
    useEffect(() => {
        if (!isConnected || !address) return;
        
        // 1. Always fetch once on mount/connect
        refreshBotData(); 

        // 2. Poll ONLY if running or starting
        const intervalId = setInterval(() => {
            const currentStatus = statusRef.current;
            if (currentStatus === 'running' || currentStatus === 'starting') {
                refreshBotData();
            }
        }, 30000); // 30 seconds interval

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
