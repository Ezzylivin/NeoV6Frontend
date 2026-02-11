// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: v12.4.1 - Full Config Restoration & Lateral Neural Layout

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

const ModeSelectionModal = ({ onSelect, isConnected, hasApiKeys, onReset }) => {
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
                        <div className="flex gap-3 mb-6">
                            <button onClick={() => setStep('selection')} className="flex-1 py-3 text-neutral-400 hover:text-white">Back</button>
                            <button onClick={() => onSelect('paper', paperBalance)} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded">Start</button>
                        </div>
                        <div className="pt-4 border-t border-zinc-800">
                             <button onClick={onReset} className="text-[10px] text-zinc-500 hover:text-rose-500 flex items-center justify-center gap-1.5 w-full transition-colors uppercase font-bold tracking-wide">
                                <RefreshCw size={10} /> Reset Previous Session Data
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const TradingBotContainer = () => {
    const { botStatus, logs, loading: botLoading, startBot, stopBot, resetBot } = useBot();
    const { setups } = useBacktestSetupFunction();
    const { isConnected, address } = useAccount();
    const logContainerRef = useRef(null);

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
        params: { ...DEFAULT_STRATEGY_PARAMS.rsi_threshold, take_profit: 0.05, stop_loss: 0.02, trailing_stop: 0.01 },
        filters: { trend_filter: "none", vol_min: 0, atr_filter: 0 }
    });

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = 0; 
        }
    }, [logs]);

    useEffect(() => {
        if (isConnected) {
            axios.get(`${API_BASE}/users/keys`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
                .then(res => {
                    const keys = Array.isArray(res.data) ? res.data : (res.data.keys || []);
                    setHasApiKeys(keys.length > 0);
                }).catch(() => setHasApiKeys(false));
        }
    }, [isConnected]);

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
        if (window.confirm("Are you sure? This will wipe all session history.")) {
            try {
                if (resetBot) await resetBot();
                toast.success("Bot Reset Successfully");
                window.location.reload();
            } catch (e) { toast.error("Reset Failed: " + e.message); }
        }
    };

    const patchedStatus = {
        ...botStatus,
        currentPosition: botStatus?.activePosition || botStatus?.currentPosition || null,
        positions: botStatus?.activePositions || []
    };

    return (
        <UIModeProvider>
            <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 overflow-x-hidden">
                <Toaster position="top-right" />
                
                {!isModeSelected && <ModeSelectionModal onSelect={handleModeSelection} isConnected={isConnected} hasApiKeys={hasApiKeys} onReset={handleReset} />}
                {showPreFlight && <PreFlightModal config={formConfig} onConfirm={handleConfirmStart} onCancel={() => setShowPreFlight(false)} isStarting={isStarting} hasApiKeys={hasApiKeys} address={address} />}

                <header className={`max-w-[1800px] mx-auto mb-8 flex items-center justify-between transition-all duration-500 ${!isModeSelected || showPreFlight ? 'blur-sm' : ''}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Activity className="text-black w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-widest">Sovereign <span className="text-emerald-500">Live</span></h1>
                            <p className="text-[9px] text-zinc-500 font-bold">HYBRID INTELLIGENCE ENGINE v12.4</p>
                        </div>
                    </div>
                    {isModeSelected && (
                        <div className="flex gap-4">
                             <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] uppercase font-bold text-zinc-400">
                                Mode: <span className={formConfig.tradingMode === 'live' ? 'text-red-500' : 'text-emerald-500'}>{formConfig.tradingMode}</span>
                            </div>
                            <ConnectButton accountStatus="avatar" chainStatus="icon" />
                        </div>
                    )}
                </header>

                <div className={`max-w-[1800px] mx-auto grid grid-cols-12 gap-6 transition-all duration-500 ${!isModeSelected || showPreFlight ? 'blur-sm pointer-events-none' : ''}`}>
                    
                    {/* --- LEFT SIDEBAR: FULL CONFIGURATION (3 Cols) --- */}
                    <div className="col-span-12 lg:col-span-3 space-y-6">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sticky top-6 max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl">
                            <form onSubmit={(e) => { e.preventDefault(); setShowPreFlight(true); }} className="space-y-8">
                                
                                {/* 1. AI Configuration */}
                                <AIConfig 
                                    mlMode={formConfig.mlMode} 
                                    setMlMode={(m)=>setFormConfig({...formConfig, mlMode: m})} 
                                    params={formConfig.params} 
                                    availableModels={availableModels} 
                                    onParamChange={(k,v)=>setFormConfig(p=>({...p, params:{...p.params,[k]:v}}))} 
                                />
                                
                                {/* 2. Strategy Ensemble */}
                                <div className="space-y-4 border-t border-zinc-800 pt-6">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[10px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1">
                                            Logic Ensemble 
                                            <Tooltip text="Combine multiple strategies. Both must signal to trigger a trade."><Info size={10} className="text-zinc-500" /></Tooltip>
                                        </h4>
                                        <button type="button" onClick={() => setFormConfig(p => ({ ...p, strategies: [...p.strategies, { code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }] }))} className="p-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {formConfig.strategies.map((s, i) => (
                                            <div key={i} className="p-3 bg-zinc-800/30 rounded-xl border border-zinc-700">
                                                <div className="flex justify-between mb-2">
                                                    <select 
                                                        value={s.code} 
                                                        onChange={(e) => { 
                                                            const n = [...formConfig.strategies]; 
                                                            n[i] = { code: e.target.value, params: DEFAULT_STRATEGY_PARAMS[e.target.value] }; 
                                                            setFormConfig({...formConfig, strategies: n}); 
                                                        }} 
                                                        className="bg-transparent text-[10px] font-bold text-amber-500 outline-none"
                                                    >
                                                        {STRAT_POOL.map(o => <option key={o.code} value={o.code}>{o.name}</option>)}
                                                    </select>
                                                    <button type="button" onClick={() => setFormConfig(p => ({ ...p, strategies: p.strategies.filter((_, idx) => idx !== i) }))} className="text-zinc-500 hover:text-rose-500">
                                                        <Trash2 size={12}/>
                                                    </button>
                                                </div>
                                                <StrategyParamInputs strategy={s} onChange={(p) => { const n = [...formConfig.strategies]; n[i].params = p; setFormConfig({...formConfig, strategies: n}); }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. Risk Shield */}
                                <div className="space-y-4 border-t border-zinc-800 pt-6">
                                    <div className="flex items-center gap-2">
                                        <Shield size={14} className="text-amber-500"/>
                                        <h4 className="text-[10px] text-amber-500 font-black uppercase tracking-widest flex items-center gap-1">
                                            Execution Shield
                                            <Tooltip text="TP/SL percentages relative to entry price."><Info size={10} className="text-zinc-500" /></Tooltip>
                                        </h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className={labelClass}>TP %</label><input type="number" step="0.001" value={formConfig.params.take_profit} onChange={(e)=>setFormConfig(p=>({...p,params:{...p.params,take_profit:parseFloat(e.target.value)}}))} className={inputClass}/></div>
                                        <div><label className={labelClass}>SL %</label><input type="number" step="0.001" value={formConfig.params.stop_loss} onChange={(e)=>setFormConfig(p=>({...p,params:{...p.params,stop_loss:parseFloat(e.target.value)}}))} className={inputClass}/></div>
                                        <div className="col-span-2"><label className={labelClass}>Trailing Stop %</label><input type="number" step="0.001" value={formConfig.params.trailing_stop} onChange={(e)=>setFormConfig(p=>({...p,params:{...p.params,trailing_stop:parseFloat(e.target.value)}}))} className={inputClass}/></div>
                                    </div>
                                </div>

                                {/* 4. Market Scope */}
                                <div className="space-y-4 border-t border-zinc-800 pt-6">
                                    <div className="flex items-center gap-2">
                                        <Globe size={14} className="text-cyan-400"/>
                                        <h4 className="text-[10px] text-cyan-400 font-black uppercase tracking-widest flex items-center gap-1">Market scope</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                            <label className={labelClass}>Asset Pair</label>
                                            <select value={formConfig.symbol} onChange={(e)=>setFormConfig({...formConfig, symbol: e.target.value})} className={inputClass}>
                                                <option value="BTC-USD">BTC-USD</option>
                                                <option value="ETH-USD">ETH-USD</option>
                                                <option value="SOL-USD">SOL-USD</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Interval</label>
                                            <select value={formConfig.timeframe} onChange={(e)=>setFormConfig({...formConfig, timeframe: e.target.value})} className={inputClass}>
                                                <option value="1m">1m</option>
                                                <option value="5m">5m</option>
                                                <option value="15m">15m</option>
                                                <option value="1h">1h</option>
                                                <option value="4h">4h</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Capital</label>
                                            <input type="number" value={formConfig.capitalAllocation} onChange={(e)=>setFormConfig({...formConfig, capitalAllocation: parseFloat(e.target.value)})} className={inputClass} disabled={formConfig.tradingMode === 'paper'} />
                                        </div>
                                    </div>
                                </div>

                                {/* 5. Sanity Filters */}
                                <AdvancedFilters filters={formConfig.filters} onChange={(k, v) => setFormConfig(p => ({...p, filters: {...p.filters, [k]: v}}))} />

                                {/* Action Buttons */}
                                <div className="pt-6">
                                    {botStatus?.status === 'running' ? (
                                        <button type="button" onClick={stopBot} className="w-full py-4 bg-rose-500 text-white font-black uppercase text-xs rounded-2xl hover:bg-rose-600 shadow-xl transition-all flex items-center justify-center gap-2 animate-pulse">
                                            <Power size={16} /> Emergency Abort
                                        </button>
                                    ) : (
                                        <button type="submit" disabled={isStarting} className="w-full py-4 bg-emerald-500 text-black font-black uppercase text-xs rounded-2xl hover:bg-emerald-400 shadow-xl transition-all">
                                            {isStarting ? "Igniting..." : "Launch Operations"}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* --- RIGHT: DASHBOARD (9 Cols) --- */}
                    <div className="col-span-12 lg:col-span-9 space-y-6">
                        
                        {/* Status Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                                <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">Engine State</p>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${botStatus?.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`}></div>
                                    <p className={`text-xl font-mono ${botStatus?.status === 'running' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                        {botStatus?.status === 'running' ? 'OPERATIONAL' : 'STANDBY'}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                                <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">Exposure</p>
                                <p className="text-xl font-mono text-white">0.00%</p>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                                <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">PnL</p>
                                <p className="text-xl font-mono text-emerald-400">+$0.00</p>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                                <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">Balance</p>
                                <p className="text-xl font-mono text-white">${botStatus?.currentBalance?.toFixed(2) || formConfig.capitalAllocation.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Lateral Layout Container */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[650px]">
                            
                            {/* Terminal Window (Chart) */}
                            <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden flex flex-col relative shadow-2xl">
                                <div className="bg-zinc-800/30 p-4 border-b border-zinc-800/50 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <TrendingUp size={16} className="text-emerald-500" />
                                        <span className="text-xs font-bold tracking-tighter uppercase">{formConfig.symbol} • {formConfig.timeframe} Terminal</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="h-1.5 w-8 rounded-full bg-zinc-700"></div>
                                        <div className="h-1.5 w-8 rounded-full bg-zinc-700"></div>
                                    </div>
                                </div>
                                <div className="flex-1 bg-[#0b0e14]">
                                    <LiveTradingChart 
                                        symbol={formConfig.symbol} 
                                        timeframe={formConfig.timeframe} 
                                        isRunning={botStatus?.status === 'running'}
                                        logs={logs}
                                        activePositions={patchedStatus.positions}
                                        candleData={botStatus?.candles || []}
                                    />
                                </div>
                            </div>

                            {/* Lateral Neural Stream Window */}
                            <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-[32px] flex flex-col overflow-hidden shadow-2xl">
                                <div className="p-4 border-b border-zinc-800 bg-zinc-800/30">
                                    <h3 className="text-[10px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${botStatus?.status === 'running' ? 'bg-violet-500 animate-ping' : 'bg-zinc-700'}`}></span>
                                        Neural Logic Stream
                                    </h3>
                                </div>

                                <div 
                                    ref={logContainerRef}
                                    className="flex-1 overflow-y-auto p-5 font-mono text-[10px] leading-relaxed space-y-4 custom-scrollbar bg-black/20"
                                >
                                    {logs.map((log, i) => {
                                        const msg = String(log);
                                        const isThought = msg.includes('🧠');
                                        const isOrder = msg.includes('🟢') || msg.includes('🔴');

                                        return (
                                            <div key={i} className={`p-2 rounded-lg border ${
                                                isOrder ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 
                                                isThought ? 'bg-violet-500/5 border-violet-500/10 text-zinc-300' : 
                                                'bg-zinc-800/20 border-transparent text-zinc-500'
                                            } animate-in fade-in slide-in-from-right-2 duration-500`}>
                                                {msg}
                                            </div>
                                        );
                                    })}
                                    {logs.length === 0 && (
                                        <div className="text-zinc-600 italic text-center mt-20 p-4">
                                            Awaiting link to Alpha-Server...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </UIModeProvider>
    );
};

// --- SUB-COMPONENTS ---

function AIConfig({ mlMode, setMlMode, params, onParamChange, availableModels = [] }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Cpu size={14} className="text-violet-400" />
                    <h4 className="text-[10px] text-violet-400 font-black uppercase tracking-widest flex items-center gap-1">Neural Gate</h4>
                </div>
                <select value={mlMode} onChange={(e) => setMlMode(e.target.value)} className="bg-zinc-800 text-[9px] rounded-md px-2 py-1 outline-none">
                    <option value="off">BYPASS</option>
                    <option value="on">ACTIVE</option>
                </select>
            </div>
            {mlMode === "on" && (
                <div className="grid grid-cols-1 gap-3 animate-in fade-in duration-300">
                    <div>
                        <label className="text-[9px] text-zinc-500 uppercase font-bold ml-1">Architecture</label>
                        <select 
                            value={params.model_type} 
                            onChange={(e) => onParamChange('model_type', e.target.value)}
                            className={inputClass}
                        >
                            {availableModels.map(m => (<option key={m.id} value={m.id}>{m.name}</option>))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                         <div>
                            <label className="text-[9px] text-zinc-500 uppercase font-bold ml-1">Long Gate</label>
                            <input type="number" step="0.01" value={params.long_threshold || 0.5} onChange={(e)=>onParamChange('long_threshold', parseFloat(e.target.value))} className={inputClass}/>
                        </div>
                        <div>
                            <label className="text-[9px] text-zinc-500 uppercase font-bold ml-1">Short Gate</label>
                            <input type="number" step="0.01" value={params.short_threshold || 0.5} onChange={(e)=>onParamChange('short_threshold', parseFloat(e.target.value))} className={inputClass}/>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StrategyParamInputs({ strategy, onChange }) {
    const { code, params = {} } = strategy;
    const f = (l, k, s = "1") => (
        <div className="flex flex-col">
            <label className="text-[8px] text-zinc-600 uppercase font-bold mb-1 ml-1">{l}</label>
            <input 
                type="number" 
                step={s}
                value={params[k] === undefined ? "" : params[k]} 
                onChange={(e) => onChange({...params, [k]: parseFloat(e.target.value)})} 
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-[9px] text-amber-500 outline-none" 
            />
        </div>
    );
    return (
        <div className="grid grid-cols-2 gap-2 mt-1">
            {code === "rsi_threshold" && <>{f("Length", "rsi_length")}{f("Oversold", "oversold")}{f("Overbought", "overbought")}</>}
            {code === "stoch" && <>{f("K-Period", "k_period")}{f("D-Period", "d_period")}{f("Slowing", "slowing")}</>}
            {code === "bb_fade" && <>{f("Period", "bb_period")}{f("Deviation", "bb_std", "0.1")}</>}
            {code === "sma_crossover" && <>{f("Fast", "fast_sma")}{f("Slow", "slow_sma")}</>}
            {code === "macd_crossover" && <>{f("Fast", "fast")}{f("Slow", "slow")}{f("Signal", "signal")}</>}
        </div>
    );
}

function AdvancedFilters({ filters, onChange }) {
    return (
        <div className="space-y-4 border-t border-zinc-800 pt-6">
            <div className="flex items-center gap-2">
                <Filter size={14} className="text-indigo-400"/>
                <h4 className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Sanity Filters</h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                    <label className={labelClass}>Trend Filter</label>
                    <select value={filters.trend_filter} onChange={(e)=>onChange('trend_filter', e.target.value)} className={inputClass}>
                        <option value="none">None</option>
                        <option value="ema_200">200 EMA</option>
                        <option value="sma_200">200 SMA</option>
                    </select>
                </div>
                <div><label className={labelClass}>Min Vol</label><input type="number" value={filters.vol_min} onChange={(e)=>onChange('vol_min', parseFloat(e.target.value))} className={inputClass}/></div>
                <div><label className={labelClass}>ATR Min</label><input type="number" step="0.1" value={filters.atr_filter} onChange={(e)=>onChange('atr_filter', parseFloat(e.target.value))} className={inputClass}/></div>
            </div>
        </div>
    );
}

export default TradingBotContainer;
