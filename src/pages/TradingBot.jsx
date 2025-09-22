// File: src/pages/TradingBot.jsx
// FINAL VERSION: This is the complete UI for deploying and monitoring both single and combined strategy bots.

import React, { useState, useEffect } from "react";
import { useBot } from '../hooks/useBot.js';
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx"; // FIXED import for loading saved "blueprints"
import { useBacktest } from "../hooks/useBacktest.js"; 
import "./TradingBot.css";

// --- Metrics Display Component (Re-used from Backtests page) ---
const MetricsDisplay = ({ metrics }) => {
    if (!metrics || Object.keys(metrics).length === 0) return <p className="no-metrics">No live metrics yet.</p>;
    const formatValue = (key, value) => {
        if (typeof value !== 'number') return String(value || 'N/A');
        if (key.toLowerCase().includes('win rate')) return `${value.toFixed(2)}%`;
        if (key.toLowerCase().includes('profit')) return `$${value.toFixed(2)}`;
        return value;
    };
    const keyMetrics = { "Total Profit": metrics.totalProfit, "Total Trades": metrics.totalTrades, "Win Rate": metrics.winRate };
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
    const { setups, loading: setupsLoading } = useBacktestSetupFunction(); // FIXED hook usage
    const { options: backtestOptions, initialLoading: optionsLoading } = useBacktest();

    // --- State for the unified configuration form ---
    const [formConfig, setFormConfig] = useState({
        isCombo: false,
        strategyId: '',
        comboConfig: { strategyCodes: [], combinationRule: 'OR' },
        symbol: '',
        timeframe: '1h',
        capitalAllocation: 1000,
    });
    const [selectedSetupId, setSelectedSetupId] = useState('');

    // --- Effects ---
    // Pre-fill the form with defaults once options are loaded
    useEffect(() => {
        if (backtestOptions.strategies?.length > 0 && !formConfig.strategyId && !selectedSetupId) {
            setFormConfig(prev => ({
                ...prev,
                strategyId: backtestOptions.strategies[0]._id,
                symbol: backtestOptions.symbols[0] || 'BTC-USD',
            }));
        }
    }, [backtestOptions, formConfig.strategyId, selectedSetupId]);

    // Refresh bot data periodically when it's running
    useEffect(() => {
        if (botStatus?.status === 'running') {
            const interval = setInterval(refreshBotData, 30 * 1000);
            return () => clearInterval(interval);
        }
    }, [botStatus?.status, refreshBotData]);

    // --- Handlers ---
    const handleSetupSelect = (setupId) => {
        setSelectedSetupId(setupId);
        const setup = setups.find(s => s._id === setupId);
        if (setup) {
            // Populate the form with the data from the saved setup "blueprint"
            setFormConfig({
                isCombo: setup.isCombo,
                strategyId: setup.strategyId || '',
                comboConfig: setup.comboConfig || { strategyCodes: [], combinationRule: 'OR' },
                symbol: setup.symbol,
                timeframe: setup.timeframe,
                capitalAllocation: 1000, // Default capital for now
            });
        } else {
            // Reset to default if "Select a setup" is chosen
            setSelectedSetupId('');
        }
    };

    const handleStart = async (e) => {
        e.preventDefault();
        try {
            await startBot(formConfig);
        } catch (err) {
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
    
    if (optionsLoading || setupsLoading) {
        return <div className="loading-container">Loading Bot Configuration...</div>;
    }

    const isRunning = botStatus?.status === 'running';

    return (
        <div className="trading-bot-container">
            <h2 className="header">Live Trading Bot</h2>

            {/* --- Unified Control Panel --- */}
            <div className="bot-card control-panel">
                <h3 className="card-title">{isRunning ? 'Bot is Live' : 'Deploy a Strategy'}</h3>
                <form onSubmit={handleStart} className="bot-form">
                    <label className="setup-selector">
                        Load Saved Setup
                        <select value={selectedSetupId} onChange={(e) => handleSetupSelect(e.target.value)} disabled={isRunning}>
                            <option value="">-- Manual Configuration --</option>
                            {setups.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                    </label>
                    
                    {/* The rest of the form is now driven by the selected setup */}
                    <div className="form-grid">
                        <label>Symbol<input value={formConfig.symbol} disabled /></label>
                        <label>Timeframe<input value={formConfig.timeframe} disabled /></label>
                        <label>Capital ($)<input type="number" value={formConfig.capitalAllocation} onChange={(e) => setFormConfig(p=>({...p, capitalAllocation: e.target.value}))} disabled={isRunning} /></label>
                    </div>

                    <div className="strategy-details-display">
                        <h4>Strategy Configuration:</h4>
                        {formConfig.isCombo ? (
                            <div>
                                <p><strong>Type:</strong> Combined Strategy</p>
                                <p><strong>Rule:</strong> {formConfig.comboConfig.combinationRule}</p>
                                <ul>
                                    {formConfig.comboConfig.strategyCodes.map(code => <li key={code}>{backtestOptions.strategies.find(s=>s.code === code)?.name || code}</li>)}
                                </ul>
                            </div>
                        ) : (
                            <p><strong>Type:</strong> {backtestOptions.strategies.find(s => s._id === formConfig.strategyId)?.name}</p>
                        )}
                    </div>

                    <div className="form-actions">
                        {!isRunning && <button type="submit" className="button-start" disabled={loading}>{loading ? 'Deploying...' : 'Deploy Bot'}</button>}
                    </div>
                </form>
            </div>

            {isRunning && <button onClick={handleStop} className="button-stop-main" disabled={loading}>{loading ? 'Stopping...' : 'Stop Running Bot'}</button>}
            
            {error && <div className="error-banner">{error}</div>}

            {/* --- Live Status and Activity --- */}
            {botStatus?.isConfigured && (
                <>
                    <div className="bot-card status-dashboard">
                        <div className="status-header">
                            <h3 className="card-title">Live Status</h3>
                            <div className={`status-indicator ${botStatus.status}`}>{botStatus.status}</div>
                        </div>
                        <div className="status-details">
                             <p><strong>Strategy:</strong> {botStatus.isCombo ? `Combo (${botStatus.comboConfig.combinationRule})` : backtestOptions.strategies.find(s => s._id === botStatus.strategyId)?.name}</p>
                             <p><strong>Symbol:</strong> {botStatus.symbol}</p>
                             <p><strong>Timeframe:</strong> {botStatus.timeframe}</p>
                             <p><strong>Current Balance:</strong> ${botStatus.currentBalance?.toFixed(2)}</p>
                        </div>
                        <MetricsDisplay metrics={botStatus.performanceMetrics} />
                    </div>

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
                            ) : (<p className="no-logs">No activity recorded yet.</p>)}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
