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

// --- Helper functions and child components (MetricsDisplay, etc.) are unchanged ---
// ... (imagine all the previous helper code is here) ...

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981"];
const formatDate = dateString => { if (!dateString) return ''; const date = new Date(dateString); if (isNaN(date.getTime())) return ''; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; };
const getDefaultDates = () => { const today = new Date(); const start = new Date(today); start.setFullYear(today.getFullYear() - 1); const end = new Date(today); end.setDate(today.getDate() - 1); return { startDate: formatDate(start), endDate: formatDate(end) }; };
const initialFormData = { code: "", symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate, initialBalance: 1000, params: {}, riskManagementMode: 'standard', riskPercentage: 1, growthCapitalTarget: 2000, mlMode: "off", mlModel: "default", mlThreshold: 0.5, mlHorizon: 1 };
const initialComboData = { strategyConfigs: [{ code: "", params: {} }], symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate, initialBalance: 1000, riskManagementMode: 'standard', riskPercentage: 1, growthCapitalTarget: 2000, mlMode: "off", mlModel: "default", mlThreshold: 0.5, mlHorizon: 1 };
const MetricsDisplay = ({ metrics }) => { if (!metrics) return null; const items = [ { label: "Initial Balance", value: metrics.initialBalance, format: 'currency' }, { label: "Final Balance", value: metrics.finalBalance, format: 'currency' }, { label: "Total Profit", value: metrics.totalProfit, format: 'currency' }, { label: "Total Trades", value: metrics.totalTrades, format: 'number' }, { label: "Win Rate", value: metrics.winRate, format: 'percent' }, { label: "Max Drawdown", value: metrics.maxDrawdown, format: 'percent' }, { label: "Profit Factor", value: metrics.profitFactor, format: 'number' }, ]; return ( <div className="metrics-grid"> {items.map(m => ( <div key={m.label} className="metric-item"> <span className="metric-label">{m.label}</span> <span className="metric-value"> {typeof m.value === "number" ? ( m.format === 'currency' ? `$${m.value.toFixed(2)}` : m.format === 'percent' ? `${m.value.toFixed(2)}%` : m.value.toFixed(2) ) : "N/A"} </span> </div> ))} </div> ); };
const CommonBacktestInputs = ({ data, onChange, options }) => { const symbolOptions = options.symbolOptions || []; const timeframeOptions = options.timeframeOptions || []; return ( <> <label>Symbol: <select name="symbol" value={data.symbol} onChange={onChange} disabled={!symbolOptions.length}> {symbolOptions.length ? symbolOptions.map(s => <option key={s} value={s}>{s}</option>) : <option>Loading symbols...</option>} </select> </label> <label>Timeframe: <select name="timeframe" value={data.timeframe} onChange={onChange} disabled={!timeframeOptions.length}> {timeframeOptions.length ? timeframeOptions.map(t => <option key={t} value={t}>{t}</option>) : <option>Loading timeframes...</option>} </select> </label> <label>Start Date: <input type="date" name="startDate" value={data.startDate} onChange={onChange} /></label> <label>End Date: <input type="date" name="endDate" value={data.endDate} onChange={onChange} /></label> <label>Initial Balance: <input type="number" name="initialBalance" value={data.initialBalance} onChange={onChange} /></label> </> ); };
const ComboStrategyCard = ({ idx, config, strategies = [], onChange, onRemove, disableRemove }) => { const handleChange = (e) => onChange(e, idx); return ( <div className="combo-card"> <div className="combo-card-header"> <strong>Strategy #{idx + 1}</strong> {!disableRemove && <button type="button" onClick={() => onRemove(idx)}>✕</button>} </div> <div className="combo-card-body"> <label>Strategy: <select name="strategyCode" value={config.code} onChange={handleChange} disabled={!strategies.length}> {strategies.length ? strategies.map(s => <option key={s.code} value={s.code}>{s.name}</option>) : <option>Loading strategies...</option>} </select> </label> <label>Stop Loss (%): <input type="number" name="param_SL" value={config.params?.SL || 0} onChange={handleChange} step="0.1" /> </label> <label>Take Profit (%): <input type="number" name="param_TP" value={config.params?.TP || 0} onChange={handleChange} step="0.1" /> </label> </div> </div> ); };


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
    // ... same as before
  }, [strategyOptions, symbolOptions, timeframeOptions]);

  const { combinedEquityCurve, combinedMetrics } = useMemo(() => {
    // ... same as before
  }, [backtestResults, comboData.initialBalance]);

  const pieData = useMemo(() => {
    // ... same as before
  }, [combinedMetrics]);

  if (loading === 'initial') {
    return (
        <div className="dashboard-container">
            <h1>Loading Backtest Environment...</h1>
            <h2>Tracer A: Inside Loading Block</h2>
        </div>
    );
  }
  
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
      <h2>Tracer 1: After H1</h2>
      {error && <div className="error-box"><h4>Error</h4><p>{error?.status && `Status ${error.status}: `}{error?.message}</p></div>}
      
      <div className="backtest-main">
        <h2>Tracer 2: Inside backtest-main</h2>
        <div className="backtest-forms">
            <h2>Tracer 3: Inside backtest-forms</h2>
            <div className="tabs">
                <button className={activeTab === 'single' ? 'active' : ''} onClick={() => setActiveTab('single')}>Single Strategy</button>
                <button className={activeTab === 'combo' ? 'active' : ''} onClick={() => setActiveTab('combo')}>Combo Strategy</button>
            </div>
            
            {activeTab === 'single' && (
                <form onSubmit={handleRunBacktest} className="backtest-form">
                    <h2>Tracer 4: Inside Single Form</h2>
                    {/* ... rest of the form ... */}
                </form>
            )}

            {activeTab === 'combo' && (
                <form onSubmit={handleRunComboBacktest} className="backtest-form">
                    <h2>Tracer 5: Inside Combo Form</h2>
                    {/* ... rest of the form ... */}
                </form>
            )}
        </div>

        {(loading === 'backtest' || combinedMetrics) && (
          <div className="results-section">
              <h2>Tracer 6: Inside results-section</h2>
              {/* ... rest of the results ... */}
          </div>
        )}
      </div>
    </div>
  );
}
