// File: src/pages/TradingBot.jsx
// FINAL VERSION: This is the complete user interface for controlling and monitoring the live trading bot.

import React, { useState, useEffect } from "react";
import { useBot } from '../hooks/useBot.js';
import { useBacktest } from "../hooks/useBacktest.js"; // Re-used to get strategy and symbol lists
import "./TradingBot.css"; // We'll need some specific styles for this page

// --- Metrics Display Component (Re-used from Backtests page) ---
const MetricsDisplay = ({ metrics }) => {
    if (!metrics || Object.keys(metrics).length === 0) {
        return <p className="no-metrics">No live metrics yet.</p>;
    }
    const formatValue = (key, value) => {
        if (typeof value !== 'number') return String(value || 'N/A');
        if (key.toLowerCase().includes('win rate')) return `${value.toFixed(2)}%`;
        if (key.toLowerCase().includes('profit')) return `$${value.toFixed(2)}`;
        return value;
    };
    const keyMetrics = {
        "Total Profit": metrics.totalProfit,
        "Total Trades": metrics.totalTrades,
        "Win Rate": metrics.winRate,
    };
    return (
        <div className="metrics-grid">
            {Object.entries(keyMetrics).map(([key, value]) => (
                <div key={key} className="metric-item">
                    <span className="metric-label">{key}</span>
                    <span className="metric-value">{formatValue(key, value)}</span>
                </div>
            ))}
        </div>
    );
};


export default function TradingBot() {
    // --- Hooks ---
    const { botStatus, logs, loading, error, startBot, stopBot, refreshBotData } = useBot();
    const { options: backtestOptions, initialLoading: optionsLoading } = useBacktest();

    // --- State for the configuration form ---
    const [formConfig, setFormConfig] = useState({
        strategyId: '',
        symbol: '',
        timeframe: '1h',
        capitalAllocation: 1000,
    });

    // --- Effects ---
    // Pre-fill the form with default values once the strategy options are loaded
    useEffect(() => {
        if (backtestOptions.strategies?.length > 0 && !formConfig.strategyId) {
            setFormConfig(prev => ({
                ...prev,
                strategyId: backtestOptions.strategies[0]._id,
                symbol: backtestOptions.symbols[0] || 'BTC-USD',
            }));
        }
    }, [backtestOptions, formConfig.strategyId]);

    // Set up a poller to refresh bot data periodically when it's running
    useEffect(() => {
        if (botStatus?.status === 'running') {
            const interval = setInterval(() => {
                refreshBotData();
            }, 30 * 1000); // Refresh every 30 seconds
            return () => clearInterval(interval);
        }
    }, [botStatus?.status, refreshBotData]);


    // --- Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleStart = async (e) => {
        e.preventDefault();
        if (!formConfig.strategyId) {
            alert("Please select a strategy.");
            return;
        }
        try {
            await startBot(formConfig);
        } catch (err) {
            // The hook will set the error state, but we can also alert the user
            alert(`Failed to start bot: ${err.message}`);
        }
    };

    const handleStop = async () => {
        try {
            await stopBot();
        } catch (err) {
            alert(`Failed to stop bot: ${err.message}`);
        }
    };
    
    // --- Render Logic ---
    if (optionsLoading) {
        return <div className="loading-container">Loading bot configuration...</div>;
    }

    const isRunning = botStatus?.status === 'running';

    return (
        <div className="trading-bot-container">
            <h2 className="header">Live Trading Bot</h2>

            {/* --- Control Panel --- */}
            <div className="bot-card control-panel">
                <h3 className="card-title">{isRunning ? 'Bot is Live' : 'Deploy a Strategy'}</h3>
                {backtestOptions.strategies?.length === 0 ? (
                     <p className="no-strategies-warning">You haven't created any strategies yet. Please go to the "Strategies" page to create one first.</p>
                ) : (
                    <form onSubmit={handleStart} className="bot-form">
                        <div className="form-grid">
                            <label>
                                Strategy to Deploy
                                <select name="strategyId" value={formConfig.strategyId} onChange={handleChange} disabled={isRunning}>
                                    {backtestOptions.strategies.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </select>
                            </label>
                            <label>
                                Symbol
                                <select name="symbol" value={formConfig.symbol} onChange={handleChange} disabled={isRunning}>
                                    {backtestOptions.symbols.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </label>
                            <label>
                                Timeframe
                                <select name="timeframe" value={formConfig.timeframe} onChange={handleChange} disabled={isRunning}>
                                    {backtestOptions.timeframes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </label>
                            <label>
                                Capital Allocation ($)
                                <input type="number" name="capitalAllocation" value={formConfig.capitalAllocation} onChange={handleChange} disabled={isRunning} />
                            </label>
                        </div>
                        <div className="form-actions">
                            {isRunning ? (
                                <button type="button" onClick={handleStop} className="button-stop" disabled={loading}>
                                    {loading ? 'Stopping...' : 'Stop Bot'}
                                </button>
                            ) : (
                                <button type="submit" className="button-start" disabled={loading}>
                                    {loading ? 'Starting...' : 'Start Bot'}
                                </button>
                            )}
                        </div>
                    </form>
                )}
            </div>

            {error && <div className="error-banner">{error}</div>}

            {/* --- Live Status and Metrics --- */}
            {botStatus?.isConfigured && (
                <div className="bot-card status-dashboard">
                    <div className="status-header">
                        <h3 className="card-title">Live Status</h3>
                        <div className={`status-indicator ${botStatus.status}`}>
                            {botStatus.status}
                        </div>
                    </div>
                    <div className="status-details">
                        <p><strong>Symbol:</strong> {botStatus.symbol}</p>
                        <p><strong>Timeframe:</strong> {botStatus.timeframe}</p>
                        <p><strong>Current Balance:</strong> ${botStatus.currentBalance?.toFixed(2)}</p>
                         <p><strong>Initial Capital:</strong> ${botStatus.capitalAllocation?.toFixed(2)}</p>
                    </div>
                    <MetricsDisplay metrics={botStatus.performanceMetrics} />
                </div>
            )}

            {/* --- Activity Log --- */}
            {botStatus?.isConfigured && (
                 <div className="bot-card logs-panel">
                    <h3 className="card-title">Activity Log</h3>
                    <div className="logs-container">
                        {logs.length > 0 ? (
                            logs.map((log, index) => (
                                <div key={index} className={`log-entry log-${log.type}`}>
                                    <span className="log-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    <span className="log-message">{log.message}</span>
                                </div>
                            ))
                        ) : (
                            <p className="no-logs">No activity recorded yet. Start the bot to see its actions.</p>
                        )}
                    </div>
                 </div>
            )}
        </div>
    );
}
