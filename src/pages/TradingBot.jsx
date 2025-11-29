// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: Fixed Zero Balance Display + Added Titles & Buttons.

import React, { useState, useEffect, useRef, useContext } from "react";
import { useBot } from '../hooks/useBot.js';
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import { useBacktest } from "../hooks/useBacktest.js";
import { StrategyContext } from "../context/StrategyContext.jsx";
import LiveTradingChart from "../components/LiveTradingChart.jsx"; 
import "./TradingBot.css";

// --- HELPER: Robustly Find Metrics ---
// This fixes the $0.00 issue by searching both root and nested objects
const getRobustMetrics = (status) => {
    const pm = status?.performanceMetrics || {};
    
    // Fallbacks: Check root if not in performanceMetrics
    const totalProfit = pm.totalProfit ?? status?.totalProfit ?? 0;
    const totalTrades = pm.totalTrades ?? status?.trades?.length ?? 0;
    const currentBalance = pm.currentBalance ?? status?.currentBalance ?? status?.capitalAllocation ?? 0;
    
    // Calculate Win Rate manually if missing
    let winRate = pm.winRate ?? 0;
    if (status?.trades?.length > 0) {
        const wins = status.trades.filter(t => t.profit > 0).length;
        winRate = (wins / status.trades.length) * 100;
    }

    return {
        "Total Profit": totalProfit,
        "Total Trades": totalTrades,
        "Win Rate": winRate,
        "Max Drawdown": pm.maxDrawdown ?? 0,
        "Profit Factor": pm.profitFactor ?? 0,
        "Current Balance": currentBalance
    };
};

const MetricsDisplay = ({ data }) => {
    const metrics = getRobustMetrics(data);

    const formatValue = (key, value) => {
        if (value === undefined || value === null) return "N/A";
        if (typeof value !== "number") return String(value);
        if (key.includes("Rate") || key.includes("Drawdown")) return `${value.toFixed(2)}%`;
        if (key.includes("Profit") || key.includes("Balance")) return `$${value.toFixed(2)}`;
        return value.toFixed(2);
    };

    return (
        <div className="metrics-grid">
            {Object.entries(metrics).map(([key, value]) => (
                <div key={key} className="metric-item">
                    <span className="metric-label">{key}</span>
                    <span className="metric-value" style={{
                        color: (key.includes("Profit") || key.includes("Balance")) && value < 0 ? '#ef4444' : '#f3f4f6'
                    }}>{formatValue(key, value)}</span>
                </div>
            ))}
        </div>
    );
};

