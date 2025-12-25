// File: src/hooks/useBot.js
// 🚀 UPGRADE: v10.6 - Resilience & Smart Polling
// 🛠 FIX: Handles 500 errors without crashing React
// 🛠 FIX: Auto-maps 'activePosition' for UI
// 🛠 PERF: Polls every 3s only when running

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAccount } from 'wagmi';

export const useBot = () => {
    const { address, isConnected } = useAccount();
    const [botStatus, setBotStatus] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Ref to track status without triggering re-renders
    // 'idle' | 'starting' | 'running' | 'stopping' | 'stopped'
    const statusRef = useRef('idle');

    const API_URL = "https://neov6backend.onrender.com/api";

    // 🔄 Core Polling Function
    const refreshBotData = useCallback(async () => {
        if (!isConnected || !address) return;

        try {
            const token = localStorage.getItem('token');
            
            const res = await axios.get(`${API_URL}/bot/status`, {
                params: { userId: address },
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // 🛡️ DATA MAPPING
            const hydratedStatus = {
                ...res.data,
                candles: res.data.candles || [],
                trades: res.data.trades || [],
                logs: res.data.logs || [],
                
                // 🟢 CRITICAL: Sync 'activePosition' for the UI
                activePosition: res.data.activePosition || (res.data.activePositions && res.data.activePositions[0]) || null,
                currentPosition: res.data.activePosition || (res.data.activePositions && res.data.activePositions[0]) || null
            };

            setBotStatus(hydratedStatus);
            
            // Only update ref if we are not in a transitional state like 'stopping'
            if (statusRef.current !== 'stopping') {
                statusRef.current = hydratedStatus.status; 
            }
            
            if (res.data.logs) setLogs(res.data.logs);
            setError(null);

        } catch (err) {
            // 🟢 HANDLE 404 (Bot Not Found/Stopped)
            if (err.response && err.response.status === 404) {
                // If backend says 404, the bot is definitely stopped
                setBotStatus((prev) => ({ 
                    ...prev, 
                    status: 'stopped', 
                    activePosition: null 
                }));
                statusRef.current = 'stopped';
            } 
            // 🔴 HANDLE 500 (Server Crash/Booting)
            else if (err.response && err.response.status === 500) {
                console.warn("⚠️ Backend initializing or error (500). Retrying...");
                // Do NOT change statusRef here; let it keep trying
            }
            else {
                console.warn("Poll Error:", err.message);
            }
        }
    }, [address, isConnected]);

    // 🚀 Start Bot
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
            
            // Immediate refresh to populate initial state
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

    // 🛑 Stop Bot
    const stopBot = async () => {
        setLoading(true);
        statusRef.current = 'stopping'; // Prevent poll from overwriting state momentarily
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/bot/stop`, { userId: address }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            statusRef.current = 'stopped'; // Disable polling
            await refreshBotData(); // One last fetch to confirm stop
        } catch (err) {
            console.error("Stop Error:", err);
            // Even if API fails, UI should reflect stopped to allow retry
            statusRef.current = 'stopped'; 
        } finally {
            setLoading(false);
        }
    };

    // ♻️ Reset Bot
    const resetBot = async (config) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = { ...config, userId: address };
            
            await axios.post(`${API_URL}/bot/reset`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
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
        
        // 1. Initial Fetch
        refreshBotData(); 

        // 2. Poll ONLY if running or starting
        const intervalId = setInterval(() => {
            const currentStatus = statusRef.current;
            if (currentStatus === 'running' || currentStatus === 'starting') {
                refreshBotData();
            }
        }, 3000); // 3 Seconds (Fast enough for UI, slow enough for server)

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
