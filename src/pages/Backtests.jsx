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

// --- Helper functions for dates ---
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
  strategyConfigs: [{ code: "" }],
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
    options,
    initialLoading,
    singleLoading,
    batchLoading,
    error,
    runNewBacktest,
    runComboBacktest,
  } = useBacktest();
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
      } else {
        alert("Backtest ran successfully but produced no trades.");
      }
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
      // Build payload expected by backend - keep shape consistent
      const strategyCodes = comboData.strategyConfigs.map((s) => s.code).filter(Boolean);
      if (strategyCodes.length < 2) return alert("Select at least 2 unique strategies for a combo test.");

      const payload = {
        combinationRule: comboData.combinationRule,
        symbol: comboData.symbol,
        timeframe: comboData.timeframe,
        startDate: comboData.startDate,
        endDate: comboData.endDate,
        strategyCodes, // backend expects codes or strategy identifiers
      };

      console.log("Combo Backtest Payload:", payload);

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
            trades: r.trades || [], // preserve if present
          })),
        });
      } else {
        alert("Combo backtest ran successfully but produced no trades.");
      }
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
        // source is payload used for combo test
        payload = {
          name: setupDetails.name,
          description: setupDetails.description,
          strategies: source.strategyCodes || [], // use codes array
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
      // update context
      setStrategies((prev) => [...(prev || []), saved]);
      closeSaveModal();
    } catch (err) {
      console.error("Save setup failed:", err);
      alert(err.response?.data?.message || "Failed to save setup.");
    }
  };

  // --- Chart Data (main equity/chart merging) ---
  const chartData = useMemo(() => {
    if (!backtestResults?.main?.equityCurve?.length) return null;

    const mapSeriesToPoints = (seriesData) => seriesData.map((p) => ({ date: formatDate(p.timestamp), Equity: p.balance }));

    if (activeTestType === "single")
      return { data: mapSeriesToPoints(backtestResults.main.equityCurve), series: [{ name: "Equity", color: "#8884d8", dataKey: "Equity" }] };

    if (activeTestType === "combo") {
      const individualSeries = backtestResults.individuals.filter((r) => r.metrics?.totalTrades > 0).map((r) => ({ name: r.name, data: r.equityCurve }));
      const allSeries = [{ name: "Combined", data: backtestResults.main.equityCurve }, ...individualSeries];
      const allTimestamps = [...new Set(allSeries.flatMap((s) => s.data.map((p) => new Date(p.timestamp).getTime())))].sort((a, b) => a - b);

      const dataMap = {};
      allSeries.forEach((s) => {
        dataMap[s.name] = s.data.reduce((acc, p) => { acc[new Date(p.timestamp).getTime()] = p.balance; return acc; }, {});
      });

      const lastBalances = {};
      allSeries.forEach((s) => { lastBalances[s.name] = s.data[0]?.balance || 1000; });

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

  // --- Derived data for additional charts ---
  const equityCurve = backtestResults?.main?.equityCurve || [];

  // trades: prefer explicit trades if backend provides them; otherwise empty array
  // backend may include trades under metrics.trades or individuals[].trades
  const trades = useMemo(() => {
    // try main metrics.trades
    const mTrades = backtestResults?.main?.metrics?.trades;
    if (Array.isArray(mTrades)) return mTrades;

    // otherwise try to merge individual trades if present
    const indTrades = backtestResults?.individuals?.flatMap((r) => r.trades || []) || [];
    if (indTrades.length > 0) return indTrades;

    // fallback empty
    return [];
  }, [backtestResults]);

  // 1) drawdown curve (percentage)
  const drawdownData = useMemo(() => {
    if (!equityCurve.length) return [];
    let peak = -Infinity;
    return equityCurve.map((p) => {
      peak = Math.max(peak, p.balance);
      const dd = peak > 0 ? ((p.balance - peak) / peak) * 100 : 0;
      return { date: formatDate(p.timestamp), drawdown: dd };
    });
  }, [equityCurve]);

  // 2) trade return distribution (bins)
  const distributionData = useMemo(() => {
    if (!trades.length) return [];
    // create 11 bins from -50% to +50% in 10% steps
    const bins = Array.from({ length: 11 }, (_, i) => {
      const low = -50 + i * 10;
      const high = low + 10;
      return { label: `${low}%–${high}%`, count: 0 };
    });
    trades.forEach((t) => {
      // try to compute pct return; tolerate missing fields
      // prefer pct if provided, otherwise compute from pnl / (entryPrice * size)
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

  // 3) monthly returns from equity curve
  const monthlyData = useMemo(() => {
    if (!equityCurve.length) return [];
    const map = {};
    equityCurve.forEach((p) => {
      const ymd = formatDate(p.timestamp);
      const month = ymd.slice(0, 7); // YYYY-MM
      if (!map[month]) map[month] = { month, start: p.balance, end: p.balance };
      else map[month].end = p.balance;
    });
    return Object.values(map).map((m) => {
      const ret = m.start && m.start !== 0 ? ((m.end - m.start) / m.start) * 100 : 0;
      return { month: m.month, returnPct: ret };
    });
  }, [equityCurve]);

  // 4) win / loss breakdown
  const winLossData = useMemo(() => {
    if (!trades.length) return [];
    const wins = trades.filter((t) => t.pnl > 0).length;
    const losses = trades.filter((t) => t.pnl <= 0).length;
    return [{ name: "Wins", value: wins }, { name: "Losses", value: losses }];
  }, [trades]);

  const COLORS = ["#22c55e", "#ef4444"];

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
                {options?.strategies?.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Symbol
              <select name="symbol" value={formData.symbol} onChange={handleChange} required>
                {options?.symbols?.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Timeframe
              <select name="timeframe" value={formData.timeframe} onChange={handleChange} required>
                {options?.timeframes?.map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}
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

            <button type="submit" disabled={singleLoading}>
              {singleLoading ? "Running..." : "Run Backtest"}
            </button>
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
                  <select name="strategyCode" value={cfg.code} onChange={(e) => handleComboChange(e, idx)} required>
                    <option value="">-- Select a strategy --</option>
                    {options?.strategies
                      ?.filter((s) => !comboData.strategyConfigs.some((c, i) => c.code === s.code && i !== idx))
                      .map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </label>
                {comboData.strategyConfigs.length > 1 && (
                  <button type="button" onClick={() => removeStrategyFromCombo(idx)} className="button-remove">
                    Remove
                  </button>
                )}
              </div>
            ))}

            <button type="button" onClick={addStrategyToCombo} className="button-add" disabled={comboData.strategyConfigs.length >= (options?.strategies?.length || 99)}>
              Add Strategy
            </button>

            <label>
              Combination Rule
              <select name="combinationRule" value={comboData.combinationRule} onChange={(e) => handleComboChange(e, 0)}>
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            </label>

            <label>
              Symbol
              <select name="symbol" value={comboData.symbol} onChange={(e) => handleComboChange(e, 0)} required>
                {options?.symbols?.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Timeframe
              <select name="timeframe" value={comboData.timeframe} onChange={(e) => handleComboChange(e, 0)} required>
                {options?.timeframes?.map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Start Date
              <input type="date" name="startDate" value={comboData.startDate} onChange={(e) => handleComboChange(e, 0)} required />
            </label>

            <label>
              End Date
              <input type="date" name="endDate" value={comboData.endDate} onChange={(e) => handleComboChange(e, 0)} required />
            </label>

            <button type="submit" disabled={batchLoading || comboData.strategyConfigs.filter((s) => s.code).length < 2}>
              {batchLoading ? "Running..." : "Run Combo Backtest"}
            </button>
          </div>
        </form>
      </div>

      {/* Saved Setup Display */}
      {savedSetup && (
        <div className="saved-setup-card">
          <h3>Saved Setup: {savedSetup.name}</h3>
          <p>{savedSetup.description}</p>
          <p>
            <strong>Symbol:</strong> {savedSetup.symbol} | <strong>Timeframe:</strong> {savedSetup.timeframe}
          </p>
          {savedSetup.isCombo && (
            <p>
              <strong>Combo Strategies:</strong> {savedSetup.comboConfig.strategyCodes.join(", ")} | <strong>Rule:</strong> {savedSetup.comboConfig.combinationRule}
            </p>
          )}
        </div>
      )}

      {/* Chart & Metrics */}
      {backtestResults?.main && (
        <div key={resultKey} className="chart-card">
          <div className="results-header">
            <h3>{backtestResults.main.name}</h3>
            <button onClick={openSaveModal} className="button-save">
              Save Setup
            </button>
          </div>

          {backtestResults.main.noTradeReason && <p className="no-trades-reason">⚠️ {backtestResults.main.noTradeReason}</p>}

          <MetricsDisplay metrics={backtestResults.main.metrics} />

          {/* Equity / Combined chart */}
          {chartData?.data?.length > 0 && (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={["auto", "auto"]} />
                <Tooltip />
                <Legend />
                {chartData.series.map((s) => (
                  <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color} dot={false} name={s.name} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* Performance Dashboard - 4 additional charts */}
          <div className="performance-dashboard">
            <h3>Performance Dashboard</h3>
            <div className="dashboard-grid">
              {/* Drawdown Curve */}
              <div className="dashboard-card">
                <h4>Drawdown Curve</h4>
                {drawdownData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={drawdownData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis unit="%" />
                      <Tooltip />
                      <Line type="monotone" dataKey="drawdown" stroke="#f97316" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="no-strategies">Not enough equity data to compute drawdown.</p>
                )}
              </div>

              {/* Trade Return Distribution */}
              <div className="dashboard-card">
                <h4>Trade Return Distribution</h4>
                {distributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={distributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" interval={0} tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="no-strategies">No trade-level data available to show distribution.</p>
                )}
              </div>

              {/* Monthly Returns */}
              <div className="dashboard-card">
                <h4>Monthly Returns</h4>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis unit="%" />
                      <Tooltip />
                      <Bar dataKey="returnPct" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="no-strategies">Not enough data to compute monthly returns.</p>
                )}
              </div>

              {/* Win/Loss Breakdown */}
              <div className="dashboard-card">
                <h4>Win / Loss Breakdown</h4>
                {winLossData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={winLossData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                        {winLossData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="no-strategies">No trades to compute win/loss breakdown.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {isSaveModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Save Backtest Setup</h3>
            <form onSubmit={handleSaveSetup}>
              <label>
                Setup Name
                <input type="text" name="name" value={setupDetails.name} onChange={handleSetupDetailChange} required />
              </label>
              <label>
                Description
                <textarea name="description" value={setupDetails.description} onChange={handleSetupDetailChange} />
              </label>
              {saveError && <p className="error-text">{saveError}</p>}
              <div className="modal-actions">
                <button type="button" onClick={closeSaveModal} className="button-secondary">Cancel</button>
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
