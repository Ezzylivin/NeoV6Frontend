// File: src/pages/Backtests.jsx
// UPGRADED: Added UI inputs for new Hybrid/Filter modes (AND/OR/Regime, Volatility, Trend).
// UPGRADED: Cleaned up form change handlers to correctly manage global vs. strategy-specific params.
// UPGRADED: Simplified form/combo state objects to use a single 'params' block for filters and SL/TP.
// UPGRADED: Simplified and corrected useEffect hooks to prevent re-renders and set defaults properly.
// UPGRADED: Combo test can now be run with a single strategy.
// (Other features and fixes from previous versions remain)

import React, { useState, useEffect, useMemo } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import "./Backtests.css";

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981"];

const formatDate = dateString => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

// --- UPGRADED: Added default filter params ---
const defaultFilterParams = {
    SL: 5.0,
    TP: 10.0,
    minAtrPct: 0, // Default 0 = off
    trendFilterPeriod: 200,
    hybridMode: 'AND' // Default to the new "AND" logic
};

const initialFormData = {
  code: "", symbol: "", timeframe: "1h", startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate, initialBalance: 1000, 
  params: { ...defaultFilterParams }, // Use new defaults
  riskManagementMode: 'standard', riskPercentage: 1, growthCapitalTarget: 2000,
  mlMode: "off", mlModel: "", mlThreshold: 0.5, mlHorizon: 1
};

const initialComboData = {
  strategies: [
    { code: "", params: { SL: 5.0, TP: 10.0 } }, // Per-strategy SL/TP
    { code: "", params: { SL: 5.0, TP: 10.0 } }
  ],
  params: { // Global filter params for the whole combo
    minAtrPct: 0,
    trendFilterPeriod: 200,
    hybridMode: 'AND'
  },
  symbol: "", timeframe: "1h",
  startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate,
  initialBalance: 1000, riskManagementMode: 'standard',
  riskPercentage: 1, growthCapitalTarget: 2000,
  mlMode: "off", mlModel: "", mlThreshold: 0.5, mlHorizon: 1
};

// --- Child Components ---
const MetricsDisplay = ({ metrics }) => {
  if (!metrics) return <div className="metrics-grid-loading">Calculating metrics...</div>;
  const items = [
    { label: "Total Return", value: metrics.totalReturn, format: 'percent' },
    { label: "Profit Factor", value: metrics.profitFactor, format: 'number' },
    { label: "Max Drawdown", value: metrics.maxDrawdown, format: 'percent' },
    { label: "Win Rate", value: metrics.winRate, format: 'percent' },
    { label: "Total Trades", value: metrics.totalTrades, format: 'number' },
    { label: "Avg. Win", value: metrics.averageWin, format: 'currency' },
    { label: "Avg. Loss", value: metrics.averageLoss, format: 'currency' },
    { label: "Final Balance", value: metrics.finalBalance, format: 'currency' }
  ];
  return (<div className="metrics-grid"> {items.map(m => (<div key={m.label} className="metric-item"> <span className="metric-label">{m.label}</span> <span className="metric-value"> {typeof m.value === "number" ? (m.format === 'currency' ? `$${m.value.toFixed(2)}` : m.format === 'percent' ? `${m.value.toFixed(2)}%` : m.value.toFixed(2)) : "N/A"} </span> </div>))} </div>);
};

