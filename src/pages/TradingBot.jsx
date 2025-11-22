// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: Includes Live Chart, Strategy Loading, and Mode Switching.

import React, { useState, useEffect, useRef, useContext } from "react";
import { useBot } from '../hooks/useBot.js';
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
    const { botStatus, logs, loading: botLoading, error, startBot, stopBot, refreshBotData } = useBot();
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
    const [winnersList, setWinnersList] = useState([]);
    const [selectedWinnerId, setSelectedWinnerId] = useState("");
    const logsEndRef = useRef(null);

    // 1. Fetch Winners on Mount
    useEffect(() => {
        const fetchWinners = async () => {
            try {
                const res = await fetch('/api/bot/winners');
                if (res.ok) {
                    const data = await res.json();
                    setWinnersList(data);
                }
            } catch (e) { console.error("Error fetching winners:", e); }
        };
        fetchWinners();
    }, []);

    // 2. Auto-scroll Logs
    useEffect(() => {
        if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    // 3. Default Strategy Selection
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

    // 4. Live Polling
    useEffect(() => {
        if (botStatus?.status === 'running') {
            const interval = setInterval(refreshBotData, 10000); // Poll faster (10s) for chart
            return () => clearInterval(interval);
        }
    }, [botStatus?.status, refreshBotData]);

    // --- Handlers ---

    const handleSetupSelect = (setupId) => {
        setSelectedSetupId(setupId);
        setSelectedWinnerId(""); // Clear winner selection
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
        setSelectedSetupId(""); // Clear setup selection

        if (!filename) return;

        const selectedWinner = winnersList.find(w => w.id === filename);
        if (selectedWinner && selectedWinner.config) {
            const winnerConfig = selectedWinner.config;
            if (winnerConfig.combo_strategies) {
                const codes = winnerConfig.combo_strategies.split(',');
                setFormConfig(prev => ({
                    ...prev,
                    isCombo: true,
                    comboConfig: { strategyCodes: codes, combinationRule: winnerConfig.hybridMode || 'REGIME' },
                    params: winnerConfig // Inject the specific winning params
                }));
            }
        }
    };

    const handleStart = async (e) => {
        e.preventDefault();
        if (formConfig.tradingMode === 'live') {
            const confirm = window.confirm("⚠️ WARNING: You are about to start REAL MONEY trading. \n\nAre you sure you want to proceed?");
            if (!confirm) return;
        }
        try { await startBot(formConfig); } 
        catch (err) { alert(`Failed to start bot: ${err.message}`); }
    };

    const handleStop = async () => {
        try { await stopBot(); } 
        catch (err) { alert(`Failed to stop bot: ${err.message}`); }
    };

    if (optionsLoading || setupsLoading) {
        return <div className="loading-container">Loading Bot Configuration...</div>;
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
                    {isRunning ? 'Bot is Live' : 'Deploy a Strategy'}
                    <span className={`mode-badge ${formConfig.tradingMode}`}>
                        {formConfig.tradingMode === 'paper' ? 'PAPER TRADING' : 'REAL MONEY'}
                    </span>
                </h3>
                
                <form onSubmit={handleStart} className="bot-form">
                    {!isRunning && (
                        <div className="mode-switch-container">
                            <label className="switch-label">Trading Mode:</label>
                            <div className="mode-toggle">
                                <button 
                                    type="button"
                                    className={formConfig.tradingMode === 'paper' ? 'active' : ''}
                                    onClick={() => setFormConfig(p => ({...p, tradingMode: 'paper'}))}
                                >
                                    Paper (Simulated)
                                </button>
                                <button 
                                    type="button"
                                    className={formConfig.tradingMode === 'live' ? 'active danger' : ''}
                                    onClick={() => setFormConfig(p => ({...p, tradingMode: 'live'}))}
                                >
                                    Real Money
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="selectors-row" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                        <label className="setup-selector" style={{ flex: 1 }}>Load Saved Setup (DB)
                            <select value={selectedSetupId} onChange={(e) => handleSetupSelect(e.target.value)} disabled={isRunning || !!selectedWinnerId}>
                                <option value="">-- Manual Configuration --</option>
                                {setups.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </label>

                        <label className="setup-selector" style={{ flex: 1 }}>Load Optimized Strategy (ML)
                            <select value={selectedWinnerId} onChange={handleWinnerSelect} disabled={isRunning || !!selectedSetupId} style={{ borderColor: selectedWinnerId ? '#3b82f6' : '#444' }}>
                                <option value="">-- Select a Winner --</option>
                                {winnersList.map(w => (
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
                    
                    <div className="strategy-details-display">
                        <h4>Strategy Configuration:</h4>
                        {formConfig.isCombo ? (
                            <div>
                                <p><strong>Type:</strong> Combined Strategy</p>
                                <p><strong>Rule:</strong> {formConfig.comboConfig.combinationRule}</p>
                                <ul>
                                    {formConfig.comboConfig.strategyCodes.map(code => {
                                        const s = availableStrategies.find(s => s.code === code);
                                        return <li key={code} title={s?.name}>{s?.name || code}</li>;
                                    })}
                                </ul>
                                {formConfig.params && Object.keys(formConfig.params).length > 0 && (
                                    <div style={{marginTop:'10px', fontSize:'0.85em', color:'#aaa'}}>
                                        <strong>Optimized Params:</strong>
                                        <pre>{JSON.stringify(formConfig.params, null, 2)}</pre>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p><strong>Type:</strong> {findStrategyName(formConfig.strategyId)}</p>
                        )}
                    </div>
                    
                    <div className="form-actions">
                        {!isRunning && (
                            <button type="submit" className={`button-start ${formConfig.tradingMode === 'live' ? 'live-btn' : ''}`} disabled={botLoading}>
                                {botLoading ? 'Deploying...' : (formConfig.tradingMode === 'live' ? '🚀 Start Live Trading' : '🤖 Start Paper Bot')}
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {isRunning && <button onClick={handleStop} className="button-stop-main" disabled={botLoading}>{botLoading ? 'Stopping...' : 'Stop Running Bot'}</button>}
            {error && <div className="error-banner">{error}</div>}

            {botStatus?.isConfigured && (
                <>
                    <div className="bot-card status-dashboard">
                        <div className="status-header">
                            <h3 className="card-title">Live Status</h3>
                            <div className={`status-indicator ${botStatus.status}`}>{botStatus.status}</div>
                        </div>
                        <div className="status-details">
                            <p><strong>Strategy:</strong> {botStatus.isCombo ? `Combo (${botStatus.comboConfig.combinationRule})` : findStrategyName(botStatus.strategyId)}</p>
                            <p><strong>Symbol:</strong> {botStatus.symbol}</p>
                            <p><strong>Timeframe:</strong> {botStatus.timeframe}</p>
                            <p><strong>Current Balance:</strong> <span className="balance-highlight">${botStatus.currentBalance?.toFixed(2)}</span></p>
                            {botStatus.lastTrade && <p><strong>Last Trade:</strong> {new Date(botStatus.lastTrade).toLocaleTimeString()}</p>}
                        </div>
                        <MetricsDisplay metrics={botStatus.performanceMetrics} />
                    </div>
                    
                    {/* 🚀 LIVE CHART PANEL */}
                    <div className="bot-card chart-panel">
                        <h3 className="card-title">Live Market Action</h3>
                        <LiveTradingChart 
                            candles={botStatus.candles || []} 
                            trades={botStatus.trades || []} 
                        />
                    </div>

                    <div className="bot-card logs-panel">
                        <h3 className="card-title">Activity Log</h3>
                        <div className="logs-container">
                            {logs.length > 0 ? logs.map((log, i) => (
                                <div key={i} className={`log-entry log-${log.type}`}>
                                    <span className="log-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    <span className="log-message">{log.message}</span>
                                </div>
                            )) : <p className="no-logs">No activity recorded yet.</p>}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
