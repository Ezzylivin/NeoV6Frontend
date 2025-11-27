// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: Full Support for "Saved Combos" + Golden Strategies + Auto-Polling

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

// --- MAIN COMPONENT ---
export default function TradingBot() {
    const { 
        botStatus, 
        logs, 
        winners: botWinners, 
        loading: botLoading, 
        error, 
        startBot, 
        stopBot, 
        refreshBotData 
    } = useBot();

    const { setups, loading: setupsLoading } = useBacktestSetupFunction();
    const { state: backtestState } = useBacktest();
    const winners = botWinners.length > 0 ? botWinners : (backtestState?.winners || []);

    const { strategies: availableStrategies } = useContext(StrategyContext);
    const [selectedWinnerId, setSelectedWinnerId] = useState("");
    const [selectedSetupId, setSelectedSetupId] = useState("");
    const logsEndRef = useRef(null);

    // 3. Local Form Config
    const [formConfig, setFormConfig] = useState({
        isCombo: false, 
        strategyId: '', 
        comboConfig: { strategyCodes: [], combinationRule: 'AND' },
        symbol: 'BTC-USD', 
        timeframe: '1h',   
        capitalAllocation: 1000,
        tradingMode: 'paper',
        // Defaults to prevent undefined errors
        params: {},
        strategies: [],
        mlMode: 'off'
    });

    // --- Auto-Scroll Logs ---
    useEffect(() => {
        if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    // --- 🚀 AUTO-POLLING (Every 2s) ---
    useEffect(() => {
        let interval;
        if (botStatus?.status === 'running') {
            interval = setInterval(() => {
                refreshBotData(); 
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [botStatus?.status, refreshBotData]);


    // --- HANDLER: Saved Setup (DB) ---
    // 🚀 UPGRADE: Deep Load of Saved Configs
    const handleSetupSelect = (setupId) => {
        setSelectedSetupId(setupId);
        setSelectedWinnerId(""); // Clear winner if selecting saved setup
        
        const setup = setups.find(s => s._id === setupId);
        if (setup) {
            console.log("📂 Loaded Saved Setup:", setup);
            
            setFormConfig(prev => ({
                ...prev,
                // 1. Meta
                symbol: setup.symbol || 'BTC-USD',
                timeframe: setup.timeframe || '1h',
                capitalAllocation: setup.initialBalance || 1000,
                
                // 2. Mode Logic
                isCombo: setup.isCombo || (setup.strategies && setup.strategies.length > 1),
                
                // 3. Strategies
                strategyId: setup.strategyId || '',
                comboConfig: setup.comboConfig || { strategyCodes: [], combinationRule: 'OR' },
                strategies: setup.strategies || [], // Pass the full strategy array if saved
                
                // 4. Parameters & ML
                params: setup.params || {},
                mlMode: setup.mlMode || 'off',
                mlModel: setup.mlModel || '',
                mlThreshold: setup.mlThreshold || 0.5
            }));
        }
    };

    // --- HANDLER: Golden Strategy (ML) ---
    const handleWinnerSelect = (e) => {
        const filename = e.target.value;
        setSelectedWinnerId(filename);
        setSelectedSetupId(""); 

        if (!filename) return;

        const selectedWinner = winners.find(w => w.id === filename);
        if (selectedWinner && selectedWinner.config) {
            const winnerConfig = selectedWinner.config;
            
            // Robust Parsing
            const nameParts = filename.split('_');
            let detectedSymbol = winnerConfig.symbol || 'BTC-USD';
            let detectedTimeframe = winnerConfig.timeframe || '1h';

            if (!winnerConfig.symbol) {
                 if (nameParts.length >= 2 && nameParts[1].includes('-')) detectedSymbol = nameParts[1];
                 if (nameParts.length >= 3 && ['1h','4h','1d'].includes(nameParts[2])) detectedTimeframe = nameParts[2];
            }

            // Determine Strategy Codes
            let codes = [];
            if (typeof winnerConfig.strategies === 'string') {
                codes = winnerConfig.strategies.split(',').map(s => s.trim());
            } else if (Array.isArray(winnerConfig.strategies)) {
                codes = winnerConfig.strategies.map(s => s.code);
            }
            if (Array.isArray(winnerConfig)) { // Handle raw array config
                codes = winnerConfig.map(s => s.code || "unknown");
            }

            console.log("🏆 Loaded Golden Strategy:", { symbol: detectedSymbol, codes });

            setFormConfig(prev => ({
                ...prev,
                isCombo: true,
                comboConfig: { strategyCodes: codes, combinationRule: winnerConfig.hybridMode || 'AND' },
                params: winnerConfig.params || {}, 
                // 🚀 Ensure we pass strategy definitions if available, or let backend reconstruct from codes
                strategies: Array.isArray(winnerConfig.strategies) ? winnerConfig.strategies : [],
                
                symbol: detectedSymbol,    
                timeframe: detectedTimeframe,
                
                // ML Defaults from Winner
                mlMode: winnerConfig.mlMode || (winnerConfig.mlModel ? 'predictions' : 'off'),
                mlModel: winnerConfig.mlModel || '',
                mlThreshold: winnerConfig.mlThreshold || 0.5
            }));
        }
    };

    const handleStart = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!formConfig.symbol || !formConfig.timeframe || !formConfig.capitalAllocation) {
             alert("Please fill in Symbol, Timeframe, and Capital.");
             return;
        }

        if (formConfig.tradingMode === 'live') {
            if (!window.confirm("⚠️ WARNING: Real Money Trading. Proceed?")) return;
        }
        try { await startBot(formConfig); } 
        catch (err) { console.error(err); alert(err.message); }
    };

    const handleStop = async () => {
        try { await stopBot(); } 
        catch (err) { console.error(err); }
    };

    const isRunning = botStatus?.status === 'running';

    const findStrategyName = (id) => {
        if (!id) return "Combo Strategy";
        const s = availableStrategies.find(st => st._id === id);
        return s ? s.name : id;
    };

    return (
        <div className="trading-bot-container">
            <h2 className="header">Live Trading Bot</h2>
            
            {/* CONTROL PANEL */}
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
                        <>
                            <div className="mode-switch-container">
                                <label className="switch-label">Mode:</label>
                                <div className="mode-toggle">
                                    <button type="button" className={formConfig.tradingMode === 'paper' ? 'active' : ''} onClick={() => setFormConfig(p => ({...p, tradingMode: 'paper'}))}>Paper</button>
                                    <button type="button" className={formConfig.tradingMode === 'live' ? 'active danger' : ''} onClick={() => setFormConfig(p => ({...p, tradingMode: 'live'}))}>Real Money</button>
                                </div>
                            </div>

                            <div className="selectors-row">
                                <label className="setup-selector" style={{flex:1}}>
                                    Saved Setups (DB)
                                    <select value={selectedSetupId} onChange={(e) => handleSetupSelect(e.target.value)} disabled={isRunning || !!selectedWinnerId}>
                                        <option value="">-- Select Setup --</option>
                                        {setups.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                    </select>
                                </label>

                                <label className="setup-selector" style={{flex:1}}>
                                    Optimized Strategies (ML)
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
                                <label>Capital ($)<input type="number" value={formConfig.capitalAllocation} onChange={e => setFormConfig(p => ({...p, capitalAllocation: Number(e.target.value)}))} /></label>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className={`button-start ${formConfig.tradingMode === 'live' ? 'live-btn' : ''}`} disabled={botLoading}>
                                    {botLoading ? 'Deploying...' : (formConfig.tradingMode === 'live' ? '🚀 Launch Live' : '🤖 Launch Paper')}
                                </button>
                            </div>
                        </>
                    )}
                    
                    {isRunning && (
                        <div className="running-actions">
                            <button type="button" onClick={handleStop} className="button-stop-main" disabled={botLoading}>
                                {botLoading ? 'Stopping...' : 'Stop Bot'}
                            </button>
                        </div>
                    )}
                </form>
            </div>

            {error && <div className="error-banner">{error}</div>}

            {/* DASHBOARD */}
            {(botStatus?.isConfigured || isRunning) && (
                <>
                    <div className="bot-card status-dashboard">
                         <MetricsDisplay metrics={botStatus.performanceMetrics} />
                    </div>
                    
                    <div className="bot-card chart-panel">
                        <h3 className="card-title">Live Chart</h3>
                        <LiveTradingChart candles={botStatus.candles || []} trades={botStatus.trades || []} />
                    </div>

                    <div className="bot-card logs-panel">
                        <h3 className="card-title">Live Logs</h3>
                        <div className="logs-container">
                            {logs.length > 0 ? logs.map((log, i) => (
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
