// File: src/pages/Backtests.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import "./Backtests.css";

const COLORS = [
  "#22c55e",
  "#ef4444",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#10b981"
];

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today);
  start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today);
  end.setDate(today.getDate() - 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

const initialFormData = {
  code: "",
  symbol: "",
  timeframe: "1h",
  startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate,
  initialBalance: 1000,
  params: {},
  riskManagementMode: "standard",
  riskPercentage: 1,
  growthCapitalTarget: 2000,
  mlMode: "off",
  mlModel: "",
  mlThreshold: 0.5,
  mlHorizon: 1
};

const initialComboData = {
  strategyConfigs: [{ code: "", params: {} }],
  symbol: "",
  timeframe: "1h",
  startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate,
  initialBalance: 1000,
  riskManagementMode: "standard",
  riskPercentage: 1,
  growthCapitalTarget: 2000,
  mlMode: "off",
  mlModel: "",
  mlThreshold: 0.5,
  mlHorizon: 1
};

// --- Child Components (Full Implementations) ---
const MetricsDisplay = ({ metrics }) => {
  if (!metrics)
    return (
      <div className="metrics-grid-loading">Calculating metrics...</div>
    );

  const items = [
    { label: "Initial Balance", value: metrics.initialBalance, format: "currency" },
    { label: "Final Balance", value: metrics.finalBalance, format: "currency" },
    { label: "Total Profit", value: metrics.totalProfit, format: "currency" },
    { label: "Total Trades", value: metrics.totalTrades, format: "number" },
    { label: "Win Rate", value: metrics.winRate, format: "percent" },
    { label: "Max Drawdown", value: metrics.maxDrawdown, format: "percent" },
    { label: "Profit Factor", value: metrics.profitFactor, format: "number" }
  ];

  return (
    <div className="metrics-grid">
      {items.map((m) => (
        <div key={m.label} className="metric-item">
          <span className="metric-label">{m.label}</span>
          <span className="metric-value">
            {typeof m.value === "number"
              ? m.format === "currency"
                ? `$${m.value.toFixed(2)}`
                : m.format === "percent"
                ? `${m.value.toFixed(2)}%`
                : m.value.toFixed(2)
              : "N/A"}
          </span>
        </div>
      ))}
    </div>
  );
};

const CommonBacktestInputs = ({ data, onChange, options }) => {
  const symbolOptions = options.symbolOptions || [];
  const timeframeOptions = options.timeframeOptions || [];
  const modelOptions = options.modelOptions || [];

  return (
    <>
      <label>
        Symbol:
        <select name="symbol" value={data.symbol} onChange={onChange} disabled={!symbolOptions.length}>
          {symbolOptions.length ? (
            symbolOptions.map((s) => <option key={s} value={s}>{s}</option>)
          ) : (
            <option>Loading symbols...</option>
          )}
        </select>
      </label>
      <label>
        Timeframe:
        <select name="timeframe" value={data.timeframe} onChange={onChange} disabled={!timeframeOptions.length}>
          {timeframeOptions.length ? (
            timeframeOptions.map((t) => <option key={t} value={t}>{t}</option>)
          ) : (
            <option>Loading timeframes...</option>
          )}
        </select>
      </label>
      <label>
        Start Date: <input type="date" name="startDate" value={data.startDate} onChange={onChange} />
      </label>
      <label>
        End Date: <input type="date" name="endDate" value={data.endDate} onChange={onChange} />
      </label>
      <label>
        Initial Balance: <input type="number" name="initialBalance" value={data.initialBalance} onChange={onChange} />
      </label>
      <fieldset>
        <legend>Risk Management</legend>
        <label>
          Mode:
          <select name="riskManagementMode" value={data.riskManagementMode} onChange={onChange}>
            <option value="standard">Standard Risk %</option>
            <option value="dynamic">Dynamic Growth Mode</option>
          </select>
        </label>
        {data.riskManagementMode === "standard" ? (
          <label>
            Risk Per Trade (%):
            <input type="number" name="riskPercentage" value={data.riskPercentage} onChange={onChange} step="0.1" />
          </label>
        ) : (
          <>
            <label>
              Growth Capital Target ($):
              <input type="number" name="growthCapitalTarget" value={data.growthCapitalTarget} onChange={onChange} />
            </label>
            <label>
              Risk % (After Target):
              <input type="number" name="riskPercentage" value={data.riskPercentage} onChange={onChange} step="0.1" />
            </label>
          </>
        )}
      </fieldset>
      <fieldset>
        <legend>Machine Learning</legend>
        <label>
          Mode:
          <select name="mlMode" value={data.mlMode || "off"} onChange={onChange}>
            <option value="off">Off (No ML)</option>
            <option value="predictions">Use ML Predictions</option>
            <option value="hybrid">Hybrid (Strategy + ML)</option>
          </select>
        </label>
        {data.mlMode !== "off" && (
          <>
            <label>
              Model:
              <select name="mlModel" value={data.mlModel} onChange={onChange} disabled={!modelOptions.length}>
                {modelOptions.length > 0 ? (
                  modelOptions.map((modelName) => (
                    <option key={modelName} value={modelName}>{modelName}</option>
                  ))
                ) : (
                  <option>Loading models...</option>
                )}
              </select>
            </label>
            <label>
              Confidence Threshold:
              <input type="number" name="mlThreshold" value={data.mlThreshold || 0.5} step="0.01" min="0" max="1" onChange={onChange} />
            </label>
            <label>
              Prediction Horizon:
              <input type="number" name="mlHorizon" value={data.mlHorizon || 1} step="1" min="1" onChange={onChange} />
            </label>
          </>
        )}
      </fieldset>
    </>
  );
};

const ComboStrategyCard = ({ idx, config, strategies = [], onChange, onRemove, disableRemove }) => {
  const handleChange = (e) => onChange(e, idx);

  return (
    <div className="combo-card">
      <div className="combo-card-header">
        <strong>Strategy #{idx + 1}</strong>
        {!disableRemove && (
          <button type="button" onClick={() => onRemove(idx)}>
            ✕
          </button>
        )}
      </div>
      <div className="combo-card-body">
        <label>
          Strategy:
          <select name="strategyCode" value={config.code} onChange={handleChange} disabled={!strategies.length}>
            {strategies.length ? (
              strategies.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)
            ) : (
              <option>Loading strategies...</option>
            )}
          </select>
        </label>
        <label>
          Stop Loss (%):
          <input type="number" name="param_SL" value={config.params?.SL || 0} onChange={handleChange} step="0.1" />
        </label>
        <label>
          Take Profit (%):
          <input type="number" name="param_TP" value={config.params?.TP || 0} onChange={handleChange} step="0.1" />
        </label>
      </div>
    </div>
  );
};