// --- UPGRADED: This component now contains all new filter inputs ---
const CommonBacktestInputs = ({ data, onChange, options, isCombo = false }) => {
    const symbolOptions = options.symbolOptions || [];
    const timeframeOptions = options.timeframeOptions || [];
    const modelOptions = options.modelOptions || [];

    // This handler adds properties to the top-level `params` object
    const handleParamChange = (e) => {
        const { name, value, type } = e.target;
        const val = type === 'number' && value !== '' ? parseFloat(value) : value;
        // This synthetic event targets the 'params' object in the form state
        const syntheticEvent = { target: { name: `param_${name}`, value: val, type: type } };
        onChange(syntheticEvent);
    };

    // This handler is for top-level properties (symbol, mlMode, etc.)
    const handleGlobalChange = (e) => {
        onChange(e);
    };

    // Determine the correct params object to read from
    // For Combo, filters are global (data.params) but SL/TP are per-strategy (not here)
    // For Single, all params are in data.params
    const params = data.params || {};

    return (
        <>
            <label>Symbol:
                <select name="symbol" value={data.symbol} onChange={handleGlobalChange} disabled={!symbolOptions.length}>
                    <option value="">-- Select Symbol --</option>
                    {symbolOptions.length ? symbolOptions.map(s => <option key={s} value={s}>{s}</option>) : <option>Loading...</option>}
                </select>
            </label>
            <label>Timeframe:
                <select name="timeframe" value={data.timeframe} onChange={handleGlobalChange} disabled={!timeframeOptions.length}>
                    {timeframeOptions.length ? timeframeOptions.map(t => <option key={t} value={t}>{t}</option>) : <option>Loading...</option>}
                </select>
            </label>
            <label>Start Date: <input type="date" name="startDate" value={data.startDate} onChange={handleGlobalChange} /></label>
            <label>End Date: <input type="date" name="endDate" value={data.endDate} onChange={handleGlobalChange} /></label>
            <label>Initial Balance: <input type="number" name="initialBalance" value={data.initialBalance} onChange={handleGlobalChange} /></label>
            <fieldset>
                <legend>Risk Management</legend>
                <label>Mode:
                    <select name="riskManagementMode" value={data.riskManagementMode} onChange={handleGlobalChange}>
                        <option value="standard">Standard Risk %</option>
                        <option value="dynamic">Dynamic Growth Mode</option>
                    </select>
                </label>
                {data.riskManagementMode === 'standard' ? (<label>Risk Per Trade (%): <input type="number" name="riskPercentage" value={data.riskPercentage} onChange={handleGlobalChange} step="0.1" /> </label>) : (<> <label>Growth Capital Target ($): <input type="number" name="growthCapitalTarget" value={data.growthCapitalTarget} onChange={handleGlobalChange} /> </label> <label>Risk % (After Target): <input type="number" name="riskPercentage" value={data.riskPercentage} onChange={handleGlobalChange} step="0.1" /> </label> </>)}
            </fieldset>
            <fieldset>
                <legend>Machine Learning</legend>
                <label>Mode:
                    <select name="mlMode" value={data.mlMode || "off"} onChange={handleGlobalChange}>
                        <option value="off">Off (Pure TA)</option>
                        <option value="predictions">Hybrid (TA + ML Filter)</option>
                        <option value="on">On (Pure ML)</option>
                    </select>
                </label>
                {data.mlMode !== "off" && (
                    <>
                        <label>Model:
                            <select name="mlModel" value={data.mlModel} onChange={handleGlobalChange} disabled={!modelOptions.length}>
                                <option value="">-- Select Model --</option>
                                {modelOptions.length ? (
                                    modelOptions.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))
                                ) : (
                                    <option>Loading...</option>
                                )}
                            </select>
                        </label>
                        <label>Confidence Threshold: <input type="number" name="mlThreshold" value={data.mlThreshold || 0.5} step="0.01" min="0" max="1" onChange={handleGlobalChange} /> </label>
                        <label>Prediction Horizon: <input type="number" name="mlHorizon" value={data.mlHorizon || 1} step="1" min="1" onChange={handleGlobalChange} /> </label>
                        
                        {/* --- 🚀 UPGRADE 1: HYBRID LOGIC SELECTOR --- */}
                        {data.mlMode === 'predictions' && (
                            <label>Hybrid Logic:
                                <select 
                                    name="hybridMode" 
                                    value={params.hybridMode ?? 'AND'} 
                                    onChange={handleParamChange}
                                >
                                    <option value="AND">TA AND ML (Strict Filter)</option>
                                    <option value="OR">TA OR ML (Permissive)</option>
                                    <option value="Regime">TA as Regime Filter</option>
                                </select>
                            </label>
                        )}
                    </>
                )}
            </fieldset>

            {/* --- 🚀 UPGRADE 2 & 3: ADVANCED FILTERS --- */}
            <fieldset>
                <legend>Advanced Filters</legend>
                <label>Volatility Filter (Min ATR %):
                    <input 
                        type="number" 
                        name="minAtrPct" 
                        value={params.minAtrPct ?? 0} 
                        onChange={handleParamChange} 
                        step="0.05" 
                        min="0" 
                        title="Set to 0 to disable. e.g., 0.25 = only trade if 14-period ATR is > 0.25% of the close price."
                    />
                </label>
                
                {/* Trend Filter - Appears for Pure ML or Hybrid-Regime */}
                {(data.mlMode === 'on' || (data.mlMode === 'predictions' && params.hybridMode === 'Regime')) && (
                    <label>Trend Filter SMA Period:
                        <input 
                            type="number" 
                            name="trendFilterPeriod" 
                            value={params.trendFilterPeriod ?? 200} 
                            onChange={handleParamChange} 
                            step="1" 
                            min="1" 
                            title="e.g., 200. Only takes ML buy signals above SMA, sells below."
                        />
                    </label>
                )}
            </fieldset>

            {/* SL/TP inputs are only shown on the SINGLE tab form */}
            {!isCombo && (
                <>
                    <label>Stop Loss (%):
                        <input type="number" name="SL" value={params.SL ?? 1.0} onChange={handleParamChange} step="0.1" min="0" />
                    </label>
                    <label>Take Profit (%):
                        <input type="number" name="TP" value={params.TP ?? 2.0} onChange={handleParamChange} step="0.1" min="0" />
                    </label>
                </>
            )}
        </>
    );
};

