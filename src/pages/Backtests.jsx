// File: src/pages/Backtests.jsx
import React, { useState, useEffect, useMemo, useContext } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import { StrategyContext } from "../context/StrategyContext.jsx";
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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
};

const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

const initialFormData = {
  code: "", symbol: "", timeframe: "", startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate, initialBalance: 1000, params: {},
  riskManagementMode: 'standard', riskPercentage: 1, growthCapitalTarget: 2000,
  mlMode: "off", mlModel: "default", mlThreshold: 0.5, mlHorizon: 1
};

const initialComboData = {
  strategyConfigs: [{ code: "", params: {} }], symbol: "", timeframe: "",
  startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate,
  initialBalance: 1000, riskManagementMode: 'standard',
  riskPercentage: 1, growthCapitalTarget: 2000,
  mlMode: "off", mlModel: "default", mlThreshold: 0.5, mlHorizon: 1
};

// --- Metrics Display ---
const MetricsDisplay = ({ metrics }) => {
  if (!metrics) return <div className="metrics-grid-loading">Calculating metrics...</div>;
  const items = [
    { label: "Initial Balance", value: metrics.initialBalance, format: 'currency' },
    { label: "Final Balance", value: metrics.finalBalance, format: 'currency' },
    { label: "Total Profit", value: metrics.totalProfit, format: 'currency' },
    { label: "Total Trades", value: metrics.totalTrades, format: 'number' },
    { label: "Win Rate", value: metrics.winRate, format: 'percent' },
    { label: "Max Drawdown", value: metrics.maxDrawdown, format: 'percent' },
    { label: "Profit Factor", value: metrics.profitFactor, format: 'number' },
  ];
  return (
    <div className="metrics-grid">
      {items.map(m => (
        <div key={m.label} className="metric-item">
          <span className="metric-label">{m.label}</span>
          <span className="metric-value">
            {typeof m.value === "number" ? (
              m.format === 'currency' ? `$${m.value.toFixed(2)}` :
              m.format === 'percent' ? `${m.value.toFixed(2)}%` :
              m.value.toFixed(2)
            ) : "N/A"}
          </span>
        </div>
      ))}
    </div>
  );
};

// --- Common Inputs ---
const CommonBacktestInputs = ({ data, onChange, options }) => {
  const symbolOptions = options.symbolOptions || [];
  const timeframeOptions = options.timeframeOptions || [];
  return (
    <>
      <label>Symbol:
        <select name="symbol" value={data.symbol} onChange={onChange} disabled={!symbolOptions.length}>
          {symbolOptions.length ? symbolOptions.map(s => <option key={s} value={s}>{s}</option>) : <option>Loading symbols...</option>}
        </select>
      </label>
      <label>Timeframe:
        <select name="timeframe" value={data.timeframe} onChange={onChange} disabled={!timeframeOptions.length}>
          {timeframeOptions.length ? timeframeOptions.map(t => <option key={t} value={t}>{t}</option>) : <option>Loading timeframes...</option>}
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
        {data.riskManagementMode === 'standard' ? (
          <label>Risk Per Trade (%):
            <input type="number" name="riskPercentage" value={data.riskPercentage} onChange={onChange} step="0.1" />
          </label>
        ) : (
          <>
            <label>Growth Capital Target ($):
              <input type="number" name="growthCapitalTarget" value={data.growthCapitalTarget} onChange={onChange} />
            </label>
            <label>Risk % (After Target):
              <input type="number" name="riskPercentage" value={data.riskPercentage} onChange={onChange} step="0.1" />
            </label>
          </>
        )}
      </fieldset>

      <fieldset>
        <legend>Machine Learning</legend>
        <label>Mode:
          <select name="mlMode" value={data.mlMode || "off"} onChange={onChange}>
            <option value="off">Off (No ML)</option>
            <option value="predictions">Use ML Predictions</option>
            <option value="hybrid">Hybrid (Strategy + ML)</option>
          </select>
        </label>
        {data.mlMode !== "off" && (
          <>
            <label>Model:
              <select name="mlModel" value={data.mlModel || "default"} onChange={onChange}>
                <option value="default">Main Model</option>
              </select>
            </label>
            <label>Confidence Threshold:
              <input type="number" name="mlThreshold" value={data.mlThreshold || 0.5} step="0.01" min="0" max="1" onChange={onChange}/>
            </label>
            <label>Prediction Horizon:
              <input type="number" name="mlHorizon" value={data.mlHorizon || 1} step="1" min="1" onChange={onChange}/>
            </label>
          </>
        )}
      </fieldset>
    </>
  );
};

