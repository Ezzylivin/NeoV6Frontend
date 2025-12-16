// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: v70.0 - Session Persistence & Panic Button
// Changes: Remembers trading mode on refresh, adds Panic Sell logic.

import React, { useState, useEffect, useRef } from "react";
import axios from "axios"; 
import { useAccount } from 'wagmi'; 
import { ConnectButton } from '@rainbow-me/rainbowkit'; 
import { Link } from 'react-router-dom'; 
import { useBot } from '../hooks/useBot.js';
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx"; 
import { UIModeProvider } from "../context/UIModeContext";
import TradingBotShell from "./TradingBotShell"; 
import "./TradingBot.css"; 
import "../styles/Themes.css"; 

// --- MODE SELECTION MODAL COMPONENT ---
const ModeSelectionModal = ({ onSelect, isConnected, hasApiKeys }) => {
    const [step, setStep] = useState('selection'); 
    const [paperBalance, setPaperBalance] = useState(10000);
    const [agreedRisk, setAgreedRisk] = useState(false);
    const [agreedBot, setAgreedBot] = useState(false);
    const [isStarting, setIsStarting] = useState(false); // 🚀 UX: Loading State

    // Helper to wrap selection with loading state
    const handleSelect = async (mode, balance) => {
        setIsStarting(true);
        // Simulate a brief delay or wait for parent logic if needed
        await onSelect(mode, balance); 
        setIsStarting(false);
    };

    if (!isConnected) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/10 text-center max-w-md animate-fade-in">
                    <div className="text-4xl mb-4">🦊</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Connect Wallet</h2>
                    <p className="text-neutral-400 mb-6">Access is restricted to verified wallet holders only.</p>
                    <div className="flex justify-center"><ConnectButton /></div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
            <div className="max-w-5xl w-full p-6 animate-fade-in">
                
                {step === 'selection' && (
                    <div className="text-center">
                         <h1 className="text-4xl font-bold text-white mb-2">Trading Environment</h1>
                         <p className="text-neutral-400 mb-10">Select your operational mode.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                            {/* PAPER TRADING CARD */}
                            <div onClick={() => setStep('paper_setup')} className="group cursor-pointer bg-[#1a1a1a] border border-white/10 hover:border-emerald-500/50 hover:bg-[#1f2937] p-8 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><span className="text-9xl">📄</span></div>
                                <h3 className="text-2xl font-bold text-emerald-400 mb-2">Paper Trading</h3>
                                <p className="text-neutral-300 mb-6">Simulate trades with fake money. Zero risk. Perfect for testing new strategies.</p>
                                <div className="flex items-center gap-2 text-sm text-emerald-500 font-bold uppercase tracking-wider"><span>Configure Simulation</span><span>→</span></div>
                            </div>

                            {/* LIVE TRADING CARD */}
                            <div onClick={() => { if (hasApiKeys) setStep('live_agreement'); }} className={`group relative p-8 rounded-2xl border transition-all duration-300 overflow-hidden ${hasApiKeys ? 'cursor-pointer bg-[#1a0505] border-red-900/30 hover:border-red-500/50 hover:bg-[#2f0a0a] transform hover:-translate-y-1' : 'cursor-not-allowed bg-neutral-900 border-neutral-800 opacity-70'}`}>
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><span className="text-9xl">⚡</span></div>
                                <h3 className={`text-2xl font-bold mb-2 ${hasApiKeys ? 'text-red-500' : 'text-neutral-500'}`}>Live Trading</h3>
                                <p className="text-neutral-300 mb-6">Execute real orders on your exchange. Real capital is at risk.</p>
                                {hasApiKeys ? (
                                    <div className="flex items-center gap-2 text-sm text-red-500 font-bold uppercase tracking-wider"><span>Enter Danger Zone</span><span>→</span></div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded text-xs font-bold text-center">⛔ LOCKED: No API Keys Found</div>
                                        <Link to="/settings" className="text-sm text-white underline hover:text-red-400 relative z-10">Go to Settings to Add Keys</Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {step === 'paper_setup' && (
                    <div className="max-w-md mx-auto bg-[#1a1a1a] border border-white/10 p-8 rounded-2xl animate-fade-in-up">
                        <button onClick={() => setStep('selection')} className="text-neutral-500 hover:text-white mb-6 text-sm">← Back</button>
                        <h3 className="text-2xl font-bold text-emerald-400 mb-2">Setup Simulation</h3>
                        <p className="text-neutral-400 mb-6 text-sm">How much fake capital should we start with?</p>
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Starting Balance ($)</label>
                            <input type="number" value={paperBalance} onChange={(e) => setPaperBalance(Number(e.target.value))} className="w-full bg-black border border-white/20 rounded-lg p-4 text-2xl text-white font-mono focus:border-emerald-500 outline-none" />
                        </div>
                        <button onClick={() => handleSelect('paper', paperBalance)} disabled={isStarting} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-lg transition flex justify-center items-center gap-2">
                            {isStarting ? 'Initializing...' : 'Start Simulation'}
                        </button>
                    </div>
                )}

                {step === 'live_agreement' && (
                    <div className="max-w-lg mx-auto bg-[#1a0505] border border-red-500/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.2)] animate-fade-in-up">
                        <button onClick={() => setStep('selection')} className="text-red-400/60 hover:text-red-400 mb-6 text-sm">← Cancel</button>
                        <div className="flex items-center gap-3 mb-4"><span className="text-4xl">⚠️</span><h3 className="text-2xl font-bold text-white">Live Trading Agreement</h3></div>
                        <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20 mb-6 text-sm text-red-200 leading-relaxed">You are about to give an autonomous bot permission to trade with <strong>REAL MONEY</strong>. Market conditions can change instantly, and losses can exceed deposits.</div>
                        <div className="space-y-4 mb-8">
                            <label className="flex items-start gap-3 cursor-pointer group"><input type="checkbox" checked={agreedRisk} onChange={(e) => setAgreedRisk(e.target.checked)} className="mt-1 w-5 h-5 bg-black border border-red-500/30 rounded focus:ring-red-500 checked:bg-red-600 cursor-pointer" /><span className="text-sm text-neutral-300 group-hover:text-white transition">I understand that I am responsible for all financial losses.</span></label>
                            <label className="flex items-start gap-3 cursor-pointer group"><input type="checkbox" checked={agreedBot} onChange={(e) => setAgreedBot(e.target.checked)} className="mt-1 w-5 h-5 bg-black border border-red-500/30 rounded focus:ring-red-500 checked:bg-red-600 cursor-pointer" /><span className="text-sm text-neutral-300 group-hover:text-white transition">I agree that this software is provided "as is".</span></label>
                        </div>
                        <button onClick={() => handleSelect('live', null)} disabled={!agreedRisk || !agreedBot || isStarting} className={`w-full py-4 rounded-lg font-bold text-lg transition-all duration-300 flex justify-center items-center gap-2 ${agreedRisk && agreedBot ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/50' : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'}`}>
                            {isStarting ? 'Entering Market...' : (agreedRisk && agreedBot ? 'ENTER LIVE MARKET' : 'Accept Terms to Proceed')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MAIN LOGIC CONTAINER ---
const TradingBotContainer = () => {
    const { botStatus, logs: apiLogs, loading: botLoading, startBot, stopBot, refreshBotData } = useBot();
    const { setups } = useBacktestSetupFunction(); 
    const { address, isConnected } = useAccount();

    const [isModeSelected, setIsModeSelected] = useState(false);
    const [hasApiKeys, setHasApiKeys] = useState(false);
    const [liveWinners, setLiveWinners] = useState([]);
    const [scanningWinners, setScanningWinners] = useState(false);
    const [selectedWinnerId, setSelectedWinnerId] = useState("");
    const [selectedSetupId, setSelectedSetupId] = useState("");
    const [logsClearedTime, setLogsClearedTime] = useState(0);
    const logsContainerRef = useRef(null);
    const [persistentLogs, setPersistentLogs] = useState([]);
    
    // 3. 📝 Form State
    const [formConfig, setFormConfig] = useState({
        isCombo: false, strategyId: '', comboConfig: { strategyCodes: [], combinationRule: 'AND' },
        symbol: 'BTC-USD', timeframe: '1h', capitalAllocation: 1000, tradingMode: 'paper',
        params: {}, strategies: [], mlMode: 'off', mlModel: '', mlThreshold: 0.5,
        riskManagementMode: 'static', riskPercentage: 1, growthCapitalTarget: 2000
    });

    // 🚀 RESTORE SESSION ON MOUNT
    useEffect(() => {
        const savedSession = sessionStorage.getItem('botSession');
        if (savedSession) {
            const { mode, balance } = JSON.parse(savedSession);
            setFormConfig(prev => ({
                ...prev,
                tradingMode: mode,
                capitalAllocation: balance || prev.capitalAllocation
            }));
            setIsModeSelected(true);
        }
    }, []);

    // 🚀 CHECK API KEYS
    useEffect(() => {
        const checkKeys = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get('https://neov6backend.onrender.com/api/users/keys', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const keyList = Array.isArray(res.data) ? res.data : (res.data.keys || []);
                setHasApiKeys(keyList.length > 0);
            } catch (err) { setHasApiKeys(false); }
        };
        if (isConnected) checkKeys();
    }, [isConnected]);

    // ... [KEEP YOUR EXISTING useEffects for Logs, Scroll, etc. HERE] ...
    useEffect(() => {
        if (apiLogs && apiLogs.length > 0) {
            setPersistentLogs(prevLogs => {
                const newLogs = apiLogs.filter(apiLog => !prevLogs.some(prevLog => prevLog.timestamp === apiLog.timestamp && prevLog.message === apiLog.message));
                const combined = [...prevLogs, ...newLogs].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
                return combined.slice(-500);
            });
        }
    }, [apiLogs]);
    const visibleLogs = persistentLogs.filter(log => new Date(log.timestamp).getTime() > logsClearedTime);
    const handleClearLogs = () => setLogsClearedTime(Date.now());
    useEffect(() => { if (logsContainerRef.current) logsContainerRef.current.scrollTo({ top: logsContainerRef.current.scrollHeight, behavior: 'smooth' }); }, [persistentLogs]);
    useEffect(() => {
        let interval;
        if (botStatus?.status === 'running') interval = setInterval(() => refreshBotData(), 2000);
        return () => clearInterval(interval);
    }, [botStatus?.status, refreshBotData]);
    const fetchWinners = async () => {
        setScanningWinners(true);
        try {
            const token = localStorage.getItem("token"); 
            const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners", { headers: { Authorization: `Bearer ${token}` } });
            if (res.data) setLiveWinners(res.data);
        } catch (err) { console.error("Failed to load winners:", err); } finally { setScanningWinners(false); }
    };
    useEffect(() => { fetchWinners(); }, []);
    // ... [END EXISTING EFFECTS] ...


    // 🚀 Handle Mode Selection & Save Session
    const handleModeSelection = (mode, balance) => {
        const allocation = mode === 'paper' ? balance : formConfig.capitalAllocation;
        
        setFormConfig(prev => ({
            ...prev,
            tradingMode: mode,
            capitalAllocation: allocation
        }));
        
        // Save to Session Storage so reload doesn't kill it
        sessionStorage.setItem('botSession', JSON.stringify({ mode, balance: allocation }));
        setIsModeSelected(true);
    };

    // 🚀 HANDLERS
    const handleSetupSelect = (e) => {
        const setupId = e.target.value;
        setSelectedSetupId(setupId); setSelectedWinnerId(""); 
        const setup = setups.find(s => s._id === setupId);
        if (setup) {
            const isCombo = setup.isCombo || (setup.strategies && setup.strategies.length > 1);
            let comboConfig = setup.comboConfig || (isCombo ? { strategyCodes: setup.strategies.map(s => s.code), combinationRule: setup.params?.hybridMode || 'AND' } : null);
            setFormConfig(prev => ({
                ...prev, symbol: setup.symbol, timeframe: setup.timeframe,
                capitalAllocation: prev.tradingMode === 'paper' ? prev.capitalAllocation : (setup.initialBalance || 1000),
                isCombo: isCombo, strategies: setup.strategies || [], comboConfig: comboConfig || { strategyCodes: [], combinationRule: 'OR' },
                params: setup.params || {}, mlMode: setup.mlMode || 'off', mlModel: setup.mlModel || '', mlThreshold: setup.mlThreshold || 0.5,
                riskManagementMode: setup.riskManagementMode || 'static', riskPercentage: setup.riskPercentage || 1, growthCapitalTarget: setup.growthCapitalTarget || 2000
            }));
        }
    };

    const handleWinnerSelect = (e) => {
        const filename = e.target.value;
        setSelectedWinnerId(filename);
        const selectedWinner = liveWinners.find(w => w.id === filename);
        if (!selectedWinner || !selectedWinner.config) return;
        const data = selectedWinner.config;
        let symbol = data.symbol || "BTC-USD"; let timeframe = data.timeframe || "1h";
        if(!data.symbol && filename.includes('_')) { const parts = filename.split('_'); if(parts[1]) symbol = parts[1]; if(parts[2]) timeframe = parts[2]; }
        let strategies = (Array.isArray(data.strategies) ? data.strategies : (Array.isArray(data) ? data : [])).map(s => ({ strategyId: "", code: (typeof s === 'string' ? s : (s.code || "unknown")), params: (typeof s === 'string' ? {} : (s.params || s)) }));
        let mlMode = data.mlMode || "off"; let mlModel = data.params?.mlModel || data.mlModel || "";
        if (mlModel && mlMode === "off") mlMode = "predictions"; if (!mlModel && mlMode !== "off") mlModel = 'btc_1h_xgboost_model'; 
        const globalParams = { ...data.params }; if (data.riskPercentage) globalParams.riskPercentage = Number(data.riskPercentage); if (data.maxPyramiding) globalParams.maxPyramiding = Number(data.maxPyramiding);
        setFormConfig(prev => ({
            ...prev, symbol, timeframe, isCombo: true, strategies,
            comboConfig: { strategyCodes: strategies.map(s => s.code), combinationRule: globalParams.hybridMode || 'OR' },
            mlMode, mlModel, mlThreshold: Number(data.mlThreshold) || 0.5, params: globalParams,
            riskManagementMode: data.riskManagementMode || 'static', riskPercentage: Number(data.riskPercentage) || 1, growthCapitalTarget: Number(data.growthCapitalTarget) || 2000
        }));
    };

    const handleStart = async (e) => {
        e.preventDefault();
        if (!isConnected || !address) { alert("⚠️ Wallet Disconnected!"); return; }
        setLogsClearedTime(0); setPersistentLogs([]); 
        const cleanStrategies = (formConfig.strategies || []).map(s => ({ code: s.code || "unknown", params: s.params || {} }));
        const cleanPayload = {
            userId: address, mode: formConfig.tradingMode, symbol: formConfig.symbol, timeframe: formConfig.timeframe,
            capitalAllocation: Number(formConfig.capitalAllocation), currentBalance: Number(formConfig.capitalAllocation),
            mlMode: formConfig.mlMode, mlModel: formConfig.mlModel, mlThreshold: Number(formConfig.mlThreshold),
            isCombo: !!formConfig.isCombo, comboConfig: formConfig.comboConfig || { strategyCodes: cleanStrategies.map(s => s.code), combinationRule: 'AND' },
            strategies: cleanStrategies, params: formConfig.params || {}, maxPyramiding: parseInt(formConfig.params?.maxPyramiding || 1, 10),
            riskManagementMode: formConfig.riskManagementMode, riskPercentage: Number(formConfig.riskPercentage), growthCapitalTarget: Number(formConfig.growthCapitalTarget)
        };
        try { 
            await startBot(cleanPayload); 
            setPersistentLogs(prev => [{ timestamp: new Date().toISOString(), message: `✅ Bot Initialized in ${formConfig.tradingMode.toUpperCase()} Mode with $${cleanPayload.capitalAllocation}`, type: 'system' }]);
            setTimeout(refreshBotData, 1000);
        } catch (err) { console.error("Bot Start Error:", err); alert(`Failed to start: ${err.message}`); }
    };

    const handleStop = async () => {
        try { await stopBot(); setTimeout(refreshBotData, 1000); } catch (err) { console.error(err); }
    };

    // 🚀 NEW: Panic Sell Handler
    const handlePanicSell = async () => {
        if (!window.confirm("⚠️ EMERGENCY: SELL ALL POSITIONS?\n\nThis will market sell everything and stop the bot. This action cannot be undone.")) return;
        try {
            const token = localStorage.getItem('token');
            // Assuming your backend supports a 'liquidate' flag or you have a dedicated route
            await axios.post('https://neov6backend.onrender.com/api/bot/stop', 
                { userId: address, liquidate: true }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setPersistentLogs(prev => [{ timestamp: new Date().toISOString(), message: `🛑 PANIC SELL INITIATED. Stopping Bot...`, type: 'error' }]);
            setTimeout(refreshBotData, 1000);
        } catch (err) {
            console.error("Panic Sell Error:", err);
            alert("Panic Sell Failed: " + err.message);
        }
    };
    
    const handleRefreshChart = () => refreshBotData();
    const isRunning = botStatus?.status === 'running';
    const chartData = {
        candleData: botStatus?.candles || [],
        tradeBreakdown: (botStatus?.trades || []).map(t => ({ ...t, entryTime: t.entryTime, exitTime: t.exitTime, profit: t.profit, price: t.entry_price || t.price, exitPrice: t.exit_price || t.exitPrice }))
    };
    const hasData = chartData.candleData && chartData.candleData.length > 0;

    const botProps = {
        botStatus, logs: persistentLogs, visibleLogs, loading: botLoading, isRunning,
        liveWinners, setups, chartData, hasData,
        formConfig, setFormConfig, selectedSetupId, selectedWinnerId,
        handleStart, handleStop, handleSetupSelect, handleWinnerSelect, fetchWinners, scanningWinners, handleRefreshChart, handleClearLogs,
        logsContainerRef,
        
        // 🚀 Pass Panic Handler to Shell
        handlePanicSell 
    };

    return (
        <div className="trading-bot-root relative">
            {!isModeSelected && <ModeSelectionModal onSelect={handleModeSelection} isConnected={isConnected} hasApiKeys={hasApiKeys} />}
            <div className={`transition-all duration-500 ${!isModeSelected ? 'filter blur-lg pointer-events-none' : ''}`}>
                 <TradingBotShell {...botProps} />
            </div>
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
