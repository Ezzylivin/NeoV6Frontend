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

// --- Helper functions and FULL child component implementations ---
const COLORS = ["#22c55e", "#ef4444"];
const formatDate = dateString => { if (!dateString) return ''; const date = new Date(dateString); if (isNaN(date.getTime())) return ''; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
const getDefaultDates = () => { const today = new Date(); const start = new Date(today); start.setFullYear(today.getFullYear() - 1); const end = new Date(today); end.setDate(today.getDate() - 1); return { startDate: formatDate(start), endDate: formatDate(end) }; };
const initialFormData = { code: "", symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate, initialBalance: 1000, params: {}, riskManagementMode: 'standard', riskPercentage: 1, growthCapitalTarget: 2000, mlMode: "off", mlModel: "default", mlThreshold: 0.5, mlHorizon: 1 };
const initialComboData = { strategyConfigs: [{ code: "", params: {} }], symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate, initialBalance: 1000, riskManagementMode: 'standard', riskPercentage: 1, growthCapitalTarget: 2000, mlMode: "off", mlModel: "default", mlThreshold: 0.5, mlHorizon: 1 };

const MetricsDisplay = ({ metrics }) => { /* ... full implementation ... */ };

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
      {/* ... fieldsets ... */}
    </>
  );
};

const ComboStrategyCard = ({ idx, config, strategies, onChange, onRemove, disableRemove }) => { /* ... full implementation ... */ };


// --- Main Component ---
export default function Backtests() {
  // ... Hooks and state setup are unchanged ...
  const { state, runNewBacktest, runComboBacktest } = useBacktest();
  const { loading, error, options } = state || {};
  const { createSetup } = useBacktestSetupFunction();
  const { strategies: contextStrategies } = useContext(StrategyContext) || {};
  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTab, setActiveTab] = useState('single');
  const strategyOptions = useMemo(() => contextStrategies || [], [contextStrategies]);
  const symbolOptions = useMemo(() => options?.symbols || [], [options]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);
  useEffect(() => { /* ... */ }, [strategyOptions, symbolOptions, timeframeOptions]);
  const { combinedEquityCurve, combinedMetrics } = useMemo(() => { /* ... full implementation ... */ }, [backtestResults, comboData.initialBalance]);
  const pieData = useMemo(() => { /* ... */ }, [combinedMetrics]);

  if (loading === 'initial') {
    return <div className="dashboard-container"><h1>Loading Backtest Environment...</h1></div>;
  }
  
  // Handlers
  const handleFormChange = () => {};
  const handleRunBacktest = () => {};
  
  console.log("--- Rendering Backtests Component ---");
  console.log("Active Tab:", activeTab);
  
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
                    <form onSubmit={handleRunBacktest} className="backtest-form" style={{ border: '2px solid green', padding: '20px', marginTop: '20px' }}>
                        <h3>Partial Form Render Test</h3>

                        <label>Strategy:
                            <select name="code" value={formData.code} onChange={handleFormChange} disabled={!strategyOptions.length}>
                                {strategyOptions.length 
                                    ? strategyOptions.map(s => <option key={s.code} value={s.code}>{s.name}</option>) 
                                    : <option>Loading...</option>}
                            </select>
                        </label>
                        
                        <hr />
                        <p>Isolating the component below:</p>

                        {/* STEP 1: Keep CommonBacktestInputs commented out.
                          If the form appears now, this component is the source of the problem.
                        */}
                        {/*
                        <CommonBacktestInputs 
                            data={formData} 
                            onChange={handleFormChange} 
                            options={{symbolOptions, timeframeOptions}} 
                        />
                        */}
                        <hr />

                        <button type="submit" disabled={loading === 'backtest'}>
                            {loading === 'backtest' ? 'Running...' : 'Run Backtest'}
                        </button>
                    </form>
                )}
                 {activeTab === 'combo' && (
                    <div style={{ border: '2px solid dodgerblue', padding: '20px', marginTop: '20px' }}>
                        {/* We are ignoring the combo form for now to focus on the single form */}
                        <h2>Combo Form Placeholder</h2>
                    </div>
                )}
            </div>
            {/* ... Results section remains the same ... */}
        </div>
    </div>
  );
}
