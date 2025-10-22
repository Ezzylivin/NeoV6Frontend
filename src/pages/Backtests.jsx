// File: src/pages/Backtests.jsx
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

const initialFormData = {
  code: "", symbol: "", timeframe: "1h", startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate, initialBalance: 1000, params: {},
  riskManagementMode: 'standard', riskPercentage: 1, growthCapitalTarget: 2000,
  mlMode: "off", mlModel: "", mlThreshold: 0.5, mlHorizon: 1
};

const initialComboData = {
  strategyConfigs: [
    { code: "", params: {} },
    { code: "", params: {} }
  ],
  symbol: "", timeframe: "1h",
  startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate,
  initialBalance: 1000, riskManagementMode: 'standard',
  riskPercentage: 1, growthCapitalTarget: 2000,
  mlMode: "off", mlModel: "", mlThreshold: 0.5, mlHorizon: 1
};

// --- Child Components ---
const MetricsDisplay = ({ metrics }) => {
  if (!metrics) return <div className="metrics-grid-loading">Calculating metrics...</div>;
  const items = [{ label: "Initial Balance", value: metrics.initialBalance, format: 'currency' }, { label: "Final Balance", value: metrics.finalBalance, format: 'currency' }, { label: "Total Profit", value: metrics.totalProfit, format: 'currency' }, { label: "Total Trades", value: metrics.totalTrades, format: 'number' }, { label: "Win Rate", value: metrics.winRate, format: 'percent' }, { label: "Max Drawdown", value: metrics.maxDrawdown, format: 'percent' }, { label: "Profit Factor", value: metrics.profitFactor, format: 'number' },];
  return (<div className="metrics-grid"> {items.map(m => (<div key={m.label} className="metric-item"> <span className="metric-label">{m.label}</span> <span className="metric-value"> {typeof m.value === "number" ? (m.format === 'currency' ? `$${m.value.toFixed(2)}` : m.format === 'percent' ? `${m.value.toFixed(2)}%` : m.value.toFixed(2)) : "N/A"} </span> </div>))} </div>);
};

