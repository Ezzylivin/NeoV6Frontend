// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: Fully integrated with useBot hook & Winners List & Clear Logs

import React, { useState, useEffect, useRef, useContext } from "react";
import { useBot } from '../hooks/useBot.js'; // Hook handles API calls + Auth
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import { useBacktest } from "../hooks/useBacktest.js";
import { StrategyContext } from "../context/StrategyContext.jsx";
import LiveTradingChart from "../components/LiveTradingChart.jsx"; 
import "./TradingBot.css";

const MetricsDisplay = ({ metrics }) => {
    if (!metrics || Object.keys(metrics).length === 0) return <p className="no-metrics">No live metrics yet.</p>;
    
    const formatValue = (key, value) => {
        if (value == null) return "N/A";
        if (typeof value !== "number") return String(value);
        if (key.toLowerCase().includes("win rate")) return `${value.toFixed(2)}%`;
        if (key.toLowerCase().includes("profit") || key.toLowerCase().includes("balance") || key.toLowerCase().includes("drawdown")) return `$${value.toFixed(2)}`;
        if (key.toLowerCase().includes("profit factor")) return value.toFixed(2);
        return value;
    };

    const keyMetrics = {
        "Total Profit": metrics.totalProfit,
        "Total Trades": metrics.totalTrades,
        "Win Rate": metrics.winRate,
        "Max Drawdown": metrics.maxDrawdown,
        "Profit Factor": metrics.profitFactor,
        "Current Balance": metrics.currentBalance
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
    // 1. Hook Integration: Get everything from useBot
    const { 
        botStatus, 
        logs, 
        winners, // <--- Automatically fetched by hook
        loading: botLoading, 
        error, 
        startBot, 
        stopBot, 
        refreshBotData 
    } = useBot();

    const { setups, loading: setupsLoading } = useBacktestSetupFunction();
    const { state: backtestState } = useBacktest();
    const { options: backtestOptions, loading: backtestLoading } = backtestState;
    const optionsLoading = backtestLoading === 'initial';
    const { strategies: availableStrategies } = useContext(StrategyContext);

    const [formConfig, setFormConfig] = useState({
        isCombo: false, 
        strategyId: '', 
        comboConfig: { strategyCodes: [], combinationRule: 'OR' },
        symbol: '', 
        timeframe: '1h', 
        capitalAllocation: 1000,
        tradingMode: 'paper'
    });

    const [selectedSetupId, setSelectedSetupId] = useState('');
    const [selectedWinnerId, setSelectedWinnerId] = useState("");
    const logsEndRef = useRef(null);

    // 2. Auto-scroll Logs
    useEffect(() => {
        if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    // 3. Default Config Initialization
    useEffect(() => {
        if (availableStrategies?.length > 0 && !formConfig.strategyId && !selectedSetupId && !selectedWinnerId) {
            const firstStrategy = availableStrategies[0];
            setFormConfig(prev => ({
                ...prev,
                strategyId: firstStrategy?._id || '',
                symbol: backtestOptions.symbols?.[0] || 'BTC-USD',
                isCombo: firstStrategy?.isCombo || false,
                comboConfig: firstStrategy?.comboConfig || { strategyCodes: [], combinationRule: 'OR' },
            }));
        }
    }, [availableStrategies, backtestOptions, formConfig.strategyId, selectedSetupId, selectedWinnerId]);

    // 4. Live Polling (10s refresh when running)
    useEffect(() => {
        if (botStatus?.status === 'running') {
            const interval = setInterval(refreshBotData, 10000);
            return () => clearInterval(interval);
        }
    }, [botStatus?.status, refreshBotData]);

    // --- Handlers ---

    const handleSetupSelect = (setupId) => {
        setSelectedSetupId(setupId);
        setSelectedWinnerId(""); 
        const setup = setups.find(s => s._id === setupId);
        if (setup) {
            setFormConfig(prev => ({
                ...prev,
                isCombo: setup.isCombo,
                strategyId: setup.strategyId || '',
                comboConfig: setup.comboConfig || { strategyCodes: [], combinationRule: 'OR' },
                symbol: setup.symbol,
                timeframe: setup.timeframe,
                capitalAllocation: 1000,
            }));
        }
    };

   const handleWinnerSelect = (e) => {
        const filename = e.target.value;
        setSelectedWinnerId(filename);
        setSelectedSetupId(""); 

        if (!filename) return;

        // 1. Find the winner data
        const selectedWinner = winners.find(w => w.id === filename);
        
        if (selectedWinner && selectedWinner.config) {
            const winnerConfig = selectedWinner.config;
            
            // 2. 🚀 PARSE FILENAME for Symbol & Timeframe
            // Format is usually: winner_SYMBOL_TIMEFRAME_TYPE_DATE.json
            // Example: winner_BTC-USD_1d_FINAL_1_2025.json
            const nameParts = filename.split('_');
            
            // Default fallbacks if parsing fails
            let detectedSymbol = 'BTC-USD';
            let detectedTimeframe = '1h';

            if (nameParts.length >= 3) {
                detectedSymbol = nameParts[1]; // "BTC-USD"
                detectedTimeframe = nameParts[2]; // "1d" or "1h"
            }

            // 3. Parse Strategies
            const stratString = selectedWinner.name.split('(')[0].trim();
            const codes = stratString.split(',').map(s => s.trim());
            
            const finalCodes = winnerConfig.combo_strategies 
                ? winnerConfig.combo_strategies.split(',') 
                : codes;

            // 4. Update Form State
            setFormConfig(prev => ({
                ...prev,
                isCombo: true,
                comboConfig: { strategyCodes: finalCodes, combinationRule: winnerConfig.hybridMode || 'REGIME' },
                params: winnerConfig, 
                symbol: detectedSymbol,    // <--- 🚀 Now Dynamic
                timeframe: detectedTimeframe // <--- 🚀 Now Dynamic
            }));
        }
    };

    const handleStart = async (e) => {
        e.preventDefault();
        if (formConfig.tradingMode === 'live') {
            if (!window.confirm("⚠️ WARNING: Real Money Trading. Proceed?")) return;
        }
        try { await startBot(formConfig); } 
        catch (err) { /* Error handled by hook state */ }
    };

    const handleStop = async () => {
        try { await stopBot(); } 
        catch (err) { /* Error handled by hook state */ }
    };

    const handleClearLogs = () => {
        // Note: This just clears the local view until next refresh. 
        // To clear backend logs, you'd need an API endpoint like DELETE /api/bot/logs
        // For now, we can just force a refresh or maybe implement local clearing if needed,
        // but usually 'Logs' implies persistent history.
        // Let's assume we just want to refresh data to ensure we see latest.
        refreshBotData(); 
    };

    if (optionsLoading || setupsLoading) {
        return <div className="loading-container">Loading Configuration...</div>;
    }

    const isRunning = botStatus?.status === 'running';

    const findStrategyName = (id) => {
        const strat = availableStrategies.find(s => s._id === id);
        return strat?.name || 'Unnamed Strategy';
    };

    return (
        <div className="trading-bot-container">
            <h2 className="header">Live Trading Bot</h2>
            
            <div className="bot-card control-panel">
                <h3 className="card-title">
                    {isRunning ? 'Bot is Live' : 'Deploy Strategy'}
                    <span className={`mode-badge ${formConfig.tradingMode}`}>
                        {formConfig.tradingMode === 'paper' ? 'PAPER' : 'LIVE'}
                    </span>
                </h3>
                
                <form onSubmit={handleStart} className="bot-form">
                    {!isRunning && (
                        <div className="mode-switch-container">
                            <label className="switch-label">Mode:</label>
                            <div className="mode-toggle">
                                <button 
                                    type="button" 
                                    className={formConfig.tradingMode === 'paper' ? 'active' : ''}
                                    onClick={() => setFormConfig(p => ({...p, tradingMode: 'paper'}))}
                                >Paper</button>
                                <button 
                                    type="button" 
                                    className={formConfig.tradingMode === 'live' ? 'active danger' : ''}
                                    onClick={() => setFormConfig(p => ({...p, tradingMode: 'live'}))}
                                >Real Money</button>
                            </div>
                        </div>
                    )}

                    <div className="selectors-row" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                        <label className="setup-selector" style={{ flex: 1 }}>Saved Setups (DB)
                            <select value={selectedSetupId} onChange={(e) => handleSetupSelect(e.target.value)} disabled={isRunning || !!selectedWinnerId}>
                                <option value="">-- Select Setup --</option>
                                {setups.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </label>

                        <label className="setup-selector" style={{ flex: 1 }}>Optimized Strategies (ML)
                            <select value={selectedWinnerId} onChange={handleWinnerSelect} disabled={isRunning || !!selectedSetupId} style={{ borderColor: selectedWinnerId ? '#3b82f6' : '#444' }}>
                                <option value="">-- Select Winner --</option>
                                {winners && winners.map(w => (
                                    <option key={w.id} value={w.id}>🏆 {w.name}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    
                    <div className="form-grid">
                        <label>Symbol<input value={formConfig.symbol} disabled /></label>
                        <label>Timeframe<input value={formConfig.timeframe} disabled /></label>
                        <label>Capital ($)<input type="number" value={formConfig.capitalAllocation} onChange={e => setFormConfig(p => ({...p, capitalAllocation: Number(e.target.value)}))} disabled={isRunning} /></label>
                    </div>

                    <div className="form-actions">
                        {!isRunning && (
                            <button type="submit" className={`button-start ${formConfig.tradingMode === 'live' ? 'live-btn' : ''}`} disabled={botLoading}>
                                {botLoading ? 'Deploying...' : (formConfig.tradingMode === 'live' ? '🚀 Launch Live' : '🤖 Launch Paper')}
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {isRunning && <button onClick={handleStop} className="button-stop-main" disabled={botLoading}>{botLoading ? 'Stopping...' : 'Stop Bot'}</button>}
            {error && <div className="error-banner">{error}</div>}

            {botStatus?.isConfigured && (
                <>
                    <div className="bot-card status-dashboard">
                        <div className="status-header">
                            <h3 className="card-title">Status</h3>
                            <div className={`status-indicator ${botStatus.status}`}>{botStatus.status}</div>
                        </div>
                        <div className="status-details">
                            <p><strong>Strategy:</strong> {botStatus.isCombo ? `Combo` : findStrategyName(botStatus.strategyId)}</p>
                            <p><strong>Balance:</strong> <span className="balance-highlight">${botStatus.currentBalance?.toFixed(2)}</span></p>
                        </div>
                        <MetricsDisplay metrics={botStatus.performanceMetrics} />
                    </div>
                    
                    <div className="bot-card chart-panel">
                        <h3 className="card-title">Live Chart</h3>
                        <LiveTradingChart candles={botStatus.candles || []} trades={botStatus.trades || []} />
                    </div>

                    <div className="bot-card logs-panel">
                        <div className="card-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 className="card-title" style={{ margin: 0 }}>Logs</h3>
                            <button onClick={handleClearLogs} className="clear-logs-btn" style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                Refresh Logs
                            </button>
                        </div>
                        <div className="logs-container">
                            {logs.length > 0 ? logs.map((log, i) => (
                                <div key={i} className={`log-entry log-${log.type}`}>
                                    <span className="log-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    <span className="log-message">{log.message}</span>
                                </div>
                            )) : <p className="no-logs">No logs yet.</p>}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
