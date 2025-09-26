// File: src/pages/Backtests.jsx
import React, { useState, useEffect, useMemo, useContext } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import { StrategyContext } from "../context/StrategyContext.jsx";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import "./Backtests.css";

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b"];

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
  const { strategies: availableStrategies, setStrategies } = useContext(StrategyContext);
  const { options, singleLoading, batchLoading, runNewBacktest, runComboBacktest } = useBacktest();
  const { createSetup } = useBacktestSetupFunction();

  const [formData, setFormData] = useState({});
  const [comboData, setComboData] = useState({});
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTestType, setActiveTestType] = useState("single");
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [setupDetails, setSetupDetails] = useState({ name: "", description: "" });

  const strategyOptions = useMemo(() => options?.strategies || [], [options]);
  const symbolOptions = useMemo(() => options?.symbols || [], [options]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);

  // --- Init forms
  useEffect(() => {
    if (!formData.code && strategyOptions.length) {
      setFormData({
        code: strategyOptions[0].code,
        symbol: symbolOptions[0]||"",
        timeframe: timeframeOptions[0]||"",
        params: strategyOptions[0].params,
        initialBalance: 1000
      });
    }
    if (!comboData.strategyConfigs && strategyOptions.length) {
      setComboData({
        strategyConfigs: [{ code: strategyOptions[0].code }],
        symbol: symbolOptions[0]||"",
        timeframe: timeframeOptions[0]||"",
        combinationRule: "AND",
        initialBalance: 1000
      });
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

  const addStrategyToCombo = () => setComboData(prev => ({
    ...prev,
    strategyConfigs: [...prev.strategyConfigs, { code: strategyOptions[0]?.code || "" }]
  }));

  const removeStrategyFromCombo = (idx) => setComboData(prev => ({
    ...prev,
    strategyConfigs: prev.strategyConfigs.filter((_, i) => i !== idx)
  }));

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setActiveTestType("single");
    try {
      const result = await runNewBacktest({ ...formData, initialBalance: Number(formData.initialBalance) });
      setBacktestResults({ main: { ...result, metrics: { ...result.metrics, initialBalance: Number(formData.initialBalance) } }, individuals: [] });
    } catch (err) { alert(err.response?.data?.message || "Single backtest failed"); }
  };

  const handleComboSubmit = async (e) => {
    e.preventDefault();
    setActiveTestType("combo");
    try {
      const strategyCodes = comboData.strategyConfigs.map(s => s.code).filter(Boolean);
      const payload = { ...comboData, strategyCodes, initialBalance: Number(comboData.initialBalance) };
      const result = await runComboBacktest(payload);
      setBacktestResults({
        main: { ...result.combinedResult, metrics: { ...result.combinedResult.metrics, initialBalance: Number(comboData.initialBalance) } },
        individuals: result.individualResults
      });
    } catch (err) { alert(err.response?.data?.message || "Combo backtest failed"); }
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
      setStrategies(prev => [saved, ...(prev||[])]);
      alert("Setup saved successfully!");
      closeSaveModal();
    } catch (err) { alert(err.response?.data?.message || "Failed to save setup"); }
  };

  // --- Chart data transformations ---
  const chartData = useMemo(() => {
    if (!backtestResults.main?.equityCurve) return [];
    return backtestResults.main.equityCurve.map(d => ({ date: d.date, equity: d.equity }));
  }, [backtestResults.main?.equityCurve]);

  const individualCharts = useMemo(() => {
    if (!backtestResults.individuals?.length) return [];
    return backtestResults.individuals.map(ind => ({
      code: ind.strategyCode,
      data: ind.equityCurve?.map(d => ({ date: d.date, equity: d.equity })) || [],
      metrics: ind.metrics
    }));
  }, [backtestResults.individuals]);

  const profitLossData = useMemo(() => individualCharts.map((s, i) => ({
    name: s.code,
    profit: s.metrics.totalProfit,
    trades: s.metrics.totalTrades
  })), [individualCharts]);

  const drawdownData = useMemo(() => individualCharts.map((s, i) => ({
    name: s.code,
    drawdown: s.metrics.maxDrawdown
  })), [individualCharts]);

  const winLossData = useMemo(() => individualCharts.map((s, i) => ({
    name: s.code,
    wins: s.metrics.totalTrades * (s.metrics.winRate/100),
    losses: s.metrics.totalTrades - (s.metrics.totalTrades * (s.metrics.winRate/100))
  })), [individualCharts]);

  const tradeReturns = useMemo(() => individualCharts.flatMap((s) =>
    s.data.slice(1).map((p, idx) => ({ name: s.code, return: p.equity - s.data[idx].equity }))
  ), [individualCharts]);

  return (
    <div className="dashboard-container">
      <h1 className="section-title">Backtests</h1>

      {/* --- Single + Combo Forms (existing) --- */}
      {/* ... keep all your existing form JSX here unchanged ... */}

      {/* --- Metrics --- */}
      {backtestResults.main && <MetricsDisplay metrics={backtestResults.main.metrics} />}

      {/* --- Main Equity Curve --- */}
      {chartData.length > 0 && (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="equity" stroke="#22c55e" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* --- Individual Strategy Curves --- */}
      {individualCharts.map((ind, idx) => ind.data.length>0 && (
        <div key={idx} className="individual-chart-container">
          <h4>{ind.code} Equity Curve</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ind.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="equity" stroke={COLORS[idx % COLORS.length]} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}

      {/* --- Profit/Loss Chart --- */}
      <h3>Profit / Trades per Strategy</h3>
      {profitLossData.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={profitLossData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="profit" fill="#22c55e" />
            <Bar dataKey="trades" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* --- Drawdown Chart --- */}
      <h3>Max Drawdown per Strategy</h3>
      {drawdownData.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={drawdownData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="drawdown" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* --- Win/Loss Pie Charts --- */}
      <h3>Wins vs Losses per Strategy</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
        {winLossData.map((s,i) => (
          <ResponsiveContainer key={i} width={250} height={250}>
            <PieChart>
              <Pie
                data={[
                  { name: "Wins", value: s.wins },
                  { name: "Losses", value: s.losses }
                ]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                <Cell fill="#22c55e" />
                <Cell fill="#ef4444" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ))}
      </div>

      {/* --- Trade Returns Histogram --- */}
      <h3>Individual Trade Returns</h3>
      {tradeReturns.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={tradeReturns}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="return" fill="#facc15" />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* --- Save Setup Modal --- */}
      {backtestResults.main && (
        <>
          <button onClick={openSaveModal} className="save-setup-btn">Save Backtest Setup</button>
          <div className={`modal ${isSaveModalOpen ? "modal-open" : ""}`}>
            <div className="modal-content">
              <h3>Save Backtest Setup</h3>
              <form onSubmit={handleSaveSetup}>
                <label>Name: <input name="name" value={setupDetails.name} onChange={handleSetupChange} required /></label>
                <label>Description: <input name="description" value={setupDetails.description} onChange={handleSetupChange} /></label>
                <button type="submit">Save</button>
                <button type="button" onClick={closeSaveModal}>Cancel</button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
