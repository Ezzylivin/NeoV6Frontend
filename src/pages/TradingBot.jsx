// File: src/pages/TradingBot.jsx
// 🚀 CYBERPUNK TERMINAL EDITION

import React, { useState, useEffect, useRef } from "react";
import axios from "axios"; 
import { useBot } from '../hooks/useBot.js';
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx"; 
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import "./TradingBot.css";

// --- HELPER: Parse Date (Forces EST/New York) ---
const formatLogDate = (isoString) => {
    if (!isoString) return "--/--";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Invalid Date";

    return d.toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
};

// --- HELPER: Thought Bubble ---
const ThinkingMessage = ({ text }) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("checked combo")) {
        const parts = text.split(/Final signal:/i);
        let rawSignal = parts[1] ? parts[1].split('|')[0].trim() : "ANALYZING";
        const metrics = text.includes('|') ? text.split('|').slice(1).join('|').trim() : "";
        const signal = rawSignal.replace('.', '').toUpperCase();
        
        let signalClass = "signal-hold";
        if (signal.includes("BUY") || signal.includes("LONG")) signalClass = "signal-buy";
        if (signal.includes("SELL") || signal.includes("SHORT")) signalClass = "signal-sell";

        return (
            <div className="thinking-wrapper">
                <div className="thinking-line">
                    <span className="thinking-badge">AI SCAN</span>
                    <span className="thinking-text">Decision: <span className={signalClass}>{signal}</span></span>
                </div>
                {metrics && (
                    <div className="thinking-metrics">
                        🔍 Telemetry: {metrics}
                    </div>
                )}
            </div>
        );
    }
    return <span>{text}</span>;
};

