// File: Backtests.jsx
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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import "./Backtests.css";

// --- Helper functions ---
const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  strategyConfigs: [{ code: "" }],
  combinationRule: "AND",
  symbol: "",
  timeframe: "",
  startDate: getInitialDates().startDate,
  endDate: getInitialDates().endDate,
};

// --- Metrics Display ---
const MetricsDisplay = ({ metrics }) => {
  if (!metrics || Object.keys(metrics).length === 0) return <p className="no-metrics">No metrics available</p>;

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
    if (k.includes("Profit") || k.includes("Drawdown") || k.includes("Balance")) return `$${v.toFixed(2)}`;
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
  const { options, initialLoading, singleLoading, batchLoading, error, runNewBacktest, runComboBacktest } = useBacktest();
  const { createSetup, loading: isSaving, error: saveError } = useBacktestSetupFunction();

  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTestType, setActiveTestType] = useState(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [setupDetails, setSetupDetails] = useState({ name: "", description: "" });
  const [savedSetup, setSavedSetup] = useState(null);
  const [resultKey, setResultKey] = useState(Date.now());

  // --- Initialize default strategy selection ---
  useEffect(() => {
    if (options && options.strategies?.length > 0 && !formData.code) {
      const s = options.strategies[0];
      setFormData((prev) => ({
        ...prev,
        code: s.code,
        symbol: options.symbols?.[0] || "",
        timeframe: options.timeframes?.[0] || "",
        params: s.params || {},
      }));
      setComboData((prev) => ({
        ...prev,
        symbol: options.symbols?.[0] || "",
        timeframe: options.timeframes?.[0] || "",
        strategyConfigs: [{ code: s.code }, { code: options.strategies?.[1]?.code || "" }],
      }));
    }
  }, [options]);

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "code") {
      const s = options.strategies?.find((s) => s.code === value);
      if (s)
        setFormData((prev) => ({
          ...prev,
          code: s.code,
          symbol: s.params?.symbol || options.symbols?.[0],
          timeframe: s.params?.timeframe || options.timeframes?.[0],
          params: s.params || {},
        }));
    } else setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleComboChange = (e, index) => {
    const { name, value } = e.target;
    setComboData((prev) => {
      if (name === "strategyCode") {
        const configs = [...prev.strategyConfigs];
        configs[index] = { ...configs[index], code: value };
        return { ...prev, strategyConfigs: configs };
      }
      return { ...prev, [name]: value };
    });
  };

  const addStrategyToCombo = () =>
    setComboData((prev) => ({ ...prev, strategyConfigs: [...prev.strategyConfigs, { code: "" }] }));

  const removeStrategyFromCombo = (idx) =>
    setComboData((prev) => ({ ...prev, strategyConfigs: prev.strategyConfigs.filter((_, i) => i !== idx) }));

  // --- Single Backtest ---
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setBacktestResults({ main: null, individuals: [] });
    setActiveTestType("single");
    setResultKey(Date.now());

    try {
      const result = await runNewBacktest(formData);
      if (result?.equityCurve?.length > 0) {
        setBacktestResults({
          main: {
            name: "Backtest Results",
            metrics: { ...result.metrics, totalProfit: result.profit, finalBalance: result.finalBalance },
            equityCurve: result.equityCurve,
            sourceData: formData,
          },
          individuals: [],
        });
      } else alert("Backtest ran successfully but produced no trades.");
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
      const strategyCodes = comboData.strategyConfigs.map((s) => s.code).filter(Boolean);
      if (strategyCodes.length < 2) return alert("Select at least 2 unique strategies for a combo test.");

      const payload = {
        combinationRule: comboData.combinationRule,
        symbol: comboData.symbol,
        timeframe: comboData.timeframe,
        startDate: comboData.startDate,
        endDate: comboData.endDate,
        strategyCodes,
      };

      const result = await runComboBacktest(payload);
      if (result?.combinedResult?.equityCurve?.length > 0) {
        setBacktestResults({
          main: {
            name: "Combined Strategy Performance",
            metrics: result.combinedResult.metrics,
            equityCurve: result.combinedResult.equityCurve,
            sourceData: payload,
          },
          individuals: result.individualResults.map((r) => ({
            name: r.strategyName,
            metrics: r.metrics,
            equityCurve: r.equityCurve,
            noTradeReason: r.noTradeReason,
            trades: r.trades || [],
          })),
        });
      } else alert("Combo backtest ran successfully but produced no trades.");
    } catch (err) {
      console.error("Combo backtest failed:", err);
      alert(err.response?.data?.message || "Error running combo backtest");
    }
  };

  // --- Save Setup ---
  const openSaveModal = () => setIsSaveModalOpen(true);
  const closeSaveModal = () => setIsSaveModalOpen(false);
  const handleSetupDetailChange = (e) => setSetupDetails({ ...setupDetails, [e.target.name]: e.target.value });

  const handleSaveSetup = async (e) => {
    e.preventDefault();
    const source = backtestResults.main?.sourceData;
    if (!source) return alert("No backtest results to save.");

    try {
      let payload;
      if (activeTestType === "single") {
        const strategy = options.strategies?.find((s) => s.code === source.code);
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
          strategies: source.strategyCodes || [],
          params: {
            symbol: source.symbol,
            timeframe: source.timeframe,
            startDate: source.startDate,
            endDate: source.endDate,
            strategyParams: (source.strategyCodes || []).map((code) => ({ strategyId: code, params: {} })),
            combinationRule: source.combinationRule,
          },
        };
      }

      const saved = await createSetup(payload);
      alert("Setup saved successfully!");
      setSetupDetails({ name: "", description: "" });
      setSavedSetup(payload);
      setStrategies((prev) => [...(prev || []), saved]);
      closeSaveModal();
    } catch (err) {
      console.error("Save setup failed:", err);
      alert(err.response?.data?.message || "Failed to save setup.");
    }
  };

  // --- Chart / Trade Computations ---
  const equityCurve = backtestResults?.main?.equityCurve || [];
  const trades = useMemo(() => {
    const mTrades = backtestResults?.main?.metrics?.trades;
    if (Array.isArray(mTrades)) return mTrades;
    const indTrades = backtestResults?.individuals?.flatMap((r) => r.trades || []) || [];
    if (indTrades.length > 0) return indTrades;
    return [];
  }, [backtestResults]);

  const drawdownData = useMemo(() => {
    if (!equityCurve.length) return [];
    let peak = -Infinity;
    return equityCurve.map((p) => {
      peak = Math.max(peak, p.balance);
      const dd = peak > 0 ? ((p.balance - peak) / peak) * 100 : 0;
      return { date: formatDate(p.timestamp), drawdown: dd };
    });
  }, [equityCurve]);

  const distributionData = useMemo(() => {
    if (!trades.length) return [];
    const bins = Array.from({ length: 11 }, (_, i) => {
      const low = -50 + i * 10;
      const high = low + 10;
      return { label: `${low}%–${high}%`, count: 0 };
    });
    trades.forEach((t) => {
      let pct = null;
      if (typeof t.returnPct === "number") pct = t.returnPct;
      else if (typeof t.pnl === "number" && t.entryPrice && t.size) {
        const denom = Math.abs(t.entryPrice * (t.size || 1));
        if (denom !== 0) pct = (t.pnl / denom) * 100;
      }
      if (pct == null || isNaN(pct)) return;
      const idx = Math.min(10, Math.max(0, Math.floor((pct + 50) / 10)));
      bins[idx].count += 1;
    });
    return bins;
  }, [trades]);

  const monthlyData = useMemo(() => {
    if (!equityCurve.length) return [];
    const map = {};
    equityCurve.forEach((p) => {
      const ymd = formatDate(p.timestamp);
      const month = ymd.slice(0, 7);
      if (!map[month]) map[month] = { month, start: p.balance, end: p.balance };
      else map[month].end = p.balance;
    });
    return Object.values(map).map((m) => ({ month: m.month, profit: m.end - m.start }));
  }, [equityCurve]);

  const winLossData = useMemo(() => {
    if (!trades.length) return [];
    let wins = 0,
      losses = 0;
    trades.forEach((t) => {
      const pnl = t.pnl || 0;
      if (pnl > 0) wins += 1;
      else losses += 1;
    });
    return [
      { name: "Wins", value: wins },
      { name: "Losses", value: losses },
    ];
  }, [trades]);

  const COLORS = ["#0088FE", "#FF8042"];

  if (initialLoading) return <div>Loading...</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  return (
    <div className="backtests-page">
      <h2>Backtests</h2>

      {/* Single Backtest Form */}
      <form className="backtest-form" onSubmit={handleSingleSubmit}>
        <h3>Single Strategy Backtest</h3>
        <button type="submit" disabled={singleLoading}>
          {singleLoading ? "Running..." : "Run Backtest"}
        </button>
      </form>

      {/* Combo Backtest Form */}
      <form className="backtest-form" onSubmit={handleComboSubmit}>
        <h3>Combo Strategy Backtest</h3>
        <button type="submit" disabled={batchLoading}>
          {batchLoading ? "Running..." : "Run Combo Backtest"}
        </button>
      </form>

      {backtestResults.main && (
        <div key={resultKey} className="backtest-results">
          <h3>{backtestResults.main.name}</h3>
          <MetricsDisplay metrics={backtestResults.main.metrics} />

          {/* Equity Chart */}
          {equityCurve.length > 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={equityCurve.map((p) => ({ date: formatDate(p.timestamp), Equity: p.balance }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Equity" stroke="#8884d8" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* Drawdown Chart */}
          {drawdownData.length > 0 && (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={drawdownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="drawdown" stroke="#FF0000" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* Distribution Chart */}
          {distributionData.length > 0 && (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={distributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Monthly Profit Chart */}
          {monthlyData.length > 0 && (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="profit" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Win/Loss Pie Chart */}
          {winLossData.length > 0 && (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={winLossData} dataKey="value" nameKey="name" outerRadius={80} fill="#8884d8" label>
                  {winLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
