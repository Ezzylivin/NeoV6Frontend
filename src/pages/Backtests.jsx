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
  
  // ✅ UPGRADED: State to hold multiple chart results
  const [chartResults, setChartResults] = useState(null);

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
    setChartResults(null); // Reset charts
    try {
      const result = await runNewBacktest(formData);
      if (result?.equityCurve && result.equityCurve.length > 0) {
        // ✅ UPGRADED: Set chart data in the new format
        setChartResults({
          combined: result.equityCurve,
          individuals: [] // No individuals for a single run
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
    setChartResults(null); // Reset charts
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

      // ✅ UPGRADED: Handle the new, detailed response from the backend
      if (result && result.combinedResult?.metrics?.equityCurve) {
        setChartResults({
          combined: result.combinedResult.metrics.equityCurve,
          individuals: result.individualResults.map(res => ({
            name: res.strategyName,
            data: res.metrics.equityCurve
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
        {/* --- Single Backtest Form (no change) --- */}
        <form className="card-row" onSubmit={handleSingleSubmit}>{/* ... */}</form>

        {/* --- Combo Strategy Builder (no change) --- */}
        <form className="card-row" onSubmit={handleComboSubmit}>{/* ... */}</form>
      </div>

      {/* --- ✅ UPGRADED: Multi-Chart Display --- */}
      {chartResults && (
        <>
          {/* Combined Chart */}
          <div className="chart-card">
            <h3>Combined Strategy Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartResults.combined}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="equity" name="Combined Equity" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Individual Charts */}
          {chartResults.individuals.length > 0 && (
             <div className="individual-charts-container">
                <h3 className="header">Individual Strategy Performance</h3>
                {chartResults.individuals.map((result, index) => (
                    <div key={index} className="chart-card">
                        <h4>{result.name}</h4>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={result.data}>
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