// --- COMPONENT: AI DECISION STREAM ---
const DecisionStream = ({ logs }) => {
    const thoughts = logs.filter(l => {
        const msg = l.message.toLowerCase();
        return msg.includes("checked combo") || 
               msg.includes("entered") || 
               msg.includes("closed") ||
               msg.includes("bot started") ||
               msg.includes("bot stopped") ||
               msg.includes("error");
    }).map(l => {
        const msg = l.message.toLowerCase();
        let signal = "INFO";
        let color = "#64748b"; 
        let detail = l.message;
        let emoji = "ℹ️";

        if (msg.includes("hold")) {
            signal = "HOLD";
            color = "#fbbf24"; 
            detail = "No high-probability setup found.";
            emoji = "⏸";
        } else if (msg.includes("entered long") || msg.includes("buy")) {
            signal = "LONG";
            color = "#10b981"; 
            detail = "Bullish signals confirmed. Entry executed.";
            emoji = "↗";
        } else if (msg.includes("entered short") || msg.includes("sell")) {
            signal = "SHORT";
            color = "#ef4444"; 
            detail = "Bearish signals confirmed. Entry executed.";
            emoji = "↘";
        } else if (msg.includes("closed")) {
            signal = "CLOSE";
            color = "#06b6d4"; 
            detail = "Position closed based on exit logic.";
            emoji = "✓";
        } else if (msg.includes("bot started")) {
            signal = "ONLINE";
            color = "#8b5cf6";
            detail = "System initialized. Polling market data.";
            emoji = "⚡";
        } else if (msg.includes("bot stopped")) {
            signal = "OFFLINE";
            color = "#ef4444";
            detail = "System shutdown initiated.";
            emoji = "■";
        } else if (msg.includes("error")) {
            signal = "ERROR";
            color = "#ef4444";
            detail = "System encountered an anomaly.";
            emoji = "⚠";
        }

        return { timestamp: l.timestamp, signal, color, detail, emoji, id: l.timestamp + l.message };
    }).reverse().slice(0, 5); 

    return (
        <div className="decision-stream">
            <div className="stream-header">
                <span className="stream-title">╔═══ AI LOGIC STREAM ═══╗</span>
            </div>
            <div className="stream-table">
                <div className="stream-row header-row">
                    <span className="col-time">TIMESTAMP</span>
                    <span className="col-signal">SIGNAL</span>
                    <span className="col-detail">RESULT</span>
                </div>
                {thoughts.length > 0 ? thoughts.map((t) => (
                    <div key={t.id} className="stream-row">
                        <span className="col-time">{formatLogDate(t.timestamp)}</span>
                        <span className="col-signal" style={{color: t.color}}>
                            {t.emoji} {t.signal}
                        </span>
                        <span className="col-detail">{t.detail}</span>
                    </div>
                )) : (
                    <div className="stream-row empty-row">
                        <span className="empty-text">[ WAITING FOR AI ACTIVITY ]</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- HELPER: Metrics ---
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
        <div className="metrics-container">
            {Object.entries(metrics).map(([key, value]) => {
                const isProfit = key.includes("Profit") || key.includes("Balance");
                const isPositive = typeof value === 'number' && value > 0 && isProfit;
                const isNegative = typeof value === 'number' && value < 0;
                
                return (
                    <div key={key} className="metric-box">
                        <div className="metric-header">{key}</div>
                        <div className={`metric-value ${isPositive ? 'positive' : ''} ${isNegative ? 'negative' : ''}`}>
                            {formatValue(key, value)}
                        </div>
                        <div className="metric-corner tl"></div>
                        <div className="metric-corner tr"></div>
                        <div className="metric-corner bl"></div>
                        <div className="metric-corner br"></div>
                    </div>
                );
            })}
        </div>
    );
};

// --- MAIN COMPONENT ---
export default function TradingBot() {
    const { 
        botStatus, logs: apiLogs, loading: botLoading, 
        startBot, stopBot, refreshBotData 
    } = useBot();

    const { setups } = useBacktestSetupFunction(); 
    
    const [liveWinners, setLiveWinners] = useState([]);
    const [scanningWinners, setScanningWinners] = useState(false);

    const logsContainerRef = useRef(null);
    const [selectedWinnerId, setSelectedWinnerId] = useState("");
    const [selectedSetupId, setSelectedSetupId] = useState("");
    
    const [persistentLogs, setPersistentLogs] = useState([]);

    const [formConfig, setFormConfig] = useState({
        isCombo: false, strategyId: '', comboConfig: { strategyCodes: [], combinationRule: 'AND' },
        symbol: 'BTC-USD', timeframe: '1h', capitalAllocation: 1000, tradingMode: 'paper',
        params: {}, strategies: [], mlMode: 'off', mlModel: '', mlThreshold: 0.5
    });

    const [logsClearedTime, setLogsClearedTime] = useState(0);

    const fetchWinners = async () => {
        setScanningWinners(true);
        try {
            const token = localStorage.getItem("token"); 
            const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) setLiveWinners(res.data);
        } catch (err) { console.error("Failed to load winners:", err); } 
        finally { setScanningWinners(false); }
    };

    useEffect(() => { fetchWinners(); }, []);

    useEffect(() => {
        if (apiLogs && apiLogs.length > 0) {
            setPersistentLogs(prevLogs => {
                const newLogs = apiLogs.filter(apiLog => 
                    !prevLogs.some(prevLog => 
                        prevLog.timestamp === apiLog.timestamp && prevLog.message === apiLog.message
                    )
                );
                const combined = [...prevLogs, ...newLogs].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
                return combined.slice(-500);
            });
        }
    }, [apiLogs]);

    const visibleLogs = persistentLogs.filter(log => new Date(log.timestamp).getTime() > logsClearedTime);

    useEffect(() => {
        if (logsContainerRef.current) {
            const { scrollHeight, clientHeight } = logsContainerRef.current;
            logsContainerRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' });
        }
    }, [persistentLogs]);

    useEffect(() => {
        let interval;
        if (botStatus?.status === 'running') {
            interval = setInterval(() => refreshBotData(), 2000);
        }
        return () => clearInterval(interval);
    }, [botStatus?.status, refreshBotData]);

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

    const handleWinnerSelect = (e) => {
        const filename = e.target.value;
        setSelectedWinnerId(filename);
        const selectedWinner = liveWinners.find(w => w.id === filename);
        
        if (!selectedWinner || !selectedWinner.config) return;
        const data = selectedWinner.config;

        let symbol = data.symbol || "BTC-USD";
        let timeframe = data.timeframe || "1h";
        if(!data.symbol && filename.includes('_')) {
            const parts = filename.split('_');
            if(parts[1]) symbol = parts[1];
            if(parts[2]) timeframe = parts[2];
        }

        let strategies = [];
        if(Array.isArray(data.strategies)) strategies = data.strategies;
        else if(Array.isArray(data)) strategies = data;
        
        const cleanStrategies = strategies.map(s => {
            const code = (typeof s === 'string') ? s : (s.code || "unknown");
            const params = (typeof s === 'string') ? {} : (s.params || s);
            return { 
                strategyId: "",
                code, 
                params 
            };
        });

        let mlMode = data.mlMode || "off";
        let mlModel = data.params?.mlModel || data.mlModel || "";
        if (mlModel && mlMode === "off") mlMode = "predictions";
        if (!mlModel && mlMode !== "off") mlModel = 'btc_1h_xgboost_model'; 

        const globalParams = { ...data.params };
        if (data.riskPercentage) globalParams.riskPercentage = Number(data.riskPercentage);
        if (data.maxPyramiding) globalParams.maxPyramiding = Number(data.maxPyramiding);

        setFormConfig(prev => ({
            ...prev,
            symbol, timeframe,
            isCombo: true,
            strategies: cleanStrategies,
            comboConfig: { 
                strategyCodes: cleanStrategies.map(s => s.code),
                combinationRule: globalParams.hybridMode || 'OR' 
            },
            mlMode, mlModel,
            mlThreshold: Number(data.mlThreshold) || 0.5,
            params: globalParams
        }));
    };

    const handleStart = async (e) => {
        e.preventDefault();
        if (formConfig.tradingMode === 'live' && !window.confirm("⚠️ Real Money Trading. Proceed?")) return;
        setLogsClearedTime(0); 
        setPersistentLogs([]); 
        
        const cleanStrategies = (formConfig.strategies || []).map(s => ({
            code: s.code || "unknown",
            params: s.params || {}
        }));

        const cleanPayload = {
            symbol: formConfig.symbol,
            timeframe: formConfig.timeframe,
            capitalAllocation: Number(formConfig.capitalAllocation),
            currentBalance: Number(formConfig.capitalAllocation),
            mlMode: formConfig.mlMode,
            mlModel: formConfig.mlModel,
            mlThreshold: Number(formConfig.mlThreshold),
            isCombo: !!formConfig.isCombo,
            comboConfig: formConfig.comboConfig || { 
                strategyCodes: cleanStrategies.map(s => s.code), 
                combinationRule: 'AND' 
            },
            strategies: cleanStrategies, 
            params: formConfig.params || {},
            maxPyramiding: parseInt(formConfig.params?.maxPyramiding || 1, 10)
        };

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

    const hasData = chartData.candleData && chartData.candleData.length > 0;

    return (
        <div className="terminal-container">
            {/* Header */}
            <div className="terminal-header">
                <div className="header-left">
                    <span className="header-bracket">[</span>
                    <span className="header-title">LIVE TRADING TERMINAL</span>
                    <span className="header-bracket">]</span>
                </div>
                <div className={`system-status ${isRunning ? 'online' : 'offline'}`}>
                    <span className="status-dot"></span>
                    {isRunning ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
                </div>
            </div>
            
            {/* Control Panel */}
            <div className="terminal-panel control-panel">
                <div className="panel-title-bar">
                    <span className="panel-title">╔═══ STRATEGY CONFIGURATION ═══╗</span>
                    <span className={`mode-badge ${formConfig.tradingMode}`}>
                        {formConfig.tradingMode === 'paper' ? '[ SIMULATION ]' : '[ LIVE EXECUTION ]'}
                    </span>
                </div>
                
                <form onSubmit={handleStart} className="control-form">
                    {/* Strategy Selectors */}
                    <div className="selector-row">
                        <div className="input-group">
                            <label className="input-label">
                                <span className="label-icon">▸</span>
                                LOAD STRATEGY (DATABASE)
                            </label>
                            <select 
                                value={selectedSetupId} 
                                onChange={handleSetupSelect} 
                                disabled={isRunning}
                                className="terminal-select"
                            >
                                <option value="">-- Select Saved Setup --</option>
                                {setups.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div className="input-group">
                            <label className="input-label">
                                <span className="label-icon">▸</span>
                                LOAD ALPHA (DATA FOLDER)
                                <button 
                                    type="button" 
                                    onClick={fetchWinners} 
                                    disabled={scanningWinners}
                                    className="scan-btn"
                                >
                                    {scanningWinners ? '[ SCANNING... ]' : '[ 🔄 SCAN ]'}
                                </button>
                            </label>
                            <select 
                                value={selectedWinnerId} 
                                onChange={handleWinnerSelect} 
                                disabled={isRunning}
                                className="terminal-select"
                            >
                                <option value="">-- Select File from Disk --</option>
                                {liveWinners.map(w => <option key={w.id} value={w.id}>🏆 {w.name}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    {/* Parameters */}
                    <div className="params-row">
                        <div className="input-group">
                            <label className="input-label">SYMBOL</label>
                            <input 
                                value={formConfig.symbol} 
                                disabled 
                                className="terminal-input"
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">TIMEFRAME</label>
                            <input 
                                value={formConfig.timeframe} 
                                disabled 
                                className="terminal-input"
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">CAPITAL ALLOCATION</label>
                            <input 
                                type="number" 
                                value={formConfig.capitalAllocation} 
                                onChange={e=>setFormConfig(p=>({...p, capitalAllocation:e.target.value}))} 
                                disabled={isRunning}
                                className="terminal-input"
                            />
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="action-bar">
                        <div className="mode-selector">
                            <button 
                                type="button" 
                                className={`mode-btn ${formConfig.tradingMode === 'paper' ? 'active' : ''}`} 
                                onClick={() => setFormConfig(p => ({...p, tradingMode: 'paper'}))} 
                                disabled={isRunning}
                            >
                                PAPER TRADE
                            </button>
                            <button 
                                type="button" 
                                className={`mode-btn danger ${formConfig.tradingMode === 'live' ? 'active' : ''}`} 
                                onClick={() => setFormConfig(p => ({...p, tradingMode: 'live'}))} 
                                disabled={isRunning}
                            >
                                LIVE EXECUTION
                            </button>
                        </div>
                        {!isRunning ? (
                            <button type="submit" className="execute-btn" disabled={botLoading}>
                                {botLoading ? '[ INITIALIZING... ]' : '[ ▶ EXECUTE STRATEGY ]'}
                            </button>
                        ) : (
                            <button type="button" onClick={handleStop} className="terminate-btn" disabled={botLoading}>
                                [ ■ TERMINATE SEQUENCE ]
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {(botStatus?.isConfigured || isRunning) && (
                <>
                    {/* Performance Metrics */}
                    <div className="section-divider">
                        <span>╔═══ PERFORMANCE TELEMETRY ═══╗</span>
                    </div>
                    <div className="terminal-panel">
                        <MetricsDisplay data={botStatus} />
                    </div>
                    
                    {/* Chart Panel */}
                    <div className="section-divider">
                        <span>╔═══ LIVE MARKET DATA ═══╗</span>
                        <button onClick={handleRefreshChart} className="sync-btn">
                            [ ↻ SYNC ]
                        </button>
                    </div>
                    <div className="terminal-panel chart-container">
                        <div className="chart-wrapper">
                            {hasData ? (
                                <ChartIndependent results={chartData} symbol={formConfig.symbol} />
                            ) : (
                                <div className="chart-loading">
                                    <div className="loading-bars">
                                        <div className="bar"></div>
                                        <div className="bar"></div>
                                        <div className="bar"></div>
                                        <div className="bar"></div>
                                        <div className="bar"></div>
                                    </div>
                                    <p className="loading-text">[ ACQUIRING EXCHANGE DATA ]</p>
                                    <button onClick={handleRefreshChart} className="retry-btn">
                                        [ FORCE RETRY ]
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Logs Panel */}
                    <div className="section-divider">
                        <span>╔═══ SYSTEM LOGS ═══╗</span>
                        <div className="log-controls">
                            <button onClick={refreshBotData} className="log-btn">[ FETCH ]</button>
                            <button onClick={handleClearLogs} className="log-btn danger">[ PURGE ]</button>
                        </div>
                    </div>
                    <div className="terminal-panel logs-panel">
                        <DecisionStream logs={persistentLogs} />

                        <div className="logs-wrapper" ref={logsContainerRef}>
                            {visibleLogs.length > 0 ? visibleLogs.map((log, i) => {
                                const isThinking = log.message.toLowerCase().includes("checked combo");
                                return (
                                    <div key={i} className={`log-line ${log.type} ${isThinking ? 'thinking' : ''}`}>
                                        <span className="log-time">{formatLogDate(log.timestamp)}</span>
                                        <span className="log-separator">│</span>
                                        <span className="log-msg">
                                            <ThinkingMessage text={log.message} />
                                        </span>
                                    </div>
                                )
                            }) : (
                                <p className="empty-logs">[ WAITING FOR INCOMING DATA STREAM ]</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
