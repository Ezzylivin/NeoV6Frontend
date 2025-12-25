import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link, useNavigate } from 'react-router-dom';
import { useBot } from '../hooks/useBot.js';
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import TradingBotShell from "./TradingBotShell";
import WinnerStrategySelect from "../components/WinnerStrategySelect"; 
import Backtests from "../pages/Backtests"; // 👈 Import Backtesting inputs directly
import "./TradingBot.css";
import "../styles/Themes.css";
import toast, { Toaster } from 'react-hot-toast';

const AUDIO_START = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.m4a'); 
const AUDIO_TRADE = new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.m4a'); 

const TradingBotContainer = () => {
    const { botStatus, logs: apiLogs, loading: botLoading, startBot, stopBot, refreshBotData: originalRefresh } = useBot();
    const { setups } = useBacktestSetupFunction();
    const { address, isConnected } = useAccount();

    const [isModeSelected, setIsModeSelected] = useState(false);
    const [hasApiKeys, setHasApiKeys] = useState(false);
    const [showPreFlight, setShowPreFlight] = useState(false);
    const [backtestReady, setBacktestReady] = useState(false); // Flag for Backtesting integration
    const [isStarting, setIsStarting] = useState(false);
    const [logFilter, setLogFilter] = useState('ALL'); 
    const [latency, setLatency] = useState(0);
    const [selectedSetupId, setSelectedSetupId] = useState("");
    const [logsClearedTime, setLogsClearedTime] = useState(0);
    const logsContainerRef = useRef(null);
    const [persistentLogs, setPersistentLogs] = useState([]);
    const [backtestsFormData, setBacktestsFormData] = useState(null); // Store Backtests form data

    // User configuration and bot settings
    const [formConfig, setFormConfig] = useState({
        isCombo: false, 
        symbol: 'BTC-USD', 
        timeframe: '1h', 
        capitalAllocation: 1000, 
        tradingMode: 'paper',
        params: {}, 
        strategies: [], 
        mlMode: 'off', 
        mlModel: '', 
        mlThreshold: 0.5,
        riskManagementMode: 'static', 
        riskPercentage: 1, 
        growthCapitalTarget: 2000,
        maxDailyLoss: 5, 
        maxDrawdown: 10, 
        maxTradesPerDay: 20 
    });

    useEffect(() => {
        // Sync Backtesting results if ready
        if (backtestReady && backtestsFormData) {
            applyBacktestingInputs(backtestsFormData);
            setBacktestReady(false); // Reset flag
        }
    }, [backtestReady, backtestsFormData]);

    const fetchWinners = async () => {
        try {
            const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners");
            const winners = res.data || [];
            setFormConfig(prev => ({
                ...prev,
                strategies: winners.map(w => ({
                    strategyId: w.strategyId,
                    code: w.code,
                    params: w.params,
                }))
            }));
        } catch (err) {
            toast.error("Failed to fetch winners");
        }
    };

    const applyBacktestingInputs = (data) => {
        setFormConfig(prev => ({
            ...prev,
            ...data, // Incorporates all Backtesting inputs directly
        }));
        toast.success(`Backtesting configuration applied successfully!`);
    };

    const handleStartBot = async () => {
        const payload = { ...formConfig }; // Prepare payload
        try {
            await startBot(payload);
            toast.success("Bot started successfully!");
        } catch (err) {
            toast.error("Failed to start bot.");
        }
    };

    const handleStopBot = async () => {
        try {
            await stopBot();
            toast.success("Bot stopped.");
        } catch (err) {
            toast.error("Failed to stop bot.");
        }
    };

    return (
        <div className="trading-bot-root">
            <Toaster position="top-right" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
            
            {!isModeSelected && <Backtests onSubmit={applyBacktestingInputs} setReady={setBacktestReady} />} {/* Backtests used dynamically */}
            <div className="bot-controls">
                {/* Bot Configuration */}
                <WinnerStrategySelect 
                    onStrategySelect={(strategy) => setFormConfig(prev => ({
                        ...prev,
                        ...strategy // Sync backend winner strategies
                    }))}
                />
                <button onClick={handleStartBot}>
                    Start Bot
                </button>
                <button onClick={handleStopBot}>
                    Stop Bot
                </button>
            </div>
        </div>
    );
};

export default TradingBotContainer;
