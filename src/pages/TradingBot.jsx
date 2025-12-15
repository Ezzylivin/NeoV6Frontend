// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: v67.0 - Web3 Wallet Integration
// Changes: Now uses the connected Wallet Address as the 'userId' for the bot.

import React, { useState, useEffect, useRef } from "react";
import axios from "axios"; 
import { useAccount } from 'wagmi'; // 🚀 NEW: Import Wagmi Hook
import { useBot } from '../hooks/useBot.js';
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx"; 
import { UIModeProvider } from "../context/UIModeContext";
import TradingBotShell from "./TradingBotShell"; 
import "./TradingBot.css"; 
import "../styles/Themes.css"; 

// --- MAIN LOGIC CONTAINER ---
const TradingBotContainer = () => {
    // 1. 🧠 Core Bot Logic
    const { 
        botStatus, logs: apiLogs, loading: botLoading, 
        startBot, stopBot, refreshBotData 
    } = useBot();

    const { setups } = useBacktestSetupFunction(); 
    
    // 🚀 NEW: Get Wallet Address
    const { address, isConnected } = useAccount();

    // 2. 📊 Local State
    const [liveWinners, setLiveWinners] = useState([]);
    const [scanningWinners, setScanningWinners] = useState(false);
    const [selectedWinnerId, setSelectedWinnerId] = useState("");
    const [selectedSetupId, setSelectedSetupId] = useState("");
    const [logsClearedTime, setLogsClearedTime] = useState(0);
    const logsContainerRef = useRef(null);
    
    // 3. 📝 Form State
    const [formConfig, setFormConfig] = useState({
        isCombo: false, strategyId: '', comboConfig: { strategyCodes: [], combinationRule: 'AND' },
        symbol: 'BTC-USD', timeframe: '1h', capitalAllocation: 1000, tradingMode: 'paper',
        params: {}, strategies: [], mlMode: 'off', mlModel: '', mlThreshold: 0.5,
        riskManagementMode: 'static', riskPercentage: 1, growthCapitalTarget: 2000
    });

    // 4. 📜 Log Management
    const [persistentLogs, setPersistentLogs] = useState([]);

    useEffect(() => {
        if (apiLogs && apiLogs.length > 0) {
            setPersistentLogs(prevLogs => {
                const newLogs = apiLogs.filter(apiLog => 
                    !prevLogs.some(prevLog => 
                        prevLog.timestamp === apiLog.timestamp && prevLog.message === apiLog.message
                    )
                );
                const combined = [...prevLogs, ...newLogs].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
                return combined.slice(-500);
            });
        }
    }, [apiLogs]);

    const visibleLogs = persistentLogs.filter(log => new Date(log.timestamp).getTime() > logsClearedTime);
    const handleClearLogs = () => setLogsClearedTime(Date.now());

    // 5. 🔄 Auto-Scroll & Polling
    useEffect(() => {
        if (logsContainerRef.current) {
            const { scrollHeight, clientHeight } = logsContainerRef.current;
            logsContainerRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' });
        }
    }, [persistentLogs]);

    useEffect(() => {
        let interval;
        if (botStatus?.status === 'running') {
            interval = setInterval(() => refreshBotData(), 2000);
        }
        return () => clearInterval(interval);
    }, [botStatus?.status, refreshBotData]);

    // 6. 📂 Data Fetching
    const fetchWinners = async () => {
        setScanningWinners(true);
        try {
            const token = localStorage.getItem("token"); 
            const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) setLiveWinners(res.data);
        } catch (err) { console.error("Failed to load winners:", err); } 
        finally { setScanningWinners(false); }
    };
    useEffect(() => { fetchWinners(); }, []);

    // 7. 🎛️ Handlers
    const handleSetupSelect = (e) => {
        const setupId = e.target.value;
        setSelectedSetupId(setupId);
        setSelectedWinnerId(""); 
        
        const setup = setups.find(s => s._id === setupId);
        if (setup) {
            const isCombo = setup.isCombo || (setup.strategies && setup.strategies.length > 1);
            let comboConfig = setup.comboConfig;
            if (!comboConfig && isCombo) {
                comboConfig = {
                    strategyCodes: setup.strategies.map(s => s.code),
                    combinationRule: setup.params?.hybridMode || 'AND'
                };
            }
            setFormConfig(prev => ({
                ...prev,
                symbol: setup.symbol, timeframe: setup.timeframe, capitalAllocation: setup.initialBalance || 1000,
                isCombo: isCombo, strategies: setup.strategies || [],
                comboConfig: comboConfig || { strategyCodes: [], combinationRule: 'OR' },
                params: setup.params || {},
                mlMode: setup.mlMode || 'off', mlModel: setup.mlModel || '', mlThreshold: setup.mlThreshold || 0.5,
                riskManagementMode: setup.riskManagementMode || 'static',
                riskPercentage: setup.riskPercentage || 1,
                growthCapitalTarget: setup.growthCapitalTarget || 2000
            }));
        }
    };

    const handleWinnerSelect = (e) => {
        const filename = e.target.value;
        setSelectedWinnerId(filename);
        const selectedWinner = liveWinners.find(w => w.id === filename);
        
        if (!selectedWinner || !selectedWinner.config) return;
        const data = selectedWinner.config;

        let symbol = data.symbol || "BTC-USD";
        let timeframe = data.timeframe || "1h";
        if(!data.symbol && filename.includes('_')) {
             const parts = filename.split('_');
             if(parts[1]) symbol = parts[1];
             if(parts[2]) timeframe = parts[2];
        }

        let strategies = [];
        if(Array.isArray(data.strategies)) strategies = data.strategies;
        else if(Array.isArray(data)) strategies = data;
        
        const cleanStrategies = strategies.map(s => {
            const code = (typeof s === 'string') ? s : (s.code || "unknown");
            const params = (typeof s === 'string') ? {} : (s.params || s);
            return { strategyId: "", code, params };
        });

        let mlMode = data.mlMode || "off";
        let mlModel = data.params?.mlModel || data.mlModel || "";
        if (mlModel && mlMode === "off") mlMode = "predictions";
        if (!mlModel && mlMode !== "off") mlModel = 'btc_1h_xgboost_model'; 

        const globalParams = { ...data.params };
        if (data.riskPercentage) globalParams.riskPercentage = Number(data.riskPercentage);
        if (data.maxPyramiding) globalParams.maxPyramiding = Number(data.maxPyramiding);

        setFormConfig(prev => ({
            ...prev,
            symbol, timeframe,
            isCombo: true,
            strategies: cleanStrategies,
            comboConfig: { 
                strategyCodes: cleanStrategies.map(s => s.code),
                combinationRule: globalParams.hybridMode || 'OR' 
            },
            mlMode, mlModel,
            mlThreshold: Number(data.mlThreshold) || 0.5,
            params: globalParams,
            riskManagementMode: data.riskManagementMode || 'static',
            riskPercentage: Number(data.riskPercentage) || 1,
            growthCapitalTarget: Number(data.growthCapitalTarget) || 2000
        }));
    };

    // 8. 🚀 Execution Handlers
    const handleStart = async (e) => {
        e.preventDefault();
        
        // 🛡️ Wallet Guard
        if (!isConnected || !address) {
            alert("⚠️ Please connect your Web3 Wallet first!");
            return;
        }

        if (formConfig.tradingMode === 'live' && !window.confirm("⚠️ Real Money Trading. Proceed?")) return;
        setLogsClearedTime(0); 
        setPersistentLogs([]); 
        
        const cleanStrategies = (formConfig.strategies || []).map(s => ({
            code: s.code || "unknown",
            params: s.params || {}
        }));

        const cleanPayload = {
            // 🚀 NEW: Attach Wallet Address as ID
            userId: address,
            
            symbol: formConfig.symbol,
            timeframe: formConfig.timeframe,
            capitalAllocation: Number(formConfig.capitalAllocation),
            currentBalance: Number(formConfig.capitalAllocation),
            mlMode: formConfig.mlMode,
            mlModel: formConfig.mlModel,
            mlThreshold: Number(formConfig.mlThreshold),
            isCombo: !!formConfig.isCombo,
            comboConfig: formConfig.comboConfig || { 
                strategyCodes: cleanStrategies.map(s => s.code), 
                combinationRule: 'AND' 
            },
            strategies: cleanStrategies, 
            params: formConfig.params || {},
            maxPyramiding: parseInt(formConfig.params?.maxPyramiding || 1, 10),
            riskManagementMode: formConfig.riskManagementMode,
            riskPercentage: Number(formConfig.riskPercentage),
            growthCapitalTarget: Number(formConfig.growthCapitalTarget)
        };

        try { 
            await startBot(cleanPayload); 
            setTimeout(refreshBotData, 1000);
        } catch (err) { 
            console.error("Bot Start Error:", err); 
            alert(`Failed to start: ${err.message}`); 
        }
    };

    const handleStop = async () => {
        try { await stopBot(); setTimeout(refreshBotData, 1000); } 
        catch (err) { console.error(err); }
    };
    
    const handleRefreshChart = () => refreshBotData();

    // 9. 📦 Data Prep for Shell
    const isRunning = botStatus?.status === 'running';
    
    const chartData = {
        candleData: botStatus?.candles || [],
        tradeBreakdown: (botStatus?.trades || []).map(t => ({
            ...t,
            entryTime: t.entryTime, 
            exitTime: t.exitTime,
            profit: t.profit,
            price: t.entry_price || t.price, 
            exitPrice: t.exit_price || t.exitPrice
        }))
    };

    const hasData = chartData.candleData && chartData.candleData.length > 0;

    // 10. 🔌 Connect to Shell
    const botProps = {
        botStatus,
        logs: persistentLogs,
        visibleLogs,
        loading: botLoading,
        isRunning,
        
        liveWinners,
        setups,
        chartData,
        hasData,
        
        formConfig,
        setFormConfig,
        selectedSetupId,
        selectedWinnerId,
        
        handleStart,
        handleStop,
        handleSetupSelect,
        handleWinnerSelect,
        fetchWinners,
        scanningWinners,
        handleRefreshChart,
        handleClearLogs,
        
        logsContainerRef
    };

    return (
        <div className="trading-bot-root">
            <TradingBotShell {...botProps} />
        </div>
    );
};

export default function TradingBot() {
    return (
        <UIModeProvider>
            <TradingBotContainer />
        </UIModeProvider>
    );
}
