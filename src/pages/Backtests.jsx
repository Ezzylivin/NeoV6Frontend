// Fixed Backtests.jsx
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

// --- Helper functions
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
        strategyConfigs: [
          { code: s.code },
          { code: options.strategies?.[1]?.code || "" },
        ],
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
    if (!source) return alert("No source data found to save.");

    let setupPayload;
    if (activeTestType === "single") {
      const strategy = options.strategies.find((s) => s.code === source.code);
      setupPayload = {
        name: setupDetails.name,
        description: setupDetails.description,
        symbol: source.symbol,
        timeframe: source.timeframe,
        isCombo: false,
        strategyId: strategy?._id,
      };
    } else {
      setupPayload = {
        name: setupDetails.name,
        description: setupDetails.description,
        symbol: source.symbol,
        timeframe: source.timeframe,
        isCombo: true,
        comboConfig: {
          strategyCodes: source.strategyCodes || [],
          combinationRule: source.combinationRule,
        },
      };
    }

    try {
      const saved = await createSetup(setupPayload);
      setSavedSetup(saved);
      alert("Setup saved successfully!");
      setSetupDetails({ name: "", description: "" });
      setStrategies((prev) => [saved, ...(prev || [])]);
      closeSaveModal();
    } catch (err) {
      console.error("Save setup failed:", err);
      alert(err.response?.data?.message || "Failed to save setup.");
    }
  };

  // --- Chart / Performance computations ---
  // ... (same as your original code: chartData, drawdownData, trades, distributionData, monthlyData, winLossData)
  // For brevity, this part remains unchanged

  const COLORS = ["#22c55e", "#ef4444"];
  if (initialLoading) return <div>Loading...</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  return (
    <div className="dashboard-container">
      {/* ... rest of your JSX remains the same */}
    </div>
  );
}
