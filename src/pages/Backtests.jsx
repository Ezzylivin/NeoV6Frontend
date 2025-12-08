// File: src/pages/Backtests.jsx
// 🚀 UPGRADE: v64.0 - "Max Pyramiding Restored"
// Fixes: UI Input for Pyramiding was missing.

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import api from "../api/apiClient"; 
import "./Backtests.css"; 

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981"];

// --- 1. MAPPINGS & CONSTANTS ---
const STRATEGY_TYPE_TO_CODE_MAP = {
  "Moving Average Crossover": "sma_crossover", "RSI": "rsi_divergence", "MACD": "macd_crossover",
  "Stochastic Oscillator": "stochastic_crossover", "CCI": "cci_oversold", "Bollinger Bands": "bollinger_bands",
  "Ichimoku Cloud": "ichimoku_cloud", "ATR": "atr_breakout", "On-Balance Volume": "obv_signal", "Parabolic SAR": "psar_signal"
};

const defaultFilterParams = { minAtrPct: 0, trendFilterPeriod: 200, minAdxLevel: 0, tslAtrMult: 3.5, regime_threshold: 25 };

// --- 2. HELPER FUNCTIONS ---
const formatDate = dateString => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

const formatChartDate = timestamp => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? '' : `${date.getMonth()+1}/${date.getDate()}`;
};

const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

