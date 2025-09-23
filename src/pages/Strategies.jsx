import React, { useState, useEffect } from "react";
import api from "../api/apiClient.js";
import "./Strategies.css";

// --- Strategy Guides ---
const strategyGuides = {
  ATR: { title: "ATR (Average True Range)", whatItIs: "ATR measures market volatility...", howItWorks: "A common use is setting a stop-loss...", combineWith: "Combine with trend indicators like SMA or MACD..." },
  "Bollinger Bands": { title: "Bollinger Bands", whatItIs: "These bands use a moving average...", howItWorks: "The main idea is 'mean reversion'...", combineWith: "Combine with RSI or a Stochastic Oscillator..." },
  CCI: { title: "CCI (Commodity Channel Index)", whatItIs: "CCI measures deviation from statistical average...", howItWorks: "Long entry when CCI crosses up from below oversold...", combineWith: "Use with trend indicators (like SMAs)..." },
  "Ichimoku Cloud": { title: "Ichimoku Cloud", whatItIs: "Shows trend, support/resistance, momentum...", howItWorks: "Long entry when price above cloud and conversion line crosses base line...", combineWith: "Pair with RSI to confirm entries in ranging markets" },
  MACD: { title: "MACD (Moving Average Convergence Divergence)", whatItIs: "Shows trend direction and momentum...", howItWorks: "Long entry when MACD line crosses above Signal line...", combineWith: "Combine with ATR or Bollinger Bands to avoid false signals" },
  "On-Balance Volume": { title: "On-Balance Volume (OBV)", whatItIs: "Tracks cumulative buying/selling pressure...", howItWorks: "Key signal is divergence with price...", combineWith: "Use with SMA to confirm price action agrees with volume" },
  "Parabolic SAR": { title: "Parabolic SAR", whatItIs: "Places dots indicating trend direction...", howItWorks: "Long entry when dots flip below price...", combineWith: "Excellent for trend-following. Pair with ATR for stop-loss management" },
  RSI: { title: "RSI", whatItIs: "Momentum oscillator for overbought/oversold...", howItWorks: "Long entry when RSI crosses up from below 30...", combineWith: "Best in range-bound markets; combine with SMA" },
  "Moving Average Crossover": { title: "SMA Crossover", whatItIs: "Trend-following using fast/slow moving averages", howItWorks: "Long entry when fast MA crosses above slow MA...", combineWith: "Combine with ATR or RSI for better signals" },
  "Stochastic Oscillator": { title: "Stochastic Oscillator", whatItIs: "Momentum indicator comparing closing price to range...", howItWorks: "Long entry when %K crosses %D below 20...", combineWith: "Use with MACD to filter false signals in strong trends" }
};

// --- Default new strategy ---
const initialStrategyState = {
  name: "",
  description: "",
  params: { strategyType: "Moving Average Crossover", shortPeriod: 10, longPeriod: 50 },
};

const Strategies = () => {
  const [singleStrategies, setSingleStrategies] = useState([]);
  const [comboStrategies, setComboStrategies] = useState([]);
  const [newStrategy, setNewStrategy] = useState(initialStrategyState);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Fetch single strategies ---
  const fetchSingleStrategies = async () => {
    try {
      const res = await api.get("/strategy");
      setSingleStrategies(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  // --- Fetch combo strategies ---
  const fetchComboStrategies = async () => {
    try {
      const res = await api.get("/combos");
      setComboStrategies(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await fetchSingleStrategies();
      await fetchComboStrategies();
      setLoading(false);
    };
    fetchAll();
  }, []);

  // --- Handle form changes ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "strategyType") {
      const defaultParams = {
        "Moving Average Crossover": { shortPeriod: 10, longPeriod: 50 },
        RSI: { rsiPeriod: 14, overbought: 70, oversold: 30 },
        "Bollinger Bands": { period: 20, numStdDev: 2 },
        "Stochastic Oscillator": { kPeriod: 14, dPeriod: 3, overbought: 80, oversold: 20 },
        MACD: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
        "Parabolic SAR": { start: 0.02, increment: 0.02, max: 0.2 },
        "On-Balance Volume": { maPeriod: 20 },
        CCI: { period: 20, overbought: 100, oversold: -100 },
        ATR: { period: 14, multiplier: 2 },
        "Ichimoku Cloud": { conversionLinePeriod: 9, baseLinePeriod: 26, laggingSpanPeriod: 26, leadingSpanBPeriod: 52 }
      };
      setNewStrategy((prev) => ({ ...prev, params: { strategyType: value, ...defaultParams[value] } }));
    } else if (newStrategy.params.hasOwnProperty(name)) {
      setNewStrategy((prev) => ({ ...prev, params: { ...prev.params, [name]: value } }));
    } else {
      setNewStrategy((prev) => ({ ...prev, [name]: value }));
    }
  };

  // --- Create strategy ---
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/strategy", newStrategy);
      fetchSingleStrategies();
      setNewStrategy(initialStrategyState);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  // --- Delete strategy ---
  const handleDelete = async (id, type) => {
    if (!window.confirm("Are you sure you want to delete this strategy?")) return;
    try {
      await api.delete(`/${type}/${id}`);
      if (type === "strategy") fetchSingleStrategies();
      if (type === "combos") fetchComboStrategies();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  if (loading) return <p className="no-strategies">Loading strategies...</p>;
  if (error) return <p className="error-banner">Error: {error}</p>;

  return (
    <div className="strategies-container">
      <h1 className="header">My Trading Strategies</h1>

      {/* --- Create Strategy Form --- */}
      <div className="strategy-form">
        <h2 className="card-title">Create a New Strategy</h2>
        <form onSubmit={handleCreate}>
          <label>
            Strategy Type:
            <select name="strategyType" value={newStrategy.params.strategyType} onChange={handleChange} className="dashboard-dropdown">
              {Object.keys(strategyGuides).map((t) => <option key={t} value={t}>{strategyGuides[t].title}</option>)}
            </select>
          </label>

          <label>
            Strategy Name:
            <input type="text" name="name" value={newStrategy.name} onChange={handleChange} required />
          </label>

          <label>
            Description:
            <textarea name="description" value={newStrategy.description} onChange={handleChange} />
          </label>

          <button type="submit" className="button-add">Create Strategy</button>
        </form>
      </div>

      {/* --- Single Strategies --- */}
      <div>
        <h2 className="card-title">Single Strategies</h2>
        {singleStrategies.length > 0 ? (
          <ul className="strategy-list">
            {singleStrategies.map(s => (
              <li key={s._id} className="strategy-card">
                <span>
                  <span className="strategy-name">{s.name}</span>
                  <span className="strategy-type">{s.params.strategyType}</span>
                </span>
                <button className="button-remove" onClick={() => handleDelete(s._id, "strategy")}>Delete</button>
              </li>
            ))}
          </ul>
        ) : <p className="no-strategies">No single strategies yet.</p>}
      </div>

      {/* --- Combo Strategies --- */}
      <div>
        <h2 className="card-title">Combo Strategies</h2>
        {comboStrategies.length > 0 ? (
          <ul className="strategy-list">
            {comboStrategies.map(c => (
              <li key={c._id} className="strategy-card combo">
                <span>
                  <span className="strategy-name">{c.name}</span>
                  <span className="strategy-type">{c.params.strategyType}</span>
                </span>
                <button className="button-remove" onClick={() => handleDelete(c._id, "combos")}>Delete</button>
              </li>
            ))}
          </ul>
        ) : <p className="no-strategies">No combo strategies yet.</p>}
      </div>
    </div>
  );
};

export default Strategies;
