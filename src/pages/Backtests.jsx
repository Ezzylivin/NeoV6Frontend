import React, { useState, useEffect, useMemo } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
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
  code: "", symbol: "", timeframe: "",
  startDate: getInitialDates().startDate,
  endDate: getInitialDates().endDate,
  params: {},
};

const initialComboData = {
  strategyConfigs: [{ code: "" }],
  combinationRule: 'AND',
  symbol: "", timeframe: "",
  startDate: getInitialDates().startDate,
  endDate: getInitialDates().endDate,
};

// --- Metrics Display Component (no change) ---
const MetricsDisplay = ({ metrics }) => {
    if (!metrics || Object.keys(metrics).length === 0) {
        return <p className="no-metrics">No performance metrics available.</p>;
    }
    const formatValue = (key, value) => {
        if (typeof value !== 'number') return String(value || 'N/A');
        if (key.toLowerCase().includes('win rate')) return `${value.toFixed(2)}%`;
        if (key.toLowerCase().includes('factor')) return value.toFixed(2);
        if (key.toLowerCase().includes('profit') || key.toLowerCase().includes('drawdown') || key.toLowerCase().includes('balance')) return `$${value.toFixed(2)}`;
        return value;
    };
    const keyMetrics = {
        "Total Profit": metrics.totalProfit, "Total Trades": metrics.totalTrades, "Win Rate": metrics.winRate,
        "Max Drawdown": metrics.maxDrawdown, "Profit Factor": metrics.profitFactor, "Final Balance": metrics.finalBalance,
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
    options, initialLoading, singleLoading, batchLoading, error, runNewBacktest, runComboBacktest,
  } = useBacktest();

  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState(null);
  const [activeTestType, setActiveTestType] = useState(null);

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

  // --- Handlers (no change) ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "code") {
      const selectedStrategy = options.strategies.find((s) => s.code === value);
      if (selectedStrategy) {
        setFormData((prev) => ({ ...prev, code: selectedStrategy.code, symbol: selectedStrategy.params?.symbol || options.symbols[0] || "", timeframe: selectedStrategy.params?.timeframe || options.timeframes[0] || "", params: selectedStrategy.params || {} }));
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
      const newConfigs = [...comboData.strategyConfigs];
      newConfigs[index] = { ...newConfigs[index], code: value };
      setComboData(prev => ({ ...prev, strategyConfigs: newConfigs }));
    } else {
      setComboData(prev => ({ ...prev, [name]: value }));
    }
  };

  const addStrategyToCombo = () => setComboData(prev => ({ ...prev, strategyConfigs: [...prev.strategyConfigs, { code: "" }] }));
  const removeStrategyFromCombo = (index) => setComboData(prev => ({ ...prev, strategyConfigs: comboData.strategyConfigs.filter((_, i) => i !== index) }));

  // --- Submit Handlers ---
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setActiveTestType('single');
    try {
      const result = await runNewBacktest(formData);
      if (result?.equityCurve?.length > 0) {
        setBacktestResults({
          main: { name: `${result.strategy.name} Performance`, metrics: { ...result.metrics, totalProfit: result.profit, finalBalance: result.finalBalance }, equityCurve: result.equityCurve },
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
    setBacktestResults(null);
    setActiveTestType('combo');
    try {
      const payload = { ...comboData, strategyCodes: comboData.strategyConfigs.map(s => s.code).filter(Boolean) };
      delete payload.strategyConfigs;
      if (payload.strategyCodes.length < 1) {
        alert("Please select at least one strategy.");
        return;
      }
      const result = await runComboBacktest(payload);
      if (result?.combinedResult?.equityCurve?.length > 0) {
        setBacktestResults({
          main: { name: 'Combined Strategy Performance', metrics: result.combinedResult.metrics, equityCurve: result.combinedResult.equityCurve },
          individuals: result.individualResults.map(res => ({ name: res.strategyName, metrics: res.metrics, equityCurve: res.equityCurve }))
        });
      } else {
        alert("Combo backtest ran successfully but produced no trades.");
      }
    } catch (err) {
      console.error("Combo backtest failed:", err);
    }
  };

  // ✅ --- UPGRADED: Logic to merge equity curves for the combo chart ---
  const comboChartData = useMemo(() => {
    if (!backtestResults || activeTestType !== 'combo' || !backtestResults.main) {
        return null;
    }

    // Filter for individual strategies that actually produced trades
    const individualsWithTrades = backtestResults.individuals.filter(
        res => res.metrics && res.metrics.totalTrades > 0
    );

    const allSeries = [
        { name: 'Combined', data: backtestResults.main.equityCurve },
        // Map the filtered individuals to the structure needed for the chart
        ...individualsWithTrades.map(res => ({ name: res.name, data: res.equityCurve }))
    ];

    // Get all unique timestamps from all series
    const allTimestamps = [...new Set(allSeries.flatMap(s => s.data.map(p => new Date(p.timestamp).getTime())))].sort((a, b) => a - b);
    
    // Create a map for quick lookup of balances at each timestamp for each series
    const dataMap = {};
    allSeries.forEach(s => {
        dataMap[s.name] = s.data.reduce((acc, p) => {
            acc[new Date(p.timestamp).getTime()] = p.balance;
            return acc;
        }, {});
    });

    // Create a structure to hold the last known balance for each series
    const lastBalances = {};
    allSeries.forEach(s => { lastBalances[s.name] = s.data[0]?.balance || 0 });

    // Build the final merged data array for the chart
    const mergedData = allTimestamps.map(ts => {
        const point = { timestamp: new Date(ts).toLocaleDateString() };
        allSeries.forEach(s => {
            // If there's a point at this timestamp, update the last balance
            if (dataMap[s.name][ts] !== undefined) {
                lastBalances[s.name] = dataMap[s.name][ts];
            }
            // Use the last known balance to create a continuous line
            point[s.name] = lastBalances[s.name];
        });
        return point;
    });
    
    // Assign a color to each line in the chart
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
    const series = allSeries.map((s, i) => ({ name: s.name, color: colors[i % colors.length] }));

    return { data: mergedData, series };

  }, [backtestResults, activeTestType]);


  if (initialLoading) return <div>Loading backtests...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div className="dashboard-container">
      <h2 className="header">Backtests</h2>
      {error && <div className="error-banner">{error}</div>}
      
      <div className="forms-container">
        {/* --- Forms (no change) --- */}
        <form className="card-row" onSubmit={handleSingleSubmit}>{/* ... form fields ... */}</form>
        <form className="card-row" onSubmit={handleComboSubmit}>{/* ... form fields ... */}</form>
      </div>

      {/* --- ✅ UPGRADED: Smart Results Display --- */}
      {backtestResults?.main && activeTestType === 'single' && (
        <div className="chart-card">
          <h3>{backtestResults.main.name}</h3>
          <MetricsDisplay metrics={backtestResults.main.metrics} />
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={backtestResults.main.equityCurve}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="timestamp" name="Time" /><YAxis domain={['dataMin', 'dataMax']} /><Tooltip /><Legend />
              <Line type="monotone" dataKey="balance" name="Equity" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {backtestResults?.main && activeTestType === 'combo' && comboChartData && (
        <div className="chart-card">
          <h3>Combined Strategy Performance</h3>
          <MetricsDisplay metrics={backtestResults.main.metrics} />
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={comboChartData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              {comboChartData.series.map(s => (
                <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