const ComboStrategyCard = ({ idx, config, strategies = [], onChange, onRemove, disableRemove }) => {
    const handleChange = (e) => onChange(e, idx);
    return (
        <div className="combo-card">
            <div className="combo-card-header"><strong>Strategy #{idx + 1}</strong>
                {!disableRemove && <button type="button" onClick={() => onRemove(idx)}>✕</button>}
            </div>
            <div className="combo-card-body">
                <label>Strategy:
                    <select name="code" value={config.code} onChange={handleChange} disabled={!strategies.length}>
                        <option value="">-- Select --</option>
                        {strategies.length ? strategies.map(s => <option key={s.code} value={s.code}>{s.name}</option>) : <option>Loading...</option>}
                    </select>
                </label>
            {/* These are PER-STRATEGY SL/TP values */}
              <label>Stop Loss (%): <input type="number" name="param_SL" value={config.params?.SL ?? 1.0} onChange={handleChange} step="0.1" min="0" /></label>
              <label>Take Profit (%): <input type="number" name="param_TP" value={config.params?.TP ?? 2.0} onChange={handleChange} step="0.1" min="0" /></label>
            </div>
        </div>
    );
};

// --- Main Component ---
export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest } = useBacktest();
  const { loading = 'initial', error = null, options = {} } = state || {};

  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTab, setActiveTab] = useState('single');

  const strategyOptions = useMemo(() => options?.strategies || [], [options]);
  const symbolOptions = useMemo(() => options?.symbols || [], [options]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);
  const modelOptions = useMemo(() => options?.models || [], [options]);

 // Effect 1: Set default for the SINGLE strategy form
useEffect(() => {
    if (strategyOptions.length > 0 && !formData.code) {
      const defaultStrategy = strategyOptions[0];
      setFormData(prev => ({
        ...prev,
        code: defaultStrategy.code,
        params: { ...prev.params, ...defaultStrategy.params } // Merges defaults
      }));
    }
}, [strategyOptions]); // Only depends on strategies

// Effect 2: Set defaults for the COMBO strategy form
useEffect(() => {
    if (strategyOptions.length > 0 && comboData.strategies.every(c => !c.code)) {
      const newConfigs = comboData.strategies.map((config, index) => {
        const strategy = strategyOptions[index] || strategyOptions[0];
        return {
          code: strategy.code,
          params: { SL: 5.0, TP: 10.0, ...strategy.params } // Per-strategy params
        };
      });
      setComboData(prev => ({ ...prev, strategies: newConfigs }));
    }
}, [strategyOptions]); // Only depends on strategies

// Effect 3: Set default symbol for BOTH forms
useEffect(() => {
    if (symbolOptions.length && !formData.symbol) {
      const defaultSymbol = symbolOptions[0];
      setFormData(prev => ({ ...prev, symbol: defaultSymbol }));
s     setComboData(prev => ({ ...prev, symbol: defaultSymbol }));
    }
}, [symbolOptions, formData.symbol]); 