// --- MAIN COMPONENT ---
export default function TradingBot() {
    const { 
        botStatus, logs, winners: botWinners, loading: botLoading, 
        error, startBot, stopBot, refreshBotData 
    } = useBot();

    const { state: backtestState } = useBacktest();
    const winners = (botWinners && botWinners.length > 0) ? botWinners : (backtestState?.winners || []);
    const logsEndRef = useRef(null);

    const [selectedWinnerId, setSelectedWinnerId] = useState("");
    const [formConfig, setFormConfig] = useState({
        isCombo: false, strategyId: '', comboConfig: { strategyCodes: [], combinationRule: 'AND' },
        symbol: 'BTC-USD', timeframe: '1h', capitalAllocation: 1000, tradingMode: 'paper',
        params: {}, strategies: [], mlMode: 'off', mlModel: '', mlThreshold: 0.5
    });

    // Clear Logs State
    const [logsClearedTime, setLogsClearedTime] = useState(0);
    const visibleLogs = logs.filter(log => new Date(log.timestamp).getTime() > logsClearedTime);

    // Auto-Scroll
    useEffect(() => {
        if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }, [logs, visibleLogs]);

    // Auto-Polling (Every 2s)
    useEffect(() => {
        let interval;
        if (botStatus?.status === 'running') {
            interval = setInterval(() => refreshBotData(), 2000);
        }
        return () => clearInterval(interval);
    }, [botStatus?.status, refreshBotData]);

    // --- Handlers ---
    const handleStart = async (e) => {
        e.preventDefault();
        if (formConfig.tradingMode === 'live' && !window.confirm("⚠️ Real Money Trading. Proceed?")) return;
        
        setLogsClearedTime(0); // Reset logs
        try { 
            await startBot(formConfig); 
            setTimeout(refreshBotData, 500);
        } catch (err) { console.error(err); alert(err.message); }
    };

    const handleStop = async () => {
        try { await stopBot(); setTimeout(refreshBotData, 500); } 
        catch (err) { console.error(err); }
    };

    const handleWinnerSelect = (e) => {
        const filename = e.target.value;
        setSelectedWinnerId(filename);
        const selectedWinner = winners.find(w => w.id === filename);
        if (selectedWinner?.config) {
            const config = selectedWinner.config;
            let symbol = config.symbol || "BTC-USD";
            let timeframe = config.timeframe || "1h";
            // ... (Keep your existing parsing logic here if complex, simplified for brevity) ...
            // Basic extraction:
            if(!config.symbol && filename.includes('_')) {
                 const parts = filename.split('_');
                 if(parts[1]) symbol = parts[1];
            }

            // Simple Strategy List Extraction
            let strategies = [];
            if(Array.isArray(config.strategies)) strategies = config.strategies;
            else if(Array.isArray(config)) strategies = config; 
            // Map if raw params
            strategies = strategies.map(s => ({
                code: s.code || s.trend_strategy || "unknown",
                params: s.params || s
            }));

            setFormConfig(prev => ({
                ...prev,
                isCombo: true,
                symbol, timeframe,
                strategies: strategies,
                params: config.params || {},
                mlMode: 'predictions', // Force ML on if loading a winner
                mlModel: config.mlModel || config.params?.mlModel || 'btc_1h_xgboost_model'
            }));
        }
    };

    const isRunning = botStatus?.status === 'running';

    return (
        <div className="trading-bot-container">
            <h2 className="header">Live Trading Bot</h2>
            
            {/* Control Panel */}
            <div className="bot-card control-panel">
                <div className="panel-header">
                    <h3 className="card-title">
                        {isRunning ? 'Bot is Live' : 'Deploy Strategy'}
                        <span className={`mode-badge ${formConfig.tradingMode}`}>
                            {formConfig.tradingMode === 'paper' ? 'PAPER' : 'LIVE'}
                        </span>
                    </h3>
                    <div className={`status-indicator ${botStatus?.status || 'stopped'}`}>
                        {botStatus?.status?.toUpperCase() || 'STOPPED'}
                    </div>
                </div>
                
                <form onSubmit={handleStart} className="bot-form">
                    {!isRunning && (
                        <div className="selectors-row">
                             <label className="setup-selector" style={{flex:1}}>
                                Optimized Strategies (ML)
                                <select value={selectedWinnerId} onChange={handleWinnerSelect} style={{ borderColor: selectedWinnerId ? '#3b82f6' : '#444' }}>
                                    <option value="">-- Select Winner --</option>
                                    {winners.map(w => <option key={w.id} value={w.id}>🏆 {w.name}</option>)}
                                </select>
                            </label>
                            <div className="form-grid">
                                <label>Symbol<input value={formConfig.symbol} disabled /></label>
                                <label>Capital ($)<input type="number" value={formConfig.capitalAllocation} onChange={e=>setFormConfig(p=>({...p, capitalAllocation:Number(e.target.value)}))} /></label>
                            </div>
                            <button type="submit" className="button-start" disabled={botLoading}>
                                {botLoading ? 'Deploying...' : '🚀 Launch Paper'}
                            </button>
                        </div>
                    )}
                    {isRunning && (
                        <div className="running-actions">
                            <button type="button" onClick={handleStop} className="button-stop-main" disabled={botLoading}>Stop Bot</button>
                        </div>
                    )}
                </form>
            </div>

            {error && <div className="error-banner">{error}</div>}

            {/* DASHBOARD */}
            {(botStatus?.isConfigured || isRunning) && (
                <>
                    {/* 🚀 NEW TITLE HERE */}
                    <h3 style={{color: '#ccc', marginTop: '30px', marginBottom: '10px', borderBottom:'1px solid #444', paddingBottom:'5px'}}>
                        Live Performance Dashboard
                    </h3>

                    <div className="bot-card status-dashboard">
                         {/* We pass the WHOLE botStatus object so our helper can find data anywhere */}
                         <MetricsDisplay data={botStatus} />
                    </div>
                    
                    <div className="bot-card chart-panel">
                        <div className="card-header-row" style={{display:'flex', justifyContent:'space-between'}}>
                             <h3 className="card-title" style={{margin:0}}>Live Chart</h3>
                             <button onClick={refreshBotData} style={{background:'none', border:'none', color:'#4ade80', cursor:'pointer'}}>↻ Refresh Chart</button>
                        </div>
                        <LiveTradingChart candles={botStatus.candles || []} trades={botStatus.trades || []} />
                    </div>

                    <div className="bot-card logs-panel">
                        <div className="card-header-row" style={{display:'flex', justifyContent:'space-between'}}>
                            <h3 className="card-title" style={{margin:0}}>Logs</h3>
                            <div style={{display:'flex', gap:'10px'}}>
                                <button onClick={refreshBotData} className="clear-logs-btn" style={{border:'1px solid #555'}}>Refresh</button>
                                <button onClick={() => setLogsClearedTime(Date.now())} className="clear-logs-btn" style={{color:'#ef4444', borderColor:'#ef4444'}}>Clear</button>
                            </div>
                        </div>
                        <div className="logs-container">
                            {visibleLogs.length > 0 ? visibleLogs.map((log, i) => (
                                <div key={i} className={`log-entry log-${log.type}`}>
                                    <span className="log-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    <span className="log-message">{log.message}</span>
                                </div>
                            )) : <p className="no-logs">Waiting for logs...</p>}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
