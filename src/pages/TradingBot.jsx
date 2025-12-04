// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: v28.0 - Full Integration (Saved Setups + Golden Strategies + Live Logic)

import React, { useState, useEffect, useRef, useContext } from "react";
import { useBot } from '../hooks/useBot.js';
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx"; // Hook for DB Setups
import { useBacktest } from "../hooks/useBacktest.js"; // Hook for Golden Strategies
import { StrategyContext } from "../context/StrategyContext.jsx";
import LiveTradingChart from "../components/LiveTradingChart.jsx"; 
import "./TradingBot.css";

// --- HELPER: Robustly Find Metrics ---
const getRobustMetrics = (status) => {
    const pm = status?.performanceMetrics || {};
    
    const totalProfit = pm.totalProfit ?? status?.totalProfit ?? 0;
    const totalTrades = pm.totalTrades ?? status?.trades?.length ?? 0;
    const currentBalance = pm.currentBalance ?? status?.currentBalance ?? status?.capitalAllocation ?? 0;
    
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

// --- METRICS DISPLAY ---
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
    // 1. Bot State
    const { 
        botStatus, logs, winners: botWinners, loading: botLoading, 
        error, startBot, stopBot, refreshBotData 
    } = useBot();

    // 2. Data Sources
    const { setups } = useBacktestSetupFunction(); // DB Saved Setups
    const { state: backtestState } = useBacktest(); // ML Golden Files
    const winners = (botWinners && botWinners.length > 0) ? botWinners : (backtestState?.winners || []);
    
    const logsEndRef = useRef(null);

    // 3. Local State
    const [selectedWinnerId, setSelectedWinnerId] = useState("");
    const [selectedSetupId, setSelectedSetupId] = useState("");
    
    const [formConfig, setFormConfig] = useState({
        isCombo: false, strategyId: '', comboConfig: { strategyCodes: [], combinationRule: 'AND' },
        symbol: 'BTC-USD', timeframe: '1h', capitalAllocation: 1000, tradingMode: 'paper',
        params: {}, strategies: [], mlMode: 'off', mlModel: '', mlThreshold: 0.5
    });

    const [logsClearedTime, setLogsClearedTime] = useState(0);
    const visibleLogs = logs.filter(log => new Date(log.timestamp).getTime() > logsClearedTime);

    // Auto-Scroll Logs
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

    // --- HANDLER 1: Load Saved Setup (DB) ---
    const handleSetupSelect = (e) => {
        const setupId = e.target.value;
        setSelectedSetupId(setupId);
        setSelectedWinnerId(""); // Clear Golden dropdown
        
        const setup = setups.find(s => s._id === setupId);
        if (setup) {
            console.log("📂 Loaded Saved Setup:", setup);
            
            // Robust Combo Detection
            const isCombo = setup.isCombo || (setup.strategies && setup.strategies.length > 1);
            
            // Ensure Combo Config Exists
            let comboConfig = setup.comboConfig;
            if (!comboConfig && isCombo) {
                comboConfig = {
                    strategyCodes: setup.strategies.map(s => s.code),
                    combinationRule: setup.params?.hybridMode || 'AND'
                };
            }

            setFormConfig(prev => ({
                ...prev,
                symbol: setup.symbol,
                timeframe: setup.timeframe,
                capitalAllocation: setup.initialBalance || 1000,
                isCombo: isCombo,
                strategies: setup.strategies || [],
                comboConfig: comboConfig || { strategyCodes: [], combinationRule: 'OR' },
                params: setup.params || {},
                mlMode: setup.mlMode || 'off',
                mlModel: setup.mlModel || '',
                mlThreshold: setup.mlThreshold || 0.5
            }));
        }
    };

    // --- HANDLER 2: Load Golden Strategy (ML) ---
    const handleWinnerSelect = (e) => {
        const filename = e.target.value;
        setSelectedWinnerId(filename);
        setSelectedSetupId(""); // Clear DB dropdown

        const selectedWinner = winners.find(w => w.id === filename);
        if (selectedWinner && selectedWinner.config) {
            const config = selectedWinner.config;
            console.log("🏆 Loaded Golden Strategy:", config);

            let symbol = config.symbol || "BTC-USD";
            let timeframe = config.timeframe || "1h";

            // Parse Filename for Symbol/Timeframe if missing
            if(!config.symbol && filename.includes('_')) {
                 const parts = filename.split('_');
                 if(parts[1]) symbol = parts[1];
                 if(parts[2] && ['1h','4h','1d'].includes(parts[2])) timeframe = parts[2];
            }

            // Parse Strategies (Handle Legacy Lists vs Objects)
            let strategies = [];
            if(Array.isArray(config.strategies)) strategies = config.strategies;
            else if(Array.isArray(config)) strategies = config;
            
            // Normalize to Object format
            strategies = strategies.map(s => ({
                code: s.code || s.trend_strategy || "unknown",
                params: s.params || s
            }));

            // Auto-Detect ML
            let mlMode = config.mlMode || "off";
            let mlModel = config.mlModel || "";
            if(config.params?.mlModel) mlModel = config.params.mlModel;
            if(mlModel && mlMode === "off") mlMode = "predictions";

            setFormConfig(prev => ({
                ...prev,
                isCombo: true,
                symbol, timeframe,
                strategies: strategies,
                comboConfig: { 
                    strategyCodes: strategies.map(s=>s.code), 
                    combinationRule: config.params?.hybridMode || 'REGIME' 
                },
                params: config.params || {},
                mlMode: mlMode, 
                mlModel: mlModel || 'btc_1h_xgboost_model',
                mlThreshold: config.mlThreshold || 0.5
            }));
        }
    };

    const handleStart = async (e) => {
        e.preventDefault();
        if (formConfig.tradingMode === 'live' && !window.confirm("⚠️ Real Money Trading. Proceed?")) return;
        
        setLogsClearedTime(0); 
        try { 
            await startBot(formConfig); 
            setTimeout(refreshBotData, 1000);
        } catch (err) { console.error(err); alert(err.message); }
    };

    const handleStop = async () => {
        try { await stopBot(); setTimeout(refreshBotData, 1000); } 
        catch (err) { console.error(err); }
    };

    const handleClearLogs = () => setLogsClearedTime(Date.now());
    const handleRefreshChart = () => refreshBotData();
    
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
                    {!isRunning && (
                        <>
                            <div className="selectors-row" style={{display:'flex', gap:'20px', marginBottom:'15px'}}>
                                {/* 📂 SAVED SETUPS DROPDOWN */}
                                <label className="setup-selector" style={{flex:1}}>
                                    Saved Setups (DB)
                                    <select value={selectedSetupId} onChange={handleSetupSelect}>
                                        <option value="">-- Select Setup --</option>
                                        {setups.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                    </select>
                                </label>

                                {/* 🏆 GOLDEN STRATEGIES DROPDOWN */}
                                <label className="setup-selector" style={{flex:1}}>
                                    Optimized Strategies (ML)
                                    <select value={selectedWinnerId} onChange={handleWinnerSelect} style={{borderColor: selectedWinnerId ? '#3b82f6' : '#444'}}>
                                        <option value="">-- Select Winner --</option>
                                        {winners.map(w => <option key={w.id} value={w.id}>🏆 {w.name}</option>)}
                                    </select>
                                </label>
                            </div>
                            
                            <div className="form-grid">
                                <label>Symbol<input value={formConfig.symbol} disabled /></label>
                                <label>Timeframe<input value={formConfig.timeframe} disabled /></label>
                                <label>Capital ($)<input type="number" value={formConfig.capitalAllocation} onChange={e=>setFormConfig(p=>({...p, capitalAllocation:Number(e.target.value)}))} /></label>
                            </div>

                            <div className="mode-switch-container" style={{marginTop:'15px'}}>
                                <div className="mode-toggle">
                                    <button type="button" className={formConfig.tradingMode === 'paper' ? 'active' : ''} onClick={() => setFormConfig(p => ({...p, tradingMode: 'paper'}))}>Paper</button>
                                    <button type="button" className={formConfig.tradingMode === 'live' ? 'active danger' : ''} onClick={() => setFormConfig(p => ({...p, tradingMode: 'live'}))}>Real Money</button>
                                </div>
                                <button type="submit" className="button-start" disabled={botLoading}>
                                    {botLoading ? 'Deploying...' : '🚀 Launch Bot'}
                                </button>
                            </div>
                        </>
                    )}
                    
                    {isRunning && (
                        <div className="running-actions">
                            <button type="button" onClick={handleStop} className="button-stop-main" disabled={botLoading}>Stop Bot</button>
                        </div>
                    )}
                </form>
            </div>

            {error && <div className="error-banner">{error}</div>}

            {(botStatus?.isConfigured || isRunning) && (
                <>
                    <h3 style={{color: '#ccc', marginTop: '30px', marginBottom: '10px', borderBottom:'1px solid #444', paddingBottom:'5px'}}>
                        Live Performance Dashboard
                    </h3>

                    <div className="bot-card status-dashboard">
                         <MetricsDisplay data={botStatus} />
                    </div>
                    
                    <div className="bot-card chart-panel">
                        <div className="card-header-row" style={{display:'flex', justifyContent:'space-between'}}>
                             <h3 className="card-title" style={{margin:0}}>Live Chart</h3>
                             <button onClick={handleRefreshChart} style={{background:'none', border:'none', color:'#4ade80', cursor:'pointer'}}>↻ Refresh</button>
                        </div>
                        {/* 🚀 PASS ACTIVE POSITIONS TO CHART */}
                        <LiveTradingChart 
                            candles={botStatus.candles || []} 
                            trades={botStatus.trades || []} 
                            activePositions={botStatus.activePositions || []} 
                        />
                    </div>

                    <div className="bot-card logs-panel">
                        <div className="card-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 className="card-title" style={{ margin: 0 }}>Logs</h3>
                            <div style={{display:'flex', gap:'10px'}}>
                                <button onClick={refreshBotData} className="clear-logs-btn">Refresh</button>
                                <button onClick={handleClearLogs} className="clear-logs-btn" style={{color:'#ef4444', borderColor:'#ef4444'}}>Clear</button>
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
