// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: v45.2 - "Fixed Reference Error" (Restored handleSetupSelect)

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
            <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                    <span className="thinking-tag">AI SCAN</span>
                    <span>Decision: <span className={signalClass}>{signal}</span></span>
                </div>
                {metrics && (
                    <div style={{fontSize:'0.75rem', color:'#64748b', marginLeft:'68px', fontFamily:'monospace'}}>
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

        if (msg.includes("hold")) {
            signal = "HOLD";
            color = "#f59e0b"; 
            detail = "No high-probability setup found.";
        } else if (msg.includes("entered long") || msg.includes("buy")) {
            signal = "LONG";
            color = "#22c55e"; 
            detail = "Bullish signals confirmed. Entry executed.";
        } else if (msg.includes("entered short") || msg.includes("sell")) {
            signal = "SHORT";
            color = "#ef4444"; 
            detail = "Bearish signals confirmed. Entry executed.";
        } else if (msg.includes("closed")) {
            signal = "CLOSE";
            color = "#3b82f6"; 
            detail = "Position closed based on exit logic.";
        } else if (msg.includes("bot started")) {
            signal = "ONLINE";
            color = "#a855f7";
            detail = "System initialized. Polling market data.";
        } else if (msg.includes("bot stopped")) {
            signal = "OFFLINE";
            color = "#ef4444";
            detail = "System shutdown initiated.";
        } else if (msg.includes("error")) {
            signal = "ERROR";
            color = "#ef4444";
            detail = "System encountered an anomaly.";
        }

        return { timestamp: l.timestamp, signal, color, detail, id: l.timestamp + l.message };
    }).reverse().slice(0, 5); 

    return (
        <div className="decision-stream">
            <h4 style={{color:'#94a3b8', fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'10px'}}>
                AI Logic Stream
            </h4>
            <div className="decision-table">
                <div className="d-row d-header">
                    <span style={{flex:1}}>Time</span>
                    <span style={{flex:1}}>Signal</span>
                    <span style={{flex:3}}>Context / Result</span>
                </div>
                {thoughts.length > 0 ? thoughts.map((t) => (
                    <div key={t.id} className="d-row">
                        <span className="d-time">{formatLogDate(t.timestamp)}</span>
                        <span className="d-signal" style={{color: t.color, fontWeight:'bold'}}>
                            {t.signal === "HOLD" && "⏸ "}
                            {t.signal === "LONG" && "🚀 "}
                            {t.signal === "SHORT" && "🔻 "}
                            {t.signal === "ONLINE" && "⚡ "}
                            {t.signal === "OFFLINE" && "🛑 "}
                            {t.signal === "ERROR" && "⚠️ "}
                            {t.signal}
                        </span>
                        <span className="d-detail">{t.detail}</span>
                    </div>
                )) : (
                    <div className="d-row" style={{justifyContent:'center', fontStyle:'italic', color:'#475569', padding:'20px'}}>
                        Waiting for AI activity...
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
        botStatus, logs: apiLogs, loading: botLoading, 
        startBot, stopBot, refreshBotData 
    } = useBot();

    const { setups } = useBacktestSetupFunction(); 
    
    // 🚀 LIVE STATE FOR WINNERS
    const [liveWinners, setLiveWinners] = useState([]);
    const [scanningWinners, setScanningWinners] = useState(false);

    const logsContainerRef = useRef(null);
    const [selectedWinnerId, setSelectedWinnerId] = useState("");
    const [selectedSetupId, setSelectedSetupId] = useState("");
    
    // Persistent Log State
    const [persistentLogs, setPersistentLogs] = useState([]);

    const [formConfig, setFormConfig] = useState({
        isCombo: false, strategyId: '', comboConfig: { strategyCodes: [], combinationRule: 'AND' },
        symbol: 'BTC-USD', timeframe: '1h', capitalAllocation: 1000, tradingMode: 'paper',
        params: {}, strategies: [], mlMode: 'off', mlModel: '', mlThreshold: 0.5
    });

    const [logsClearedTime, setLogsClearedTime] = useState(0);

    // 🚀 FETCH WINNERS FROM DISK (With Auth)
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

    // Log Accumulation
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

    // Auto-Scroll Logs
    useEffect(() => {
        if (logsContainerRef.current) {
            const { scrollHeight, clientHeight } = logsContainerRef.current;
            logsContainerRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' });
        }
    }, [persistentLogs]);

    // Auto-Polling
    useEffect(() => {
        let interval;
        if (botStatus?.status === 'running') {
            interval = setInterval(() => refreshBotData(), 2000);
        }
        return () => clearInterval(interval);
    }, [botStatus?.status, refreshBotData]);

    // 🚀 RESTORED: DATABASE SETUP HANDLER (Fixed ReferenceError)
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

     // 🚀 UNIVERSAL WINNER ADAPTER (With "Smart Mapping")
  const handleWinnerSelect = (e) => {
      const filename = e.target.value;
      setSelectedWinnerId(filename);
      const selectedWinner = liveWinners.find(w => w.id === filename);
      
      if (!selectedWinner || !selectedWinner.config) return;
      const data = selectedWinner.config;

      // PARSE CONFIG
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
          
          // 🚀 SMART MAP: Find the ID that matches this code so Dropdown populates
          const matchedOption = strategyOptions.find(opt => opt.code === code);
          const strategyId = matchedOption ? matchedOption._id : ""; // If found, use ID; else blank

          return { 
              strategyId, // This makes the dropdown show the name!
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

      // APPLY TO COMBO FORM
      setActiveTab('combo');
      setComboData(prev => ({
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
                    <div className="selectors-row">
                        <label className="setup-selector">
                            Load Strategy (Database)
                            <select value={selectedSetupId} onChange={handleSetupSelect} disabled={isRunning}>
                                <option value="">-- Select Saved Setup --</option>
                                {setups.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </label>

                        <label className="setup-selector" style={{position: 'relative'}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <span>Load Alpha (Data Folder)</span>
                                <button 
                                    type="button" 
                                    onClick={fetchWinners} 
                                    disabled={scanningWinners}
                                    style={{background:'none', border:'none', cursor:'pointer', color:'#4ade80', fontSize:'0.8rem'}}
                                >
                                    {scanningWinners ? 'Scanning...' : '🔄 Scan'}
                                </button>
                            </div>
                            <select value={selectedWinnerId} onChange={handleWinnerSelect} disabled={isRunning} style={{borderColor: selectedWinnerId ? '#3b82f6' : '#444'}}>
                                <option value="">-- Select File from Disk --</option>
                                {liveWinners.map(w => <option key={w.id} value={w.id}>🏆 {w.name}</option>)}
                            </select>
                        </label>
                    </div>
                    
                    <div className="form-grid">
                        <label>Symbol<input value={formConfig.symbol} disabled /></label>
                        <label>Timeframe<input value={formConfig.timeframe} disabled /></label>
                        <label>Capital Allocation
                            <input 
                                type="number" 
                                value={formConfig.capitalAllocation} 
                                onChange={e=>setFormConfig(p=>({...p, capitalAllocation:e.target.value}))} 
                                disabled={isRunning}
                            />
                        </label>
                    </div>

                    <div className="mode-switch-container">
                        <div className="mode-toggle">
                            <button type="button" className={formConfig.tradingMode === 'paper' ? 'active' : ''} onClick={() => setFormConfig(p => ({...p, tradingMode: 'paper'}))} disabled={isRunning}>Paper Trade</button>
                            <button type="button" className={formConfig.tradingMode === 'live' ? 'active danger' : ''} onClick={() => setFormConfig(p => ({...p, tradingMode: 'live'}))} disabled={isRunning}>Live Execution</button>
                        </div>
                        {!isRunning ? (
                            <button type="submit" className="button-start" disabled={botLoading}>{botLoading ? 'Initializing...' : '🚀 EXECUTE STRATEGY'}</button>
                        ) : (
                            <button type="button" onClick={handleStop} className="button-stop-main" disabled={botLoading}>TERMINATE SEQUENCE</button>
                        )}
                    </div>
                </form>
            </div>

            {(botStatus?.isConfigured || isRunning) && (
                <>
                    <h3 style={{color: '#94a3b8', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '30px', marginBottom: '15px'}}>Performance Telemetry</h3>
                    <div className="bot-card status-dashboard"><MetricsDisplay data={botStatus} /></div>
                    
                    <div className="bot-card chart-panel">
                        <div className="card-header-row" style={{display:'flex', justifyContent:'space-between', paddingBottom: '10px', borderBottom: '1px solid #2d3748', marginBottom: '10px'}}>
                             <h3 className="card-title" style={{margin:0, fontSize:'0.9rem'}}>Live Market Data</h3>
                             <button onClick={handleRefreshChart} style={{background:'none', border:'none', color:'#4ade80', cursor:'pointer', fontSize:'0.8rem'}}>↻ SYNC</button>
                        </div>
                        <div style={{height: '500px'}}>
                            {hasData ? (
                                <ChartIndependent results={chartData} symbol={formConfig.symbol} />
                            ) : (
                                <div style={{height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#64748b', gap:'15px'}}>
                                    <div className="spinner"></div>
                                    <p>Acquiring Exchange Data...</p>
                                    <button onClick={handleRefreshChart} style={{padding:'8px 16px', background:'#334155', border:'none', color:'#e2e8f0', borderRadius:'6px', cursor:'pointer'}}>Force Retry</button>
                                </div>
                            )}
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
                        
                        <DecisionStream logs={persistentLogs} />

                        <div className="logs-container" ref={logsContainerRef} style={{borderTop:'1px solid #334155', paddingTop:'10px'}}>
                            {visibleLogs.length > 0 ? visibleLogs.map((log, i) => {
                                const isThinking = log.message.toLowerCase().includes("checked combo");
                                return (
                                    <div key={i} className={`log-entry log-${log.type} ${isThinking ? 'log-thinking' : ''}`}>
                                        <span className="log-timestamp">{formatLogDate(log.timestamp)}</span>
                                        <span className="log-message"><ThinkingMessage text={log.message} /></span>
                                    </div>
                                )
                            }) : <p className="no-logs" style={{color:'#475569', fontStyle:'italic', padding:'10px'}}>Waiting for incoming data stream...</p>}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
