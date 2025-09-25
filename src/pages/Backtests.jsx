// File: src/pages/Backtests.jsx
import React, { useState, useEffect, useMemo, useContext } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import { StrategyContext } from "../context/StrategyContext.jsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./Backtests.css";

// --- Date Helpers ---
const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const getInitialDates = () => {
  const today = new Date();
  const start = new Date(today);
  start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today);
  end.setDate(today.getDate() - 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

// --- Initial Form Data ---
const initialFormData = {
  code: "",
  symbol: "",
  timeframe: "",
  startDate: getInitialDates().startDate,
  endDate: getInitialDates().endDate,
  params: {},
};

const initialComboData = {
  strategyConfigs: [{ code: "" }, { code: "" }],
  combinationRule: "AND",
  symbol: "",
  timeframe: "",
  startDate: getInitialDates().startDate,
  endDate: getInitialDates().endDate,
};

// --- Metrics Display ---
const MetricsDisplay = ({ metrics }) => {
  if (!metrics || Object.keys(metrics).length === 0)
    return <p className="no-metrics">No metrics available</p>;

  const keyMetrics = {
    "Total Profit": metrics.totalProfit,
    "Total Trades": metrics.totalTrades,
    "Win Rate": metrics.winRate,
    "Max Drawdown": metrics.maxDrawdown,
    "Profit Factor": metrics.profitFactor,
    "Final Balance": metrics.finalBalance,
  };

  const formatValue = (k, v) => {
    if (v == null) return "N/A";
    if (k.includes("Win Rate")) return `${v.toFixed(2)}%`;
    if (k.includes("Profit Factor")) return v.toFixed(2);
    if (k.includes("Profit") || k.includes("Drawdown") || k.includes("Balance"))
      return `$${v.toFixed(2)}`;
    return v;
  };

  return (
    <div className="metrics-grid">
      {Object.entries(keyMetrics).map(([k, v]) => (
        <div key={k} className="metric-item">
          <span className="metric-label">{k}</span>
          <span className="metric-value">{formatValue(k, v)}</span>
        </div>
      ))}
    </div>
  );
};

// --- Main Component ---
export default function Backtests() {
  const { strategies, setStrategies } = useContext(StrategyContext);
  const {
    options = { strategies: [], symbols: [], timeframes: [] },
    initialLoading,
    singleLoading,
    batchLoading,
    error,
    runNewBacktest,
    runComboBacktest,
  } = useBacktest();
  const { createSetup } = useBacktestSetupFunction();

  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTestType, setActiveTestType] = useState(null);
  const [setupDetails, setSetupDetails] = useState({ name: "", description: "" });
  const [resultKey, setResultKey] = useState(Date.now());

  // --- Initialize default strategy selection safely ---
  useEffect(() => {
    if (options.strategies.length && !formData.code) {
      const s = options.strategies[0];
      setFormData((prev) => ({
        ...prev,
        code: s.code,
        symbol: options.symbols[0] || "",
        timeframe: options.timeframes[0] || "",
        params: s.params || {},
      }));
      setComboData((prev) => ({
        ...prev,
        symbol: options.symbols[0] || "",
        timeframe: options.timeframes[0] || "",
        strategyConfigs: [
          { code: s.code },
          { code: options.strategies[1]?.code || "" },
        ],
      }));
    }
  }, [options]);

  // --- Form Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "code") {
      const s = options.strategies.find((s) => s.code === value);
      if (s)
        setFormData((prev) => ({
          ...prev,
          code: s.code,
          symbol: s.params?.symbol || options.symbols[0] || "",
          timeframe: s.params?.timeframe || options.timeframes[0] || "",
          params: s.params || {},
        }));
    } else setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleComboChange = (e, index = null) => {
    const { name, value } = e.target;
    setComboData((prev) => {
      if (name === "strategyCode" && index !== null) {
        const configs = [...prev.strategyConfigs];
        const duplicate = configs.some((c, i) => c.code === value && i !== index);
        if (duplicate) return prev;
        configs[index] = { ...configs[index], code: value };
        return { ...prev, strategyConfigs: configs };
      } else {
        return { ...prev, [name]: value };
      }
    });
  };

  const addStrategyToCombo = () => {
    setComboData((prev) => {
      if (prev.strategyConfigs.length >= options.strategies.length) return prev;
      return { ...prev, strategyConfigs: [...prev.strategyConfigs, { code: "" }] };
    });
  };

  const removeStrategyFromCombo = (idx) => {
    setComboData((prev) => ({
      ...prev,
      strategyConfigs: prev.strategyConfigs.filter((_, i) => i !== idx),
    }));
  };

  // --- Single Backtest ---
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setBacktestResults({ main: null, individuals: [] });
    setActiveTestType("single");
    setResultKey(Date.now());
    try {
      const result = await runNewBacktest(formData);
      if (result?.equityCurve?.length) {
        setBacktestResults({
          main: {
            name: "Backtest Results",
            metrics: { ...result.metrics, totalProfit: result.profit, finalBalance: result.finalBalance },
            equityCurve: result.equityCurve,
            sourceData: formData,
          },
          individuals: [],
        });
      } else alert("Backtest ran but produced no trades.");
    } catch (err) {
      alert(err.response?.data?.message || "Error running backtest");
    }
  };

  // --- Combo Backtest ---
  const handleComboSubmit = async (e) => {
    e.preventDefault();
    setBacktestResults({ main: null, individuals: [] });
    setActiveTestType("combo");
    setResultKey(Date.now());

    try {
      const selectedStrategies = comboData.strategyConfigs
        .filter((s) => s.code)
        .map((s) => {
          const strat = options.strategies.find((opt) => opt.code === s.code);
          return { strategyId: strat?._id || s.code, params: strat?.params || {} };
        });

      if (selectedStrategies.length < 2) return alert("Select at least 2 unique strategies.");

      const payload = {
        params: {
          combinationRule: comboData.combinationRule,
          symbol: comboData.symbol,
          timeframe: comboData.timeframe,
          startDate: comboData.startDate,
          endDate: comboData.endDate,
          strategyParams: selectedStrategies,
        },
      };

      const result = await runComboBacktest(payload);

      if (result?.combinedResult?.equityCurve?.length) {
        setBacktestResults({
          main: {
            name: "Combined Strategy Performance",
            metrics: result.combinedResult.metrics,
            equityCurve: result.combinedResult.equityCurve,
            sourceData: payload,
          },
          individuals: result.individualResults?.map((r) => ({
            name: r.strategyName,
            metrics: r.metrics,
            equityCurve: r.equityCurve,
            noTradeReason: r.noTradeReason,
          })) || [],
        });
      } else alert("Combo backtest ran but produced no trades.");
    } catch (err) {
      console.error("Combo backtest failed:", err);
      alert(
        err.response?.data?.message ||
          "Error running combo backtest. Ensure at least 2 strategies are selected."
      );
    }
  };

  // --- Save Setup ---
  const handleSetupDetailChange = (e) =>
    setSetupDetails({ ...setupDetails, [e.target.name]: e.target.value });

  const handleSaveSetup = async (e) => {
    e.preventDefault();
    const source = backtestResults.main?.sourceData;
    if (!source) return alert("No backtest results to save.");

    try {
      let payload;
      if (activeTestType === "single") {
        const strategy = options.strategies.find((s) => s.code === source.code);
        payload = {
          name: setupDetails.name,
          description: setupDetails.description,
          strategies: [strategy?._id || source.code],
          params: {
            symbol: source.symbol,
            timeframe: source.timeframe,
            startDate: source.startDate,
            endDate: source.endDate,
            strategyParams: [{ strategyId: strategy?._id || source.code, params: strategy?.params || {} }],
          },
        };
      } else {
        payload = {
          name: setupDetails.name,
          description: setupDetails.description,
          strategies: source.strategyParams.map((s) => s.strategyId),
          params: source,
        };
      }

      const saved = await createSetup(payload);
      alert("Setup saved successfully!");
      setSetupDetails({ name: "", description: "" });
      setStrategies((prev) => [...prev, saved]);
    } catch (err) {
      console.error("Save setup failed:", err);
      alert(err.response?.data?.message || "Failed to save setup.");
    }
  };

  // --- Chart Data ---
  const chartData = useMemo(() => {
    if (!backtestResults?.main?.equityCurve?.length) return null;

    const mapSeriesToPoints = (seriesData) =>
      seriesData.map((p) => ({ date: formatDate(p.timestamp), Equity: p.balance }));

    if (activeTestType === "single")
      return {
        data: mapSeriesToPoints(backtestResults.main.equityCurve),
        series: [{ name: "Equity", color: "#8884d8", dataKey: "Equity" }],
      };

    if (activeTestType === "combo") {
      const individualSeries = backtestResults.individuals
        .filter((r) => r.metrics?.totalTrades > 0)
        .map((r) => ({ name: r.name, data: r.equityCurve }));

      const allSeries = [{ name: "Combined", data: backtestResults.main.equityCurve }, ...individualSeries];

      const allTimestamps = [
        ...new Set(allSeries.flatMap((s) => s.data.map((p) => new Date(p.timestamp).getTime()))),
      ].sort((a, b) => a - b);

      const dataMap = {};
      allSeries.forEach((s) => {
        dataMap[s.name] = s.data.reduce((acc, p) => {
          acc[new Date(p.timestamp).getTime()] = p.balance;
          return acc;
        }, {});
      });

      const lastBalances = {};
      allSeries.forEach((s) => (lastBalances[s.name] = s.data[0]?.balance || 1000));

      const mergedData = allTimestamps.map((ts) => {
        const point = { date: formatDate(ts) };
        allSeries.forEach((s) => {
          if (dataMap[s.name][ts] !== undefined) lastBalances[s.name] = dataMap[s.name][ts];
          point[s.name] = lastBalances[s.name];
        });
        return point;
      });

      const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F", "#FFBB28"];
      return { data: mergedData, series: allSeries.map((s, i) => ({ name: s.name, color: colors[i % colors.length], dataKey: s.name })) };
    }

    return null;
  }, [backtestResults, activeTestType]);

  if (initialLoading) return <div>Loading...</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  return (
    <div className="dashboard-container">
      <h2 className="header">Backtests</h2>

      {/* Forms */}
      <div className="forms-container">
        {/* Single Backtest Form */}
        <form className="card-row" onSubmit={handleSingleSubmit}>
          <div className="metric-card">
            <h3 className="card-title">Single Strategy Backtest</h3>
            <label>
              Strategy
              <select name="code" value={formData.code} onChange={handleChange} required>
                <option value="">-- Select a strategy --</option>
                {options.strategies.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </label>
            <label>
              Symbol
              <select name="symbol" value={formData.symbol} onChange={handleChange} required>
                {options.symbols.map((sym) => <option key={sym} value={sym}>{sym}</option>)}
              </select>
            </label>
            <label>
              Timeframe
              <select name="timeframe" value={formData.timeframe} onChange={handleChange} required>
                {options.timeframes.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
              </select>
            </label>
            <label>
              Start Date
              <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required />
            </label>
            <label>
              End Date
              <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required />
            </label>
            <button type="submit" disabled={singleLoading}>{singleLoading ? "Running..." : "Run Backtest"}</button>
          </div>
        </form>

        {/* Combo Backtest Form */}
        <form className="card-row" onSubmit={handleComboSubmit}>
          <div className="metric-card">
            <h3 className="card-title">Combined Strategy Backtest</h3>
            {comboData.strategyConfigs.map((cfg, idx) => (
              <div key={idx} className="combo-strategy-row">
                <label>
                  Strategy {idx + 1}
                  <select
                    name="strategyCode"
                    value={cfg.code}
                    onChange={(e) => handleComboChange(e, idx)}
                    required
                  >
                    <option value="">-- Select a strategy --</option>
                    {options.strategies
                      .filter((s) => !comboData.strategyConfigs.some((c, i) => c.code === s.code && i !== idx))
                      .map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                  </select>
                </label>
                {comboData.strategyConfigs.length > 2 && (
                  <button type="button" onClick={() => removeStrategyFromCombo(idx)}>Remove</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addStrategyToCombo} disabled={comboData.strategyConfigs.length >= options.strategies.length}>Add Strategy</button>

            <label>
              Combination Rule
              <select name="combinationRule" value={comboData.combinationRule} onChange={(e) => handleComboChange(e)}>
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            </label>

            <label>
              Symbol
              <select name="symbol" value={comboData.symbol} onChange={(e) => handleComboChange(e)} required>
                {options.symbols.map((sym) => <option key={sym} value={sym}>{sym}</option>)}
              </select>
            </label>

            <label>
              Timeframe
              <select name="timeframe" value={comboData.timeframe} onChange={(e) => handleComboChange(e)} required>
                {options.timeframes.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
              </select>
            </label>

            <label>
              Start Date
              <input type="date" name="startDate" value={comboData.startDate} onChange={(e) => handleComboChange(e)} required />
            </label>

            <label>
              End Date
              <input type="date" name="endDate" value={comboData.endDate} onChange={(e) => handleComboChange(e)} required />
            </label>

            <button type="submit" disabled={batchLoading || comboData.strategyConfigs.filter(s => s.code).length < 2}>
              {batchLoading ? "Running..." : "Run Combo Backtest"}
            </button>
          </div>
        </form>
      </div>

      {/* Save Setup Form */}
      {backtestResults.main && (
        <form className="save-setup-form" onSubmit={handleSaveSetup}>
          <h3>Save Backtest Setup</h3>
          <label>
            Name
            <input type="text" name="name" value={setupDetails.name} onChange={handleSetupDetailChange} required />
          </label>
          <label>
            Description
            <textarea name="description" value={setupDetails.description} onChange={handleSetupDetailChange} />
          </label>
          <button type="submit">Save Setup</button>
        </form>
      )}

      {/* Metrics & Chart */}
      {backtestResults.main && (
        <div className="chart-container">
          <h3>{backtestResults.main.name}</h3>
          <MetricsDisplay metrics={backtestResults.main.metrics} />
          {chartData && (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {chartData.series.map((s) => (
                  <Line key={s.name} type="monotone" dataKey={s.dataKey} stroke={s.color} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