// --- Combo Strategy Card ---
const ComboStrategyCard = ({ idx, config, strategies = [], onChange, onRemove, disableRemove }) => {
  const handleChange = (e) => onChange(e, idx);
  return (
    <div className="combo-card">
      <div className="combo-card-header">
        <strong>Strategy #{idx + 1}</strong>
        {!disableRemove && <button type="button" onClick={() => onRemove(idx)}>✕</button>}
      </div>
      <div className="combo-card-body">
        <label>Strategy:
          <select name="strategyCode" value={config.code} onChange={handleChange} disabled={!strategies.length}>
            {strategies.length ? strategies.map(s => <option key={s.code} value={s.code}>{s.name}</option>) : <option>Loading strategies...</option>}
          </select>
        </label>
        <label>Stop Loss (%):
          <input type="number" name="param_SL" value={config.params?.SL || 0} onChange={handleChange} step="0.1" />
        </label>
        <label>Take Profit (%):
          <input type="number" name="param_TP" value={config.params?.TP || 0} onChange={handleChange} step="0.1" />
        </label>
      </div>
    </div>
  );
};

// --- Main Component ---
export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest } = useBacktest();
  const { loading, error, options } = state || {};
  const { createSetup } = useBacktestSetupFunction();
  const { strategies: contextStrategies } = useContext(StrategyContext) || {};

  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [setupDetails, setSetupDetails] = useState({ name: "", description: "" });
  const [activeTab, setActiveTab] = useState('single');

  const strategyOptions = useMemo(() => contextStrategies || [], [contextStrategies]);
  const symbolOptions = useMemo(() => options?.symbols || [], [options]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);

  useEffect(() => {
    if (strategyOptions.length && symbolOptions.length) {
      const defaultStrategy = strategyOptions[0] || {};
      const defaultSymbol = symbolOptions[0] || "";
      const defaultTimeframe = timeframeOptions[0] || "1m";

      setFormData(prev => ({
        ...prev,
        code: prev.code || defaultStrategy.code,
        params: prev.params || defaultStrategy.params || {},
        symbol: prev.symbol || defaultSymbol,
        timeframe: prev.timeframe || defaultTimeframe
      }));
      setComboData(prev => ({
        ...prev,
        strategyConfigs: prev.strategyConfigs.length ? prev.strategyConfigs : [{ code: defaultStrategy.code, params: defaultStrategy.params || {} }],
        symbol: prev.symbol || defaultSymbol,
        timeframe: prev.timeframe || defaultTimeframe
      }));
    }
  }, [strategyOptions, symbolOptions, timeframeOptions]);

  if (loading === 'initial') return <div className="dashboard-container"><h1>Loading Backtest Environment...</h1></div>;

  // --- Handlers ---
  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    const isParam = name.startsWith("param_");
    const val = type === 'number' ? parseFloat(value) : value;

    if (isParam) {
        const paramName = name.substring(6);
        setFormData(prev => ({
            ...prev,
            params: { ...prev.params, [paramName]: val }
        }));
    } else {
        setFormData(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleComboChange = (e) => {
      const { name, value, type } = e.target;
      setComboData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
  };

  const handleStrategyConfigChange = (e, index) => {
      const { name, value, type } = e.target;
      const isParam = name.startsWith("param_");
      const val = type === 'number' ? parseFloat(value) : value;

      const updatedConfigs = [...comboData.strategyConfigs];
      if (isParam) {
          const paramName = name.substring(6);
          updatedConfigs[index].params = { ...updatedConfigs[index].params, [paramName]: val };
      } else { // 'strategyCode'
          const selectedStrategy = strategyOptions.find(s => s.code === value);
          updatedConfigs[index].code = value;
          updatedConfigs[index].params = selectedStrategy?.params || {};
      }
      setComboData(prev => ({ ...prev, strategyConfigs: updatedConfigs }));
  };

  const addStrategyCard = () => {
    const newCard = { code: strategyOptions[0]?.code || "", params: strategyOptions[0]?.params || {} };
    setComboData(prev => ({ ...prev, strategyConfigs: [...prev.strategyConfigs, newCard] }));
  };

  const removeStrategyCard = (index) => {
    setComboData(prev => ({ ...prev, strategyConfigs: prev.strategyConfigs.filter((_, i) => i !== index) }));
  };

  const handleRunBacktest = async (e) => {
      e.preventDefault();
      setBacktestResults({ main: null, individuals: [] }); // Clear previous results
      const result = await runNewBacktest(formData);
      if (result) setBacktestResults({ main: result, individuals: [] });
  };

  const handleRunComboBacktest = async (e) => {
      e.preventDefault();
      setBacktestResults({ main: null, individuals: [] }); // Clear previous results
      const result = await runComboBacktest(comboData);
      if (result) setBacktestResults(result); // result should be { main, individuals }
  };


  // --- Compute Combined Metrics & Equity Curve ---
  const { combinedEquityCurve, combinedMetrics } = useMemo(() => {
    const individuals = backtestResults?.individuals || [];
    if (!individuals.length) {
      const mainMetrics = backtestResults?.main?.metrics || null;
      const mainCurve = backtestResults?.main?.equityCurve?.map(d => ({ timestamp: d.timestamp, balance: d.balance })) || [];
      return { combinedEquityCurve: mainCurve, combinedMetrics: mainMetrics };
    }
    const allTimestamps = [...new Set(individuals.flatMap(ind => ind.equityCurve?.map(d => d.timestamp) || []))].sort();
    if (!allTimestamps.length) return { combinedEquityCurve: [], combinedMetrics: null };
    const initialBalance = comboData.initialBalance || 1000;
    let lastBalances = individuals.map(ind => ind.metrics?.initialBalance || 0);
    const curve = allTimestamps.map(ts => {
      let currentTotal = 0;
      individuals.forEach((ind, idx) => {
        const point = ind.equityCurve?.find(p => p.timestamp === ts);
        if (point) lastBalances[idx] = point.balance;
        currentTotal += lastBalances[idx];
      });
      return { timestamp: ts, balance: currentTotal };
    });
    const finalBalance = curve.length ? curve[curve.length - 1].balance : initialBalance;
    const totalProfit = finalBalance - initialBalance;
    const totalTrades = individuals.reduce((sum, ind) => sum + (ind.metrics?.totalTrades || 0), 0);
    const winningTrades = individuals.reduce((sum, ind) => sum + (ind.metrics?.winningTrades || 0), 0);
    const winRate = totalTrades ? (winningTrades / totalTrades) * 100 : 0;
    let peak = initialBalance, maxDrawdownValue = 0;
    curve.forEach(p => { if (p.balance > peak) peak = p.balance; const dd = peak - p.balance; if (dd > maxDrawdownValue) maxDrawdownValue = dd; });
    const maxDrawdown = peak ? (maxDrawdownValue / peak) * 100 : 0;
    const grossProfit = individuals.reduce((sum, ind) => sum + ((ind.metrics?.winningTrades || 0) * (ind.metrics?.averageWin || 0)), 0);
    const grossLoss = individuals.reduce((sum, ind) => sum + ((ind.metrics?.losingTrades || 0) * (ind.metrics?.averageLoss || 0)), 0);
    const profitFactor = grossLoss ? grossProfit / grossLoss : Infinity;
    return { combinedEquityCurve: curve, combinedMetrics: { initialBalance, finalBalance, totalProfit, totalTrades, winRate, maxDrawdown, profitFactor } };
  }, [backtestResults, comboData.initialBalance]);

  const pieData = useMemo(() => {
    if (!combinedMetrics || !combinedMetrics.totalTrades || !combinedMetrics.winRate) return [];
    const wins = Math.round(combinedMetrics.totalTrades * (combinedMetrics.winRate / 100));
    const losses = combinedMetrics.totalTrades - wins;
    return [{ name: "Wins", value: wins }, { name: "Losses", value: losses }];
  }, [combinedMetrics]);

  return (
    <div className="dashboard-container">
      <h1>Backtests</h1>
      {error && <div className="error-box"><h4>Error</h4><p>{error?.status && `Status ${error.status}: `}{error?.message}</p></div>}
      
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
                    <CommonBacktestInputs data={formData} onChange={handleFormChange} options={{symbolOptions, timeframeOptions}} />
                    <button type="submit" disabled={loading === 'backtest'}>
                        {loading === 'backtest' ? 'Running...' : 'Run Backtest'}
                    </button>
                </form>
            )}

            {activeTab === 'combo' && (
                <form onSubmit={handleRunComboBacktest} className="backtest-form">
                    <div className="combo-common-inputs">
                        <CommonBacktestInputs data={comboData} onChange={handleComboChange} options={{symbolOptions, timeframeOptions}} />
                    </div>
                    <div className="combo-strategy-list">
                        {comboData.strategyConfigs.map((config, idx) => (
                            <ComboStrategyCard 
                                key={idx}
                                idx={idx}
                                config={config}
                                strategies={strategyOptions}
                                onChange={handleStrategyConfigChange}
                                onRemove={removeStrategyCard}
                                disableRemove={comboData.strategyConfigs.length <= 1}
                            />
                        ))}
                    </div>
                    <button type="button" onClick={addStrategyCard}>Add Strategy</button>
                    <button type="submit" disabled={loading === 'backtest'}>
                        {loading === 'backtest' ? 'Running...' : 'Run Combo Backtest'}
                    </button>
                </form>
            )}
        </div>

        {(loading === 'backtest' || combinedMetrics) && (
          <div className="results-section">
              <h2>Backtest Results</h2>
              {loading === 'backtest' && <div className="loading-overlay"><h3>Running backtest...</h3></div>}
              {combinedMetrics && (
                  <>
                      <MetricsDisplay metrics={combinedMetrics} />
                      <div className="charts-container">

                          {/* =====================================================================
                            DEBUGGING STEP: Equity Curve Chart has been temporarily commented out.
                            =====================================================================
                          */}
                          {/*
                          <div className="chart">
                              <h3>Equity Curve</h3>
                              {combinedEquityCurve?.length > 0 ? (
                                  <ResponsiveContainer width="100%" height={300}>
                                      <LineChart data={combinedEquityCurve} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                          <XAxis 
                                              dataKey="timestamp" 
                                              tickFormatter={formatDate}
                                              angle={-45}
                                              textAnchor="end"
                                              height={70}
                                          />
                                          <YAxis domain={['dataMin', 'dataMax']} />
                                          <Tooltip labelFormatter={formatDate} formatter={(value) => [`$${value.toFixed(2)}`, 'Balance']}/>
                                          <CartesianGrid stroke="#333" strokeDasharray="3 3"/>
                                          <Line type="monotone" dataKey="balance" stroke="#8884d8" strokeWidth={2} dot={false}/>
                                      </LineChart>
                                  </ResponsiveContainer>
                              ) : <p>No equity curve data available.</p>}
                          </div>
                          */}

                          {/* ============================================================================
                            DEBUGGING STEP: Win/Loss Distribution Chart has been temporarily commented out.
                            ============================================================================
                          */}
                          {/*
                          <div className="chart">
                              <h3>Win / Loss Distribution</h3>
                              {pieData?.length > 0 ? (
                                  <ResponsiveContainer width="100%" height={300}>
                                      <PieChart>
                                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                              {pieData.map((entry, index) => (
                                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                              ))}
                                          </Pie>
                                          <Tooltip />
                                          <Legend />
                                      </PieChart>
                                  </ResponsiveContainer>
                              ) : <p>No win/loss data available.</p>}
                          </div>
                          */}
                      </div>
                  </>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