const CommonBacktestInputs = ({ data, onChange, options }) => {
    const symbolOptions = options.symbolOptions || [];
    const timeframeOptions = options.timeframeOptions || [];
    const modelOptions = options.modelOptions || [];

    const handleParamChange = (e) => {
        const { name, value } = e.target;
        const syntheticEvent = { target: { name: `param_${name}`, value: value, type: 'number' } };
        onChange(syntheticEvent);
    };

    return (
        <>
            <label>Symbol:
                <select name="symbol" value={data.symbol} onChange={onChange} disabled={!symbolOptions.length}>
                    {symbolOptions.length ? symbolOptions.map(s => <option key={s} value={s}>{s}</option>) : <option>Loading...</option>}
                </select>
            </label>
            <label>Timeframe:
                <select name="timeframe" value={data.timeframe} onChange={onChange} disabled={!timeframeOptions.length}>
                    {timeframeOptions.length ? timeframeOptions.map(t => <option key={t} value={t}>{t}</option>) : <option>Loading...</option>}
                </select>
            </label>
            <label>Start Date: <input type="date" name="startDate" value={data.startDate} onChange={onChange} /></label>
            <label>End Date: <input type="date" name="endDate" value={data.endDate} onChange={onChange} /></label>
            <label>Initial Balance: <input type="number" name="initialBalance" value={data.initialBalance} onChange={onChange} /></label>
            <fieldset>
                <legend>Risk Management</legend>
                <label>Mode:
                    <select name="riskManagementMode" value={data.riskManagementMode} onChange={onChange}>
                        <option value="standard">Standard Risk %</option>
                        <option value="dynamic">Dynamic Growth Mode</option>
                    </select>
                </label>
                {data.riskManagementMode === 'standard' ? (<label>Risk Per Trade (%): <input type="number" name="riskPercentage" value={data.riskPercentage} onChange={onChange} step="0.1" /> </label>) : (<> <label>Growth Capital Target ($): <input type="number" name="growthCapitalTarget" value={data.growthCapitalTarget} onChange={onChange} /> </label> <label>Risk % (After Target): <input type="number" name="riskPercentage" value={data.riskPercentage} onChange={onChange} step="0.1" /> </label> </>)}
            </fieldset>
            <fieldset>
                <legend>Machine Learning</legend>
                <label>Mode:
                    <select name="mlMode" value={data.mlMode || "off"} onChange={onChange}>
                        <option value="off">Off</option>
                        <option value="predictions">Use Predictions</option>
                        <option value="hybrid">Hybrid</option>
                    </select>
                </label>
                {data.mlMode !== "off" && (
                    <>
                        <label>Model:
                            <select name="mlModel" value={data.mlModel} onChange={onChange} disabled={!modelOptions.length}>
                                {modelOptions.length ? modelOptions.map(m => <option key={m} value={m}>{m}</option>) : <option>Loading...</option>}
                            </select>
                        </label>
                        <label>Confidence Threshold: <input type="number" name="mlThreshold" value={data.mlThreshold || 0.5} step="0.01" min="0" max="1" onChange={onChange} /> </label>
                        <label>Prediction Horizon: <input type="number" name="mlHorizon" value={data.mlHorizon || 1} step="1" min="1" onChange={onChange} /> </label>
                    </>
                )}
            </fieldset>
            <label>Stop Loss (%):
                <input type="number" name="SL" value={data.params?.SL || 1.0} onChange={handleParamChange} step="0.1" min="0.1" />
            </label>
            <label>Take Profit (%):
                <input type="number" name="TP" value={data.params?.TP || 2.0} onChange={handleParamChange} step="0.1" min="0.1" />
            </label>
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
                        {strategies.length ? strategies.map(s => <option key={s.code} value={s.code}>{s.name}</option>) : <option>Loading...</option>}
                    </select>
                </label>
                <label>Stop Loss (%): <input type="number" name="param_SL" value={config.params?.SL || 1.0} onChange={handleChange} step="0.1" min="0.1" /></label>
                <label>Take Profit (%): <input type="number" name="param_TP" value={config.params?.TP || 2.0} onChange={handleChange} step="0.1" min="0.1" /></label>
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

  useEffect(() => {
    if (strategyOptions.length && !formData.code) {
      setFormData(prev => ({ ...prev, code: strategyOptions[0].code }));
    }
    if (strategyOptions.length && comboData.strategyConfigs.every(c => !c.code)) {
        const newConfigs = comboData.strategyConfigs.map((config, index) => {
            const strategy = strategyOptions[index] || strategyOptions[0];
            return {
                code: strategy.code,
                params: { SL: 1.0, TP: 2.0, ...strategy.params }
            };
        });
        setComboData(prev => ({ ...prev, strategyConfigs: newConfigs }));
    }
    if (symbolOptions.length && !formData.symbol) {
      setFormData(prev => ({ ...prev, symbol: symbolOptions[0] }));
      setComboData(prev => ({ ...prev, symbol: symbolOptions[0] }));
    }
  }, [strategyOptions, symbolOptions, formData.code, comboData.strategyConfigs, formData.symbol]);
  
  const { combinedEquityCurve, combinedMetrics } = useMemo(() => {
      try {
          const mainResult = backtestResults?.main;
          if (mainResult) {
              return {
                  combinedEquityCurve: mainResult.equityCurve || [],
                  combinedMetrics: mainResult.metrics || null,
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
    const isParam = name.startsWith("param_");
    const val = type === 'number' && value !== '' ? parseFloat(value) : value;

    if (isParam) {
      const paramName = name.substring(6);
      setFormData(prev => ({ ...prev, params: { ...prev.params, [paramName]: val } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleComboChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === 'number' && value !== '' ? parseFloat(value) : value;
    setComboData(prev => ({ ...prev, [name]: val }));
  };

  const handleStrategyConfigChange = (e, index) => {
    const { name, value, type } = e.target;
    const isParam = name.startsWith("param_");
    const val = type === 'number' && value !== '' ? parseFloat(value) : value;
    const updatedConfigs = [...comboData.strategyConfigs];

    if (isParam) {
      const paramName = name.substring(6);
      updatedConfigs[index].params = { ...updatedConfigs[index].params, [paramName]: val };
    } else {
      const selectedStrategy = strategyOptions.find(s => s.code === value);
      updatedConfigs[index].code = value;
      updatedConfigs[index].params = { SL: 1.0, TP: 2.0, ...selectedStrategy?.params };
    }
    setComboData(prev => ({ ...prev, strategyConfigs: updatedConfigs }));
  };

  const addStrategyCard = () => {
    const defaultStrategy = strategyOptions[0] || {};
    const newCard = { code: defaultStrategy.code, params: { SL: 1.0, TP: 2.0, ...defaultStrategy.params } };
    setComboData(prev => ({ ...prev, strategyConfigs: [...prev.strategyConfigs, newCard] }));
  };

  const removeStrategyCard = (index) => {
    if (comboData.strategyConfigs.length <= 2) return;
    setComboData(prev => ({ ...prev, strategyConfigs: prev.strategyConfigs.filter((_, i) => i !== index) }));
  };

  const handleRunBacktest = async (e) => {
    e.preventDefault();
    setBacktestResults({ main: null, individuals: [] });
    try {
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
    
    if (comboData.strategyConfigs.filter(s => s.code && s.code.trim() !== "").length < 2) {
        console.error("Combo backtest validation failed: At least two strategies must be selected.");
        return;
    }

    setBacktestResults({ main: null, individuals: [] });
    try {
      const res = await runComboBacktest?.(comboData);
      if (res) {
        setBacktestResults(res);
      }
    } catch (err) {
      console.error("Combo backtest failed:", err);
    }
  };

  const isComboSubmitDisabled = loading.startsWith('running') ||
                                !strategyOptions.length ||
                                comboData.strategyConfigs.filter(s => s.code && s.code.trim() !== "").length < 2;

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
                  {strategyOptions.length ? strategyOptions.map(s => <option key={s.code} value={s.code}>{s.name}</option>) : <option>Loading...</option>}
                </select>
              </label>
              <CommonBacktestInputs data={formData} onChange={handleFormChange} options={{ symbolOptions, timeframeOptions, modelOptions }} />
              <button type="submit" disabled={loading.startsWith('running') || !strategyOptions.length}>
                {loading.startsWith('running') ? 'Running...' : 'Run Backtest'}
              </button>
            </form>
          )}
          {activeTab === 'combo' && (
            <form onSubmit={handleRunComboBacktest} className="backtest-form">
              <CommonBacktestInputs data={comboData} onChange={handleComboChange} options={{ symbolOptions, timeframeOptions, modelOptions }} />
              <div className="combo-strategy-list">
                {comboData.strategyConfigs.map((config, idx) => (
                  <ComboStrategyCard
                    key={idx}
                    idx={idx}
                    config={config}
                    strategies={strategyOptions}
                    onChange={handleStrategyConfigChange}
                    onRemove={removeStrategyCard}
                    disableRemove={comboData.strategyConfigs.length <= 2}
                  />
                ))}
              </div>
              <button type="button" onClick={addStrategyCard} disabled={!strategyOptions.length}>Add Strategy</button>
              <button type="submit" disabled={isComboSubmitDisabled}>
                {loading.startsWith('running') ? 'Running...' : 'Run Combo Backtest'}
              </button>
            </form>
          )}
        </div>
        {(loading.startsWith('running') || combinedMetrics) && (
          <div className="results-section">
            <h2>Backtest Results</h2>
            {loading.startsWith('running') && <div className="loading-overlay"><h3>Running backtest...</h3></div>}
            {combinedMetrics && (
              <>
                <MetricsDisplay metrics={combinedMetrics} />
                <div className="charts-container">
                  <div className="chart">
                    <h3>Equity Curve</h3>
                    {combinedEquityCurve?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={combinedEquityCurve}><XAxis dataKey="timestamp" tickFormatter={formatDate} /><YAxis domain={['auto', 'auto']} /><Tooltip /><CartesianGrid stroke="#333" /><Line type="monotone" dataKey="balance" stroke="#8884d8" dot={false} /></LineChart>
                      </ResponsiveContainer>
                    ) : <p>No data available for chart.</p>}
                  </div>
                  <div className="chart">
                    <h3>Win / Loss Distribution</h3>
                    {pieData?.length > 0 && pieData.some(d => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>{pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip /><Legend /></PieChart>
                      </ResponsiveContainer>
                    ) : <p>No data available for chart.</p>}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