// Effect 4: Set default ML Model for BOTH forms
useEffect(() => {
    if (modelOptions.length && !formData.mlModel) {
      const defaultModelId = modelOptions[0].id;
      setFormData(prev => ({ ...prev, mlModel: defaultModelId }));
      setComboData(prev => ({ ...prev, mlModel: defaultModelId }));
    }
}, [modelOptions, formData.mlModel]);
  
  const { combinedEquityCurve, combinedMetrics } = useMemo(() => {
      try {
        // This logic handles both single and combo results
          const mainResult = backtestResults?.main || backtestResults?.combinedResult;
          if (mainResult) {
              return {
                  combinedEquityCurve: mainResult.equityCurve || [],
                  combinedMetrics: mainResult.metrics || null,
    .map(p => ({ ...p, timestamp: new Date(p.timestamp).getTime()})) // Ensure numeric timestamps
              };
          }
          return { combinedEquityCurve: [], combinedMetrics: null };
      } catch (e) {
          console.error("Error calculating results:", e);
          return { combinedEquityCurve: [], combinedMetrics: null };
      }
  }, [backtestResults]);

  const pieData = useMemo(() => {
      if (!combinedMetrics || combinedMetrics.winningTrades === undefined) return [];
      const wins = combinedMetrics.winningTrades;
      const losses = combinedMetrics.totalTrades - wins;
      return [{ name: "Wins", value: wins }, { name: "Losses", value: losses }];
  }, [combinedMetrics]);

  if (loading === 'initial') {
    return <div className="dashboard-container"><h1>Loading Backtest Environment...</h1></div>;
  }

  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === 'number' && value !== '' ? parseFloat(value) : value;

    if (name === 'code') {
        const selectedStrategy = strategyOptions.find(s => s.code === value);
        setFormData(prev => ({
            ...prev,
            code: value,
            params: { ...prev.params, ...selectedStrategy?.params } // Merges, keeping existing SL/TP
        }));
    } else if (name.startsWith("param_")) {
        const paramName = name.substring(6);
        setFormData(prev => ({
            ...prev,
            params: { ...prev.params, [paramName]: val }
        }));
    } else {
        setFormData(prev => ({ ...prev, [name]: val }));
    }
  };

  // --- UPGRADED: Handles both global (e.g. mlMode) and global param (e.g. minAtrPct) changes ---
