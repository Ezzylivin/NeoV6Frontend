import React, { useState, useEffect, useMemo } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
} from "recharts";
import "./Backtests.css";

// --- Helper functions for dates (no change) ---
const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getInitialDates = () => {
  const today = new Date();
  const start = new Date(today);
  start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today);
  end.setDate(today.getDate() - 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

const initialFormData = { code: "", symbol: "", timeframe: "", startDate: getInitialDates().startDate, endDate: getInitialDates().endDate, params: {} };
const initialComboData = { strategyConfigs: [{ code: "" }], combinationRule: "AND", symbol: "", timeframe: "", startDate: getInitialDates().startDate, endDate: getInitialDates().endDate };

// --- Metrics Card Component (no change) ---
const MetricsDisplay = ({ metrics }) => {
  if (!metrics || Object.keys(metrics).length === 0) return <p className="no-metrics">No metrics available</p>;
  const keyMetrics = { "Total Profit": metrics.totalProfit, "Total Trades": metrics.totalTrades, "Win Rate": metrics.winRate, "Max Drawdown": metrics.maxDrawdown, "Profit Factor": metrics.profitFactor, "Final Balance": metrics.finalBalance };
  const formatValue = (k, v) => {
    if (v == null) return "N/A";
    if (k.includes("Win Rate")) return `${v.toFixed(2)}%`;
    if (k.includes("Profit Factor")) return v.toFixed(2);
    if (k.includes("Profit") || k.includes("Drawdown") || k.includes("Balance")) return `$${v.toFixed(2)}`;
    return v;
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

// --- Main Component ---
export default function Backtests() {
  const { options, initialLoading, singleLoading, batchLoading, error, runNewBacktest, runComboBacktest } = useBacktest();
  const { createSetup, loading: isSaving, error: saveError } = useBacktestSetupFunction();
  
  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTestType, setActiveTestType] = useState(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [setupDetails, setSetupDetails] = useState({ name: '', description: '' });
  const [resultKey, setResultKey] = useState(Date.now());

  useEffect(() => {
    if (options && options.strategies?.length > 0 && !formData.code) {
      const s = options.strategies[0];
      setFormData(prev => ({ ...prev, code: s.code, symbol: options.symbols[0], timeframe: options.timeframes[0], params: s.params || {} }));
      setComboData(prev => ({ ...prev, symbol: options.symbols[0], timeframe: options.timeframes[0], strategyConfigs: [{ code: s.code }] }));
    }
  }, [options]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "code") {
      const s = options.strategies.find(s => s.code === value);
      if (s) setFormData(prev => ({ ...prev, code: s.code, symbol: s.params?.symbol || options.symbols[0], timeframe: s.params?.timeframe || options.timeframes[0], params: s.params || {} }));
    } else setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleComboChange = (e, index) => {
    const { name, value } = e.target;
    if (name === "strategyCode") {
      const arr = [...comboData.strategyConfigs];
      arr[index] = { ...arr[index], code: value };
      setComboData(prev => ({ ...prev, strategyConfigs: arr }));
    } else setComboData(prev => ({ ...prev, [name]: value }));
  };

  const addStrategyToCombo = () => setComboData(prev => ({ ...prev, strategyConfigs: [...prev.strategyConfigs, { code: "" }] }));
  const removeStrategyFromCombo = (i) => setComboData(prev => ({ ...prev, strategyConfigs: comboData.strategyConfigs.filter((_, idx) => idx !== i) }));

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setBacktestResults({ main: null, individuals: [] });
    setActiveTestType("single");
    setResultKey(Date.now());
    try {
      const result = await runNewBacktest(formData);
      if (result?.equityCurve?.length > 0) {
        setBacktestResults({ main: { name: "Backtest Results", metrics: { ...result.metrics, totalProfit: result.profit, finalBalance: result.finalBalance }, equityCurve: result.equityCurve, sourceData: formData }, individuals: [] });
      } else {
        alert("Backtest ran successfully but produced no trades.");
      }
    } catch (err) { alert(err.response?.data?.message || "Error running backtest"); }
  };

  const handleComboSubmit = async (e) => {
    e.preventDefault();
    setBacktestResults({ main: null, individuals: [] });
    setActiveTestType("combo");
    setResultKey(Date.now());
    try {
      const payload = { ...comboData, strategyCodes: comboData.strategyConfigs.map(s => s.code).filter(Boolean) };
      delete payload.strategyConfigs;
      if (!payload.strategyCodes.length) return alert("Select at least one strategy.");
      const result = await runComboBacktest(payload);
      if (result?.combinedResult?.equityCurve?.length > 0) {
        setBacktestResults({
          main: { name: "Combined Strategy Performance", metrics: result.combinedResult.metrics, equityCurve: result.combinedResult.equityCurve, sourceData: comboData },
          individuals: result.individualResults.map(res => ({ name: res.strategyName, metrics: res.metrics, equityCurve: res.equityCurve, noTradeReason: res.noTradeReason }))
        });
      } else {
        alert("Combo backtest ran successfully but produced no trades.");
      }
    } catch (err) { alert(err.response?.data?.message || "Error running combo backtest"); }
  };
  
  const openSaveModal = () => setIsSaveModalOpen(true);
  const closeSaveModal = () => setIsSaveModalOpen(false);
  const handleSetupDetailChange = (e) => setSetupDetails({ ...setupDetails, [e.target.name]: e.target.value });

  const handleSaveSetup = async (e) => {
    e.preventDefault();
    const source = backtestResults.main?.sourceData;
    if (!source) return alert("No source data found to save.");

    let setupPayload;
    if (activeTestType === 'single') {
        const strategy = options.strategies.find(s => s.code === source.code);
        setupPayload = { name: setupDetails.name, description: setupDetails.description, symbol: source.symbol, timeframe: source.timeframe, isCombo: false, strategyId: strategy?._id };
    } else {
        setupPayload = { name: setupDetails.name, description: setupDetails.description, symbol: source.symbol, timeframe: source.timeframe, isCombo: true, comboConfig: { strategyCodes: source.strategyConfigs.map(s => s.code).filter(Boolean), combinationRule: source.combinationRule } };
    }
    try {
        await createSetup(setupPayload);
        alert("Setup saved successfully!");
        closeSaveModal();
    } catch (err) {
        alert(err.response?.data?.message || "Failed to save setup.");
    }
  };

  const chartData = useMemo(() => {
    if (!backtestResults?.main?.equityCurve?.length) return null;

    const mapSeriesToPoints = (seriesData) => seriesData.map(p => ({
      date: formatDate(p.timestamp),
      Equity: p.balance
    }));

    if (activeTestType === "single") {
      return {
        data: mapSeriesToPoints(backtestResults.main.equityCurve),
        series: [{ name: "Equity", color: "#8884d8", dataKey: "Equity" }]
      };
    }

    if (activeTestType === "combo") {
      const individualSeries = backtestResults.individuals
        .filter(r => r.metrics?.totalTrades > 0)
        .map(r => ({ name: r.name, data: r.equityCurve }));

      const allSeries = [{ name: "Combined", data: backtestResults.main.equityCurve }, ...individualSeries];
      const allTimestamps = [...new Set(allSeries.flatMap(s => s.data.map(p => new Date(p.timestamp).getTime())))].sort((a, b) => a - b);
      const dataMap = {};
      allSeries.forEach(s => {
        dataMap[s.name] = s.data.reduce((acc, p) => {
          acc[new Date(p.timestamp).getTime()] = p.balance;
          return acc;
        }, {});
      });

      const lastBalances = {};
      allSeries.forEach(s => { lastBalances[s.name] = s.data[0]?.balance || 1000; });

      const mergedData = allTimestamps.map(ts => {
        const point = { date: formatDate(ts) };
        allSeries.forEach(s => {
          if (dataMap[s.name][ts] !== undefined) lastBalances[s.name] = dataMap[s.name][ts];
          point[s.name] = lastBalances[s.name];
        });
        return point;
      });

      const colors = ["#8884d8","#82ca9d","#ffc658","#ff8042","#0088FE","#00C49F","#FFBB28"];
      return { data: mergedData, series: allSeries.map((s,i) => ({ name: s.name, color: colors[i % colors.length], dataKey: s.name })) };
    }

    return null;
  }, [backtestResults, activeTestType]); // ✅ Corrected dependency array placement

  if (initialLoading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div className="dashboard-container">
      <h2 className="header">Backtests</h2>

      <div className="forms-container">
        {/* Single Backtest */}
        <form className="card-row" onSubmit={handleSingleSubmit}>
          <div className="metric-card">
            <h3 className="card-title">Single Backtest</h3>
            <label>Strategy<select name="code" value={formData.code} onChange={handleChange} required><option value="">Select strategy</option>{options.strategies?.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select></label>
            <label>Symbol<select name="symbol" value={formData.symbol} onChange={handleChange} required>{options.symbols?.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
            <label>Timeframe<select name="timeframe" value={formData.timeframe} onChange={handleChange} required>{options.timeframes?.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
            <label>Start Date<input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required /></label>
            <label>End Date<input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required /></label>
            <button type="submit" disabled={singleLoading}>{singleLoading ? "Running..." : "Run Backtest"}</button>
          </div>
        </form>

        {/* Combo Backtest */}
        <form className="card-row" onSubmit={handleComboSubmit}>
          <div className="metric-card">
            <h3 className="card-title">Combo Strategy Builder</h3>
            {comboData.strategyConfigs.map((s, idx) => (
              <div key={idx} className="combo-strategy-item">
                <select name="strategyCode" value={s.code} onChange={e => handleComboChange(e, idx)} required>
                  <option value="">Select Strategy {idx+1}</option>
                  {options.strategies?.map(opt => <option key={opt.code} value={opt.code}>{opt.name}</option>)}
                </select>
                {comboData.strategyConfigs.length>1 && <button type="button" onClick={()=>removeStrategyFromCombo(idx)} className="button-remove">X</button>}
              </div>
            ))}
            <button type="button" onClick={addStrategyToCombo} className="button-add">+ Add Strategy</button>
            <label>Combination Rule<select name="combinationRule" value={comboData.combinationRule} onChange={handleComboChange} required><option value="AND">AND</option><option value="OR">OR</option></select></label>
            <label>Symbol<select name="symbol" value={comboData.symbol} onChange={handleComboChange} required>{options.symbols?.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
            <label>Timeframe<select name="timeframe" value={comboData.timeframe} onChange={handleComboChange} required>{options.timeframes?.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
            <label>Start Date<input type="date" name="startDate" value={comboData.startDate} onChange={handleComboChange} required /></label>
            <label>End Date<input type="date" name="endDate" value={comboData.endDate} onChange={handleComboChange} required /></label>
            <button type="submit" disabled={batchLoading}>{batchLoading ? "Running..." : "Run Combo Test"}</button>
          </div>
        </form>
      </div>

      {/* --- Smart Results Display --- */}
      {backtestResults?.main && (
        <div key={resultKey} className="chart-card">
          <div className="results-header">
            <h3>{backtestResults.main.name}</h3>
            <button onClick={openSaveModal} className="button-save">Save Setup</button>
          </div>
          {backtestResults.main.noTradeReason && <p className="no-trades-reason">⚠️ {backtestResults.main.noTradeReason}</p>}
          <MetricsDisplay metrics={backtestResults.main.metrics} />
          {chartData?.data?.length > 0 && (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={['auto','auto']} />
                <Tooltip />
                <Legend />
                {chartData.series.map(s => <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color} dot={false} name={s.name} />)}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {isSaveModalOpen && (
          <div className="modal-overlay">
              <div className="modal-content">
                  <h3 className="modal-title">Save Backtest Setup</h3>
                  <form onSubmit={handleSaveSetup}>
                      <label>Setup Name<input type="text" name="name" value={setupDetails.name} onChange={handleSetupDetailChange} required /></label>
                      <label>Description<textarea name="description" value={setupDetails.description} onChange={handleSetupDetailChange} /></label>
                      {saveError && <p className="error-text">{saveError}</p>}
                      <div className="modal-actions">
                          <button type="button" onClick={closeSaveModal} className="button-secondary">Cancel</button>
                          <button type="submit" className="button-save" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}

