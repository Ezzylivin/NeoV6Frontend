// File: src/pages/Backtests.jsx
// 🚀 UPGRADE: v49.0 - "Smart Mapper" (Fixes Missing Strategy Names in Dropdowns)

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx"; 
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import "./Backtests.css"; 

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981"];

// --- 1. CONSTANTS ---
const STRATEGY_TYPE_TO_CODE_MAP = {
  "Moving Average Crossover": "sma_crossover",
  "RSI": "rsi_divergence",
  "MACD": "macd_crossover",
  "Stochastic Oscillator": "stochastic_crossover",
  "CCI": "cci_oversold",
  "Bollinger Bands": "bollinger_bands",
  "Ichimoku Cloud": "ichimoku_cloud",
  "ATR": "atr_breakout", 
  "On-Balance Volume": "obv_signal",
  "Parabolic SAR": "psar_signal"
};

const defaultFilterParams = {
    minAtrPct: 0, 
    trendFilterPeriod: 200, 
    minAdxLevel: 0,
    tslAtrMult: 3.5,
    regime_threshold: 25 
};

// --- 2. HELPER FUNCTIONS ---
const formatDate = dateString => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const formatChartDate = timestamp => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
};

const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

// --- 3. INITIAL STATE ---
const initialFormData = {
  strategyId: "", code: "", symbol: "", timeframe: "",
  startDate: getDefaultDates().startDate, 
  endDate: getDefaultDates().endDate,
  initialBalance: 1000, params: { ...defaultFilterParams },
  riskManagementMode: 'standard', riskPercentage: 1, growthCapitalTarget: 2000,
  mlMode: "off", mlModel: "", mlThreshold: 0.5, mlHorizon: 1
};

const initialComboData = {
  strategies: [ 
    { strategyId: "", code: "", params: { tslAtrMult: 3.5 } },
    { strategyId: "", code: "", params: { tslAtrMult: 3.5 } }
  ],
  params: { ...defaultFilterParams },
  comboConfig: { strategyCodes: [], combinationRule: 'AND' },
  symbol: "", timeframe: "", 
  startDate: getDefaultDates().startDate, 
  endDate: getDefaultDates().endDate,
  initialBalance: 1000,
  riskManagementMode: 'standard', riskPercentage: 1, growthCapitalTarget: 2000,
  mlMode: "off", mlModel: "", mlThreshold: 0.5, mlHorizon: 1
};

// --- 4. COMPONENTS ---
const MetricsDisplay = ({ metrics }) => {
  if (!metrics) return <div className="metrics-grid-loading">Calculating metrics...</div>;
  const formatValue = (value, format) => {
       if (value === undefined || value === null || isNaN(value)) return "N/A";
       switch (format) {
           case 'currency': return `$${value.toFixed(2)}`;
           case 'percent': return `${value.toFixed(2)}%`;
           case 'number': return value.toFixed(2);
           default: return value;
       }
  };
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
              {formatValue(m.value, m.format)}
          </span>
        </div>
      ))}
    </div>
  );
};

