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
      {/* ... other fieldsets ... */}
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
  // STEP 1: ALL HOOKS ARE CALLED UNCONDITIONALLY AT THE TOP
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
    if (strategyOptions.length && symbolOptions.length && timeframeOptions.length) {
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
        strategyConfigs: prev.strategyConfigs.length === 1 && !prev.strategyConfigs[0].code
          ? [{ code: defaultStrategy.code, params: defaultStrategy.params || {} }]
          : prev.strategyConfigs,
        symbol: prev.symbol || defaultSymbol,
        timeframe: prev.timeframe || defaultTimeframe
      }));
    }
  }, [strategyOptions, symbolOptions, timeframeOptions]);

  const { combinedEquityCurve, combinedMetrics } = useMemo(() => {
    const individuals = backtestResults?.individuals || [];
    if (!individuals.length) {
      const mainMetrics = backtestResults?.main?.metrics || null;
      const mainCurve = backtestResults?.main?.equityCurve?.map(d => ({ timestamp: d.timestamp, balance: d.balance })) || [];
      return { combinedEquityCurve: mainCurve, combinedMetrics: mainMetrics };
    }
    // ... (rest of the logic is the same)
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
    const grossProfit = individuals.reduce((sum, ind) => sum + ((ind.metrics?.grossProfit || 0)), 0);
    const grossLoss = individuals.reduce((sum, ind) => sum + (Math.abs(ind.metrics?.grossLoss || 0)), 0);
    const profitFactor = grossLoss ? grossProfit / grossLoss : Infinity;
    return { combinedEquityCurve: curve, combinedMetrics: { initialBalance, finalBalance, totalProfit, totalTrades, winRate, maxDrawdown, profitFactor, winningTrades } };
  }, [backtestResults, comboData.initialBalance]);

  const pieData = useMemo(() => {
    if (!combinedMetrics || !combinedMetrics.totalTrades || combinedMetrics.winningTrades === undefined) return [];
    const wins = combinedMetrics.winningTrades;
    const losses = combinedMetrics.totalTrades - wins;
    return [{ name: "Wins", value: wins }, { name: "Losses", value: losses }];
  }, [combinedMetrics]);

  // STEP 2: EARLY RETURN CAN HAPPEN *AFTER* ALL HOOKS HAVE BEEN CALLED
  if (loading === 'initial') {
    return <div className="dashboard-container"><h1>Loading Backtest Environment...</h1></div>;
  }

  // STEP 3: ALL HANDLER FUNCTIONS AND RENDER LOGIC COME LAST
  const handleFormChange = (e) => { /* ... implementation ... */ };
  const handleComboChange = (e) => { /* ... implementation ... */ };
  const handleStrategyConfigChange = (e, index) => { /* ... implementation ... */ };
  const addStrategyCard = () => { /* ... implementation ... */ };
  const removeStrategyCard = (index) => { /* ... implementation ... */ };
  const handleRunBacktest = async (e) => { e.preventDefault(); setBacktestResults({ main: null, individuals: [] }); const res = await runNewBacktest(formData); if(res) setBacktestResults({ main: res, individuals: [] }); };
  const handleRunComboBacktest = async (e) => { e.preventDefault(); setBacktestResults({ main: null, individuals: [] }); const res = await runComboBacktest(comboData); if(res) setBacktestResults(res); };
  
  return (
    <div className="dashboard-container">
      <h1>Backtests</h1>
      {error && <div className="error-box"><h4>Error</h4><p>{error?.status && `Status ${error.status}: `}{error?.message}</p></div>}
      
      <div className="backtest-main">
        <div className="backtest-forms">
            {/* Forms JSX is unchanged */}
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
                            CHARTS ARE NOW UNCOMMENTED AND ACTIVE
                            =====================================================================
                          */}
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
                                          <YAxis domain={['auto', 'auto']} allowDataOverflow={true} />
                                          <Tooltip labelFormatter={formatDate} formatter={(value) => [`$${value.toFixed(2)}`, 'Balance']}/>
                                          <CartesianGrid stroke="#333" strokeDasharray="3 3"/>
                                          <Line type="monotone" dataKey="balance" stroke="#8884d8" strokeWidth={2} dot={false}/>
                                      </LineChart>
                                  </ResponsiveContainer>
                              ) : <p>No equity curve data available.</p>}
                          </div>
                          
                          <div className="chart">
                              <h3>Win / Loss Distribution</h3>
                              {pieData?.length > 0 && pieData.some(d => d.value > 0) ? (
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

                      </div>
                  </>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
