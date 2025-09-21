// File: src/pages/Backtests.jsx
// UPGRADED: Now includes a "Save Setup" feature to create reusable backtest "blueprints".

import React, { useState, useEffect, useMemo } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.js"; // ✅ 1. Import the new hook
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
} from "recharts";
import "./Backtests.css";

// --- Helper functions & Initial State (no changes) ---
const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const getInitialDates = () => {
  const today = new Date();
  const start = new Date(today);
  start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today);
  end.setDate(today.getDate() - 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};
const initialFormData = { code: "", symbol: "", timeframe: "", startDate: getInitialDates().startDate, endDate: getInitialDates().endDate, params: {} };
const initialComboData = { strategyConfigs: [{ code: "" }], combinationRule: "AND", symbol: "", timeframe: "", startDate: getInitialDates().startDate, endDate: getInitialDates().endDate };

// --- Metrics Card Component (no changes) ---
const MetricsDisplay = ({ metrics }) => {
    if (!metrics || Object.keys(metrics).length === 0) return <p className="no-metrics">No metrics available</p>;
    const keyMetrics = { "Total Profit": metrics.totalProfit, "Total Trades": metrics.totalTrades, "Win Rate": metrics.winRate, "Max Drawdown": metrics.maxDrawdown, "Profit Factor": metrics.profitFactor, "Final Balance": metrics.finalBalance };
    const formatValue = (k, v) => {
        if (v == null) return "N/A";
        if (k.includes("Win Rate")) return `${v.toFixed(2)}%`;
        if (k.includes("Profit Factor")) return v.toFixed(2);
        if (k.includes("Profit") || k.includes("Drawdown") || k.includes("Balance")) return `$${v.toFixed(2)}`;
        return v;
    };
    return (
        <div className="metrics-grid">
            {Object.entries(keyMetrics).map(([key, value]) => (
                <div key={key} className="metric-item">
                    <span className="metric-label">{key}</span>
                    <span className="metric-value">{formatValue(key, value)}</span>
                </div>
            ))}
        </div>
    );
};

