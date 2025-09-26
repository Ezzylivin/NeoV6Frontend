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
import "./Backtests.css"; // Ensure this path is correct

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
  params: {}, // Assume params is an object for key-value pairs
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
    "Win Trades": metrics.totalTrades, // Renamed for visual consistency with image
    "Max Drawdown": metrics.maxDrawdown,
    "Profit Factor": metrics.profitFactor,
    // "Final Balance": metrics.finalBalance, // Not explicitly in the top 4 metrics in image
  };

  const formatValue = (k, v) => {
    if (v == null) return "N/A";
    if (k.includes("Win Trades")) return `${v.toFixed(2)}%`; // Assuming win rate, though text says "Win Trades"
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
  const { strategies: availableStrategies, setStrategies } = useContext(StrategyContext); // Renamed to avoid conflict
  const { options, initialLoading, singleLoading, batchLoading, error, runNewBacktest, runComboBacktest } = useBacktest();
  const { createSetup, loading: isSaving, error: saveError } = useBacktestSetupFunction();

  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTestType, setActiveTestType] = useState("single"); // Default to single
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [setupDetails, setSetupDetails] = useState({ name: "", description: "" });
  const [savedSetup, setSavedSetup] = useState(null);
  const [resultKey, setResultKey] = useState(Date.now()); // Used to force re-render charts

  // Memoized dropdown options
  const strategyOptions = useMemo(() => options?.strategies || [], [options]);
  const symbolOptions = useMemo(() => options?.symbols || [], [options]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);

  // --- Initialize default strategy selection ---
  useEffect(() => {
    if (strategyOptions.length > 0 && !formData.code) {
      const s = strategyOptions[0];
      setFormData((prev) => ({
        ...prev,
        code: s.code,
        symbol: symbolOptions?.[0] || "",
        timeframe: timeframeOptions?.[0] || "",
        params: s.params || {},
      }));
    }
    if (strategyOptions.length > 0 && !comboData.strategyConfigs[0].code) {
      setComboData((prev) => ({
        ...prev,
        symbol: symbolOptions?.[0] || "",
        timeframe: timeframeOptions?.[0] || "",
        strategyConfigs: [
          { code: strategyOptions?.[0]?.code || "" },
          { code: strategyOptions?.[1]?.code || "" }, // Initialize with second if available
        ],
      }));
    }
  }, [strategyOptions, symbolOptions, timeframeOptions]); // Add all dependencies

  // Effect to update formData params when strategy code changes
  useEffect(() => {
    const selectedStrategy = strategyOptions.find(s => s.code === formData.code);
    if (selectedStrategy) {
      setFormData(prev => ({
        ...prev,
        params: selectedStrategy.params || {},
      }));
    }
  }, [formData.code, strategyOptions]);

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Special handling for dynamic parameter inputs
    if (name.startsWith("param_")) {
      const paramName = name.replace("param_", "");
      setFormData((prev) => ({
        ...prev,
        params: {
          ...prev.params,
          [paramName]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
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
    setResultKey(Date.now()); // Reset key to force chart re-render
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
    setResultKey(Date.now()); // Reset key to force chart re-render
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
  const closeSaveModal = () => {
    setIsSaveModalOpen(false);
    setSetupDetails({ name: "", description: "" }); // Clear form on close
  };
  const handleSetupDetailChange = (e) => setSetupDetails({ ...setupDetails, [e.target.name]: e.target.value });

  const handleSaveSetup = async (e) => {
    e.preventDefault();
    const source = backtestResults.main?.sourceData;
    if (!source) return alert("No source data found to save.");

    let setupPayload;
    if (activeTestType === "single") {
      const strategy = availableStrategies.find((s) => s.code === source.code);
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
      setSetupDetails({ name: "", description: "" }); // Clear form after successful save
      setStrategies((prev) => [saved, ...(prev || [])]);
      closeSaveModal();
    } catch (err) {
      console.error("Save setup failed:", err);
      alert(err.response?.data?.message || "Failed to save setup.");
    }
  };

  // --- Chart / Performance computations (Placeholders for now) ---
  const chartData = useMemo(() => {
    if (!backtestResults.main?.equityCurve) return [];
    // Assume equityCurve is an array of { date: 'YYYY-MM-DD', equity: number }
    return backtestResults.main.equityCurve.map((d) => ({
      date: d.date,
      equity: d.equity,
      // Add a scaled equity for a second Y-axis if needed, e.g., to represent percentages
      scaledEquity: (d.equity / backtestResults.main.equityCurve[0].equity - 1) * 100, // Example: % change from start
    }));
  }, [backtestResults.main?.equityCurve]);

  const trades = useMemo(() => {
    if (activeTestType === "single" && backtestResults.main?.trades) {
      return backtestResults.main.trades;
    }
    if (activeTestType === "combo" && backtestResults.individuals[0]?.trades) {
      // For combo, you might want to show trades of the combined strategy or the first individual one
      return backtestResults.individuals[0].trades;
    }
    return [];
  }, [backtestResults, activeTestType]);


  // Calculate the precise number of winning trades (as a decimal)
    const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b"]; // Green, Red, Blue, Yellow

    const winningTrades = totalTrades * (winRate / 100);

    // Calculate the precise number of losing trades (as a decimal)
    const losingTrades = totalTrades - winningTrades;

const distributionData = useMemo(() => {
    const { 
        totalTrades = 0, 
        winRate = 0 
    } = backtestResults.main?.metrics || {};

    if (totalTrades === 0) {
        return [];
    }
  

    

    return [
        { name: "Win", value: winningTrades, color: COLORS[0] }, // Green
        { name: "Loss", value: losingTrades, color: COLORS[1] }, // Red
    ];
}, [backtestResults.main?.metrics?.totalTrades, backtestResults.main?.metrics?.winRate]);

  // Placeholder for winLossBarChartData (replace with real data structure)
  const winLossBarChartData = useMemo(() => {
    // Example: Assuming a structure where you have counts for different profit ranges
    if (!backtestResults.main?.trades) return [];
    // This is a simplified example, you'd process your actual trades data
    return [
      { range: "-$100", count: 5 },
      { range: "$0", count: 10 },
      { range: "$100", count: 15 },
      { range: "$200+", count: 8 },
    ];
  }, [backtestResults.main?.trades]);


  const monthlyData = useMemo(() => {
    // This requires detailed trade data or pre-calculated monthly metrics
    if (!backtestResults.main?.equityCurve) return [];
    // Dummy data for monthly performance (replace with actual calculations)
    return [
      { month: 'Jan', profit: 1000 },
      { month: 'Feb', profit: 1200 },
      { month: 'Mar', profit: -300 },
      { month: 'Apr', profit: 1500 },
      { month: 'May', profit: 800 },
    ];
  }, [backtestResults.main?.equityCurve]);


  if (initialLoading) return <div className="loading-state">Loading options...</div>;
  if (error) return <div className="error-state">Error: {error}</div>;

  return (
    <div className="dashboard-container">
      <div className="tab-buttons">
        <button
          className={`tab-button ${activeTestType === "single" ? "active" : ""}`}
          onClick={() => {
            setActiveTestType("single");
            setBacktestResults({ main: null, individuals: [] }); // Clear results on tab change
          }}
        >
          Single Strategy
        </button>
        <button
          className={`tab-button ${activeTestType === "combo" ? "active" : ""}`}
          onClick={() => {
            setActiveTestType("combo");
            setBacktestResults({ main: null, individuals: [] }); // Clear results on tab change
          }}
        >
          Combo Strategy
        </button>
      </div>

      <div className="content-grid">
        {/* Left Column: Configuration Forms */}
        <div className="config-panel">
          {activeTestType === "single" && (
            <form onSubmit={handleSingleSubmit} className="strategy-form">
              <div className="form-section">
                <label>
                  Strategy
                  <select
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    className="dashboard-dropdown"
                    required
                  >
                    {strategyOptions.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name || s.code}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Symbol
                  <select
                    name="symbol"
                    value={formData.symbol}
                    onChange={handleChange}
                    className="dashboard-dropdown"
                    required
                  >
                    {symbolOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Timeframe
                  <select
                    name="timeframe"
                    value={formData.timeframe}
                    onChange={handleChange}
                    className="dashboard-dropdown"
                    required
                  >
                    {timeframeOptions.map((tf) => (
                      <option key={tf} value={tf}>
                        {tf}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="date-inputs">
                  <label>
                    Start Date
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      className="date-input"
                      required
                    />
                  </label>
                  <label>
                    End Date
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      className="date-input"
                      required
                    />
                  </label>
                </div>
              </div>

              <div className="form-section parameters-section">
                <h4>Parameters</h4>
                {Object.keys(formData.params).length > 0 ? (
                  Object.entries(formData.params).map(([key, value]) => (
                    <label key={key}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      <input
                        type={typeof value === 'number' ? 'number' : 'text'}
                        name={`param_${key}`}
                        value={value}
                        onChange={handleChange}
                        className="param-input"
                      />
                    </label>
                  ))
                ) : (
                  <p>No configurable parameters for this strategy.</p>
                )}
              </div>

              <div className="form-actions">
                <button type="submit" disabled={singleLoading}>
                  {singleLoading ? "Running..." : "Run Backtest"}
                </button>
                <button type="button" onClick={openSaveModal} className="button-secondary">
                  Save Setup
                </button>
              </div>
            </form>
          )}

          {activeTestType === "combo" && (
            <form onSubmit={handleComboSubmit} className="strategy-form">
              <div className="form-section">
                {comboData.strategyConfigs.map((config, index) => (
                  <div key={index} className="combo-strategy-item">
                    <label>
                      Strategy {index + 1}
                      <select
                        name="strategyCode"
                        value={config.code}
                        onChange={(e) => handleComboChange(e, index)}
                        className="dashboard-dropdown"
                        required
                      >
                        <option value="">Select Strategy</option>
                        {strategyOptions.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name || s.code}
                          </option>
                        ))}
                      </select>
                    </label>
                    {comboData.strategyConfigs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStrategyFromCombo(index)}
                        className="button-remove"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addStrategyToCombo} className="button-add">
                  Add Strategy
                </button>
              </div>

              <div className="form-section">
                <label>
                  Combination Rule
                  <select
                    name="combinationRule"
                    value={comboData.combinationRule}
                    onChange={handleComboChange}
                    className="dashboard-dropdown"
                    required
                  >
                    <option value="AND">AND (All strategies must signal)</option>
                    <option value="OR">OR (Any strategy can signal)</option>
                  </select>
                </label>
                <label>
                  Symbol
                  <select
                    name="symbol"
                    value={comboData.symbol}
                    onChange={handleComboChange}
                    className="dashboard-dropdown"
                    required
                  >
                    {symbolOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Timeframe
                  <select
                    name="timeframe"
                    value={comboData.timeframe}
                    onChange={handleComboChange}
                    className="dashboard-dropdown"
                    required
                  >
                    {timeframeOptions.map((tf) => (
                      <option key={tf} value={tf}>
                        {tf}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="date-inputs">
                  <label>
                    Start Date
                    <input
                      type="date"
                      name="startDate"
                      value={comboData.startDate}
                      onChange={handleComboChange}
                      className="date-input"
                      required
                    />
                  </label>
                  <label>
                    End Date
                    <input
                      type="date"
                      name="endDate"
                      value={comboData.endDate}
                      onChange={handleComboChange}
                      className="date-input"
                      required
                    />
                  </label>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" disabled={batchLoading}>
                  {batchLoading ? "Running..." : "Run Combo Backtest"}
                </button>
                <button type="button" onClick={openSaveModal} className="button-secondary">
                  Save Setup
                </button>
              </div>
            </form>
          )}

          {backtestResults.main && (
            <>
              <div className="chart-card">
                <h3 className="chart-header">Win/Loss Distribution</h3>
                <div className="chart-container">
                  {distributionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={distributionData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label={(entry) => `${entry.name}: ${entry.value.toFixed(0)}`}
                        >
                          {distributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="no-metrics">No distribution data available.</p>
                  )}
                </div>
              </div>

              <div className="chart-card">
                <h3 className="chart-header">Trades</h3>
                {trades.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Price</th>
                        <th>Size</th>
                        <th>P/L ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.slice(0, 10).map((trade, index) => ( // Show first 10 trades
                        <tr key={index}>
                          <td>{formatDate(trade.date)}</td>
                          <td style={{ color: trade.type === 'buy' ? COLORS[0] : COLORS[1] }}>
                            {trade.type.toUpperCase()}
                          </td>
                          <td>${trade.price.toFixed(2)}</td>
                          <td>{trade.size.toFixed(4)}</td>
                          <td style={{ color: trade.profit > 0 ? COLORS[0] : COLORS[1] }}>
                            ${trade.profit.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="no-metrics">No trades to display.</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="results-panel">
          {backtestResults.main ? (
            <>
              <div className="metrics-section">
                <h3 className="section-title">Results</h3>
                <MetricsDisplay metrics={backtestResults.main.metrics} />
              </div>

              <div className="chart-card">
                <h3 className="chart-header">Equity Curve</h3>
                {backtestResults.main.equityCurve?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300} key={resultKey}>
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#ccc" tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString()} />
                      <YAxis yAxisId="left" stroke="#22c55e" label={{ value: 'Equity ($)', angle: -90, position: 'insideLeft', fill: '#22c55e' }} />
                      <YAxis yAxisId="right" orientation="right" stroke="#6366f1" label={{ value: '% Change', angle: 90, position: 'insideRight', fill: '#6366f1' }} />
                      <Tooltip
                        formatter={(value, name, props) => {
                          if (name === "equity") return [`$${value.toFixed(2)}`, "Equity"];
                          if (name === "scaledEquity") return [`${value.toFixed(2)}%`, "% Change"];
                          return value;
                        }}
                      />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="equity" stroke="#22c55e" dot={false} name="Equity" />
                      <Line yAxisId="right" type="monotone" dataKey="scaledEquity" stroke="#6366f1" dot={false} name="% Change" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="no-metrics">No equity curve data available.</p>
                )}
              </div>

              <div className="chart-card">
                <h3 className="chart-header">Win / Distribution</h3>
                <div className="chart-container">
                  {winLossBarChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={winLossBarChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="range" stroke="#ccc" />
                        <YAxis stroke="#ccc" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#3b82f6" name="Number of Trades" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="no-metrics">No win/loss distribution data.</p>
                  )}
                </div>
              </div>

              <div className="chart-card">
                <h3 className="chart-header">Monthly Performance</h3>
                <div className="chart-container">
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="month" stroke="#ccc" />
                        <YAxis stroke="#ccc" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="profit" fill="#10b981" name="Monthly Profit" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="no-metrics">No monthly performance data.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="no-results-message">Run a backtest to see results here.</p>
          )}

          {activeTestType === "combo" && backtestResults.individuals.length > 0 && (
            <div className="individual-results-section">
              <h3 className="section-title">Individual Strategy Results (Combo)</h3>
              <div className="individual-results-grid">
                {backtestResults.individuals.map((individual, index) => (
                  <div key={index} className="individual-result-card">
                    <h4>{individual.name}</h4>
                    {individual.noTradeReason ? (
                      <p className="no-trades-reason">{individual.noTradeReason}</p>
                    ) : (
                      <MetricsDisplay metrics={individual.metrics} />
                    )}
                    {/* Optionally add small equity curve for each individual strategy */}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isSaveModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Save Backtest Setup</h3>
            {saveError && <p className="error-banner">{saveError}</p>}
            <form onSubmit={handleSaveSetup}>
              <label>
                Name
                <input
                  type="text"
                  name="name"
                  value={setupDetails.name}
                  onChange={handleSetupDetailChange}
                  required
                  placeholder="e.g., My Trend Following Strategy"
                />
              </label>
              <label>
                Description (Optional)
                <textarea
                  name="description"
                  value={setupDetails.description}
                  onChange={handleSetupDetailChange}
                  rows="3"
                  placeholder="Brief description of this setup"
                ></textarea>
              </label>
              <div className="modal-actions">
                <button type="button" onClick={closeSaveModal} className="button-secondary">
                  Cancel
                </button>
                <button type="submit" className="button-save" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
