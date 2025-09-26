// File: src/pages/Backtests.jsx
import React, { useState, useEffect, useMemo, useContext } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import { StrategyContext } from "../context/StrategyContext.jsx";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
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

const MetricsChart = ({ metrics }) => {
  if (!metrics) return null;
  const items = [
    { label: "Total Profit", value: metrics.totalProfit },
    { label: "Win Rate", value: metrics.winRate },
    { label: "Max DD", value: metrics.maxDrawdown },
    { label: "Profit Factor", value: metrics.profitFactor },
    { label: "Final Balance", value: metrics.finalBalance },
  ];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={items} layout="vertical" margin={{ left: 40 }}>
        <XAxis type="number" />
        <YAxis type="category" dataKey="label" />
        <Tooltip />
        <Bar dataKey="value" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
};

const WinLossPie = ({ metrics }) => {
  if (!metrics || !metrics.totalTrades) return null;
  const wins = metrics.totalTrades * (metrics.winRate / 100);
  const losses = metrics.totalTrades - wins;
  const data = [
    { name: "Win", value: wins, color: COLORS[0] },
    { name: "Loss", value: losses, color: COLORS[1] },
  ];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={80} label>
          {data.map((entry, index) => <Cell key={index} fill={entry.color} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};

const StrategyCharts = ({ title, curve, metrics }) => (
  <div className="strategy-charts">
    <h3>{title}</h3>
    <div className="charts-grid">
      {/* Equity Curve */}
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={curve}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="equity" stroke="#22c55e" dot={false} />
        </LineChart>
      </ResponsiveContainer>

      {/* Metrics */}
      <MetricsChart metrics={metrics} />

      {/* Win/Loss Pie */}
      <WinLossPie metrics={metrics} />
    </div>
  </div>
);

export default function Backtests() {
  const { strategies: availableStrategies, setStrategies } = useContext(StrategyContext);
  const { options, singleLoading, batchLoading, runNewBacktest, runComboBacktest } = useBacktest();
  const { createSetup } = useBacktestSetupFunction();

  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTestType, setActiveTestType] = useState("single");

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

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setActiveTestType("single");
    try {
      const result = await runNewBacktest({ ...formData, initialBalance: Number(formData.initialBalance) });
      setBacktestResults({ main: { ...result, metrics: { ...result.metrics, initialBalance: Number(formData.initialBalance) } }, individuals: [] });
    } catch (err) { alert("Single backtest failed"); }
  };

  const handleComboSubmit = async (e) => {
    e.preventDefault();
    setActiveTestType("combo");
    try {
      const strategyCodes = comboData.strategyConfigs.map(s => s.code).filter(Boolean);
      const payload = { ...comboData, strategyCodes, initialBalance: Number(comboData.initialBalance) };
      const result = await runComboBacktest(payload);
      setBacktestResults({ main: { ...result.combinedResult, metrics: { ...result.combinedResult.metrics, initialBalance: Number(comboData.initialBalance) } }, individuals: result.individualResults });
    } catch (err) { alert("Combo backtest failed"); }
  };

  return (
    <div className="dashboard-container">
      <h1>Backtests</h1>

      {/* Single Backtest Form */}
      <form className="backtest-form" onSubmit={handleSingleSubmit}>
        <h2>Single Strategy</h2>
        <button type="submit" disabled={singleLoading}>{singleLoading ? "Running..." : "Run Backtest"}</button>
      </form>

      {/* Combo Backtest Form */}
      <form className="backtest-form" onSubmit={handleComboSubmit}>
        <h2>Combo Strategies</h2>
        <button type="submit" disabled={batchLoading}>{batchLoading ? "Running..." : "Run Combo Backtest"}</button>
      </form>

      {/* Results */}
      {backtestResults.main && (
        <StrategyCharts
          title={activeTestType === "combo" ? "Combined Strategy" : "Single Strategy"}
          curve={backtestResults.main.equityCurve}
          metrics={backtestResults.main.metrics}
        />
      )}

      {backtestResults.individuals.map((ind, idx) => (
        <StrategyCharts
          key={idx}
          title={`Strategy: ${ind.strategyCode}`}
          curve={ind.equityCurve}
          metrics={ind.metrics}
        />
      ))}
    </div>
  );
}
