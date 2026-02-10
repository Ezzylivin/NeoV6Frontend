// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: v9.3 - Fixed Log Rendering Crash (Object vs String)

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAccount } from "wagmi";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import toast, { Toaster } from "react-hot-toast";
import { useBot } from "../hooks/useBot";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup";
import { UIModeProvider } from "../context/UIModeContext";
import { LiveTradingChart } from "../components/LiveTradingChart.jsx"; 
import { 
    Play, BarChart3, Layers, Plus, Trash2, 
    Shield, Globe, Cpu, Filter, TrendingUp, 
    Activity, Percent, DollarSign, AlertTriangle, 
    Zap, Scale, Award, TrendingDown, LayoutGrid, Info, Power, RefreshCw
} from "lucide-react";
import "./TradingBot.css";
import "../styles/Themes.css";

const VITE_API = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com";
const API_BASE = VITE_API.endsWith('/api') ? VITE_API : `${VITE_API}/api`;

const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 transition-all text-xs outline-none";
const labelClass = "text-[10px] text-zinc-500 uppercase font-bold mb-1 block ml-1";

// 🟢 TOOLTIP COMPONENT
const Tooltip = ({ text, children }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative flex items-center" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
            {children}
            {visible && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-zinc-800 text-zinc-200 text-[11px] leading-relaxed p-3 rounded-lg shadow-xl z-50 border border-zinc-700 pointer-events-none">
                    {text}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-zinc-800"></div>
                </div>
            )}
        </div>
    );
};

// --- CONFIGURATION ---
const STRAT_POOL = [
    { name: "RSI Threshold", code: "rsi_threshold" },
    { name: "SMA Crossover", code: "sma_crossover" },
    { name: "SuperTrend Follow", code: "supertrend" },
    { name: "MACD Crossover", code: "macd_crossover" },
    { name: "ATR Breakout", code: "atr_breakout" },
    { name: "Bollinger Band Fade", code: "bb_fade" },
    { name: "Stochastic Osc", code: "stoch" },
    { name: "EMA Cloud", code: "ema_cloud" },
    { name: "Price Action Break", code: "pa_breakout" },
    { name: "Volume Profile", code: "vol_profile" }
];

const DEFAULT_STRATEGY_PARAMS = {
    rsi_threshold: { rsi_length: 14, oversold: 30, overbought: 70 },
    sma_crossover: { fast_sma: 50, slow_sma: 200 },
    supertrend: { st_atr: 10, st_factor: 3.0 },
    macd_crossover: { fast: 12, slow: 26, signal: 9 },
    atr_breakout: { atr_length: 14, multiplier: 1.5 },
    bb_fade: { bb_period: 20, bb_std: 2.0 },
    stoch: { k_period: 14, d_period: 3, slowing: 3 },
    ema_cloud: { fast_ema: 9, slow_ema: 21 },
    pa_breakout: { lookback: 20, buffer: 0.01 },
    vol_profile: { vol_ma: 20, threshold: 1.5 }
};

// 🟢 DEFAULT MODELS
const DEFAULT_MODELS = [
    { id: "xgboost", name: "XGBoost (Gradient Boosting)" },
    { id: "random_forest", name: "Random Forest (Bagging)" },
    { id: "gradient_boosting", name: "Gradient Boosting (Sklearn)" },
    { id: "lstm", name: "LSTM (Deep Recurrent)" },
    { id: "transformer", name: "Transformer (Attention)" },
    { id: "stacking", name: "Stacking Ensemble (Hybrid)" }
];

