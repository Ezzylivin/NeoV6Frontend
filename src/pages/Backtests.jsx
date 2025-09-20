import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
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

// --- Helper functions for dates (no change) ---
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getInitialDates = () => {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() - 1);
  const startDate = new Date(today);
  startDate.setFullYear(today.getFullYear() - 1);
  return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
};

// --- Initial state for forms (no change) ---
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
  combinationRule: 'AND',
  symbol: "",
  timeframe: "",
  startDate: getInitialDates().startDate,
  endDate: getInitialDates().endDate,
};

// ✅ --- NEW: Component to display performance metrics ---
const MetricsDisplay = ({ metrics }) => {
    if (!metrics || Object.keys(metrics).length === 0) {
        return <p className="no-metrics">No performance metrics available.</p>;
    }

    const formatValue = (key, value) => {
        if (typeof value !== 'number') return value;
        if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('factor')) {
            return `${(value * 100).toFixed(2)}%`;
        }
        if (key.toLowerCase().includes('profit') || key.toLowerCase().includes('drawdown') || key.toLowerCase().includes('balance')) {
            return `$${value.toFixed(2)}`;
        }
        return value;
    };
    
    // Select a subset of key metrics to display
    const keyMetrics = {
        "Total Profit": metrics.totalProfit,
        "Total Trades": metrics.totalTrades,
        "Win Rate": metrics.winRate,
        "Max Drawdown": metrics.maxDrawdown,
        "Profit Factor": metrics.profitFactor,
        "Final Balance": metrics.finalBalance,
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


export default function Backtests() {
  const {
    options,
    initialLoading,
    singleLoading,
    batchLoading,
    error,
    runNewBacktest,
    runComboBacktest,
  } = useBacktest();

  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  
  // ✅ UPGRADED: State to hold full results (metrics + equity curve)
  const [backtestResults, setBacktestResults] = useState(null);

  useEffect(() => {
    if (options.strategies?.length > 0 && !formData.code) {
      const firstStrategy = options.strategies[0];
      setFormData((prev) => ({
        ...prev,
        code: firstStrategy.code,
        symbol: firstStrategy.params?.symbol || options.symbols[0] || "",
        timeframe: firstStrategy.params?.timeframe || options.timeframes[0] || "",
        params: firstStrategy.params || {},
      }));
      setComboData(prev => ({
        ...prev,
        symbol: options.symbols[0] || "",
        timeframe: options.timeframes[0] || "",
        strategyConfigs: [{ code: options.strategies[0]?.code || "" }]
      }));
    }
  }, [options.strategies, options.symbols, options.timeframes, formData.code]);

  // --- Handlers (no change to logic) ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "code") {
      const selectedStrategy = options.strategies.find((s) => s.code === value);
      if (selectedStrategy) {
        setFormData((prev) => ({
          ...prev,
          code: selectedStrategy.code,
          symbol: selectedStrategy.params?.symbol || options.symbols[0] || "",
          timeframe: selectedStrategy.params?.timeframe || options.timeframes[0] || "",
          params: selectedStrategy.params || {},
        }));
      } else {
        setFormData((prev) => ({ ...prev, code: "", symbol: "", timeframe: "", params: {} }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleComboChange = (e, index) => {
    const { name, value } = e.target;
    if (name === "strategyCode") {
      const newStrategyConfigs = [...comboData.strategyConfigs];
      newStrategyConfigs[index] = { ...newStrategyConfigs[index], code: value };
      setComboData(prev => ({ ...prev, strategyConfigs: newStrategyConfigs }));
    } else {
      setComboData(prev => ({ ...prev, [name]: value }));
    }
  };

  const addStrategyToCombo = () => {
    setComboData(prev => ({ ...prev, strategyConfigs: [...prev.strategyConfigs, { code: "" }] }));
  };

  const removeStrategyFromCombo = (index) => {
    const newStrategyConfigs = comboData.strategyConfigs.filter((_, i) => i !== index);
    setComboData(prev => ({ ...prev, strategyConfigs: newStrategyConfigs }));
  };

  // --- Submit Handlers ---
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setBacktestResults(null); // Reset results
    try {
      const result = await runNewBacktest(formData);
      if (result?.equityCurve && result.equityCurve.length > 0) {
        // ✅ UPGRADED: Set full results in the new format
        setBacktestResults({
          combined: {
            metrics: { ...result.metrics, finalBalance: result.finalBalance },
            equityCurve: result.equityCurve,
          },
          individuals: []
        });
      } else {
        alert("Backtest ran successfully but produced no trades.");
      }
    } catch (err) {
      console.error("Single backtest failed:", err);
    }
  };

  const handleComboSubmit = async (e) => {
    e.preventDefault();
    setBacktestResults(null); // Reset results
    try {
      const payload = {
        ...comboData,
        strategyCodes: comboData.strategyConfigs.map(s => s.code).filter(code => code !== ""),
      };
      delete payload.strategyConfigs;

      if (payload.strategyCodes.length < 2) {
        alert("Please select at least two strategies for a combo backtest.");
        return;
      }

      const result = await runComboBacktest(payload);

      if (result && result.combinedResult?.metrics?.equityCurve) {
        // ✅ UPGRADED: Set full results for combo test
        setBacktestResults({
          combined: {
             metrics: result.combinedResult.metrics,
             equityCurve: result.combinedResult.metrics.equityCurve
          },
          individuals: result.individualResults.map(res => ({
            name: res.strategyName,
            metrics: res.metrics,
            equityCurve: res.metrics.equityCurve
          }))
        });
      } else {
        alert("Combo backtest ran successfully but produced no trades.");
      }
    } catch (err) {
      console.error("Combo backtest failed:", err);
    }
  };

  if (initialLoading) return <div>Loading backtests...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div className="dashboard-container">
      <h2 className="header">Backtests</h2>
      {error && <div className="error-banner">{error}</div>}
      
      <div className="forms-container">
        {/* --- Single Backtest Form --- */}
        <form className="card-row" onSubmit={handleSingleSubmit}>{/* ... form fields ... */}</form>

        {/* --- Combo Strategy Builder --- */}
        <form className="card-row" onSubmit={handleComboSubmit}>{/* ... form fields ... */}</form>
      </div>

      {/* --- ✅ UPGRADED: Multi-Chart and Metrics Display --- */}
      {backtestResults && (
        <>
          {/* Combined Chart & Metrics */}
          <div className="chart-card">
            <h3>Combined Strategy Performance</h3>
            <MetricsDisplay metrics={backtestResults.combined.metrics} />
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={backtestResults.combined.equityCurve}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="equity" name="Combined Equity" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Individual Charts & Metrics */}
          {backtestResults.individuals.length > 0 && (
             <div className="individual-charts-container">
                <h3 className="header">Individual Strategy Performance</h3>
                {backtestResults.individuals.map((result, index) => (
                    <div key={index} className="chart-card">
                        <h4>{result.name}</h4>
                        <MetricsDisplay metrics={result.metrics} />
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={result.equityCurve}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="equity" name={result.name} stroke="#82ca9d" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