// --- Main Component ---
export default function Backtests() {
  // Ensure functions are destructured directly from the hook return
  const { state, runNewBacktest, runComboBacktest } = useBacktest();
  const { loading, error, options } = state || {};

  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTab, setActiveTab] = useState("single");

  const strategyOptions = useMemo(() => options?.strategies || [], [options]);
  const symbolOptions = useMemo(() => options?.symbols || [], [options]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);
  const modelOptions = useMemo(() => options?.models || [], [options]);

  useEffect(() => {
    if (
      strategyOptions.length &&
      symbolOptions.length &&
      timeframeOptions.length &&
      modelOptions.length
    ) {
      const defaultStrategy = strategyOptions[0] || {};
      const defaultSymbol = symbolOptions[0] || "";
      const defaultTimeframe = timeframeOptions[0] || "1h";
      const defaultModel = modelOptions[0] || "";

      setFormData((prev) => ({
        ...prev,
        code: prev.code || defaultStrategy.code,
        params: prev.params || defaultStrategy.params || {},
        symbol: prev.symbol || defaultSymbol,
        timeframe: prev.timeframe || defaultTimeframe,
        mlModel: prev.mlModel || defaultModel
      }));

      setComboData((prev) => ({
        ...prev,
        strategyConfigs:
          prev.strategyConfigs.length === 1 && !prev.strategyConfigs[0].code
            ? [{ code: defaultStrategy.code, params: defaultStrategy.params || {} }]
            : prev.strategyConfigs,
        symbol: prev.symbol || defaultSymbol,
        timeframe: prev.timeframe || defaultTimeframe,
        mlModel: prev.mlModel || defaultModel
      }));
    }
  }, [strategyOptions, symbolOptions, timeframeOptions, modelOptions]);

  const { combinedEquityCurve, combinedMetrics } = useMemo(() => {
    try {
      const individuals = backtestResults?.individuals || [];
      if (!individuals.length) {
        const mainMetrics = backtestResults?.main?.metrics || null;
        const mainCurve =
          backtestResults?.main?.equityCurve?.map((d) => ({
            timestamp: d.timestamp,
            balance: d.balance
          })) || [];
        return { combinedEquityCurve: mainCurve, combinedMetrics: mainMetrics };
      }

      const allTimestamps = [
        ...new Set(
          individuals.flatMap((ind) => ind.equityCurve?.map((d) => d.timestamp) || [])
        )
      ].sort();

      if (!allTimestamps.length) {
        return { combinedEquityCurve: [], combinedMetrics: null };
      }

      const initialBalance = comboData.initialBalance || 1000;
      let lastBalances = individuals.map((ind) => ind.metrics?.initialBalance || 0);

      const curve = allTimestamps.map((ts) => {
        let currentTotal = 0;
        individuals.forEach((ind, idx) => {
          const point = ind.equityCurve?.find((p) => p.timestamp === ts);
          if (point) lastBalances[idx] = point.balance;
          currentTotal += lastBalances[idx];
        });

        return { timestamp: ts, balance: currentTotal };
      });

      const finalBalance = curve.length ? curve[curve.length - 1].balance : initialBalance;
      const totalProfit = finalBalance - initialBalance;
      const totalTrades = individuals.reduce((sum, ind) => sum + (ind.metrics?.totalTrades || 0), 0);
      const winningTrades = individuals.reduce((sum, ind) => sum + (ind.metrics?.winningTrades || 0), 0);
      const winRate = totalTrades ? (winningTrades / totalTrades) * 100 : 0;
      let peak = initialBalance;
      let maxDrawdownValue = 0;

      curve.forEach((p) => {
        if (p.balance > peak) peak = p.balance;
        const dd = peak - p.balance;
        if (dd > maxDrawdownValue) maxDrawdownValue = dd;
      });

      const maxDrawdown = peak > 0 ? (maxDrawdownValue / peak) * 100 : 0;
      const grossProfit = individuals.reduce((sum, ind) => sum + (ind.metrics?.grossProfit || 0), 0);
      const grossLoss = individuals.reduce((sum, ind) => sum + (Math.abs(ind.metrics?.grossLoss || 0)), 0);
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;
      const metrics = {
        initialBalance,
        finalBalance,
        totalProfit,
        totalTrades,
        winRate,
        maxDrawdown,
        profitFactor,
        winningTrades
      };

      return { combinedEquityCurve: curve, combinedMetrics: metrics };
    } catch (e) {
      console.error("Error calculating backtest results:", e);
      return { combinedEquityCurve: [], combinedMetrics: null };
    }
  }, [backtestResults, comboData.initialBalance]);

  const pieData = useMemo(() => {
    if (!combinedMetrics || !combinedMetrics.totalTrades || combinedMetrics.winningTrades === undefined) {
      return [];
    }
    const wins = combinedMetrics.winningTrades;
    const losses = combinedMetrics.totalTrades - wins;
    return [{ name: "Wins", value: wins }, { name: "Losses", value: losses }];
  }, [combinedMetrics]);

  if (loading === "initial") {
    return (
      <div className="dashboard-container">
        <h1>Loading Backtest Environment...</h1>
      </div>
    );
  }

  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    const isParam = name.startsWith("param_");
    const val = type === "number" ? parseFloat(value) : value;
    if (isParam) {
      const paramName = name.substring(6);
      setFormData((prev) => ({
        ...prev,
        params: { ...prev.params, [paramName]: val }
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: val }));
    }
  };

  const handleComboChange = (e) => {
    const { name, value, type } = e.target;
    setComboData((prev) => ({ ...prev, [name]: type === "number" ? parseFloat(value) : value }));
  };

  const handleStrategyConfigChange = (e, index) => {
    const { name, value, type } = e.target;
    const isParam = name.startsWith("param_");
    const val = type === "number" ? parseFloat(value) : value;
    const updatedConfigs = [...comboData.strategyConfigs];
    if (isParam) {
      const paramName = name.substring(6);
      updatedConfigs[index].params = {
        ...updatedConfigs[index].params,
        [paramName]: val
      };
    } else {
      const selectedStrategy = strategyOptions.find((s) => s.code === value);
      updatedConfigs[index].code = value;
      updatedConfigs[index].params = selectedStrategy?.params || {};
    }
    setComboData((prev) => ({ ...prev, strategyConfigs: updatedConfigs }));
  };

  const addStrategyCard = () => {
    const newCard = { code: strategyOptions[0]?.code || "", params: strategyOptions[0]?.params || {} };
    setComboData((prev) => ({
      ...prev,
      strategyConfigs: [...prev.strategyConfigs, newCard]
    }));
  };

  const removeStrategyCard = (index) => {
    setComboData((prev) => ({
      ...prev,
      strategyConfigs: prev.strategyConfigs.filter((_, i) => i !== index)
    }));
  };

  const handleRunBacktest = async (e) => {
    e.preventDefault();
    setBacktestResults({ main: null, individuals: [] });

    try {
      // 🚨 FIX: Optional chaining ensures no crash if runNewBacktest is undefined
      const res = await runNewBacktest?.(formData);
      if (res) {
        setBacktestResults({ main: res, individuals: [] });
      }
    } catch (error) {
      console.error("Backtest failed:", error.message);
    }
  };

  const handleRunComboBacktest = async (e) => {
    e.preventDefault();
    setBacktestResults({ main: null, individuals: [] });

    try {
      // 🚨 FIX: Optional chaining ensures no crash if runComboBacktest is undefined
      const res = await runComboBacktest?.(comboData);
      if (res) {
        setBacktestResults(res);
      }
    } catch (error) {
      console.error("Combo backtest failed:", error.message);
    }
  };

  return (
    <div className="dashboard-container">
      <h1>Backtests</h1>
      {error && (
        <div className="error-box">
          <h4>Error</h4>
          <p>{error.message}</p>
        </div>
      )}
      <div className="backtest-main">
        <div className="backtest-forms">
          <div className="tabs">
            <button
              className={activeTab === "single" ? "active" : ""}
              onClick={() => setActiveTab("single")}
            >
              Single Strategy
            </button>
            <button
              className={activeTab === "combo" ? "active" : ""}
              onClick={() => setActiveTab("combo")}
            >
              Combo Strategy
            </button>
          </div>

          {activeTab === "single" && (
            <form onSubmit={handleRunBacktest} className="backtest-form">
              <label>
                Strategy:
                <select
                  name="code"
                  value={formData.code}
                  onChange={handleFormChange}
                  disabled={!strategyOptions.length}
                >
                  {strategyOptions.length ? (
                    strategyOptions.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))
                  ) : (
                    <option>Loading...</option>
                  )}
                </select>
              </label>
              <CommonBacktestInputs
                data={formData}
                onChange={handleFormChange}
                options={{ symbolOptions, timeframeOptions, modelOptions }}
              />
              <button
                type="submit"
                disabled={loading.startsWith("running") || !strategyOptions.length}
              >
                {loading.startsWith("running") ? "Running…" : "Run Backtest"}
              </button>
            </form>
          )}

          {activeTab === "combo" && (
            <form onSubmit={handleRunComboBacktest} className="backtest-form">
              <CommonBacktestInputs
                data={comboData}
                onChange={handleComboChange}
                options={{ symbolOptions, timeframeOptions, modelOptions }}
              />
              <div className="combo-strategy-list">
                {comboData.strategyConfigs.map((config, idx) => (
                  <ComboStrategyCard
                    key={idx}
                    idx={idx}
                    config={config}
                    strategies={strategyOptions}
                    onChange={handleStrategyConfigChange}
                    onRemove={removeStrategyCard}
                    disableRemove={comboData.strategyConfigs.length <= 1}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={addStrategyCard}
                disabled={!strategyOptions.length}
              >
                Add Strategy
              </button>
              <button
                type="submit"
                disabled={loading.startsWith("running") || !strategyOptions.length}
              >
                {loading.startsWith("running") ? "Running…" : "Run Combo Backtest"}
              </button>
            </form>
          )}
        </div>

        {(loading.startsWith("running") || combinedMetrics) && (
          <div className="results-section">
            <h2>Backtest Results</h2>
            {loading.startsWith("running") && (
              <div className="loading-overlay">
                <h3>Running backtest…</h3>
              </div>
            )}
            {combinedMetrics && (
              <>
                <MetricsDisplay metrics={combinedMetrics} />
                <div className="charts-container">
                  <div className="chart">
                    <h3>Equity Curve</h3>
                    {combinedEquityCurve?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={combinedEquityCurve}>
                          <XAxis dataKey="timestamp" tickFormatter={formatDate} />
                          <YAxis domain={["auto", "auto"]} />
                          <Tooltip />
                          <CartesianGrid stroke="#333" />
                          <Line
                            type="monotone"
                            dataKey="balance"
                            stroke="#8884d8"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p>No equity curve data available.</p>
                    )}
                  </div>
                  <div className="chart">
                    <h3>Win / Loss Distribution</h3>
                    {pieData?.length > 0 && pieData.some((d) => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                          >
                            {pieData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p>No pie chart data available.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
