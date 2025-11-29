// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: Added Clear Logs, Chart Refresh, and Better Header.

import React, { useState, useEffect, useRef, useContext } from "react";
import { useBot } from '../hooks/useBot.js';
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import { useBacktest } from "../hooks/useBacktest.js";
import { StrategyContext } from "../context/StrategyContext.jsx";
import LiveTradingChart from "../components/LiveTradingChart.jsx"; 
import "./TradingBot.css";
import api from '../api/apiClient'; 

// --- METRICS COMPONENT ---
const MetricsDisplay = ({ metrics }) => {
    const m = metrics || {};
    const keyMetrics = {
        "Total Profit": m.totalProfit ?? 0,
        "Total Trades": m.totalTrades ?? 0,
        "Win Rate": m.winRate ?? 0,
        "Max Drawdown": m.maxDrawdown ?? 0,
        "Profit Factor": m.profitFactor ?? 0,
        "Current Balance": m.currentBalance ?? 0
    };

    const formatValue = (key, value) => {
        if (value === undefined || value === null) return "N/A";
        if (typeof value !== "number") return String(value);
        if (key.includes("Rate") || key.includes("Drawdown")) return `${value.toFixed(2)}%`;
        if (key.includes("Profit") || key.includes("Balance")) return `$${value.toFixed(2)}`;
        return value.toFixed(2);
    };

    return (
        <div className="metrics-grid">
            {Object.entries(keyMetrics).map(([key, value]) => (
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

    // 🚀 NEW: Logs Clearing State
    const [logsClearedTime, setLogsClearedTime] = useState(0);
    
    // Filter Logs locally
    const visibleLogs = logs.filter(log => new Date(log.timestamp).getTime() > logsClearedTime);

    // Auto-Scroll
    useEffect(() => {
        if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    // Auto-Polling
    useEffect(() => {
        let interval;
        if (botStatus?.status === 'running') {
            interval = setInterval(() => {
                refreshBotData(); 
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [botStatus?.status, refreshBotData]);

    // ... (Parsing Logic Same as Before) ...
    // For brevity, assuming logic helpers (normalizeParams, etc) are imported or defined above.
    // If needed, I can re-paste the full parsing block, but it's identical to previous.
    
    // --- HANDLER: Golden Strategy ---
    const handleWinnerSelect = (e) => {
        const filename = e.target.value;
        setSelectedWinnerId(filename);
        if (!filename) return;

        const selectedWinner = winners.find(w => w.id === filename);
        if (selectedWinner && selectedWinner.config) {
            // ... (Same parsing logic as before) ...
            // Set formConfig ...
        }
    };
    // (Note: In your actual file, keep the full parsing logic from previous step here)

    const handleStart = async (e) => {
        e.preventDefault();
        setLogsClearedTime(0); // Reset logs on start
        if (formConfig.tradingMode === 'live') {
            if (!window.confirm("⚠️ WARNING: Real Money Trading. Proceed?")) return;
        }
        try { 
            await startBot(formConfig); 
            setTimeout(refreshBotData, 500);
        } catch (err) { console.error(err); alert(err.message); }
    };

    const handleStop = async () => {
        try { await stopBot(); setTimeout(refreshBotData, 500); } 
        catch (err) { console.error(err); }
    };

    const handleClearLogs = () => {
        setLogsClearedTime(Date.now()); // Just hide old logs
    };

    const handleRefreshChart = () => {
        refreshBotData(); // Re-fetch data
    };

    const isRunning = botStatus?.status === 'running';

    return (
        <div className="trading-bot-container">
            <h2 className="header">Live Trading Bot</h2>
            
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
                     {/* ... (Form Inputs Same as Before) ... */}
                     {/* (Keep your existing form JSX here) */}
                     {/* ... */}
                     
                     <div className="form-actions">
                        {!isRunning ? (
                             <button type="submit" className={`button-start ${formConfig.tradingMode === 'live' ? 'live-btn' : ''}`} disabled={botLoading}>
                                {botLoading ? 'Deploying...' : (formConfig.tradingMode === 'live' ? '🚀 Launch Live' : '🤖 Launch Paper')}
                            </button>
                        ) : (
                            <button type="button" onClick={handleStop} className="button-stop-main" disabled={botLoading}>
                                {botLoading ? 'Stopping...' : 'Stop Bot'}
                            </button>
                        )}
                     </div>
                </form>
            </div>

            {error && <div className="error-banner">{error}</div>}

            {(botStatus?.isConfigured || isRunning) && (
                <>
                    <div className="bot-card status-dashboard">
                         <MetricsDisplay metrics={botStatus.performanceMetrics} />
                    </div>
                    
                    <div className="bot-card chart-panel">
                        <div className="card-header-row" style={{marginBottom: '10px', display:'flex', justifyContent:'space-between'}}>
                            <h3 className="card-title" style={{margin:0}}>Live Chart</h3>
                            {/* 🚀 NEW: Chart Refresh Button */}
                            <button onClick={handleRefreshChart} style={{background:'transparent', border:'none', color:'#4ade80', cursor:'pointer', fontSize:'0.8rem'}}>
                                ↻ Refresh Chart
                            </button>
                        </div>
                        <LiveTradingChart candles={botStatus.candles || []} trades={botStatus.trades || []} />
                    </div>

                    <div className="bot-card logs-panel">
                        <div className="card-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 className="card-title" style={{ margin: 0 }}>Logs</h3>
                            <div style={{display:'flex', gap:'10px'}}>
                                <button onClick={refreshBotData} className="clear-logs-btn" style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                    Refresh
                                </button>
                                {/* 🚀 NEW: Clear Button */}
                                <button onClick={handleClearLogs} className="clear-logs-btn" style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                    Clear
                                </button>
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