// --- MODALS ---
const PreFlightModal = ({ config, onConfirm, onCancel, isStarting, hasApiKeys, address }) => {
    const [checks, setChecks] = useState({ wallet: false, keys: false, capital: false, strategy: false });

    useEffect(() => {
        setChecks({
            wallet: !!address,
            keys: config.tradingMode === 'paper' || hasApiKeys,
            capital: Number(config.capitalAllocation) >= 100,
            strategy: (config.strategies && config.strategies.length > 0)
        });
    }, [config, hasApiKeys, address]);

    const allPassed = Object.values(checks).every(Boolean);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="max-w-md w-full bg-[#111] border border-white/10 rounded-xl p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="text-emerald-500">🚀</span> Pre-Flight Check
                </h3>
                <div className="space-y-3 mb-8">
                    <CheckItem label="Wallet Connection" status={checks.wallet} />
                    <CheckItem label={config.tradingMode === 'live' ? "API Keys (Required)" : "API Keys (Optional)"} status={checks.keys} />
                    <CheckItem label={`Capital ($${config.capitalAllocation})`} status={checks.capital} />
                    <CheckItem label={`Logic (${config.strategies.length} Modules)`} status={checks.strategy} />
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 rounded-lg border border-white/10 text-neutral-400 hover:text-white transition">Abort</button>
                    <button onClick={onConfirm} disabled={!allPassed || isStarting} className={`flex-1 py-3 rounded-lg font-bold text-black transition flex justify-center items-center gap-2 ${allPassed ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'}`}>
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
        {status ? <span className="text-green-500 font-bold text-xs">✔ OK</span> : <span className="text-red-500 font-bold text-xs">MISSING</span>}
    </div>
);

