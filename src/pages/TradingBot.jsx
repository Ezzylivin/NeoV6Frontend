// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: v29.3 - Fixed 400 Bad Request (Added currentBalance & comboConfig)

import React, { useState, useEffect, useRef } from "react";
import { useBot } from '../hooks/useBot.js';
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx"; 
import { useBacktest } from "../hooks/useBacktest.js"; 
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
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
                        color: (key.includes("Profit") || key.includes("Balance")) ? (value < 0 ? '#ef4444' : '#4ade80') : '#f3f4f6'
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

    const { setups } = useBacktestSetupFunction(); 
    const { state: backtestState } = useBacktest(); 
    const winners = (botWinners && botWinners.length > 0) ? botWinners : (backtestState?.winners || []);
    
    const logsEndRef = useRef(null);
    const [selectedWinnerId, setSelectedWinnerId] = useState("");
    const [selectedSetupId, setSelectedSetupId] = useState("");
    
    const [formConfig, setFormConfig] = useState({
        isCombo: false, strategyId: '', comboConfig: { strategyCodes: [], combinationRule: 'AND' },
        symbol: 'BTC-USD', timeframe: '1h', capitalAllocation: 1000, tradingMode: 'paper',
        params: {}, strategies: [], mlMode: 'off', mlModel: '', mlThreshold: 0.5
    });

    const [logsClearedTime, setLogsClearedTime] = useState(0);
    const visibleLogs = logs.filter(log => new Date(log.timestamp).getTime() > logsClearedTime);

    useEffect(() => {
        if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }, [logs, visibleLogs]);

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
        setSelectedWinnerId(""); 
        
        const setup = setups.find(s => s._id === setupId);
        if (setup) {
            const isCombo = setup.isCombo || (setup.strategies && setup.strategies.length > 1);
            let comboConfig = setup.comboConfig;
            if (!comboConfig && isCombo) {
                comboConfig = {
                    strategyCodes: setup.strategies.map(s => s.code),
                    combinationRule: setup.params?.hybridMode || 'AND'
                };
            }
            setFormConfig(prev => ({
                ...prev,
                symbol: setup.symbol, timeframe: setup.timeframe, capitalAllocation: setup.initialBalance || 1000,
                isCombo: isCombo, strategies: setup.strategies || [],
                comboConfig: comboConfig || { strategyCodes: [], combinationRule: 'OR' },
                params: setup.params || {},
                mlMode: setup.mlMode || 'off', mlModel: setup.mlModel || '', mlThreshold: setup.mlThreshold || 0.5
            }));
        }
    };

    // --- HANDLER 2: Load Golden Strategy (ML) ---
    const handleWinnerSelect = (e) => {
        const filename = e.target.value;
        setSelectedWinnerId(filename);
        setSelectedSetupId(""); 

        const selectedWinner = winners.find(w => w.id === filename);
        if (selectedWinner && selectedWinner.config) {
            const config = selectedWinner.config;
            let symbol = config.symbol || "BTC-USD";
            let timeframe = config.timeframe || "1h";

            if(!config.symbol && filename.includes('_')) {
                 const parts = filename.split('_');
                 if(parts[1]) symbol = parts[1];
                 if(parts[2] && ['1h','4h','1d'].includes(parts[2])) timeframe = parts[2];
            }

            let strategies = [];
            if(Array.isArray(config.strategies)) strategies = config.strategies;
            else if(Array.isArray(config)) strategies = config;
            
            strategies = strategies.map(s => ({
                code: s.code || s.trend_strategy || "unknown",
                params: s.params || s
            }));

            let mlMode = config.mlMode || "off";
            let mlModel = config.mlModel || "";
            if(config.params?.mlModel) mlModel = config.params.mlModel;
            if(mlModel && mlMode === "off") mlMode = "predictions";

            setFormConfig(prev => ({
                ...prev,
                isCombo: true, symbol, timeframe, strategies: strategies,
                comboConfig: { 
                    strategyCodes: strategies.map(s=>s.code), 
                    combinationRule: config.params?.hybridMode || 'REGIME' 
                },
                params: config.params || {},
                mlMode: mlMode, mlModel: mlModel || 'btc_1h_xgboost_model', mlThreshold: config.mlThreshold || 0.5
            }));
        }
    };

    const handleStart = async (e) => {
        e.preventDefault();
        if (formConfig.tradingMode === 'live' && !window.confirm("⚠️ Real Money Trading. Proceed?")) return;
        
        setLogsClearedTime(0); 
        
        // 🚀 CRITICAL FIX: Robust Payload Construction
        const cleanStrategies = (formConfig.strategies || []).map(s => ({
            code: s.code || "unknown",
            params: s.params || {}
        }));

        const cleanPayload = {
            symbol: formConfig.symbol,
            timeframe: formConfig.timeframe,
            capitalAllocation: Number(formConfig.capitalAllocation),
            
            // 🛑 CRITICAL FIX: Adding currentBalance equal to capital
            currentBalance: Number(formConfig.capitalAllocation),
            
            mlMode: formConfig.mlMode,
            mlModel: formConfig.mlModel,
            mlThreshold: Number(formConfig.mlThreshold),
            
            isCombo: !!formConfig.isCombo,
            
            // 🛑 CRITICAL FIX: Sending comboConfig explicitly
            comboConfig: formConfig.comboConfig || { 
                strategyCodes: cleanStrategies.map(s => s.code), 
                combinationRule: 'AND' 
            },
            
            strategies: cleanStrategies, 
            params: formConfig.params || {},
            maxPyramiding: parseInt(formConfig.params?.maxPyramiding || 1, 10)
        };

        console.log("🚀 Payload Sent:", cleanPayload);

        try { 
            await startBot(cleanPayload); 
            setTimeout(refreshBotData, 1000);
        } catch (err) { 
            console.error("Bot Start Error:", err); 
            alert(`Failed to start: ${err.message}`); 
        }
    };

    const handleStop = async () => {
        try { await stopBot(); setTimeout(refreshBotData, 1000); } 
        catch (err) { console.error(err); }
    };

    const handleClearLogs = () => setLogsClearedTime(Date.now());
    const handleRefreshChart = () => refreshBotData();
    
    const isRunning = botStatus?.status === 'running';
    
    const chartData = {
        candleData: botStatus?.candles || [],
        tradeBreakdown: (botStatus?.trades || []).map(t => ({
            ...t,
            entryTime: t.entryTime, 
            exitTime: t.exitTime,
            profit: t.profit,
            price: t.entry_price || t.price, 
            exitPrice: t.exit_price || t.exitPrice
        }))
    };

    return (
        <div className="trading-bot-container">
            <h2 className="header">Live Trading Terminal</h2>
            
            <div className="bot-card control-panel">
                <div className="panel-header">
                    <h3 className="card-title">
                        {isRunning ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
                        <span className={`mode-badge ${formConfig.tradingMode}`}>
                            {formConfig.tradingMode === 'paper' ? 'SIMULATION' : 'LIVE EXECUTION'}
                        </span>
                    </h3>
                    <div className={`status-indicator ${botStatus?.status || 'stopped'}`}>
                        {botStatus?.status?.toUpperCase() || 'STOPPED'}
                    </div>
                </div>
                
                <form onSubmit={handleStart} className="bot-form">
                    {!isRunning && (
                        <>
                            <div className="selectors-row">
                                <label className="setup-selector">
                                    Load Strategy (Database)
                                    <select value={selectedSetupId} onChange={handleSetupSelect}>
                                        <option value="">-- Select Saved Setup --</option>
                                        {setups.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                    </select>
                                </label>

                                <label className="setup-selector">
                                    Load Alpha (ML Optimizer)
                                    <select value={selectedWinnerId} onChange={handleWinnerSelect} style={{borderColor: selectedWinnerId ? '#3b82f6' : '#444'}}>
                                        <option value="">-- Select Verified Alpha --</option>
                                        {winners.map(w => <option key={w.id} value={w.id}>🏆 {w.name}</option>)}
                                    </select>
                                </label>
                            </div>
                            
                            <div className="form-grid">
                                <label>Symbol<input value={formConfig.symbol} disabled /></label>
                                <label>Timeframe<input value={formConfig.timeframe} disabled /></label>
                                <label>Capital Allocation<input type="number" value={formConfig.capitalAllocation} onChange={e=>setFormConfig(p=>({...p, capitalAllocation:e.target.value}))} /></label>
                            </div>

                            <div className="mode-switch-container">
                                <div className="mode-toggle">
                                    <button type="button" className={formConfig.tradingMode === 'paper' ? 'active' : ''} onClick={() => setFormConfig(p => ({...p, tradingMode: 'paper'}))}>Paper Trade</button>
                                    <button type="button" className={formConfig.tradingMode === 'live' ? 'active danger' : ''} onClick={() => setFormConfig(p => ({...p, tradingMode: 'live'}))}>Live Execution</button>
                                </div>
                                <button type="submit" className="button-start" disabled={botLoading}>
                                    {botLoading ? 'Initializing...' : '🚀 EXECUTE STRATEGY'}
                                </button>
                            </div>
                        </>
                    )}
                    
                    {isRunning && (
                        <div className="running-actions">
                            <button type="button" onClick={handleStop} className="button-stop-main" disabled={botLoading}>TERMINATE SEQUENCE</button>
                        </div>
                    )}
                </form>
            </div>

            {error && <div className="error-banner">{error}</div>}

            {(botStatus?.isConfigured || isRunning) && (
                <>
                    <h3 style={{color: '#94a3b8', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '30px', marginBottom: '15px'}}>
                        Performance Telemetry
                    </h3>

                    <div className="bot-card status-dashboard">
                         <MetricsDisplay data={botStatus} />
                    </div>
                    
                    <div className="bot-card chart-panel">
                        <div className="card-header-row" style={{display:'flex', justifyContent:'space-between', paddingBottom: '10px', borderBottom: '1px solid #2d3748', marginBottom: '10px'}}>
                             <h3 className="card-title" style={{margin:0, fontSize:'0.9rem'}}>Live Market Data</h3>
                             <button onClick={handleRefreshChart} style={{background:'none', border:'none', color:'#4ade80', cursor:'pointer', fontSize:'0.8rem'}}>↻ SYNC</button>
                        </div>
                        <div style={{height: '500px'}}>
                             <ChartIndependent results={chartData} symbol={formConfig.symbol} />
                        </div>
                    </div>

                    <div className="bot-card logs-panel">
                        <div className="card-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 className="card-title" style={{ margin: 0, fontSize:'0.9rem' }}>System Logs</h3>
                            <div style={{display:'flex', gap:'10px'}}>
                                <button onClick={refreshBotData} className="clear-logs-btn">Fetch</button>
                                <button onClick={handleClearLogs} className="clear-logs-btn" style={{color:'#ef4444', borderColor:'#ef4444'}}>Purge</button>
                            </div>
                        </div>
                        <div className="logs-container">
                            {visibleLogs.length > 0 ? visibleLogs.map((log, i) => (
                                <div key={i} className={`log-entry log-${log.type}`}>
                                    <span className="log-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    <span className="log-message">{log.message}</span>
                                </div>
                            )) : <p className="no-logs" style={{color:'#475569', fontStyle:'italic', padding:'10px'}}>Waiting for incoming data stream...</p>}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
