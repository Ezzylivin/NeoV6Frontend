// File: src/pages/Backtests.jsx
import React, { useState, useEffect, useMemo, useContext } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import { StrategyContext } from "../context/StrategyContext.jsx";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, ResponsiveContainer
} from "recharts";
import "./Backtests.css";

// --- Constants ---
const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b"];
const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

const initialFormData = {
  code: "", symbol: "", timeframe: "", startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate, initialBalance: 1000,
  params: { trailingStop: "" } // Only keep trailingStop
};

const initialComboData = {
  strategyConfigs: [{ code: "", params: { trailingStop: "" } }],
  symbol: "", timeframe: "", startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate, initialBalance: 1000,
};

// --- Metrics Component ---
const MetricsDisplay = ({ metrics }) => {
  if (!metrics) return null;
  const items = [
    { label: "Initial Balance", value: metrics.initialBalance || metrics.finalBalance - metrics.totalProfit },
    { label: "Total Profit", value: metrics.totalProfit },
    { label: "Win Rate", value: metrics.winRate },
    { label: "Total Trades", value: metrics.totalTrades },
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
              ? (m.label.includes("Win Rate") || m.label.includes("Factor") ? `${m.value.toFixed(2)}` : `$${m.value.toFixed(2)}`)
              : m.value || "N/A"}
          </span>
        </div>
      ))}
    </div>
  );
};

// --- Main Component ---
export default function Backtests() {
  const { strategies: availableStrategies } = useContext(StrategyContext);
  const { state, runNewBacktest, runComboBacktest } = useBacktest();
  const { setups, createSetup } = useBacktestSetupFunction();
  const { loading, error, options } = state;

  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });

  const strategyOptions = useMemo(() => options?.strategies || [], [options]);
  const symbolOptions = useMemo(() => options?.symbols || [], [options]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);

  useEffect(() => {
    if (options.strategies.length > 0 && !formData.code) {
      setFormData(prev => ({
        ...prev,
        code: options.strategies[0]?.code || "",
        symbol: options.symbols[0] || "",
        timeframe: options.timeframes[0] || "",
        params: { trailingStop: "" }
      }));
    }
    if (options.strategies.length > 0 && !comboData.strategyConfigs[0].code) {
      setComboData(prev => ({
        ...prev,
        symbol: options.symbols[0] || "",
        timeframe: options.timeframes[0] || "",
        strategyConfigs: [{ code: options.strategies[0]?.code || "", params: { trailingStop: "" } }]
      }));
    }
  }, [options, formData.code, comboData.strategyConfigs]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("param_")) {
      const key = name.replace("param_", "");
      setFormData(prev => ({ ...prev, params: { ...prev.params, [key]: value ? Number(value) : undefined } }));
    } else setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleComboChange = (e, idx) => {
    const { name, value } = e.target;
    const newConfigs = [...comboData.strategyConfigs];
    if (name === "strategyCode") newConfigs[idx].code = value;
    else if (name.startsWith("param_")) {
      const key = name.replace("param_", "");
      newConfigs[idx].params[key] = value ? Number(value) : undefined;
    }
    setComboData(prev => ({ ...prev, strategyConfigs: newConfigs }));
  };

  const addStrategyToCombo = () => {
    setComboData(prev => ({
      ...prev,
      strategyConfigs: [...prev.strategyConfigs, { code: strategyOptions[0]?.code || "", params: { trailingStop: "" } }]
    }));
  };

  const removeStrategyFromCombo = (idx) => {
    setComboData(prev => ({ ...prev, strategyConfigs: prev.strategyConfigs.filter((_, i) => i !== idx) }));
  };

  // --- Submitting Single Backtest ---
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { trailingStop } = formData.params;
      const payload = {
        code: formData.code,
        symbol: formData.symbol.replace("-", "/").toUpperCase(),
        timeframe: formData.timeframe,
        startDate: formData.startDate,
        endDate: formData.endDate,
        initialBalance: Number(formData.initialBalance),
        params: trailingStop ? { trailingStop } : {} // Only send trailingStop
      };
      const result = await runNewBacktest(payload);
      setBacktestResults({ main: result, individuals: [] });
    } catch (err) {
      console.error("Single backtest failed:", err);
    }
  };

  // --- Submitting Combo Backtest ---
  const handleComboSubmit = async (e) => {
    e.preventDefault();
    try {
      const strategies = comboData.strategyConfigs
        .filter(c => c.code)
        .map(c => {
          const ts = c.params?.trailingStop;
          return { code: c.code, params: ts ? { trailingStop: ts } : {} }; // Only send trailingStop
        });

      if (!strategies.length) return alert("Select at least one strategy.");

      const payload = {
        strategies,
        symbol: comboData.symbol.replace("-", "/").toUpperCase(),
        timeframe: comboData.timeframe,
        startDate: comboData.startDate,
        endDate: comboData.endDate,
        initialBalance: Number(comboData.initialBalance) || 1000,
        combinationRule: "OR"
      };

      const result = await runComboBacktest(payload);
      setBacktestResults({
        main: result.combinedResult || { equityCurve: [], metrics: {} },
        individuals: result.individualResults || []
      });
    } catch (err) {
      console.error("Combo backtest failed:", err);
    }
  };

  // --- Chart Data ---
  const chartData = useMemo(() => {
    if (!backtestResults.main?.equityCurve?.length)
      return [{ date: new Date(), equity: backtestResults.main?.metrics?.initialBalance || 1000 }];
    return backtestResults.main.equityCurve.map(d => ({ date: d.timestamp || d.date, equity: d.balance || d.equity || 0 }));
  }, [backtestResults.main?.equityCurve]);

  const individualCharts = useMemo(() => {
    if (!backtestResults.individuals?.length) return [];
    return backtestResults.individuals.map(ind => ({
      code: ind.strategyName || ind.strategyCode,
      data: ind.equityCurve?.map(d => ({ date: d.timestamp || d.date, equity: d.balance || d.equity || 0 })) || [],
      metrics: ind.metrics
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
      {error && <div className="error-box"><h4>Error</h4><p>{error.message}</p></div>}

      <div className="forms-container">
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
          <label>Initial Balance: <input type="number" name