const CommonBacktestInputs = ({ data, onChange, options, availableModelData, isCombo = false }) => {
    const symbolOptions = options?.symbolOptions || [];
    const timeframeOptions = options?.timeframeOptions || [];
    const allModelOptions = options?.modelOptions || []; 

    const handleParamChange = (e) => {
        const { name, value, type } = e.target;
        let val = value;
        if (type === 'number') val = (value === '' || value === null) ? 0 : parseFloat(value);
        const syntheticEvent = { target: { name: `param_${name}`, value: val, type: type } };
        onChange(syntheticEvent);
    };
    const handleGlobalChange = (e) => { onChange(e); };

    return (
        <>
            <div className="form-grid">
                <label>Symbol:
                    <select name="symbol" value={data.symbol} onChange={handleGlobalChange}>
                        <option value="">-- Select Symbol --</option>
                        {symbolOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </label>
                <label>Timeframe:
                    <select name="timeframe" value={data.timeframe} onChange={handleGlobalChange}>
                        <option value="">-- Select Timeframe --</option>
                        {timeframeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </label>
                <label>Initial Balance: <input type="number" name="initialBalance" value={data.initialBalance} onChange={handleGlobalChange} /></label>
            </div>
            
            <div className="form-grid">
                <label>Start Date: <input type="date" name="startDate" value={data.startDate} onChange={handleGlobalChange} /></label>
                <label>End Date: <input type="date" name="endDate" value={data.endDate} onChange={handleGlobalChange} /></label>
            </div>

            <fieldset style={{border:'1px solid #334155', padding:'15px', borderRadius:'8px', marginTop:'15px'}}>
                <legend style={{color:'#94a3b8', padding:'0 5px'}}>Risk Management</legend>
                <div className="form-grid">
                    <label>Mode:
                        <select name="riskManagementMode" value={data.riskManagementMode} onChange={handleGlobalChange}>
                            <option value="standard">Standard Risk %</option>
                            <option value="dynamic">Dynamic Growth</option>
                        </select>
                    </label>
                    <label>Risk %: <input type="number" name="riskPercentage" value={data.riskPercentage} onChange={handleGlobalChange} step="0.1" /></label>
                    <label>Max Pyramiding: <input type="number" name="maxPyramiding" value={data.params?.maxPyramiding || 1} onChange={handleParamChange} min="1" /></label>
                </div>
            </fieldset>

            <fieldset style={{border:'1px solid #334155', padding:'15px', borderRadius:'8px', marginTop:'15px'}}>
                <legend style={{color:'#94a3b8', padding:'0 5px'}}>Machine Learning</legend>
                <div className="form-grid">
                    <label>Mode:
                        <select name="mlMode" value={data.mlMode || "off"} onChange={handleGlobalChange}>
                            <option value="off">Off (Pure TA)</option>
                            <option value="predictions">Hybrid (TA + ML)</option>
                            <option value="on">Pure ML</option>
                        </select>
                    </label>
                    {data.mlMode !== 'off' && (
                        <>
                            <label>Model:
                                <select name="mlModel" value={data.mlModel} onChange={handleGlobalChange}>
                                    <option value="">-- Select Model --</option>
                                    {allModelOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </label>
                            <label>Threshold: <input type="number" name="mlThreshold" value={data.mlThreshold} step="0.05" onChange={handleGlobalChange} /></label>
                        </>
                    )}
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

// --- MAIN PAGE ---
export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest } = useBacktest(); 
  const { loading = 'idle', error = null, options = {}, winners = [] } = state || {};

  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTab, setActiveTab] = useState('single');
  
  const [liveWinners, setLiveWinners] = useState([]);
  const [scanningWinners, setScanningWinners] = useState(false);

  // 🚀 STRATEGY OPTIONS (Base List)
  const strategyOptions = useMemo(() => {
    const dbStrats = options?.strategies || [];
    const baseStrats = Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code], idx) => ({
        _id: `base-${code}-${idx}`, name, code, params: {} 
    }));
    return [...baseStrats, ...dbStrats.map(s => ({...s, code: STRATEGY_TYPE_TO_CODE_MAP[s.params?.strategyType] || "unknown"}))];
  }, [options]);
  
  const symbolOptions = useMemo(() => options?.symbols || [], [options]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);
  const modelOptions = useMemo(() => options?.models || [], [options]);

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

  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    let val = (type === 'checkbox' ? e.target.checked : value);
    if (type === 'number') val = (value === '' || value === null) ? 0 : parseFloat(value);
    
    if (name === 'strategyId') { 
      const selectedStrategy = strategyOptions.find(s => s._id === val); 
      if (selectedStrategy) {
        setFormData(prev => ({ ...prev, strategyId: val, code: selectedStrategy.code, params: { ...prev.params, ...(selectedStrategy.params || {}) } })); 
      }
    } else if (name.startsWith("param_")) {
      setFormData(prev => ({ ...prev, params: { ...prev.params, [name.substring(6)]: val } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleComboChange = (e) => {
    const { name, value, type } = e.target;
    let val = (type === 'checkbox' ? e.target.checked : value);
    if (type === 'number') val = (value === '' || value === null) ? 0 : parseFloat(value);
    
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

  const handleRunBacktest = async (e) => {
    e.preventDefault();
    setBacktestResults({ main: null, individuals: [] });
    try {
      const res = await runNewBacktest?.(formData);
      if (res) setBacktestResults({ main: res, individuals: [] });
    } catch (err) { console.error(err); }
  };

  const handleRunComboBacktest = async (e) => {
    e.preventDefault();
    setBacktestResults({ main: null, individuals: [] });
    try {
      const comboRes = await runComboBacktest?.(comboData);
      if (comboRes) setBacktestResults(comboRes);
    } catch (err) { console.error(err); }
  };

  const { combinedEquityCurve, combinedMetrics, mainResult } = useMemo(() => {
       try {
         const mainResult = backtestResults?.main || backtestResults?.combinedResult;
         const curve = mainResult?.equityCurve || mainResult?.equity;
         if (mainResult?.metrics && curve) { 
           return {
             combinedEquityCurve: curve.map(p => ({ ...p, timestamp: new Date(p.timestamp).getTime() })), 
             combinedMetrics: mainResult.metrics || null,
             mainResult: mainResult
           };
         }
         return { combinedEquityCurve: [], combinedMetrics: null, mainResult:null };
       } catch (e) { return { combinedEquityCurve: [], combinedMetrics: null, mainResult:null }; }
  }, [backtestResults]);

  const pieData = useMemo(() => {
    if (!combinedMetrics || typeof combinedMetrics.winningTrades !== 'number') return [];
    const wins = combinedMetrics.winningTrades;
    const losses = combinedMetrics.totalTrades - wins;
    return (wins <= 0 && losses <= 0) ? [] : [{ name: "Wins", value: wins }, { name: "Losses", value: losses }];
  }, [combinedMetrics]);

  return (
    <div className="backtest-container">
      <h2 className="header">Strategy Backtester</h2>
      
      <div className="bot-card control-panel">
        <div className="panel-header">
            <h3 className="card-title">Configuration</h3>
        </div>
        
        {/* 🚀 FILE SCANNER */}
        <div className="form-group" style={{ marginBottom: '20px', padding: '15px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ color: '#4ade80', fontWeight: 'bold', margin: 0 }}>🏆 Load Optimized Strategy (ML)</label>
                <button type="button" onClick={fetchWinners} disabled={scanningWinners} style={{background:'none', border:'none', cursor:'pointer', color:'#4ade80', fontSize:'0.8rem'}}>
                    {scanningWinners ? 'Scanning...' : '🔄 Scan'}
                </button>
            </div>
            <select value={selectedWinnerId} onChange={handleWinnerSelect} style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', border: '1px solid #475569' }}>
                <option value="">-- Select a Golden Strategy --</option>
                {liveWinners.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
        </div>

        <div className="tabs" style={{marginBottom:'20px'}}>
            <button className={activeTab === 'single' ? 'active' : ''} onClick={() => setActiveTab('single')} style={{marginRight:'10px', padding:'8px 16px'}}>Single Strategy</button>
            <button className={activeTab === 'combo' ? 'active' : ''} onClick={() => setActiveTab('combo')} style={{padding:'8px 16px'}}>Combo Strategy</button>
        </div>

        {activeTab === 'single' && (
            <form onSubmit={handleRunBacktest} className="backtest-form">
              <label>Strategy:
                  <select name="strategyId" value={formData.strategyId} onChange={handleFormChange} disabled={!strategyOptions.length}>
                    <option value="">-- Select TA Strategy --</option>
                    {strategyOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
              </label>
              <CommonBacktestInputs data={formData} onChange={handleFormChange} options={{ symbolOptions, timeframeOptions, modelOptions }} availableModelData={{}} isCombo={false} />
              <button type="submit" className="button-start" disabled={loading !== 'idle'}>{loading !== 'idle' ? 'Processing...' : 'Run Backtest'}</button>
            </form>
        )}

        {activeTab === 'combo' && (
             <form onSubmit={handleRunComboBacktest} className="backtest-form">
                <CommonBacktestInputs data={comboData} onChange={handleComboChange} options={{ symbolOptions, timeframeOptions, modelOptions }} availableModelData={{}} isCombo={true} />
                <div className="combo-strategy-list" style={{marginTop:'20px'}}>
                    {comboData.strategies.map((config, idx) => (
                    <ComboStrategyCard key={idx} idx={idx} config={config} strategies={strategyOptions} onChange={handleStrategyConfigChange} onRemove={removeStrategyCard} disableRemove={comboData.strategies.length <= 1} />
                  ))}
                </div>
                <button type="button" onClick={addStrategyCard} style={{marginTop:'10px', marginBottom:'20px', width:'100%', padding:'10px', background:'#3b82f6', color:'white', border:'none', borderRadius:'6px'}}>+ Add Strategy Layer</button>
                <button type="submit" className="button-start" disabled={loading !== 'idle'}>{loading !== 'idle' ? 'Processing...' : 'Run Combo Backtest'}</button>
             </form>
        )}
      </div>

      {(loading !== 'idle' || combinedMetrics || error) && (
          <div className="bot-card results-panel" style={{marginTop:'30px'}}>
            <h3 className="card-title">Backtest Results</h3>
            {loading !== 'idle' && <div className="loading-overlay"><div className="spinner"></div></div>}
            
            {loading === 'idle' && combinedMetrics && !error && (
              <>
                <MetricsDisplay metrics={combinedMetrics} />
                
                {/* 🚀 PREMIUM CHART VISUALIZER (Now 850px Tall) */}
                {mainResult && mainResult.candleData?.length > 0 && (
                    <div style={{height: '850px', marginTop: '30px', marginBottom:'40px'}}>
                        <ChartIndependent results={mainResult} symbol={activeTab === 'single' ? formData.symbol : comboData.symbol} />
                    </div>
                )}

                <div className="charts-container" style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
                  <div className="chart" style={{flex:1, minWidth:'300px'}}><h3>Equity Curve</h3><ResponsiveContainer width="100%" height={300}><LineChart data={combinedEquityCurve}><XAxis dataKey="timestamp" tickFormatter={formatChartDate} /><YAxis domain={['auto', 'auto']} /><Tooltip /><CartesianGrid stroke="#555" /><Line type="monotone" dataKey="balance" stroke="#8884d8" dot={false} /></LineChart></ResponsiveContainer></div>
                  <div className="chart" style={{flex:1, minWidth:'300px'}}><h3>Win / Loss Ratio</h3><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>{pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
                </div>
              </>
            )}
          </div>
      )}
    </div>
  );
}
