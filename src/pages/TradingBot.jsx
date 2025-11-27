// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: Changed Polling Interval to 1 Minute.

import React, { useState, useEffect, useRef, useContext } from "react";
import { useBot } from '../hooks/useBot.js';
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import { useBacktest } from "../hooks/useBacktest.js";
import { StrategyContext } from "../context/StrategyContext.jsx";
import LiveTradingChart from "../components/LiveTradingChart.jsx"; 
import "./TradingBot.css";
import api from '../api/apiClient'; 

// --- 1. CONSTANTS & MAPPINGS ---
const STRATEGY_PREFIXES = {
    'macd_crossover': 'macd', 'rsi_divergence': 'rsi', 'bollinger_bands': 'bb',
    'stochastic_crossover': 'stoch', 'atr_breakout': 'atr', 'cci_oversold': 'cci',
    'ichimoku_cloud': 'ich', 'psar_signal': 'psar', 'obv_signal': 'obv', 'sma_crossover': 'sma'
};

const PARAM_MAPPING = {
    'min_adx': 'minAdxLevel', 'tsl_mult': 'tslAtrMult', 'regime_threshold': 'regime_threshold',
    'min_atr_pct': 'minAtrPct', 'trend_filter_period': 'trendFilterPeriod',
    'atr_p': 'atr_period', 'atr_m': 'atr_multiplier', 'rsi_len': 'rsi_length',
    'rsi_os': 'oversold_level', 'rsi_ob': 'overbought_level', 'bb_len': 'bb_length',
    'bb_std': 'bb_std', 'cci_len': 'cci_length', 'cci_os': 'cci_oversold',
    'cci_ob': 'cci_overbought', 'k_period': 'k_period', 'd_period': 'd_period',
    'sma_1': 'sma_fast_period', 'sma_2': 'sma_slow_period', 'macd_f': 'macd_fast_period',
    'macd_s': 'macd_slow_period', 'macd_sig': 'macd_signal_period'
};

// --- 2. HELPERS ---
const normalizeParams = (rawParams) => {
    const normalized = {};
    if (!rawParams) return normalized;
    Object.entries(rawParams).forEach(([key, val]) => {
        const uiKey = PARAM_MAPPING[key] || key; 
        normalized[uiKey] = val;
    });
    return normalized;
};

function rebuildStrategiesFromParams(raw) {
    if (Array.isArray(raw.strategies) && raw.strategies.length > 0) return raw.strategies; 
    if (typeof raw.strategies === "string") {
        return raw.strategies.split(",").map(code => ({ code: code.trim(), params: {} }));
    }
    if (Array.isArray(raw)) {
        const expanded = [];
        raw.forEach(item => {
            const p = item.params || item; 
            if (p.trend_strategy || p.range_strategy) {
                if (p.trend_strategy) expanded.push({ code: p.trend_strategy, params: p });
                if (p.range_strategy) expanded.push({ code: p.range_strategy, params: p });
            } else {
                const code = item.code || item.trend_strategy || "unknown";
                expanded.push({ code: code, params: p });
            }
        });
        return expanded;
    }
    return [];
}