const ModeSelectionModal = ({ onSelect, isConnected, hasApiKeys }) => {
    const [step, setStep] = useState('selection');
    const [paperBalance, setPaperBalance] = useState(10000);

    if (!isConnected) return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="bg-[#111] p-8 rounded-2xl border border-white/10 text-center max-w-md">
                <div className="text-4xl mb-4">🦊</div>
                <h2 className="text-2xl font-bold text-white mb-2">Connect Wallet</h2>
                <div className="flex justify-center mt-6"><ConnectButton /></div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in zoom-in-95 duration-300">
            <div className="max-w-5xl w-full p-6 text-center">
                {step === 'selection' && (
                    <>
                        <h1 className="text-3xl font-bold text-white mb-2">TRADING ENVIRONMENT</h1>
                        <p className="text-neutral-500 mb-10 text-sm">SELECT YOUR OPERATIONAL MODE</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                            <div onClick={() => setStep('paper_setup')} className="group cursor-pointer bg-[#0a0a0a] border border-white/10 hover:border-emerald-500/50 p-8 rounded-xl transition-all">
                                <h3 className="text-xl font-bold text-emerald-400 mb-2">Paper Trading</h3>
                                <p className="text-neutral-400 text-sm">Simulate trades with virtual capital.</p>
                            </div>
                            <div onClick={() => { if (hasApiKeys) onSelect('live', null); else toast.error("Add API Keys first!"); }} className={`group p-8 rounded-xl border transition-all ${hasApiKeys ? 'cursor-pointer bg-[#0a0a0a] border-white/10 hover:border-red-500/50' : 'bg-neutral-900/50 border-white/5 opacity-50 cursor-not-allowed'}`}>
                                <h3 className="text-xl font-bold text-red-500 mb-2">Live Trading</h3>
                                <p className="text-neutral-400 text-sm">Execute real orders. Capital at risk.</p>
                            </div>
                        </div>
                    </>
                )}
                {step === 'paper_setup' && (
                    <div className="max-w-sm mx-auto bg-[#111] border border-white/10 p-8 rounded-xl">
                        <h3 className="text-xl font-bold text-white mb-4">Initial Balance</h3>
                        <input type="number" value={paperBalance} onChange={(e) => setPaperBalance(Number(e.target.value))} className="w-full bg-black border border-white/20 rounded p-3 text-xl text-white mb-6 focus:border-emerald-500 outline-none" />
                        <div className="flex gap-3">
                            <button onClick={() => setStep('selection')} className="flex-1 py-3 text-neutral-400 hover:text-white">Back</button>
                            <button onClick={() => onSelect('paper', paperBalance)} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded">Start</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MAIN PAGE ---

const TradingBotContainer = () => {
    const { botStatus, logs, loading: botLoading, startBot, stopBot, resetBot } = useBot();
    const { setups } = useBacktestSetupFunction();
    const { isConnected, address } = useAccount();

    const [isModeSelected, setIsModeSelected] = useState(false);
    const [hasApiKeys, setHasApiKeys] = useState(false);
    const [showPreFlight, setShowPreFlight] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [availableModels, setAvailableModels] = useState(DEFAULT_MODELS);

    const [formConfig, setFormConfig] = useState({
        strategyId: "", symbol: "BTC-USD", timeframe: "1h", capitalAllocation: 1000,
        tradingMode: "paper", strategies: [{ code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }],
        mlMode: "off", mlModel: "", mlThreshold: 0.5,
        riskManagementMode: "static", riskPercentage: 1, hybridMode: "AND",
        growthCapitalTarget: 2000, maxDailyLoss: 5, maxDrawdown: 10, maxTradesPerDay: 20,
        params: { ...DEFAULT_STRATEGY_PARAMS.rsi_threshold, take_profit: 0.05, stop_loss: 0.02, trailing_stop: 0.01 }
    });

    const [liveWinners, setLiveWinners] = useState([]);
    const [selectedWinnerId, setSelectedWinnerId] = useState("");
    const [selectedSetupId, setSelectedSetupId] = useState("");
    const [scanningWinners, setScanningWinners] = useState(false);

    // --- EFFECTS ---
    useEffect(() => {
        if (isConnected) {
            axios.get(`${API_BASE}/users/keys`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
                .then(res => {
                    const keys = Array.isArray(res.data) ? res.data : (res.data.keys || []);
                    setHasApiKeys(keys.length > 0);
                }).catch(() => setHasApiKeys(false));
        }
    }, [isConnected]);

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_BASE}/ml/models`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (res.data && Array.isArray(res.data)) setAvailableModels(res.data);
            } catch (e) { console.warn("Using default models"); }
        };
        fetchModels();
    }, []);

    const fetchWinners = async () => {
        setScanningWinners(true);
        try {
            const res = await axios.get(`${API_BASE}/bot/winners`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            setLiveWinners(Array.isArray(res.data) ? res.data : []);
            toast.success("Strategies Refreshed");
        } catch (err) { toast.error("Failed to load alpha files"); }
        finally { setScanningWinners(false); }
    };
    useEffect(() => { if (isConnected) fetchWinners(); }, [isConnected]);

    // --- HANDLERS ---
    const handleModeSelection = (mode, balance) => {
        setFormConfig(prev => ({ ...prev, tradingMode: mode, capitalAllocation: mode === 'paper' ? balance : prev.capitalAllocation }));
        setIsModeSelected(true);
    };

    const handleConfirmStart = async () => {
        setIsStarting(true);
        try {
            await startBot({ 
                ...formConfig, userId: address, 
                comboConfig: { strategyCodes: formConfig.strategies.map(s => s.code), combinationRule: formConfig.hybridMode } 
            });
            setShowPreFlight(false);
            toast.success("Bot Started!");
        } catch (err) { toast.error("Start Failed: " + err.message); }
        finally { setIsStarting(false); }
    };

    const handleReset = async () => {
        if (window.confirm("Are you sure? This will wipe all trade history and reset the bot state.")) {
            try {
                if (resetBot) await resetBot();
                else await axios.post(`${API_BASE}/bot/reset`, { userId: address }, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                toast.success("Bot Reset Successfully");
                window.location.reload();
            } catch (e) {
                toast.error("Reset Failed: " + e.message);
            }
        }
    };

    const patchedStatus = {
        ...botStatus,
        currentPosition: botStatus?.activePosition || botStatus?.currentPosition || null,
        positions: botStatus?.activePositions || []
    };

    return (
        <UIModeProvider>
            <div className="min-h-screen bg-zinc-950 text-white font-sans p-6">
                <Toaster position="top-right" toastOptions={{ style: { background: "#333", color: "#fff" } }} />
                
                {!isModeSelected && <ModeSelectionModal onSelect={handleModeSelection} isConnected={isConnected} hasApiKeys={hasApiKeys} />}
                {showPreFlight && <PreFlightModal config={formConfig} onConfirm={handleConfirmStart} onCancel={() => setShowPreFlight(false)} isStarting={isStarting} hasApiKeys={hasApiKeys} address={address} />}

                <header className={`max-w-[1800px] mx-auto mb-8 flex items-center gap-12 transition-all duration-500 ${!isModeSelected || showPreFlight ? 'blur-sm' : ''}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Activity className="text-black w-6 h-6" />
                        </div>
                        <h1 className="text-sm font-black uppercase tracking-widest">Sovereign <span className="text-emerald-500">Live</span></h1>
                    </div>
                    {isModeSelected && (
                        <div className="px-4 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] uppercase font-bold text-zinc-400">
                            Mode: <span className={formConfig.tradingMode === 'live' ? 'text-red-500' : 'text-emerald-500'}>{formConfig.tradingMode}</span>
                        </div>
                    )}
                </header>

                <div className={`max-w-[1800px] mx-auto grid grid-cols-12 gap-8 transition-all duration-500 ${!isModeSelected || showPreFlight ? 'blur-sm pointer-events-none' : ''}`}>
                    {/* 🟢 LEFT SIDEBAR (CONFIG) */}
                    <div className="col-span-12 lg:col-span-3">
                        <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 sticky top-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <form onSubmit={(e) => { e.preventDefault(); setShowPreFlight(true); }} className="space-y-8">
                                
                                <AIConfig mlMode={formConfig.mlMode} setMlMode={(m)=>setFormConfig({...formConfig, mlMode: m})} params={formConfig.params} availableModels={availableModels} onParamChange={(k,v)=>setFormConfig(p=>({...p, params:{...p.params,[k]:v}}))} />
                                
                                <div className="space-y-4 border-t border-zinc-800 pt-6">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[10px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1">Logic Ensemble <Tooltip text="Combine multiple strategies to create a hybrid model."><Info size={10} className="text-zinc-500" /></Tooltip></h4>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setFormConfig(p => ({ ...p, strategies: [...p.strategies, { code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }] }))} className="p-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md"><Plus size={14} /></button>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {formConfig.strategies.map((s, i) => (
                                            <div key={i} className="p-3 bg-zinc-800/30 rounded-xl border border-zinc-700">
                                                <div className="flex justify-between mb-2">
                                                    <select value={s.code} onChange={(e) => { const n = [...formConfig.strategies]; n[i] = { code: e.target.value, params: DEFAULT_STRATEGY_PARAMS[e.target.value] }; setFormConfig({...formConfig, strategies: n}); }} className="bg-transparent text-[10px] font-bold text-amber-500 outline-none">{STRAT_POOL.map(o => <option key={o.code} value={o.code}>{o.name}</option>)}</select>
                                                    <button type="button" onClick={() => setFormConfig(p => ({ ...p, strategies: p.strategies.filter((_, idx) => idx !== i) }))} className="text-zinc-500 hover:text-rose-500"><Trash2 size={12}/></button>
                                                </div>
                                                <StrategyParamInputs strategy={s} onChange={(p) => { const n = [...formConfig.strategies]; n[i].params = p; setFormConfig({...formConfig, strategies: n}); }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 border-t border-zinc-800 pt-6">
                                    <div className="flex items-center gap-2"><Shield size={14} className="text-amber-500"/><h4 className="text-[10px] text-amber-500 font-black uppercase tracking-widest flex items-center gap-1">Execution Shield <Tooltip text="Protect your trades with Stop Loss, Take Profit, and Trailing Stops."><Info size={10} className="text-zinc-500" /></Tooltip></h4></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className={labelClass}>TP %</label><input type="number" step="0.001" value={formConfig.params.take_profit} onChange={(e)=>setFormConfig(p=>({...p,params:{...p.params,take_profit:parseFloat(e.target.value)}}))} className={inputClass}/></div>
                                        <div><label className={labelClass}>SL %</label><input type="number" step="0.001" value={formConfig.params.stop_loss} onChange={(e)=>setFormConfig(p=>({...p,params:{...p.params,stop_loss:parseFloat(e.target.value)}}))} className={inputClass}/></div>
                                        <div className="col-span-2"><label className={labelClass}>Trailing Stop %</label><input type="number" step="0.001" value={formConfig.params.trailing_stop} onChange={(e)=>setFormConfig(p=>({...p,params:{...p.params,trailing_stop:parseFloat(e.target.value)}}))} className={inputClass}/></div>
                                    </div>
                                </div>

                                <div className="space-y-4 border-t border-zinc-800 pt-6">
                                    <div className="flex items-center gap-2"><Globe size={14} className="text-cyan-400"/><h4 className="text-[10px] text-cyan-400 font-black uppercase tracking-widest flex items-center gap-1">Market <Tooltip text="Define market conditions, timeframes, and initial capital."><Info size={10} className="text-zinc-500" /></Tooltip></h4></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2"><label className={labelClass}>Asset</label><select value={formConfig.symbol} onChange={(e)=>setFormConfig({...formConfig, symbol: e.target.value})} className={inputClass}><option value="BTC-USD">BTC-USD</option><option value="ETH-USD">ETH-USD</option><option value="SOL-USD">SOL-USD</option></select></div>
                                        <div><label className={labelClass}>Timeframe</label><select value={formConfig.timeframe} onChange={(e)=>setFormConfig({...formConfig, timeframe: e.target.value})} className={inputClass}><option value="1m">1m</option><option value="5m">5m</option><option value="15m">15m</option><option value="1h">1h</option><option value="4h">4h</option></select></div>
                                        <div><label className={labelClass}>Capital</label><input type="number" value={formConfig.capitalAllocation} onChange={(e)=>setFormConfig({...formConfig, capitalAllocation: parseFloat(e.target.value)})} className={inputClass} disabled={formConfig.tradingMode === 'paper'} /></div>
                                    </div>
                                </div>

                                {botStatus?.status === 'running' ? (
                                    <button type="button" onClick={stopBot} className="w-full py-4 bg-rose-500 text-white font-black uppercase text-xs rounded-2xl hover:bg-rose-600 shadow-xl transition-all flex items-center justify-center gap-2">
                                        <Power size={16} /> Emergency Stop
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        <button type="submit" disabled={isStarting} className="w-full py-4 bg-emerald-500 text-black font-black uppercase text-xs rounded-2xl hover:bg-emerald-400 shadow-xl transition-all">
                                            {isStarting ? "Initializing..." : "Engage Systems"}
                                        </button>
                                        
                                        <button type="button" onClick={handleReset} className="w-full py-2 bg-zinc-800 text-zinc-400 font-bold uppercase text-[10px] rounded-xl hover:bg-zinc-700 hover:text-white border border-zinc-700 transition-all flex items-center justify-center gap-2">
                                            <RefreshCw size={12} /> Reset Bot State
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>

                    {/* 🟢 RIGHT CONTENT (LIVE DASHBOARD) */}
                    <div className="col-span-12 lg:col-span-9 space-y-6">
                        {/* Status Cards */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                                <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">Status</p>
                                <p className={`text-2xl font-mono ${botStatus?.status === 'running' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                    {botStatus?.status === 'running' ? 'ONLINE' : 'OFFLINE'}
                                </p>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                                <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">PnL (Session)</p>
                                <p className="text-2xl font-mono text-white">$0.00</p>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                                <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">Active Trades</p>
                                <p className="text-2xl font-mono text-white">0</p>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                                <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">Target</p>
                                <p className="text-2xl font-mono text-emerald-400">${formConfig.growthCapitalTarget}</p>
                            </div>
                        </div>

                        {/* 🟢 LIVE CHART */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl h-[600px] flex flex-col relative">
                            
                            <div className="bg-zinc-800/50 p-3 border-b border-zinc-800 flex items-center justify-between z-10">
                                <div className="flex items-center gap-2">
                                    <Activity size={14} className="text-emerald-500"/>
                                    <span className="text-[10px] font-mono text-zinc-400">LIVE MARKET FEED • {formConfig.symbol}</span>
                                </div>
                                {botStatus?.status === 'running' && (
                                    <div className="flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-[10px] text-emerald-500 font-bold tracking-widest uppercase">Live</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 relative">
                                <LiveTradingChart 
                                    symbol={formConfig.symbol} 
                                    timeframe={formConfig.timeframe} 
                                    isRunning={botStatus?.status === 'running'}
                                    logs={logs}
                                    activePositions={patchedStatus.positions}
                                    candleData={botStatus?.candles || []}
                                />
                                
                                {/* 🟢 OVERLAY: BOT THOUGHT STREAM (CRASH FIXED) */}
                                <div className="absolute bottom-4 left-4 w-80 max-h-48 overflow-y-auto custom-scrollbar bg-black/80 backdrop-blur-md border border-zinc-800 rounded-xl p-3 z-20 pointer-events-auto">
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                                        <Cpu size={12} className="text-violet-400" />
                                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Neural Stream</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {logs.slice(-5).map((log, i) => {
                                            // 🟢 SAFE PARSING: Handle both string and object logs
                                            const message = typeof log === 'object' && log !== null ? (log.message || JSON.stringify(log)) : String(log);
                                            const timestamp = typeof log === 'object' && log.timestamp ? new Date(log.timestamp).toLocaleTimeString().split(' ')[0] : new Date().toLocaleTimeString().split(' ')[0];
                                            
                                            return (
                                                <div key={i} className="text-[10px] font-mono animate-in slide-in-from-left-2 fade-in duration-300">
                                                    <span className="text-zinc-500 mr-2">{timestamp}</span>
                                                    <span className={message.includes('Signal') ? 'text-amber-400' : message.includes('Executing') ? 'text-emerald-400' : 'text-zinc-300'}>
                                                        {message}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {logs.length === 0 && <span className="text-[10px] text-zinc-600 italic">Waiting for market data...</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </UIModeProvider>
    );
};

// --- HELPER COMPONENTS ---

function AIConfig({ mlMode, setMlMode, params, onParamChange, availableModels = [] }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2"><Cpu size={14} className="text-violet-400" /><h4 className="text-[10px] text-violet-400 font-black uppercase tracking-widest flex items-center gap-1">Neural Gate <Tooltip text="Use machine learning models to filter trade signals."><Info size={10} className="text-zinc-500" /></Tooltip></h4></div>
                <select value={mlMode} onChange={(e) => setMlMode(e.target.value)} className="bg-zinc-800 text-[9px] rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-violet-500/50"><option value="off">BYPASS</option><option value="on">ACTIVE</option></select>
            </div>
            {mlMode === "on" && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Architecture</label>
                            <Tooltip text="Select the machine learning model architecture."><Info size={10} className="text-zinc-600" /></Tooltip>
                        </div>
                        <select value={params.model_type} onChange={(e) => onParamChange('model_type', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-violet-500 transition-all text-xs outline-none">{availableModels.map(model => (<option key={model.id} value={model.id}>{model.name}</option>))}</select>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Long Gate</label>
                            <Tooltip text="Threshold for long signal confidence (0-1)."><Info size={10} className="text-zinc-600" /></Tooltip>
                        </div>
                        <input type="number" step="0.01" value={params.long_threshold} onChange={(e) => onParamChange('long_threshold', parseFloat(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-violet-500 transition-all text-xs outline-none" />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Short Gate</label>
                            <Tooltip text="Threshold for short signal confidence (0-1)."><Info size={10} className="text-zinc-600" /></Tooltip>
                        </div>
                        <input type="number" step="0.01" value={params.short_threshold} onChange={(e) => onParamChange('short_threshold', parseFloat(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-violet-500 transition-all text-xs outline-none" />
                    </div>
                </div>
            )}
        </div>
    );
}

function StrategyParamInputs({ strategy, onChange }) {
    const { code, params = {} } = strategy;
    const handleNumChange = (k, valStr) => {
        if (valStr === "" || valStr === "-") onChange({ ...params, [k]: "" });
        else onChange({ ...params, [k]: isNaN(parseFloat(valStr)) ? "" : parseFloat(valStr) });
    };
    const f = (l, k, s = "1", tip) => (
        <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
                <label className={labelClass}>{l}</label>
                {tip && <Tooltip text={tip}><Info size={10} className="text-zinc-600" /></Tooltip>}
            </div>
            <input type="number" step={s} value={params[k] === undefined || isNaN(params[k]) ? "" : params[k]} onChange={(e) => handleNumChange(k, e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-[10px] text-amber-500 outline-none" />
        </div>
    );
    return (
        <div className="grid grid-cols-2 gap-2 mt-2">
            {code === "rsi_threshold" && <>{f("RSI Len", "rsi_length", "1", "RSI Length is the number of previous trading sessions used to calculate the Relative Strength Index (RSI).")}{f("OB", "overbought", "1", "The overbought level is a threshold on the RSI indicator, typically set at 70, which suggests that an asset may be overvalued and due for a price correction.")}{f("OS", "oversold", "1", "The oversold level is a threshold on the RSI indicator, typically set at 30, which suggests that an asset may be undervalued and due for a price bounce.")}</>}
            {code === "sma_crossover" && <>{f("Fast", "fast_sma", "1", "The Fast Simple Moving Average (SMA) calculates the average price over a shorter number of periods, reacting more quickly to price changes.")}{f("Slow", "slow_sma", "1", "The Slow Simple Moving Average (SMA) calculates the average price over a longer number of periods, smoothing out price noise to show the broader trend.")}</>}
            {code === "supertrend" && <>{f("ATR", "st_atr", "1", "The ATR Period for SuperTrend determines the lookback window for calculating volatility, which influences the distance of the stop-loss line from the price.")}{f("Factor", "st_factor", "0.1", "The SuperTrend Factor is a multiplier applied to the ATR value to set the distance of the trend line from the price; a higher factor keeps the line further away.")}</>}
            {code === "macd_crossover" && <>{f("Fast", "fast", "1", "Fast EMA Period is the shorter time period used to calculate the first Exponential Moving Average in the MACD formula.")}{f("Slow", "slow", "1", "Slow EMA Period is the longer time period used to calculate the second Exponential Moving Average in the MACD formula.")}{f("Signal", "signal", "1", "Signal Line Period is the time period for the EMA of the MACD line itself, used to generate buy and sell signals.")}</>}
            {code === "atr_breakout" && <>{f("ATR Len", "atr_length", "1", "ATR Length determines the number of periods used to calculate the Average True Range, measuring market volatility.")}{f("Mult", "multiplier", "0.1", "ATR Multiplier scales the ATR value to set dynamic stop-loss or breakout levels based on current volatility.")}</>}
            {code === "bb_fade" && <>{f("Period", "bb_period", "1", "Bollinger Band Period is the number of candles used to calculate the Simple Moving Average (SMA) which serves as the middle band.")}{f("Std", "bb_std", "0.1", "Standard Deviation Multiplier determines the width of the Bollinger Bands; typically set to 2, representing two standard deviations from the moving average.")}</>}
            {code === "stoch" && <>{f("K", "k_period", "1", "%K Period is the number of periods used to calculate the main line of the Stochastic Oscillator.")}{f("D", "d_period", "1", "%D Period is the number of periods used to calculate the moving average of the %K line, creating the signal line.")}{f("Slow", "slowing", "1", "Slowing is a smoothing factor applied to the %K line to reduce noise and false signals in the Stochastic Oscillator.")}</>}
            {code === "ema_cloud" && <>{f("Fast EMA", "fast_ema", "1", "Fast EMA in an EMA Cloud represents the shorter-term moving average that typically forms the upper boundary in an uptrend.")}{f("Slow EMA", "slow_ema", "1", "Slow EMA in an EMA Cloud represents the longer-term moving average that typically forms the lower boundary in an uptrend.")}</>}
            {code === "pa_breakout" && <>{f("Lookback", "lookback", "1", "Lookback Period defines how many past candles are analyzed to identify significant support or resistance levels.")}{f("Buffer", "buffer", "0.001", "Buffer is a small additional value added to a breakout level to filter out false breakouts and confirm price momentum.")}</>}
            {code === "vol_profile" && <>{f("Vol MA", "vol_ma", "1", "Volume Moving Average Period calculates the average trading volume over a set number of bars to establish a baseline for volume activity.")}{f("Thresh", "threshold", "0.1", "Volume Threshold is a multiplier or value that current volume must exceed relative to the average to trigger a signal.")}</>}
        </div>
    );
}

function AdvancedFilters({ filters, onChange }) {
    return (
        <div className="space-y-4 border-t border-zinc-800 pt-6">
            <div className="flex items-center gap-2"><Filter size={14} className="text-indigo-400"/><h4 className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Sanity Filters <Tooltip text="Additional checks to confirm trade validity."><Info size={10} className="text-zinc-500" /></Tooltip></h4></div>
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className={labelClass}>Trend Filter</label><select value={filters.trend_filter} onChange={(e)=>onChange('trend_filter', e.target.value)} className={inputClass}><option value="none">None</option><option value="ema_200">200 EMA</option></select></div>
                <div><label className={labelClass}>Min Vol</label><input type="number" value={filters.vol_min} onChange={(e)=>onChange('vol_min', parseFloat(e.target.value))} className={inputClass}/></div>
                <div><label className={labelClass}>ATR Filter</label><input type="number" step="0.1" value={filters.atr_filter} onChange={(e)=>onChange('atr_filter', parseFloat(e.target.value))} className={inputClass}/></div>
            </div>
        </div>
    );
}

export default TradingBotContainer;