const downloadCSV = (trades) => {
    if (!trades || trades.length === 0) return alert("No trades to export.");
    const headers = ["Entry Time", "Exit Time", "Type", "Entry Price", "Exit Price", "Profit", "Reason"];
    const rows = trades.map(t => [t.entryTime, t.exitTime, t.position, t.price, t.exitPrice, t.profit.toFixed(2), t.type]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", "backtest_trades.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

// --- 3. INITIAL STATES ---
const initialFormData = {
  strategyId: "", code: "", symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate,
  initialBalance: 1000, params: { ...defaultFilterParams, maxPyramiding: 1 }, // Default to 1
  riskManagementMode: 'standard', riskPercentage: 1, growthCapitalTarget: 2000,
  mlMode: "off", mlModel: "", mlThreshold: 0.5, mlHorizon: 1
};

const initialComboData = {
  strategies: [ { strategyId: "", code: "", params: { tslAtrMult: 3.5 } }, { strategyId: "", code: "", params: { tslAtrMult: 3.5 } } ],
  params: { ...defaultFilterParams, maxPyramiding: 1 }, 
  comboConfig: { strategyCodes: [], combinationRule: 'AND' },
  symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate, initialBalance: 1000,
  riskManagementMode: 'standard', riskPercentage: 1, growthCapitalTarget: 2000, mlMode: "off", mlModel: "", mlThreshold: 0.5, mlHorizon: 1
};

// --- 4. SUB-COMPONENTS ---
const MonthlyHeatmap = ({ equityCurve }) => {
    if (!equityCurve || equityCurve.length === 0) return null;
    const monthlyReturns = {};
    equityCurve.forEach((point) => {
        const date = new Date(point.timestamp);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyReturns[monthKey]) monthlyReturns[monthKey] = { start: point.balance, end: point.balance };
        monthlyReturns[monthKey].end = point.balance;
    });
    return (
        <div className="bot-card" style={{marginTop:'20px'}}>
            <h3 className="card-title">Monthly Performance</h3>
            <div className="heatmap-grid">
                {Object.keys(monthlyReturns).sort().map(month => {
                    const data = monthlyReturns[month];
                    const ret = ((data.end - data.start) / data.start) * 100;
                    const bg = ret >= 0 ? `rgba(34, 197, 94, ${Math.min(ret/10, 1)})` : `rgba(239, 68, 68, ${Math.min(Math.abs(ret)/10, 1)})`;
                    return (<div key={month} className="heatmap-cell" style={{backgroundColor: bg, border: '1px solid #334155'}}><div className="month-label">{month}</div><div className="month-val">{ret > 0 ? '+' : ''}{ret.toFixed(2)}%</div></div>)
                })}
            </div>
        </div>
    );
};

const MetricsDisplay = ({ metrics }) => {
  if (!metrics) return null;
  const items = [
    { label: "Total Return", value: metrics.totalReturn, format: 'percent' },
    { label: "Profit Factor", value: metrics.profitFactor, format: 'number' },
    { label: "Max Drawdown", value: metrics.maxDrawdown, format: 'percent' },
    { label: "Win Rate", value: metrics.winRate, format: 'percent' },
    { label: "Total Trades", value: metrics.totalTrades, format: null },
    { label: "Avg. Win", value: metrics.averageWin, format: 'currency' },
    { label: "Avg. Loss", value: metrics.averageLoss, format: 'currency' },
    { label: "Final Balance", value: metrics.finalBalance, format: 'currency' }
  ];
  return (
    <div className="metrics-grid">
      {items.map(m => (
        <div key={m.label} className="metric-item">
          <span className="metric-label">{m.label}</span>
          <span className="metric-value" style={{color: (m.label.includes("Return") || m.label.includes("Balance")) && m.value < 0 ? '#ef4444' : '#f1f5f9'}}>
              {m.format === 'currency' ? `$${m.value?.toFixed(2)}` : m.format === 'percent' ? `${m.value?.toFixed(2)}%` : m.value?.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
};

const CommonBacktestInputs = ({ data, onChange, options, isCombo = false }) => {
    const handleGlobalChange = (e) => onChange(e);
    const handleParamChange = (e) => {
        const { name, value, type } = e.target;
        onChange({ target: { name: `param_${name}`, value: type === 'number' ? parseFloat(value) : value, type } });
    };
    const params = data.params || {};

    return (
        <>
            <div className="form-grid">
                <label>Symbol: <select name="symbol" value={data.symbol} onChange={handleGlobalChange}><option value="">-- Select --</option>{options.symbolOptions.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
                <label>Timeframe: <select name="timeframe" value={data.timeframe} onChange={handleGlobalChange}><option value="">-- Select --</option>{options.timeframeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
                <label>Initial Balance: <input type="number" name="initialBalance" value={data.initialBalance} onChange={handleGlobalChange} /></label>
            </div>
            <div className="form-grid">
                <label>Start Date: <input type="date" name="startDate" value={data.startDate} onChange={handleGlobalChange} /></label>
                <label>End Date: <input type="date" name="endDate" value={data.endDate} onChange={handleGlobalChange} /></label>
            </div>
            
            <fieldset style={{border:'1px solid #334155', padding:'15px', borderRadius:'8px', marginTop:'15px'}}>
                <legend style={{color:'#94a3b8', padding:'0 5px'}}>Risk & Machine Learning</legend>
                <div className="form-grid">
                    <label>Risk %: <input type="number" name="riskPercentage" value={data.riskPercentage} onChange={handleGlobalChange} step="0.1" /></label>
                    
                    {/* 🚀 RESTORED: MAX PYRAMIDING */}
                    <label>Max Pyramiding: <input type="number" name="maxPyramiding" value={params.maxPyramiding || 1} onChange={handleParamChange} min="1" max="10" /></label>

                    <label>ML Mode: <select name="mlMode" value={data.mlMode || "off"} onChange={handleGlobalChange}><option value="off">Off (Pure TA)</option><option value="predictions">Hybrid (TA+ML)</option><option value="on">Pure ML</option></select></label>
                    
                    {data.mlMode === 'predictions' && (
                        <label>Hybrid Logic:
                            <select name="hybridMode" value={params.hybridMode || "AND"} onChange={handleParamChange}>
                                <option value="AND">Strict (TA + ML Agree)</option>
                                <option value="OR">Loose (TA OR ML Signal)</option>
                                <option value="REGIME">Regime (ML Filters TA)</option>
                            </select>
                        </label>
                    )}

                    {data.mlMode !== 'off' && (
                        <>
                            <label>Model: <select name="mlModel" value={data.mlModel} onChange={handleGlobalChange}><option value="">-- Select --</option>{options.modelOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
                            <label>Threshold: <input type="number" name="mlThreshold" value={data.mlThreshold} step="0.05" onChange={handleGlobalChange} /></label>
                        </>
                    )}
                    
                    {params.hybridMode === 'REGIME' && <label>Regime Thresh: <input type="number" name="regime_threshold" value={params.regime_threshold ?? 25} onChange={handleParamChange} step="1" /></label>}
                </div>
            </fieldset>

            <fieldset style={{border:'1px solid #334155', padding:'15px', borderRadius:'8px', marginTop:'15px'}}>
                <legend style={{color:'#94a3b8', padding:'0 5px'}}>Advanced Filters</legend>
                <div className="form-grid">
                    <label>Volatility Filter (Min ATR %): <input type="number" name="minAtrPct" value={params.minAtrPct ?? 0} onChange={handleParamChange} step="0.05" /></label>
                    <label>Chop Filter (Min ADX): <input type="number" name="minAdxLevel" value={params.minAdxLevel ?? 0} onChange={handleParamChange} step="1" /></label>
                    <label>Trailing Stop (ATR Mult): <input type="number" name="tslAtrMult" value={params.tslAtrMult ?? 0} onChange={handleParamChange} step="0.1" /></label>
                    <label>Trend Filter SMA: <input type="number" name="trendFilterPeriod" value={params.trendFilterPeriod ?? 200} onChange={handleParamChange} step="1" /></label>
                </div>
            </fieldset>
        </>
    );
};

const ComboStrategyCard = ({ idx, config, strategies = [], onChange, onRemove, disableRemove }) => {
  const handleChange = (e) => onChange(e, idx);
  return (
    <div className="bot-card" style={{padding:'15px', background:'#0f172a', border:'1px solid #334155'}}>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
        <strong>Strategy #{idx + 1}</strong>
        {!disableRemove && <button type="button" onClick={() => onRemove(idx)} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer'}}>✕</button>}
      </div>
      <label>Strategy:
          <select name="strategyId" value={config.strategyId} onChange={handleChange} disabled={!strategies.length} style={{width:'100%', padding:'8px', background:'#1e293b', color:'white', border:'1px solid #475569'}}>
            <option value="">-- Select --</option>
            {strategies.length ? strategies.map(s => <option key={s._id} value={s._id}>{s.name}</option>) : <option disabled>Loading...</option>}
          </select>
      </label>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest } = useBacktest(); 
  const { loading = 'idle', error = null, options = {}, winners = [] } = state || {};

  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null });
  const [activeTab, setActiveTab] = useState('single');
  const [liveWinners, setLiveWinners] = useState([]);
  const [scanningWinners, setScanningWinners] = useState(false);

  // 🔄 Loaders
  const strategyOptions = useMemo(() => {
    const dbStrats = options?.strategies || [];
    const baseStrats = Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code], idx) => ({ _id: `base-${code}-${idx}`, name, code, params: {} }));
    return [...baseStrats, ...dbStrats.map(s => ({...s, code: STRATEGY_TYPE_TO_CODE_MAP[s.params?.strategyType] || "unknown"}))];
  }, [options]);
  
  const symbolOptions = useMemo(() => options?.symbols || [], [options]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);
  const modelOptions = useMemo(() => options?.models || [], [options]);

  const fetchWinners = async () => {
      setScanningWinners(true);
      try {
          const token = localStorage.getItem("token");
          const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners", { headers: { Authorization: `Bearer ${token}` } });
          if (res.data) setLiveWinners(res.data);
      } catch (err) { console.error(err); } 
      finally { setScanningWinners(false); }
  };
  useEffect(() => { fetchWinners(); }, []);

  // 📂 File Adapter
  const handleWinnerSelect = (e) => {
      const filename = e.target.value;
      setSelectedWinnerId(filename);
      const selectedWinner = liveWinners.find(w => w.id === filename);
      if (!selectedWinner || !selectedWinner.config) return;
      
      const data = selectedWinner.config;
      let symbol = data.symbol || "BTC-USD";
      let timeframe = data.timeframe || "1h";
      if(!data.symbol && filename.includes('_')) {
           const parts = filename.split('_'); if(parts[1]) symbol = parts[1]; if(parts[2]) timeframe = parts[2];
      }

      let strategies = (Array.isArray(data.strategies) ? data.strategies : Array.isArray(data) ? data : []).map(s => {
          const code = (typeof s === 'string') ? s : (s.code || "unknown");
          const params = (typeof s === 'string') ? {} : (s.params || s);
          const matchedOption = strategyOptions.find(opt => opt.code === code);
          return { strategyId: matchedOption ? matchedOption._id : "", code, params };
      });

      let mlMode = data.mlMode || "off";
      let mlModel = data.params?.mlModel || data.mlModel || "";
      if (mlModel && mlMode === "off") mlMode = "predictions";
      if (!mlModel && mlMode !== "off") mlModel = 'btc_1h_xgboost_model'; 

      setActiveTab('combo');
      setComboData(prev => ({
          ...prev, symbol, timeframe, isCombo: true, strategies,
          comboConfig: { strategyCodes: strategies.map(s => s.code), combinationRule: data.params?.hybridMode || 'OR' },
          mlMode, mlModel, mlThreshold: Number(data.mlThreshold) || 0.5,
          params: { ...data.params, riskPercentage: Number(data.riskPercentage), maxPyramiding: Number(data.maxPyramiding) }
      }));
  };

  // 💾 SAVE STRATEGY TO DB
  const handleSaveStrategy = async () => {
    const name = prompt("Enter a name for this strategy setup:");
    if (!name) return;

    const config = activeTab === 'single' ? formData : comboData;
    const payload = {
        name,
        symbol: config.symbol,
        timeframe: config.timeframe,
        initialBalance: config.initialBalance,
        strategies: activeTab === 'single' 
            ? [{ code: config.code, params: config.params }] 
            : config.strategies.map(s => ({ code: s.code, params: s.params })),
        comboConfig: activeTab === 'combo' ? config.comboConfig : null,
        params: config.params,
        mlMode: config.mlMode,
        mlModel: config.mlModel,
        mlThreshold: config.mlThreshold,
        isCombo: activeTab === 'combo'
    };

    try {
        await api.post('/strategies', payload);
        alert("✅ Strategy saved successfully! Check the Live Bot to load it.");
    } catch (e) {
        console.error(e);
        alert("❌ Error saving: " + (e.response?.data?.message || e.message));
    }
  };

  // Handlers
  const handleFormChange = (e, setFunc) => {
    const { name, value, type } = e.target;
    let val = type === 'number' ? parseFloat(value) : value;
    if (name === 'strategyId') { 
        const strat = strategyOptions.find(s => s._id === val);
        if (strat) setFunc(prev => ({ ...prev, strategyId: val, code: strat.code, params: { ...prev.params, ...strat.params } })); 
    } else if (name.startsWith("param_")) {
        setFunc(prev => ({ ...prev, params: { ...prev.params, [name.substring(6)]: val } }));
    } else {
        setFunc(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleComboChange = (e) => {
    const { name, value, type } = e.target;
    let val = type === 'number' ? parseFloat(value) : value;
    if (name.startsWith("param_")) {
      setComboData(prev => ({ ...prev, params: { ...prev.params, [name.substring(6)]: val } }));
    } else {
      setComboData(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleStrategyConfigChange = (e, index) => {
    const { name, value } = e.target;
    const updatedStrategies = [...comboData.strategies];
    const currentConfig = { ...updatedStrategies[index] };
    if (name === 'strategyId') { 
      const selectedStrategy = strategyOptions.find(s => s._id === value);
      if (selectedStrategy) {
          currentConfig.strategyId = value;
          currentConfig.code = selectedStrategy.code;
          currentConfig.params = { ...(selectedStrategy.params || {}), ...currentConfig.params };
      }
    }
    updatedStrategies[index] = currentConfig;
    setComboData(prev => ({ ...prev, strategies: updatedStrategies }));
  };

  const addStrategyCard = () => {
    const defaultStrategy = strategyOptions[0] || {};
    setComboData(prev => ({ ...prev, strategies: [...prev.strategies, { strategyId: defaultStrategy._id || "", code: defaultStrategy.code || "", params: {} }] }));
  };

  const removeStrategyCard = (index) => {
    if (comboData.strategies.length <= 1) return;
    setComboData(prev => ({ ...prev, strategies: prev.strategies.filter((_, i) => i !== index) }));
  };

  const handleRun = async (e, isCombo) => {
    e.preventDefault();
    setBacktestResults({ main: null });
    try {
      const res = isCombo ? await runComboBacktest?.(comboData) : await runNewBacktest?.(formData);
      if (res) setBacktestResults(res.combinedResult ? res : { main: res });
    } catch (err) { console.error(err); }
  };

  // 🚀 DATA PROCESSING
  const { processedData, combinedMetrics, mainResult } = useMemo(() => {
       const res = backtestResults.main || backtestResults.combinedResult;
       if (!res || !res.metrics) return { processedData: [], combinedMetrics: null, mainResult: null };
       
       const initialBalance = activeTab === 'single' ? formData.initialBalance : comboData.initialBalance;
       const startPrice = res.candleData?.[0]?.close || 1;
       
       const curve = (res.equityCurve || []).map((p, i) => {
           const candle = res.candleData?.[i] || res.candleData?.[res.candleData.length-1];
           const price = candle ? candle.close : startPrice;
           const buyHold = (price / startPrice) * initialBalance;
           return { timestamp: new Date(p.timestamp).getTime(), balance: p.balance, buyHold: buyHold };
       });

       return { processedData: curve, combinedMetrics: res.metrics, mainResult: res };
  }, [backtestResults]);

  const pieData = useMemo(() => {
    if (!combinedMetrics) return [];
    return [{ name: "Wins", value: combinedMetrics.winningTrades }, { name: "Losses", value: combinedMetrics.totalTrades - combinedMetrics.winningTrades }];
  }, [combinedMetrics]);

  return (
    <div className="backtest-container">
      <h2 className="header">Strategy Backtester</h2>
      
      <div className="bot-card control-panel">
        <div className="panel-header">
            <h3 className="card-title">Configuration</h3>
        </div>
        
        {/* 🚀 FILE LOADER */}
        <div className="form-group" style={{ marginBottom: '20px', padding: '15px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ color: '#4ade80', fontWeight: 'bold' }}>🏆 Load Alpha (ML)</label>
                <button onClick={fetchWinners} disabled={scanningWinners} style={{background:'none', border:'none', color:'#4ade80', cursor:'pointer'}}>{scanningWinners ? '...' : '🔄'}</button>
            </div>
            <select value={selectedWinnerId} onChange={handleWinnerSelect}><option value="">-- Select Golden Strategy --</option>{liveWinners.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
        </div>

        <div className="tabs" style={{marginBottom:'20px'}}>
            <button className={activeTab === 'single' ? 'active' : ''} onClick={() => setActiveTab('single')} style={{marginRight:'10px'}}>Single Strategy</button>
            <button className={activeTab === 'combo' ? 'active' : ''} onClick={() => setActiveTab('combo')}>Combo Strategy</button>
        </div>

        <form onSubmit={(e) => handleRun(e, activeTab === 'combo')} className="backtest-form">
            {activeTab === 'single' ? (
                <>
                    <label>Strategy: <select name="strategyId" value={formData.strategyId} onChange={(e) => handleFormChange(e, setFormData)}><option value="">-- Select TA Strategy --</option>{strategyOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select></label>
                    <CommonBacktestInputs data={formData} onChange={(e) => handleFormChange(e, setFormData)} options={{ symbolOptions, timeframeOptions, modelOptions }} />
                </>
            ) : (
                <>
                    <CommonBacktestInputs data={comboData} onChange={handleComboChange} options={{ symbolOptions, timeframeOptions, modelOptions }} isCombo={true} />
                    <div className="combo-strategy-list" style={{marginTop:'20px'}}>
                        {comboData.strategies.map((config, idx) => (<ComboStrategyCard key={idx} idx={idx} config={config} strategies={strategyOptions} onChange={handleStrategyConfigChange} onRemove={removeStrategyCard} disableRemove={comboData.strategies.length <= 1} />))}
                    </div>
                    <button type="button" onClick={addStrategyCard} style={{marginTop:'10px', marginBottom:'20px', width:'100%', padding:'10px', background:'#3b82f6', color:'white', border:'none', borderRadius:'6px'}}>+ Add Strategy Layer</button>
                </>
            )}
            <button type="submit" className="button-start" disabled={loading !== 'idle'} style={{marginTop:'20px'}}>{loading !== 'idle' ? 'Processing...' : 'Run Simulation'}</button>
        </form>
      </div>

      {(loading !== 'idle' || combinedMetrics || error) && (
          <div className="bot-card results-panel" style={{marginTop:'30px'}}>
            <h3 className="card-title">Backtest Results</h3>
            {loading !== 'idle' && <div className="loading-overlay"><div className="spinner"></div></div>}
            
            {loading === 'idle' && combinedMetrics && !error && (
              <>
                <div style={{display:'flex', justifyContent:'flex-end', gap:'10px', marginBottom:'15px'}}>
                    <button onClick={handleSaveStrategy} style={{background:'#22c55e', color:'white', border:'none', padding:'8px 16px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>💾 Save Strategy</button>
                    <button onClick={() => downloadCSV(mainResult.tradeBreakdown)} style={{background:'#3b82f6', color:'white', border:'none', padding:'8px 16px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>⬇ Export CSV</button>
                </div>

                <MetricsDisplay metrics={combinedMetrics} />
                
                {mainResult && mainResult.candleData?.length > 0 && (
                    <div style={{height: '850px', margin: '30px 0'}}>
                        <ChartIndependent results={mainResult} symbol={activeTab === 'single' ? formData.symbol : comboData.symbol} />
                    </div>
                )}

                <div className="charts-container" style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
                  <div className="chart" style={{flex:2, minWidth:'400px', background:'#161b28', padding:'15px', borderRadius:'12px', border:'1px solid #334155'}}>
                      <h3 style={{color:'#e2e8f0', marginBottom:'15px'}}>Equity vs Buy & Hold</h3>
                      <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={processedData}>
                              <XAxis dataKey="timestamp" tickFormatter={formatChartDate} tick={{ fill: '#94a3b8' }} stroke="#475569" />
                              <YAxis domain={['auto', 'auto']} tick={{ fill: '#94a3b8' }} stroke="#475569" />
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                              <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                              <Line type="monotone" dataKey="balance" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Strategy" />
                              <Line type="monotone" dataKey="buyHold" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Buy & Hold (BTC)" />
                          </LineChart>
                      </ResponsiveContainer>
                  </div>
                  <div className="chart" style={{flex:1, minWidth:'300px', background:'#161b28', padding:'15px', borderRadius:'12px', border:'1px solid #334155'}}>
                      <h3 style={{color:'#e2e8f0', marginBottom:'15px'}}>Win Ratio</h3>
                      <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} stroke="none">
                                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a' }} />
                              <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
                </div>

                <MonthlyHeatmap equityCurve={processedData} />
              </>
            )}
          </div>
      )}
    </div>
  );
}
