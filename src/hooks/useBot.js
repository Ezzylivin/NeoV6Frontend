// File: src/hooks/useBot.js
// 🚀 UPGRADE: v10.0 - Reliable Polling Hook

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAccount } from 'wagmi';

export const useBot = () => {
    const { address, isConnected } = useAccount();
    const [botStatus, setBotStatus] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const pollRef = useRef(null);

    // 🔄 Core Polling Function
    const refreshBotData = useCallback(async () => {
        if (!isConnected || !address) return;
        try {
            const token = localStorage.getItem('token');
            // 🚀 PASS USER ID EXPLICITLY
            const res = await axios.get(`https://neov6backend.onrender.com/api/bot/status?userId=${address}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setBotStatus(res.data);
            if (res.data.logs) setLogs(res.data.logs);
        } catch (err) {
            console.error("Poll Error:", err);
        }
    }, [address, isConnected]);

    // 🚀 Start Bot Action
    const startBot = async (config) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = { ...config, userId: address }; 
            
            const res = await axios.post('https://neov6backend.onrender.com/api/bot/start', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setBotStatus(res.data);
            setTimeout(refreshBotData, 1000); // Immediate poll
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
            await axios.post('https://neov6backend.onrender.com/api/bot/stop', { userId: address }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTimeout(refreshBotData, 1000); 
        } catch (err) {
            console.error("Stop Error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Auto-Poll
    useEffect(() => {
        if (!isConnected) return;
        
        refreshBotData(); 

        const intervalTime = botStatus?.status === 'running' ? 2000 : 10000;
        pollRef.current = setInterval(refreshBotData, intervalTime);
        return () => clearInterval(pollRef.current);
    }, [isConnected, address, botStatus?.status, refreshBotData]);

    return { 
        botStatus, 
        logs, 
        loading, 
        error, 
        startBot, 
        stopBot, 
        refreshBotData 
    };
};