TA   const handleComboChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === 'number' && value !== '' ? parseFloat(value) : value;

    if (name.startsWith("param_")) {
        const paramName = name.substring(6);
        setComboData(prev => ({
            ...prev,
            params: { ...prev.params, [paramName]: val } // Sets global params
TA       }));
    } else {
        setComboData(prev => ({ ...prev, [name]: val })); // Sets global props
    }
  };

  // --- UPGRADED: Only handles per-strategy code and per-strategy SL/TP ---
  const handleStrategyConfigChange = (e, index) => {
    const { name, value, type } = e.target;
    const isParam = name.startsWith("param_");
    const val = type === 'number' && value !== '' ? parseFloat(value) : value;
    const updatedConfigs = [...comboData.strategies];
    const currentConfig = updatedConfigs[index];

    if (isParam) {
      const paramName = name.substring(6); // e.g., "SL" or "TP"
      // Only update per-strategy params
      currentConfig.params = { ...currentConfig.params, [paramName]: val };
    } else if (name === 'code') {
      const selectedStrategy = strategyOptions.find(s => s.code === value);
      currentConfig.code = value;
      // Reset params, but keep existing SL/TP if they were set
      currentConfig.params = { 
        SL: currentConfig.params?.SL || 5.0, 
        TP: currentConfig.params?.TP || 10.0, 
        ...selectedStrategy?.params 
      };
    }
    setComboData(prev => ({ ...prev, strategies: updatedConfigs }));
  };

  const addStrategyCard = () => {
    const defaultStrategy = strategyOptions[0] || {};
    const newCard = { code: defaultStrategy.code, params: { SL: 5.0, TP: 10.0, ...defaultStrategy.params } };
    setComboData(prev => ({ ...prev, strategies: [...prev.strategies, newCard] }));
  };

  const removeStrategyCard = (index) => {
    if (comboData.strategies.length <= 1) return; // Allow 1 strategy in combo
    setComboData(prev => ({ ...prev, strategies: prev.strategies.filter((_, i) => i !== index) }));
  };

  const handleRunBacktest = async (e) => {
    e.preventDefault();
    if (formData.mlMode !== 'off' && !formData.mlModel) {
        alert("Please select an ML model before running the backtest.");
        return;
    }
    setBacktestResults({ main: null, individuals: [] });
  m   try {
      const res = await runNewBacktest?.(formData);
      if (res) {
        setBacktestResults({ main: res, individuals: [] }); 
      }
    } catch (err) {
      console.error("Single backtest failed:", err);
    }
  };

  const handleRunComboBacktest = async (e) => {
    e.preventDefault();
    
    if (comboData.mlMode !== 'off' && !comboData.mlModel) {
M       alert("Please select an ML model before running the combo backtest.");
        return;
    }
    
    if (comboData.strategies.filter(s => s.code && s.code.trim() !== "").length < 1) { // Allow 1 strategy
        console.error("Combo backtest validation failed: At least one strategy must be selected.");
        return;
    }

    setBacktestResults({ main: null, individuals: [] }); // Reset results

    try {
      const comboRes = await runComboBacktest?.(comboData); 
      if (comboRes) {
        setBacktestResults(comboRes);// This expects { combinedResult: ..., individualResults: [...] }
      }
    } catch (err) {
      console.error("Combo backtest failed:", err);
    }
  };

  const getButtonText = (loadingState) => {
    switch (loadingState) {
        case 'running_ml':
            return 'Fetching ML Predictions...';
s       case 'running_backtest':
            return 'Running Backtest...';
        case 'running':
        case 'running_combo':
            return 'Processing...';
        default:
            return 'Run Backtest';
    }
  };

  const isComboSubmitDisabled = loading !== 'idle' ||
                          
                               !strategyOptions.length ||
                               comboData.strategies.filter(s => s.code && s.code.trim() !== "").length < 1;

  return (
    <div className="dashboard-container">
      <h1>Backtests</h1>
      {error && <div className="error-box"><h4>Error</h4><p>{error.message}</p></div>}
      <div className="backtest-main">
        <div className="backtest-forms">
          <div className="tabs">
            <button className={activeTab === 'single' ? 'active' : ''} onClick={() => setActiveTab('single')}>Single Strategy</button>
            <button className={activeTab === 'combo' ? 'active' : ''} onClick={() => setActiveTab('combo')}>Combo Strategy</button>
          </div>
          {activeTab === 'single' && (
            <form onSubmit={handleRunBacktest} className="backtest-form">
              <label>Strategy:
                <select name="code" value={formData.code} onChange={handleFormChange} disabled={!strategyOptions.length}>
                  <option value="">-- Select --</option>
                  {strategyOptions.length ? strategyOptions.map(s => <option key={s.code} value={s.code}>{s.name}</option>) : <option>Loading...</option>}
                </select>
              </label>
              <CommonBacktestInputs data={formData} onChange={handleFormChange} options={{ symbolOptions, timeframeOptions, modelOptions }} isCombo={false} />
April             <button type="submit" disabled={loading !== 'idle' || !strategyOptions.length}>
                {getButtonText(loading)}
              </button>
            </form>
          )}
          {activeTab === 'combo' && (
            <form onSubmit={handleRunComboBacktest} className="backtest-form">
              <CommonBacktestInputs data={comboData} onChange={handleComboChange} options={{ symbolOptions, timeframeOptions, modelOptions }} isCombo={true} />
              <div className="combo-strategy-list">
                {comboData.strategies.map((config, idx) => (
s                 <ComboStrategyCard
                    key={idx}
                    idx={idx}
                    config={config}
                    strategies={strategyOptions}
M                   onChange={handleStrategyConfigChange}
                    onRemove={removeStrategyCard}
                    disableRemove={comboData.strategies.length <= 1}
                  />
                ))}
              </div>
s             <button type="button" onClick={addStrategyCard} disabled={loading !== 'idle' || !strategyOptions.length}>Add Strategy</button>
              <button type="submit" disabled={isComboSubmitDisabled}>
    foo           {loading === 'running_ml' ? 'Fetching ML...' : loading.startsWith('running') ? 'Running...' : 'Run Combo Backtest'}
              </button>
            </form>
          )}
        </div>
        {(loading !== 'idle' || combinedMetrics) && (
          <div className="results-section">
            <h2>Backtest Results</h2>
            {loading !== 'idle' && <div className="loading-overlay"><h3>{getButtonText(loading)}</h3></div>}
            {combinedMetrics && (
              <>
                <MetricsDisplay metrics={combinedMetrics} />
s               <div className="charts-container">
                  <div className="chart">
                    <h3>Equity Curve</h3>
static                   {combinedEquityCurve?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={combinedEquityCurve}><XAxis dataKey="timestamp" tickFormatter={formatDate} /><YAxis domain={['auto', 'auto']} /><Tooltip /><CartesianGrid stroke="#333" /><Line type="monotone" dataKey="balance" stroke="#8884d8" dot={false} /></LineChart>
                      </ResponsiveContainer>
                    ) : <p>No data available for chart.</p>}
                  </div>
                  <div className="chart">
                    <h3>Win / Loss Distribution</h3>
s                   {pieData?.length > 0 && pieData.some(d => d.value > 0) ? (
        _temp_value           <ResponsiveContainer width="100%" height={300}>
                        <PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>{pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip /><Legend /></PieChart>
M                     </ResponsiveContainer>
                    ) : <p>No data available for chart.</p>}
          S       </div>
                </div>
              </>
      s     )}
          </div>
        )}
      </div>
    </div>
  );
}
