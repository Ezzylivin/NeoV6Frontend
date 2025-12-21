import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link, useNavigate } from 'react-router-dom';
import { useBot } from '../hooks/useBot.js';
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import { UIModeProvider } from "../context/UIModeContext";
import TradingBotShell from "./TradingBotShell";
import "./TradingBot.css";
import "../styles/Themes.css";
import toast, { Toaster } from 'react-hot-toast';

const AUDIO_START = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.m4a'); 
const AUDIO_TRADE = new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.m4a'); 

const BotStatusBar = ({ status, pnl, winRate, latency, mode, onStop }) => (
    <div className={`sticky top-0 z-40 flex items-center justify-between px-6 py-2 border-b backdrop-blur-md ${mode === 'live' ? 'bg-red-900/20 border-red-500/30' : 'bg-emerald-900/20 border-emerald-500/30'}`}>
        <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 text-sm font-bold ${status === 'running' ? 'text-green-400' : 'text-red-400'}`}>
                <span className={`w-2 h-2 rounded-full ${status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                {status === 'running' ? 'RUNNING' : 'STOPPED'}
            </div>
            <div className="h-4 w-px bg-white/10"></div>
            <div className="text-xs text-neutral-400 font-mono">
                LATENCY: <span className={latency < 200 ? 'text-green-400' : 'text-yellow-400'}>{latency ? `${latency}ms` : '--'}</span>
            </div>
        </div>

        <div className="flex items-center gap-6">
            {status === 'running' && (
                <button 
                    onClick={onStop}
                    className="flex items-center gap-2 px-4 py-1 bg-red-500/20 hover:bg-red-500 border border-red-500 text-red-500 hover:text-white rounded transition-all duration-300 text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                >
                    ⏹ Stop Engine
                </button>
            )}

            <div className="text-center">
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Session PnL</div>
                <div className={`text-sm font-mono font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pnl >= 0 ? '+' : ''}{pnl != null ? `$${pnl.toFixed(2)}` : '--'}
                </div>
            </div>
            <div className="text-center">
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Win Rate</div>
                <div className="text-sm font-mono font-bold text-white">{winRate ? `${winRate}%` : '--'}</div>
            </div>
            <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${mode === 'live' ? 'bg-red-600 text-white border-red-500' : 'bg-emerald-600 text-black border-emerald-400'}`}>
                {mode === 'live' ? 'LIVE MODE' : 'PAPER MODE'}
            </div>
        </div>
    </div>
);

const PreFlightModal = ({ config, onConfirm, onCancel, isStarting, hasApiKeys, address }) => {
    const [checks, setChecks] = useState({ wallet: false, keys: false, capital: false, strategy: false });

    useEffect(() => {
        setChecks({
            wallet: !!address,
            keys: config.tradingMode === 'paper' || hasApiKeys, 
            capital: Number(config.capitalAllocation) >= 100,
            strategy: (config.isCombo && config.comboConfig?.strategyCodes?.length > 0) || 
                      (!config.isCombo && config.strategies?.length > 0)
        });
    }, [config, hasApiKeys, address]);

    const allPassed = Object.values(checks).every(Boolean);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-xl">
            <div className="max-w-md w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-6 shadow-2xl animate-fade-in-up">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="text-yellow-500">🚀</span> Pre-Flight Check
                </h3>
                
                <div className="space-y-3 mb-8">
                    <CheckItem label="Wallet Connection" status={checks.wallet} />
                    <CheckItem label={config.tradingMode === 'live' ? "API Keys (Required)" : "API Keys (Optional)"} status={checks.keys} />
                    <CheckItem label={`Capital Allocation ($${config.capitalAllocation})`} status={checks.capital} />
                    <CheckItem label="Strategy Logic Loaded" status={checks.strategy} />
                </div>

                {config.tradingMode === 'live' && (
                    <div className="mb-6 space-y-2">
                        {config.maxDailyLoss > 10 && <div className="text-xs text-yellow-500">⚠ High Risk: Max Daily Loss &gt; 10%</div>}
                        {config.maxTradesPerDay > 50 && <div className="text-xs text-yellow-500">⚠ High Frequency: &gt; 50 Trades/Day</div>}
                    </div>
                )}

                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 rounded-lg border border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 transition">
                        Abort
                    </button>
                    <button 
                        onClick={onConfirm} 
                        disabled={!allPassed || isStarting}
                        className={`flex-1 py-3 rounded-lg font-bold text-black transition flex justify-center items-center gap-2 ${allPassed ? 'bg-yellow-500 hover:bg-yellow-400 shadow-lg shadow-yellow-500/20' : 'bg-neutral-700 text-neutral-500 cursor-not-allowed'}`}
                    >
                        {isStarting ? 'Igniting...' : 'LAUNCH BOT'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const CheckItem = ({ label, status }) => (
    <div className="flex items-center justify-between p-3 bg-black/40 rounded border border-white/5">
        <span className="text-sm text-neutral-300">{label}</span>
        {status ? <span className="text-green-500 font-bold">✔ OK</span> : <span className="text-red-500 font-bold">MISSING</span>}
    </div>
);

const ModeSelectionModal = ({ onSelect, isConnected, hasApiKeys }) => {
    const [step, setStep] = useState('selection');
    const [paperBalance, setPaperBalance] = useState(10000);
    const [agreedRisk, setAgreedRisk] = useState(false);
    const [agreedBot, setAgreedBot] = useState(false);
    const navigate = useNavigate();
    const { address } = useAccount();

    const handleReset = async () => {
        if(!window.confirm("⚠️ Are you sure? This will wipe your Paper Trading history and reset the balance.")) return;
        const toastId = toast.loading("Wiping database...");
        try {
            const token = localStorage.getItem('token');
            await axios.post('https://neov6backend.onrender.com/api/bot/reset', { 
                userId: address, 
                symbol: "BTC-USD", 
                timeframe: "1h", 
                capitalAllocation: paperBalance 
            }, {
                headers: { Authorization: `Bearer ${token}` } 
            });
            
            toast.success("Account Reset Successfully!", { id: toastId });
        } catch (err) {
            toast.error("Reset Failed: " + (err.response?.data?.message || err.message), { id: toastId });
        }
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
                            <div onClick={() => setStep('paper_setup')} className="group cursor-pointer bg-[#1a1a1a] border border-white/10 hover:border-emerald-500/50 hover:bg-[#1f2937] p-8 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><span className="text-9xl">📄</span></div>
                                <h3 className="text-2xl font-bold text-emerald-400 mb-2">Paper Trading</h3>
                                <p className="text-neutral-300 mb-6">Simulate trades with fake money. Zero risk.</p>
                                <div className="flex items-center gap-2 text-sm text-emerald-500 font-bold uppercase tracking-wider"><span>Configure Simulation</span><span>→</span></div>
                            </div>
                            <div 
                                onClick={() => { if (hasApiKeys) setStep('live_agreement'); else toast.error("Please add API Keys in Settings first!"); }} 
                                className={`group relative p-8 rounded-2xl border transition-all duration-300 overflow-hidden ${hasApiKeys ? 'cursor-pointer bg-[#1a0505] border-red-900/30 hover:border-red-500/50 hover:bg-[#2f0a0a] transform hover:-translate-y-1' : 'cursor-pointer bg-neutral-900 border-neutral-800 opacity-70 hover:opacity-100 hover:border-yellow-500/30'}`}
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><span className="text-9xl">⚡</span></div>
                                <h3 className={`text-2xl font-bold mb-2 ${hasApiKeys ? 'text-red-500' : 'text-neutral-500'}`}>Live Trading</h3>
                                <p className="text-neutral-300 mb-6">Execute real orders. Real capital at risk.</p>
                                {hasApiKeys ? (
                                    <div className="flex items-center gap-2 text-sm text-red-500 font-bold uppercase tracking-wider"><span>Enter Danger Zone</span><span>→</span></div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-3 py-2 rounded text-xs font-bold text-center">⚠ KEYS MISSING: Click to Configure</div>
                                        <button onClick={(e) => { e.stopPropagation(); navigate("/settings"); }} className="text-sm text-white underline hover:text-yellow-400 relative z-10">Go to Settings</button>
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
                        <div className="mb-6"><label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Starting Balance ($)</label><input type="number" value={paperBalance} onChange={(e) => setPaperBalance(Number(e.target.value))} className="w-full bg-black border border-white/20 rounded-lg p-4 text-2xl text-white font-mono focus:border-emerald-500 outline-none" /></div>
                        
                        <div className="flex gap-3">
                            <button onClick={handleReset} className="flex-1 bg-red-900/30 hover:bg-red-900/50 border border-red-500/50 text-red-400 font-bold py-4 rounded-lg transition">
                                ↺ Reset
                            </button>
                            <button onClick={() => onSelect('paper', paperBalance)} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-lg transition">
                                Start Simulation
                            </button>
                        </div>
                    </div>
                )}
                {step === 'live_agreement' && (
                    <div className="max-w-lg mx-auto bg-[#1a0505] border border-red-500/30 p-8 rounded-2xl animate-fade-in-up">
                        <button onClick={() => setStep('selection')} className="text-red-400/60 hover:text-red-400 mb-6 text-sm">← Cancel</button>
                        <h3 className="text-2xl font-bold text-white mb-4">Live Trading Agreement</h3>
                        <div className="space-y-4 mb-8">
                            <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={agreedRisk} onChange={(e) => setAgreedRisk(e.target.checked)} className="mt-1 w-5 h-5 bg-black border border-red-500/30 rounded focus:ring-red-500 checked:bg-red-600" /><span className="text-sm text-neutral-300">I accept financial responsibility.</span></label>
                            <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={agreedBot} onChange={(e) => setAgreedBot(e.target.checked)} className="mt-1 w-5 h-5 bg-black border border-red-500/30 rounded focus:ring-red-500 checked:bg-red-600" /><span className="text-sm text-neutral-300">I accept software provided "as is".</span></label>
                        </div>
                        <button onClick={() => onSelect('live', null)} disabled={!agreedRisk || !agreedBot} className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${agreedRisk && agreedBot ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'}`}>ENTER LIVE MARKET</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const TradingBotContainer = () => {
    const { botStatus, logs: apiLogs, loading: botLoading, startBot, stopBot, refreshBotData: originalRefresh } = useBot();
    const { setups } = useBacktestSetupFunction();
    const { address, isConnected } = useAccount();

    const [isModeSelected, setIsModeSelected] = useState(false);
    const [hasApiKeys, setHasApiKeys] = useState(false);
    const [showPreFlight, setShowPreFlight] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [logFilter, setLogFilter] = useState('ALL'); 
    const [latency, setLatency] = useState(0);
    const [sessionStartBalance, setSessionStartBalance] = useState(null); 
    const [liveWinners, setLiveWinners] = useState([]);
    const [scanningWinners, setScanningWinners] = useState(false);
    const [selectedWinnerId, setSelectedWinnerId] = useState("");
    const [selectedSetupId, setSelectedSetupId] = useState("");
    const [logsClearedTime, setLogsClearedTime] = useState(0);
    const logsContainerRef = useRef(null);
    const [persistentLogs, setPersistentLogs] = useState([]);
    
    // Track previous trade count for Sound FX
    const prevTradeCount = useRef(0);

    const [formConfig, setFormConfig] = useState({
        isCombo: false, strategyId: '', comboConfig: { strategyCodes: [], combinationRule: 'AND' },
        symbol: 'BTC-USD', timeframe: '1h', capitalAllocation: 1000, tradingMode: 'paper',
        params: {}, strategies: [], mlMode: 'off', mlModel: '', mlThreshold: 0.5,
        riskManagementMode: 'static', riskPercentage: 1, growthCapitalTarget: 2000,
        maxDailyLoss: 5, maxDrawdown: 10, maxTradesPerDay: 20 
    });

    useEffect(() => {
        const savedSession = sessionStorage.getItem('botSession');
        if (savedSession) {
            const { mode, balance, startBalance } = JSON.parse(savedSession);
            setFormConfig(prev => ({ ...prev, tradingMode: mode, capitalAllocation: balance || prev.capitalAllocation }));
            setSessionStartBalance(startBalance); 
            setIsModeSelected(true);
        }
    }, []);

    // 🟢 FIX: Sync Session PnL with Real Backend Balance
    useEffect(() => {
        if (botStatus?.status === 'running' && sessionStartBalance === null && botStatus?.currentBalance) {
            // Logic: If bot is running but we forgot the start balance (e.g., refresh), 
            // assume start balance = current balance (reset PnL view) OR fetch original start from API if available.
            // For now, syncing to current prevents the "fake profit" spike.
            setSessionStartBalance(botStatus.currentBalance);
        }
    }, [botStatus?.status, botStatus?.currentBalance]);

    useEffect(() => {
        // Sound FX Logic
        if (botStatus?.performanceMetrics?.totalTrades > prevTradeCount.current) {
            AUDIO_TRADE.play().catch(() => {}); 
            toast.success("🚀 New Trade Executed!", { duration: 4000, position: 'top-right' });
            prevTradeCount.current = botStatus.performanceMetrics.totalTrades;
        }
    }, [botStatus?.performanceMetrics?.totalTrades]);

    useEffect(() => {
        const checkKeys = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get('https://neov6backend.onrender.com/api/users/keys', { headers: { Authorization: `Bearer ${token}` } });
                const keys = Array.isArray(res.data) ? res.data : (res.data.keys || []);
                setHasApiKeys(keys.length > 0);
            } catch (err) { setHasApiKeys(false); }
        };
        if (isConnected) checkKeys();
    }, [isConnected]);

    useEffect(() => {
        if (apiLogs && apiLogs.length > 0) {
            setPersistentLogs(prevLogs => {
                const newLogs = apiLogs.filter(apiLog => 
                    !prevLogs.some(p => 
                        p.timestamp === apiLog.timestamp && 
                        p.message === apiLog.message && 
                        p.type === apiLog.type
                    )
                );
                return [...prevLogs, ...newLogs].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp)).slice(-500);
            });
        }
    }, [apiLogs]);

    const visibleLogs = persistentLogs
        .filter(log => new Date(log.timestamp).getTime() > logsClearedTime)
        .filter(log => logFilter === 'ALL' || (log.type && log.type.toUpperCase() === logFilter)); 

    const handleClearLogs = () => setLogsClearedTime(Date.now());
    
    useEffect(() => {
        const container = logsContainerRef.current;
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
            if (isNearBottom) {
                container.scrollTo({ top: scrollHeight, behavior: 'smooth' });
            }
        }
    }, [persistentLogs, logFilter]);

    const refreshWithLatency = async () => {
        const start = performance.now();
        await originalRefresh();
        setLatency(Math.round(performance.now() - start));
    };

    useEffect(() => {
        if (botStatus?.status !== 'running') return; 
        const interval = setInterval(() => refreshWithLatency(), 2000);
        return () => clearInterval(interval);
    }, [botStatus?.status]); 

    const fetchWinners = async () => {
        setScanningWinners(true);
        try {
            const token = localStorage.getItem("token"); 
            const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners", { headers: { Authorization: `Bearer ${token}` } });
            if (res.data) setLiveWinners(res.data);
        } catch (err) { toast.error("Failed to load winners"); } finally { setScanningWinners(false); }
    };
    useEffect(() => { fetchWinners(); }, []);

    const handleModeSelection = (mode, balance) => {
        const allocation = mode === 'paper' ? balance : formConfig.capitalAllocation;
        setFormConfig(prev => ({ ...prev, tradingMode: mode, capitalAllocation: allocation }));
        sessionStorage.setItem('botSession', JSON.stringify({ mode, balance: allocation, startBalance: null }));
        setIsModeSelected(true);
    };

    const handleSetupSelect = (e) => {
        const setupId = e.target.value; setSelectedSetupId(setupId); setSelectedWinnerId(""); 
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
        const filename = e.target.value; setSelectedWinnerId(filename);
        const selectedWinner = liveWinners.find(w => w.id === filename);
        if (!selectedWinner || !selectedWinner.config) return;
        const data = selectedWinner.config;
        let symbol = data.symbol || "BTC-USD"; let timeframe = data.timeframe || "1h";
        if(!data.symbol && filename.includes('_')) { const parts = filename.split('_'); if(parts[1]) symbol = parts[1]; if(parts[2]) timeframe = parts[2]; }
        
        let strategies = (Array.isArray(data.strategies) ? data.strategies : (Array.isArray(data) ? data : []))
            .map(s => ({ 
                strategyId: (typeof s === 'string' ? undefined : (s.strategyId || s._id || undefined)), 
                code: (typeof s === 'string' ? s : (s.code || "unknown")), 
                params: (typeof s === 'string' ? {} : (s.params || s)) 
            }));
            
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

    const handleStartClick = (e) => {
        e.preventDefault();
        if (!isConnected || !address) { toast.error("Wallet Disconnected!"); return; }
        setShowPreFlight(true);
    };

    const handleConfirmStart = async () => {
        setIsStarting(true);
        setLogsClearedTime(0); setPersistentLogs([]); 
        AUDIO_START.play().catch(() => {}); 
         
        const globalParams = formConfig.params || {};
        const excludedKeys = ['hybridMode', 'maxPyramiding', 'riskPercentage', 'riskManagementMode', 'mlModel', 'mlMode'];
        const cleanGlobalParams = Object.keys(globalParams).reduce((acc, key) => {
            if (!excludedKeys.includes(key)) acc[key] = globalParams[key];
            return acc;
        }, {});

        const cleanStrategies = (formConfig.strategies || []).map(s => ({ 
            strategyId: s.strategyId || s._id || undefined, 
            type: s.type || undefined,
            code: s.code || "unknown", 
            params: { ...cleanGlobalParams, ...(s.params || {}) }
        }));
        
        const cleanPayload = {
            userId: address,
            mode: formConfig.tradingMode, 
            symbol: formConfig.symbol, 
            timeframe: formConfig.timeframe,
            capitalAllocation: Number(formConfig.capitalAllocation), 
            currentBalance: Number(formConfig.capitalAllocation),
            mlMode: formConfig.mlMode, 
            mlModel: formConfig.mlModel, 
            mlThreshold: Number(formConfig.mlThreshold),
            isCombo: !!formConfig.isCombo, 
            comboConfig: formConfig.comboConfig || { strategyCodes: cleanStrategies.map(s => s.code), combinationRule: 'AND' },
            strategies: cleanStrategies, 
            params: formConfig.params || {}, 
            maxPyramiding: parseInt(formConfig.params?.maxPyramiding || 1, 10),
            riskManagementMode: formConfig.riskManagementMode, 
            riskPercentage: Number(formConfig.riskPercentage), 
            growthCapitalTarget: Number(formConfig.growthCapitalTarget),
            maxDailyLoss: Number(formConfig.maxDailyLoss), 
            maxDrawdown: Number(formConfig.maxDrawdown), 
            maxTradesPerDay: Number(formConfig.maxTradesPerDay)
        };

        try { 
            await startBot(cleanPayload); 
            const startBal = cleanPayload.capitalAllocation;
            setSessionStartBalance(startBal);
            sessionStorage.setItem('botSession', JSON.stringify({ mode: formConfig.tradingMode, balance: startBal, startBalance: startBal }));

            setPersistentLogs(prev => [{ timestamp: new Date().toISOString(), message: `✅ Bot Initialized in ${formConfig.tradingMode.toUpperCase()} Mode with $${cleanPayload.capitalAllocation}`, type: 'system' }]);
            setTimeout(refreshWithLatency, 1000);
            setShowPreFlight(false);
            toast.success("Bot Started Successfully!");
        } catch (err) { 
            console.error("Bot Start Error:", err); 
            toast.error(`Failed to start: ${err.response?.data?.message || err.message}`);
        }
        finally { setIsStarting(false); }
    };

    const handleStop = async () => {
        try { await stopBot(); setTimeout(refreshWithLatency, 1000); toast.success("Bot Stopped"); } catch (err) { console.error(err); }
    };

    const handlePanicSell = async () => {
        if (!window.confirm("⚠️ EMERGENCY: SELL ALL POSITIONS?\n\nThis will market sell everything and stop the bot. This action cannot be undone.")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.post('https://neov6backend.onrender.com/api/bot/stop', { userId: address, liquidate: true }, { headers: { Authorization: `Bearer ${token}` } });
            setPersistentLogs(prev => [{ timestamp: new Date().toISOString(), message: `🛑 PANIC SELL INITIATED. Stopping Bot...`, type: 'error' }]);
            setTimeout(refreshWithLatency, 1000);
            toast.error("PANIC SELL INITIATED");
        } catch (err) { 
            console.error("Panic Sell Error:", err); 
            toast.error("Panic Sell Failed: " + err.message); 
        }
    };
     
    const handleRefreshChart = () => refreshWithLatency();
    const isRunning = botStatus?.status === 'running';
    const chartData = { candleData: botStatus?.candles || [], tradeBreakdown: (botStatus?.trades || []).map(t => ({ ...t, entryTime: t.entryTime, exitTime: t.exitTime, profit: t.profit, price: t.entry_price || t.price, exitPrice: t.exit_price || t.exitPrice })) };
    const hasData = chartData.candleData && chartData.candleData.length > 0;

    const botProps = {
        botStatus, logs: persistentLogs, visibleLogs, loading: botLoading, isRunning,
        liveWinners, setups, chartData, hasData,
        formConfig, setFormConfig, selectedSetupId, selectedWinnerId,
        handleStart: handleStartClick, 
        handleStop, handleSetupSelect, handleWinnerSelect, fetchWinners, scanningWinners, handleRefreshChart, handleClearLogs,
        logsContainerRef, handlePanicSell,
        logFilter, setLogFilter
    };

    return (
        <div className="trading-bot-root relative">
            <Toaster position="top-right" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
            
            {!isModeSelected && <ModeSelectionModal onSelect={handleModeSelection} isConnected={isConnected} hasApiKeys={hasApiKeys} />}
             
            {showPreFlight && <PreFlightModal config={formConfig} onConfirm={handleConfirmStart} onCancel={() => setShowPreFlight(false)} isStarting={isStarting} hasApiKeys={hasApiKeys} address={address} />}

            <div className={`transition-all duration-500 ${!isModeSelected || showPreFlight ? 'filter blur-lg pointer-events-none' : ''}`}>
                 {isModeSelected && <BotStatusBar 
                     status={botStatus?.status} 
                     pnl={sessionStartBalance != null && botStatus?.currentBalance != null ? botStatus.currentBalance - sessionStartBalance : null} 
                     winRate={botStatus?.performanceMetrics?.winRate} 
                     latency={latency} 
                     mode={formConfig.tradingMode} 
                     onStop={handleStop} 
                 />}
                 <TradingBotShell {...botProps} />
            </div>
        </div>
    );
};

export default function TradingBot() {
    return ( <UIModeProvider> <TradingBotContainer /> </UIModeProvider> );
}
