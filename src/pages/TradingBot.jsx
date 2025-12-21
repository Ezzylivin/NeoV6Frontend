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
                    {pnl != null ? `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}` : '--'}
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

const TradingBotContainer = () => {
    const { botStatus, logs: apiLogs, loading: botLoading, startBot, stopBot, refreshBotData: originalRefresh } = useBot();
    
    // Safely destructure setups to prevent 'map' errors
    const { setups = [] } = useBacktestSetupFunction() || {}; 
    const liveWinners = []; 

    const { address, isConnected } = useAccount();

    const [isModeSelected, setIsModeSelected] = useState(false);
    const [hasApiKeys, setHasApiKeys] = useState(false);
    const [showPreFlight, setShowPreFlight] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [logFilter, setLogFilter] = useState('ALL'); 
    const [latency, setLatency] = useState(0);
    const [sessionStartBalance, setSessionStartBalance] = useState(null); 
    const [persistentLogs, setPersistentLogs] = useState([]);
    const [logsClearedTime, setLogsClearedTime] = useState(0);
    const logsContainerRef = useRef(null);
    const prevTradeCount = useRef(0);

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
        maxTradesPerDay: 20,
        comboConfig: { strategyCodes: [], combinationRule: 'AND' }
    });

    /* ===========================
       🟢 DERIVED BOT STATE
       =========================== */

    const isConfigured =
        !!botStatus?.config ||
        !!botStatus?.symbol ||
        !!botStatus?.timeframe ||
        (Array.isArray(botStatus?.strategies) && botStatus.strategies.length > 0) ||
        (Array.isArray(botStatus?.activePositions));

    const activePositions =
        botStatus?.activePositions ||
        botStatus?.positions ||
        [];

    const hasOpenPosition = activePositions.length > 0;
    const isRunning = botStatus?.status === 'running';
    const isStopped = botStatus?.status === 'stopped';

    /* ===========================
       EFFECTS
       =========================== */

    useEffect(() => {
        if (botStatus?.performanceMetrics?.totalTrades > prevTradeCount.current) {
            AUDIO_TRADE.play().catch(() => {});
            prevTradeCount.current = botStatus.performanceMetrics.totalTrades;
        }
    }, [botStatus?.performanceMetrics?.totalTrades]);

    useEffect(() => {
        if (botStatus?.status === 'running' && sessionStartBalance === null && botStatus?.currentBalance) {
            setSessionStartBalance(botStatus.currentBalance);
        }
    }, [botStatus?.status, botStatus?.currentBalance]);

    useEffect(() => {
        if (apiLogs?.length) {
            setPersistentLogs(prev => {
                const newLogs = apiLogs.filter(l =>
                    !prev.some(p => p.timestamp === l.timestamp && p.message === l.message)
                );
                return [...prev, ...newLogs].slice(-500);
            });
        }
    }, [apiLogs]);

    const refreshWithLatency = async () => {
        const start = performance.now();
        await originalRefresh();
        setLatency(Math.round(performance.now() - start));
    };

    useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(refreshWithLatency, 2000);
        return () => clearInterval(interval);
    }, [isRunning]);

    const handleStartClick = (e) => {
        e.preventDefault();
        setShowPreFlight(true);
    };

    const handleConfirmStart = async () => {
        setIsStarting(true);
        setPersistentLogs([]);
        AUDIO_START.play().catch(() => {});

        try {
            // 🛠 FIX: Reverted to simple payload construction (How it was before)
            const payload = { ...formConfig };
            if (address) payload.userId = address; // Only add userId if connected
            
            await startBot(payload);

            setSessionStartBalance(formConfig.capitalAllocation);
            setPersistentLogs(prev => {
                if (prev.some(l => l.message.includes("Bot Initialized"))) return prev;
                return [...prev, {
                    timestamp: new Date().toISOString(),
                    message: `✅ Bot Initialized in ${formConfig.tradingMode.toUpperCase()} Mode with $${formConfig.capitalAllocation}`,
                    type: 'system'
                }];
            });

            setShowPreFlight(false);
            toast.success("Bot Started Successfully");
        } catch (err) {
            console.error(err);
            toast.error(err.message || "Failed to start bot");
        } finally {
            setIsStarting(false);
        }
    };

    const handleStop = async () => {
        await stopBot();
        toast.success("Bot Stopped");
    };

    return (
        <div className="trading-bot-root relative">
            <Toaster position="top-right" />

            {isModeSelected && (
                <BotStatusBar 
                    status={botStatus?.status} 
                    pnl={
                        isConfigured && 
                        sessionStartBalance != null && 
                        botStatus?.currentBalance != null 
                            ? botStatus.currentBalance - sessionStartBalance
                            : null
                    }
                    winRate={botStatus?.performanceMetrics?.winRate}
                    latency={latency}
                    mode={formConfig.tradingMode}
                    onStop={handleStop}
                />
            )}

            {isStopped && hasOpenPosition && (
                <div className="bg-yellow-500/10 border-b border-yellow-500/30 text-yellow-400 text-xs px-6 py-2 font-mono">
                    ⚠ Bot is STOPPED with open positions (paper-safe state)
                </div>
            )}

            <TradingBotShell 
                botStatus={botStatus}
                logs={persistentLogs}
                loading={botLoading}
                isRunning={isRunning}
                isConfigured={isConfigured}
                hasOpenPosition={hasOpenPosition}
                handleStart={handleStartClick} 
                handleStop={handleStop}
                logsContainerRef={logsContainerRef}
                logFilter={logFilter}
                setLogFilter={setLogFilter}
                
                // Pass required data to child components
                setups={setups}
                liveWinners={liveWinners}
                formConfig={formConfig}
                setFormConfig={setFormConfig}
            />

            {/* PRE-FLIGHT MODAL */}
            {showPreFlight && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#111] border border-neutral-800 rounded-lg max-w-md w-full shadow-2xl p-6 relative">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-yellow-500">⚠</span> Confirm Launch
                        </h3>
                        
                        <div className="space-y-3 text-sm text-neutral-300 font-mono mb-6">
                            <div className="flex justify-between border-b border-white/10 pb-2">
                                <span>Mode</span>
                                <span className={formConfig.tradingMode === 'live' ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                                    {formConfig.tradingMode.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-white/10 pb-2">
                                <span>Capital</span>
                                <span className="text-white">${formConfig.capitalAllocation}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/10 pb-2">
                                <span>Strategy</span>
                                <span className="text-white">{formConfig.isCombo ? 'Combo Mode' : (formConfig.strategies[0]?.code || 'Single')}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/10 pb-2">
                                <span>Risk Per Trade</span>
                                <span className="text-red-400">{formConfig.riskPercentage}%</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowPreFlight(false)}
                                className="flex-1 py-3 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold uppercase text-xs"
                                disabled={isStarting}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConfirmStart}
                                disabled={isStarting}
                                className={`flex-1 py-3 rounded font-bold uppercase text-xs text-black transition-all ${
                                    isStarting ? 'bg-neutral-500 cursor-wait' : 'bg-yellow-500 hover:bg-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                                }`}
                            >
                                {isStarting ? 'Igniting...' : '🚀 Launch'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