// --- Main Component ---
export default function Backtests() {
  const { options, initialLoading, singleLoading, batchLoading, error, runNewBacktest, runComboBacktest } = useBacktest();
  const { createSetup, loading: isSaving, error: saveError } = useBacktestSetup(); // ✅ 2. Use the new hook
  
  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTestType, setActiveTestType] = useState(null);

  // ✅ 3. State for the "Save Setup" modal
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [setupDetails, setSetupDetails] = useState({ name: '', description: '' });

  useEffect(() => {
    if (options.strategies?.length > 0 && !formData.code) {
      const s = options.strategies[0];
      setFormData(prev => ({ ...prev, code: s.code, symbol: options.symbols[0], timeframe: options.timeframes[0], params: s.params || {} }));
      setComboData(prev => ({ ...prev, symbol: options.symbols[0], timeframe: options.timeframes[0], strategyConfigs: [{ code: s.code }] }));
    }
  }, [options]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "code") {
      const s = options.strategies.find(s => s.code === value);
      if (s) setFormData(prev => ({ ...prev, code: s.code, symbol: s.params?.symbol || options.symbols[0], timeframe: s.params?.timeframe || options.timeframes[0], params: s.params || {} }));
    } else setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleComboChange = (e, index) => {
    const { name, value } = e.target;
    if (name === "strategyCode") {
      const arr = [...comboData.strategyConfigs];
      arr[index] = { ...arr[index], code: value };
      setComboData(prev => ({ ...prev, strategyConfigs: arr }));
    } else setComboData(prev => ({ ...prev, [name]: value }));
  };

  const addStrategyToCombo = () => setComboData(prev => ({ ...prev, strategyConfigs: [...prev.strategyConfigs, { code: "" }] }));
  const removeStrategyFromCombo = (i) => setComboData(prev => ({ ...prev, strategyConfigs: comboData.strategyConfigs.filter((_, idx) => idx !== i) }));

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setBacktestResults({ main: null, individuals: [] });
    setActiveTestType("single");
    try {
      const result = await runNewBacktest(formData);
      setBacktestResults({ main: { name: "Backtest Results", metrics: result.metrics || {}, equityCurve: result.equityCurve || [], noTradeReason: result.noTradeReason, sourceData: formData }, individuals: [] });
    } catch (err) { alert(err.response?.data?.message || "Error running backtest"); }
  };

  const handleComboSubmit = async (e) => {
    e.preventDefault();
    setBacktestResults({ main: null, individuals: [] });
    setActiveTestType("combo");
    try {
      const payload = { ...comboData, strategyCodes: comboData.strategyConfigs.map(s => s.code).filter(Boolean) };
      if (!payload.strategyCodes.length) return alert("Select at least one strategy.");
      const result = await runComboBacktest(payload);
      setBacktestResults({
        main: { name: "Combined Strategy Performance", metrics: result.combinedResult.metrics, equityCurve: result.combinedResult.equityCurve, sourceData: comboData },
        individuals: result.individualResults.map(res => ({ name: res.strategyName, metrics: res.metrics, equityCurve: res.equityCurve, noTradeReason: res.noTradeReason }))
      });
    } catch (err) { alert(err.response?.data?.message || "Error running combo backtest"); }
  };

  // ✅ 4. Handlers for the Save Setup Modal
  const openSaveModal = () => setIsSaveModalOpen(true);
  const closeSaveModal = () => setIsSaveModalOpen(false);
  const handleSetupDetailChange = (e) => setSetupDetails({ ...setupDetails, [e.target.name]: e.target.value });

  const handleSaveSetup = async (e) => {
    e.preventDefault();
    const source = backtestResults.main.sourceData;
    let setupPayload;

    if (activeTestType === 'single') {
        const strategy = options.strategies.find(s => s.code === source.code);
        setupPayload = {
            name: setupDetails.name,
            description: setupDetails.description,
            symbol: source.symbol,
            timeframe: source.timeframe,
            isCombo: false,
            strategyId: strategy?._id,
        };
    } else { // combo
        setupPayload = {
            name: setupDetails.name,
            description: setupDetails.description,
            symbol: source.symbol,
            timeframe: source.timeframe,
            isCombo: true,
            comboConfig: {
                strategyCodes: source.strategyConfigs.map(s => s.code).filter(Boolean),
                combinationRule: source.combinationRule,
            },
        };
    }
    
    try {
        await createSetup(setupPayload);
        alert("Setup saved successfully!");
        closeSaveModal();
    } catch (err) {
        alert(err.response?.data?.message || "Failed to save setup.");
    }
  };


  // --- Chart Data (no change) ---
  const chartData = useMemo(() => {
    if (!backtestResults?.main) return null;
    if (activeTestType === "single") {
        const data = backtestResults.main.equityCurve.map(p => ({ ...p, date: formatDate(p.timestamp), Equity: p.balance }));
        return { data, series: [{ name: "Equity", color: "#8884d8" }] };
    }
    if (activeTestType === "combo") {
        const allSeries = [{ name: "Combined", data: backtestResults.main.equityCurve }, ...backtestResults.individuals.filter(r => r.metrics?.totalTrades > 0).map(r => ({ name: r.name, data: r.equityCurve }))];
        const allDates = [...new Set(allSeries.flatMap(s => s.data.map(p => new Date(p.timestamp).getTime())))].sort((a, b) => a - b);
        const lastBalance = {};
        allSeries.forEach(s => { lastBalance[s.name] = s.data[0]?.balance || 1000; });
        const mergedData = [];
        allDates.forEach(ts => {
            const point = { date: formatDate(ts) };
            allSeries.forEach(s => {
                const found = s.data.find(d => new Date(d.timestamp).getTime() === ts);
                if (found) lastBalance[s.name] = found.balance;
                point[s.name] = lastBalance[s.name];
            });
            mergedData.push(point);
        });
        const colors = ["#8884d8","#82ca9d","#ffc658","#ff8042","#0088FE","#00C49F","#FFBB28"];
        return { data: mergedData, series: allSeries.map((s,i) => ({ name: s.name, color: colors[i % colors.length] })) };
    }
    return null;
  }, [backtestResults, activeTestType]);

  if (initialLoading) return <div>Loading backtests...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div className="dashboard-container">
      <h2 className="header">Backtests</h2>
      {/* Forms (no change) */}
      <div className="forms-container">{/*...*/}</div>

      {/* --- Results --- */}
      {backtestResults.main && (
        <div className="chart-card">
          <div className="results-header">
            <h3>{backtestResults.main.name}</h3>
            {/* ✅ 5. The "Save Setup" Button */}
            <button onClick={openSaveModal} className="button-save">Save Setup</button>
          </div>
          {backtestResults.main.noTradeReason && <p className="no-trades-reason">⚠️ {backtestResults.main.noTradeReason}</p>}
          <MetricsDisplay metrics={backtestResults.main.metrics} />
          {chartData && (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData.data}>{/* ... */}</LineChart>
            </ResponsiveContainer>
          )}
          {activeTestType === "combo" && backtestResults.individuals.length > 0 && (
            <div className="individual-results">{/* ... */}</div>
          )}
        </div>
      )}

      {/* ✅ 6. The "Save Setup" Modal */}
      {isSaveModalOpen && (
          <div className="modal-overlay">
              <div className="modal-content">
                  <h3 className="modal-title">Save Backtest Setup</h3>
                  <p>Save this configuration as a "blueprint" to use with the live trading bot.</p>
                  <form onSubmit={handleSaveSetup}>
                      <label>
                          Setup Name
                          <input type="text" name="name" value={setupDetails.name} onChange={handleSetupDetailChange} required placeholder="e.g., My Profitable BTC Combo" />
                      </label>
                      <label>
                          Description
                          <textarea name="description" value={setupDetails.description} onChange={handleSetupDetailChange} placeholder="A short description of this setup." />
                      </label>
                      {saveError && <p className="error-text">{saveError}</p>}
                      <div className="modal-actions">
                          <button type="button" onClick={closeSaveModal} className="button-secondary">Cancel</button>
                          <button type="submit" className="button-save" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}

