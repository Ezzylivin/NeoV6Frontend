// File: src/pages/TradingBot.jsx
// 🚀 FIX: v13.26 - Visual Stream Sync + Terminal Icons Restoration

import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { useAccount } from "wagmi"; 
import { ConnectButton } from '@rainbow-me/rainbowkit';
import toast, { Toaster } from "react-hot-toast";
import { io } from "socket.io-client"; 
import { useBot } from "../hooks/useBot";
import { LiveTradingChart } from "../components/LiveTradingChart.jsx"; 
import { 
    Plus, Trash2, Shield, Globe, Cpu, Filter, TrendingUp, 
    Activity, Scale, Power, RefreshCw, Wallet, Wifi, WifiOff,
    ArrowUpRight, Clock, Box, Timer, DollarSign, Info, BarChart, Settings2, Zap, ArrowDownRight,
    CandlestickChart, AlertTriangle, RotateCcw, Eraser
} from "lucide-react"; 

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

import "./TradingBot.css";
import "../styles/Themes.css";

// Global Constants definitions here (STRAT_POOL, MODEL_POOL, etc.)

const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    // Robust 24h local time format
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const TradingBotContainer = () => {
    const { startBot, stopBot, resetBot, refreshState, restoredConfig, botStatus: hookBotStatus, logs: hookLogs } = useBot(); 
    const { isConnected, address } = useAccount();
    const [socketConnected, setSocketConnected] = useState(false);
    const [isHaltLocked, setIsHaltLocked] = useState(false);
    const [socketLogs, setSocketLogs] = useState([]);
    
    // Unified Status Derivation
    const socketStatus = useMemo(() => ({
        status: hookBotStatus?.status || 'stopped',
        currentBalance: hookBotStatus?.currentBalance || hookBotStatus?.balance || 0,
        unrealizedPnl: hookBotStatus?.unrealizedPnl || 0,
        exposure: hookBotStatus?.exposure || 0,
        positions: hookBotStatus?.positions || hookBotStatus?.activePositions || [],
        equityCurve: hookBotStatus?.equityCurve || [],
        tradeMarkers: hookBotStatus?.tradeMarkers || [],
        candles: hookBotStatus?.candles || [],
        startedAt: hookBotStatus?.startedAt || null
    }), [hookBotStatus]);

    const isBotRunning = socketStatus.status === 'running';

    // 🟢 TERMINAL HEADER LOGIC
    const handleClearLogs = () => {
        setSocketLogs([]);
        toast.success("Memory Purged");
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 overflow-x-hidden">
            <Toaster position="top-right" />
            
            {/* ... Header & Stats Grid ... */}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[720px]">
                <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-[40px] overflow-hidden flex flex-col relative shadow-2xl">
                    <div className="p-6 border-b border-zinc-800 flex justify-between bg-zinc-800/10">
                        <span className="text-[11px] font-black uppercase tracking-widest">{formConfig.symbol} Stream</span>
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${isBotRunning ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
                            <span className="text-[9px] font-black uppercase">Neural Sync</span>
                        </div>
                    </div>
                    <div className="flex-1 bg-black/40">
                        {/* 🟢 Correct Prop Injection */}
                        <LiveTradingChart 
                            symbol={formConfig.symbol} 
                            candleData={socketStatus.candles} 
                            tradeMarkers={socketStatus.tradeMarkers} 
                            activePositions={socketStatus.positions} 
                            isRunning={isBotRunning} 
                            strategies={formConfig.strategies} 
                        />
                    </div>
                </div>

                <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
                    <div className="p-5 border-b border-zinc-800 bg-zinc-800/20 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-violet-400"><Cpu size={16}/><h3 className="text-[10px] font-black uppercase tracking-widest">Neural Flow</h3></div>
                        <div className="flex items-center gap-2">
                            {/* 🟢 Eraser & Connection Symbols Restored */}
                            <button onClick={() => refreshState()} className="text-zinc-600 hover:text-emerald-400 transition-all"><RefreshCw size={14} /></button>
                            <button onClick={handleClearLogs} className="text-zinc-600 hover:text-white transition-all"><Eraser size={14} /></button>
                            {isConnected ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-rose-500 animate-pulse" />}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 font-mono text-[10px] space-y-3 bg-black/20 custom-scrollbar">
                        {hookLogs.map((log, i) => (
                            <div key={i} className={`p-3 rounded-xl border ${getLogStyle(log.message || log)}`}>
                                <span className="text-[8px] block opacity-50 mb-1">{formatTime(log.time)}</span>
                                {log.message || log}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* ... Performance Graphs ... */}
        </div>
    );
};
