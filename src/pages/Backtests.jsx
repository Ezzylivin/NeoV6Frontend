// File: src/pages/Backtests.jsx
import React, { useState, useEffect, useMemo, useContext } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import { StrategyContext } from "../context/StrategyContext.jsx";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import "./Backtests.css";

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b"];

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear()-1);
  const end = new Date(today); end.setDate(today.getDate()-1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

const initialFormData = {
  code: "", symbol: "", timeframe: "", startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate, params: {}, initialBalance: 1000,
};

const initialComboData = {
  strategyConfigs: [{ code: "" }],
  combinationRule: "AND", symbol: "", timeframe: "", startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate, initialBalance: 1000,
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
            {typeof m.value === "number" ? (m.label.includes("Win") ? `${m.value.toFixed(2)}%` : `$${m.value.toFixed(2)}`) : m.value || "N/A"}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function Backtests() {
  const { strategies: availableStrategies } = useContext(StrategyContext);
  const { options, singleLoading, batchLoading, runNewBacktest, runComboBacktest } = useBacktest();
  const { createSetup } = useBacktestSetupFunction();

  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTestType, setActiveTestType] = useState("single");
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [setupDetails, setSetupDetails] = useState({ name: "", description: "" });

  const strategyOptions = useMemo(() => options?.strategies || [], [options]);
  const symbolOptions = useMemo(() => options?.symbols || [], [options]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);

  useEffect(() => {
    if (strategyOptions.length && !formData.code) {
      setFormData(prev => ({ 
        ...prev, 
        code: strategyOptions[0].code, 
        symbol: symbolOptions[0]||"", 
        timeframe: timeframeOptions[0]||"", 
        params: strategyOptions[0].params 
      }));
    }
    if (strategyOptions.length && comboData.strategyConfigs[0].code === "") {
      setComboData(prev => ({
        ...prev,
        symbol: symbolOptions[0]||"",
        timeframe: timeframeOptions[0]||"",
        strategyConfigs: [{ code: strategyOptions[0].code }],
      }));
    }
  }, [strategyOptions, symbolOptions, timeframeOptions]);

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
    } else setComboData(prev => ({ ...prev, [name]: value }));
  };

  const addStrategyToCombo = () => {
    setComboData(prev => ({ ...prev, strategyConfigs: [...prev.strategyConfigs, { code: strategyOptions[0]?.code || "" }] }));
  };

  const removeStrategyFromCombo = (idx) => {
    setComboData(prev => ({
      ...prev,
      strategyConfigs: prev.strategyConfigs.filter((_, i) => i !== idx)
    }));
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setActiveTestType("single");
    try {
      const result = await runNewBacktest({ 
        code: formData.code,
        symbol: formData.symbol,
        timeframe: formData.timeframe,
        initial_balance: Number(formData.initialBalance), // backend expects snake_case
      });
      setBacktestResults({ main: { ...result, metrics: { ...result.metrics, initialBalance: Number(formData.initialBalance) } }, individuals: [] });
    } catch (err) { 
      console.error("❌ Error running single backtest:", err);
      alert(err.response?.data?.message || "Single backtest failed"); 
    }
  };

  const handleComboSubmit = async (e) => {
    e.preventDefault();
    setActiveTestType("combo");
    try {
      const strategyCodes = comboData.strategyConfigs.map(s => s.code).filter(Boolean);
      const payload = { 
        strategies: strategyCodes,
        symbol: comboData.symbol,
        timeframe: comboData.timeframe,
        initial_balance: Number(comboData.initialBalance), // backend expects snake_case
      };
      const result = await runComboBacktest(payload);
      setBacktestResults({ main: { ...result.combinedResult, metrics: { ...result.combinedResult.metrics, initialBalance: Number(comboData.initialBalance) } }, individuals: result.individualResults });
    } catch (err) { 
      console.error("❌ Error running combo backtest:", err);
      alert(err.response?.data?.message || "Combo backtest failed"); 
    }
  };

  const openSaveModal = () => setIsSaveModalOpen(true);
  const closeSaveModal = () => { setIsSaveModalOpen(false); setSetupDetails({ name: "", description: "" }); };
  const handleSetupChange = (e) => setSetupDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSaveSetup = async (e) => {
    e.preventDefault();
    if (!backtestResults.main) return alert("No backtest to save");
    const source = backtestResults.main.sourceData || {};
    const payload = {
      name: setupDetails.name,
      description: setupDetails.description,
      symbol: source.symbol,
      timeframe: source.timeframe,
      isCombo: activeTestType === "combo",
      strategyId: activeTestType === "single" ? availableStrategies.find(s => s.code === source.code)?._id : undefined,
      comboConfig: activeTestType === "combo" ? { strategyCodes: source.strategyCodes, combinationRule: source.combinationRule, initialBalance: source.initialBalance } : undefined,
      initialBalance: source.initialBalance,
    };
    try {
      const saved = await createSetup(payload);
      alert("Setup saved successfully!");
      closeSaveModal();
    } catch (err) { alert(err.response?.data?.message || "Failed to save setup"); }
  };

  // --- Chart Data ---
  const chartData = useMemo(() => {
    if (!backtestResults.main?.equityCurve) return [];
    return backtestResults.main.equityCurve.map(d => ({ date: d.date, equity: d.equity }));
  }, [backtestResults.main?.equityCurve]);

  const individualCharts = useMemo(() => {
    if (!backtestResults.individuals?.length) return [];
    return backtestResults.individuals.map(ind => ({
      code: ind.strategyCode,
      data: ind.equityCurve?.map(d => ({ date: d.date, equity: d.equity })) || [],
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

      {/* --- Single Strategy Form --- */}
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
        <button type="submit" disabled={singleLoading}>{singleLoading ? "Running