// --- 3. COMPONENTS ---

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
        isCombo: false, 
        strategyId: '', 
        comboConfig: { strategyCodes: [], combinationRule: 'AND' },
        symbol: 'BTC-USD', 
        timeframe: '1h',   
        capitalAllocation: 1000,
        tradingMode: 'paper',
        params: {},
        strategies: [],
        mlMode: 'off',
        mlModel: '',
        mlThreshold: 0.5
    });

    // Auto-Scroll Logs
    useEffect(() => {
        if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    // 🚀 UPGRADE: AUTO-POLLING (Every 60s / 1 Minute)
    useEffect(() => {
        let interval;
        if (botStatus?.status === 'running') {
            interval = setInterval(() => {
                refreshBotData(); 
            }, 60000); // <--- CHANGED TO 60,000ms (1 Minute)
        }
        return () => clearInterval(interval);
    }, [botStatus?.status, refreshBotData]);

    // --- HANDLER: Golden Strategy Selection ---
    const handleWinnerSelect = (e) => {
        const filename = e.target.value;
        setSelectedWinnerId(filename);
        if (!filename) return;

        const selectedWinner = winners.find(w => w.id === filename);
        if (selectedWinner && selectedWinner.config) {
            const config = selectedWinner.config;
            console.log("🏆 Loading Golden Strategy:", config);

            // A. Meta Data
            let loadedSymbol = config.symbol || "BTC-USD";
            let loadedTimeframe = config.timeframe || "1h";
            
            if (!config.symbol) {
                const parts = filename.split('_');
                if (parts.length >= 2 && parts[1].includes('-')) loadedSymbol = parts[1];
                if (parts.length >= 3 && ['1h','4h','1d'].includes(parts[2])) loadedTimeframe = parts[2];
            }

            // B. Global Params
            let rawGlobalParams = { ...config.params };
            if (Array.isArray(config) && config.length > 0) {
                 rawGlobalParams = { ...rawGlobalParams, ...(config[0].params || config[0]) };
            }
            const globalParams = normalizeParams(rawGlobalParams);

            // C. ML Detection
            let detectedModel = config.mlModel || config.params?.mlModel || "";
            let detectedMode = config.mlMode || config.params?.mlMode || "off";
            let detectedThreshold = config.mlThreshold ?? config.params?.mlThreshold ?? 0.5;

            const findML = (obj) => {
                if (obj.mlModel) detectedModel = obj.mlModel;
                if (obj.mlMode) detectedMode = obj.mlMode;
                if (obj.mlThreshold) detectedThreshold = obj.mlThreshold;
            };
            if (Array.isArray(config)) config.forEach(findML);
            else findML(config);
            if (config.params) findML(config.params);

            if (detectedMode === "off" && detectedModel) detectedMode = "predictions";

            // D. Strategy Reconstruction
            let strategiesList = rebuildStrategiesFromParams(config);

            strategiesList = strategiesList.map(s => {
                const prefix = STRATEGY_PREFIXES[s.code] || s.code.split('_')[0]; 
                const specificParams = {};
                
                const allParams = { ...(config.params || {}), ...(s.params || {}) };
                if(Array.isArray(config)) {
                    config.forEach(item => Object.assign(allParams, item.params || item));
                }

                Object.entries(allParams).forEach(([key, val]) => {
                    if (prefix && key.startsWith(prefix)) {
                         const uiKey = PARAM_MAPPING[key] || key;
                         specificParams[uiKey] = val;
                    }
                });

                return { code: s.code, params: specificParams };
            });

            // E. Update Form
            setFormConfig(prev => ({
                ...prev,
                isCombo: true,
                comboConfig: { 
                    strategyCodes: strategiesList.map(s => s.code), 
                    combinationRule: globalParams.hybridMode || 'AND' 
                },
                params: globalParams, 
                strategies: strategiesList, 
                symbol: loadedSymbol,    
                timeframe: loadedTimeframe,
                mlMode: detectedMode,
                mlModel: detectedModel,
                mlThreshold: detectedThreshold
            }));
        }
    };

    const handleStart = async (e) => {
        e.preventDefault();
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

    const handleClearLogs = () => { refreshBotData(); };
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
                            <div className="mode-switch-container">
                                <label className="switch-label">Mode:</label>
                                <div className="mode-toggle">
                                    <button type="button" className={formConfig.tradingMode === 'paper' ? 'active' : ''} onClick={() => setFormConfig(p => ({...p, tradingMode: 'paper'}))}>Paper</button>
                                    <button type="button" className={formConfig.tradingMode === 'live' ? 'active danger' : ''} onClick={() => setFormConfig(p => ({...p, tradingMode: 'live'}))}>Real Money</button>
                                </div>
                            </div>

                            <div className="selectors-row">
                                <label className="setup-selector" style={{flex:1}}>
                                    Optimized Strategies (ML)
                                    <select value={selectedWinnerId} onChange={handleWinnerSelect} style={{ borderColor: selectedWinnerId ? '#3b82f6' : '#444' }}>
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
                            )) : <p className="no-logs">Waiting for logs...</p>}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
