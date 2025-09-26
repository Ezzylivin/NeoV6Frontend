// File: src/pages/Backtests.jsx
import React, { useState, useEffect, useMemo, useContext } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import { StrategyContext } from "../context/StrategyContext.jsx";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import runCombinedStrategyService from "../services/strategyEngineService.js";
import "./Backtests.css";

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b"];

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

const initialFormData = {
  code: "", symbol: "", timeframe: "", startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate, params: {}, initialBalance: 1000,
};

const initialComboData = {
  strategyConfigs: [{ code: "" }],
  symbol: "", timeframe: "", startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate, initialBalance: 1000,
  combinationRule: "AND", // default rule
};

const MetricsDisplay = ({ metrics }) => {
  if (!metrics) return null;
  const items = [
    { label: "Initial Balance", value: metrics.initialBalance },
    { label: "Total Profit", value: metrics.totalProfit },
    { label: "Win Trades", value: metrics.winRate },
    { label: "Max Drawdown", value: metrics.maxDrawdown },
    { label: "Profit Factor", value: metrics.profitFactor },
    { label: "Final Balance", value: metrics.finalBalance },
  ];
  return (
    <div className="metrics-grid">
      {items.map(m => (
        <div key={m.label} className="metric-item">
          <span className="metric-label">{m.label}</span>
          <span className="metric-value">
            {typeof m.value === "number"
              ? (m.label.includes("Win") ? `${m.value.toFixed(2)}%` : `$${m.value.toFixed(2)}`)
              : m.value || "N/A"}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function Backtests() {
  const { strategies: availableStrategies } = useContext(StrategyContext);
  const { options, singleLoading, batchLoading, runNewBacktest } = useBacktest();
  const { setups, createSetup } = useBacktestSetupFunction();

  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTestType, setActiveTestType] = useState("single");
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [setupDetails, setSetupDetails] = useState({ name: "", description: "" });

  const strategyOptions = useMemo(() => options?.strategies || [], [options]);
  const symbolOptions = useMemo(() => options?.symbols || [], [options]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);

  // Initialize default selections
  useEffect(() => {
    if (strategyOptions.length && !formData.code) {
      setFormData(prev => ({
        ...prev,
        code: strategyOptions[0].code,
        symbol: symbolOptions[0] || "",
        timeframe: timeframeOptions[0] || "",
        params: strategyOptions[0].params,
      }));
    }
    if (strategyOptions.length && comboData.strategyConfigs[0].code === "") {
      setComboData(prev => ({
        ...prev,
        symbol: symbolOptions[0] || "",
        timeframe: timeframeOptions[0] || "",
        strategyConfigs: [{ code: strategyOptions[0].code }],
      }));
    }
  }, [strategyOptions, symbolOptions, timeframeOptions]);

  // --- Form Handlers ---
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("param_")) {
      const key = name.replace("param_", "");
      setFormData(prev => ({ ...prev, params: { ...prev.params, [key]: value } }));
    } else setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleComboChange = (e, idx) => {
    const { name, value } = e.target;
    if (name === "strategyCode") {
      const newConfigs = [...comboData.strategyConfigs];
      newConfigs[idx] = { ...newConfigs[idx], code: value };
      setComboData(prev => ({ ...prev, strategyConfigs: newConfigs }));
    } else {
      setComboData(prev => ({ ...prev, [name]: value }));
    }
  };

  const addStrategyToCombo = () => {
    setComboData(prev => ({
      ...prev,
      strategyConfigs: [...prev.strategyConfigs, { code: strategyOptions[0]?.code || "" }]
    }));
  };

  const removeStrategyFromCombo = (idx) => {
    setComboData(prev => ({
      ...prev,
      strategyConfigs: prev.strategyConfigs.filter((_, i) => i !== idx)
    }));
  };

  // --- Backtest Submit Handlers ---
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setActiveTestType("single");
    try {
      const result = await runNewBacktest({
        strategies: [formData.code],
        symbol: formData.symbol,
        timeframe: formData.timeframe,
        initial_balance: Number(formData.initialBalance)
      });
      setBacktestResults({ main: result, individuals: [] });
    } catch (err) {
      alert(err.message || "Single backtest failed");
    }
  };

  const handleComboSubmit = async (e) => {
    e.preventDefault();
    setActiveTestType("combo");

    try {
      const strategyCodes = comboData.strategyConfigs.map(s => s.code).filter(Boolean);
      if (!strategyCodes.length) return alert("Select at least one strategy");

      const payload = {
        strategyCodes,
        combinationRule: comboData.combinationRule,
        symbol: comboData.symbol,
        timeframe: comboData.timeframe,
        startDate: comboData.startDate,
        endDate: comboData.endDate,
        initialBalance: Number(comboData.initialBalance),
      };

      const result = await runCombinedStrategyService("CURRENT_USER_ID", payload);
      if (!result || !result.combinedResult) return alert("No result returned");

      setBacktestResults({
        main: result.combinedResult,
        individuals: result.individualResults || []
      });
    } catch (err) {
      console.error("runCombinedStrategyService failed", err);
      alert(err?.message || "Combo backtest failed");
    }
  };

  // --- Save Setup Handlers ---
  const openSaveModal = () => setIsSaveModalOpen(true);
  const closeSaveModal = () => { setIsSaveModalOpen(false); setSetupDetails({ name: "", description: "" }); };
  const handleSetupChange = (e) => setSetupDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSaveSetup = async (e) => {
    e.preventDefault();
    if (!backtestResults.main) return alert("No backtest to save");
    const payload = {
      name: setupDetails.name,
      description: setupDetails.description,
      symbol: backtestResults.main.symbol,
      timeframe: backtestResults.main.timeframe,
      strategies: backtestResults.main.strategies,
      initialBalance: backtestResults.main.initialBalance,
    };
    try {
      await createSetup(payload);
      alert("Setup saved successfully!");
      closeSaveModal();
    } catch (err) { alert(err.message || "Failed to save setup"); }
  };

  // --- Chart Data ---
  const chartData = useMemo(() => {
    if (!backtestResults.main?.equityCurve) return [];
    return backtestResults.main.equityCurve.map(d => ({ date: d.timestamp, equity: d.balance }));
  }, [backtestResults.main?.equityCurve]);

  const individualCharts = useMemo(() => {
    if (!backtestResults.individuals?.length) return [];
    return backtestResults.individuals.map(ind => ({
      code: ind.strategyName,
      data: ind.equityCurve?.map(d => ({ date: d.timestamp, equity: d.balance })) || [],
    }));
  }, [backtestResults.individuals]);

  const pieData = useMemo(() => {
    const metrics = backtestResults.main?.metrics || {};
    if (!metrics.totalTrades) return [];
    const wins = metrics.totalTrades * (metrics.winRate / 100);
    const losses = metrics.totalTrades - wins;
    return [{ name: "Win", value: wins, color: COLORS[0] }, { name: "Loss", value: losses, color: COLORS[1] }];
  }, [backtestResults.main?.metrics]);

  return (
    <div className="dashboard-container">
      <h1>Backtests</h1>

      {/* Single Strategy Form */}
      <form className="backtest-form" onSubmit={handleSingleSubmit}>
        <h2>Single Strategy Backtest</h2>
        <label>Strategy:
          <select name="code" value={formData.code} onChange={handleFormChange}>
            {strategyOptions.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </label>
        <label>Symbol:
          <select name="symbol" value={formData.symbol} onChange={handleFormChange}>
            {symbolOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>Timeframe:
          <select name="timeframe" value={formData.timeframe} onChange={handleFormChange}>
            {timeframeOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>Start Date: <input type="date" name="startDate" value={formData.startDate} onChange={handleFormChange} /></label>
        <label>End Date: <input type="date" name="endDate" value={formData.endDate} onChange={handleFormChange} /></label>
        <label>Initial Balance: <input type="number" name="initialBalance" value={formData.initialBalance} onChange={handleFormChange} /></label>
        <button type="submit" disabled={singleLoading}>{singleLoading ? "Running..." : "Run Backtest"}</button>
      </form>

      {/* Combo Strategy Form */}
      <form className="backtest-form" onSubmit={handleComboSubmit}>
        <h2>Combo Strategy Backtest</h2>
        {comboData.strategyConfigs.map((config, idx) => (
          <div key={idx} className="combo-strategy-row">
            <label>Strategy {idx + 1}:
              <select value={config.code} name="strategyCode" onChange={(e) => handleComboChange(e, idx)}>
                {strategyOptions.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => removeStrategyFromCombo(idx)} disabled={comboData.strategyConfigs.length === 1}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={addStrategyToCombo}>Add Strategy</button>
        <label>Symbol:
          <select name="symbol" value={comboData.symbol} onChange={(e) => handleComboChange(e, -1)}>
            {symbolOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>Timeframe:
          <select name="timeframe" value={comboData.timeframe} onChange={(e) => handleComboChange(e, -1)}>
            {timeframeOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>Start Date: <input type="date" name="startDate" value={comboData.startDate} onChange={(e) => handleComboChange(e, -1)} /></label>
        <label>End Date: <input type="date" name="endDate" value={comboData.endDate} onChange={(e) => handleComboChange(e, -1)} /></label>
        <label>Initial Balance: <input type="number" name="initialBalance" value={comboData.initialBalance} onChange={(e) => handleComboChange(e, -1)} /></label>
        <label>Combination Rule:
          <select name="combinationRule" value={comboData.combinationRule} onChange={(e) => handleComboChange(e, -1)}>
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
        </label>
        <button type="submit" disabled={batchLoading}>{batchLoading ? "Running..." : "Run Combo Backtest"}</button>
      </form>

      {/* Metrics */}
      <MetricsDisplay metrics={backtestResults.main?.metrics} />

      {/* Equity Curves */}
      <h2>Equity Curves</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          {chartData.length > 0 && <Line type="monotone" data={chartData} dataKey="equity" name="Combined" stroke={COLORS[0]} dot={false} />}
          {individualCharts.map((ind, i) => (
            <Line key={i} type="monotone" data={ind.data} dataKey="equity" name={ind.code} stroke={COLORS[(i + 1) % COLORS.length]} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Wins vs Losses Pie */}
      {pieData.length > 0 && (
        <>
          <h2>Wins vs Losses</h2>
          <ResponsiveContainer width={250} height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </>
      )}

      {/* Save Setup Modal */}
      {isSaveModalOpen && (
        <div className="modal modal-open">
          <div className="modal-content">
            <h3>Save Backtest Setup</h3>
            <label>Name: <input type="text" name="name" value={setupDetails.name} onChange={handleSetupChange} /></label>
            <label>Description: <input type="text" name="description" value={setupDetails.description} onChange={handleSetupChange} /></label>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button type="button" onClick={closeSaveModal}>Cancel</button>
              <button type="button" onClick={handleSaveSetup}>Save</button>
            </div>
          </div>
        </div>
      )}

      <button className="save-setup-btn" onClick={openSaveModal}>Save Backtest Setup</button>
    </div>
  );
}
