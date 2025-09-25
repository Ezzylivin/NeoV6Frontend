// File: src/pages/Strategies.jsx
import React, { useState, useEffect } from "react";
import api from "../api/apiClient.js";
import "./Strategies.css";

// --- Strategy Guides ---
const strategyGuides = {
  ATR: {
    title: "ATR (Average True Range)",
    whatItIs:
      "ATR measures market volatility by analyzing the range of price movement over time.",
    howItWorks:
      "Traders often use ATR to set stop-loss levels or position sizing. A higher ATR means more volatility.",
    combineWith: "Combine with trend indicators like SMA or MACD for better entry/exit decisions.",
  },
  "Bollinger Bands": {
    title: "Bollinger Bands",
    whatItIs:
      "Bollinger Bands use a moving average and standard deviation to form upper and lower bands.",
    howItWorks:
      "Price touching the bands can indicate overbought/oversold conditions. Mean reversion strategies use this.",
    combineWith:
      "Combine with RSI or a Stochastic Oscillator to confirm potential reversals.",
  },
  CCI: {
    title: "CCI (Commodity Channel Index)",
    whatItIs: "CCI measures deviation of price from its statistical mean.",
    howItWorks:
      "Buy signals occur when CCI rises above -100 from oversold conditions. Sell signals occur when CCI falls below 100 from overbought.",
    combineWith: "Use with trend indicators like SMAs to avoid false signals.",
  },
  "Ichimoku Cloud": {
    title: "Ichimoku Cloud",
    whatItIs:
      "A comprehensive indicator showing trend, momentum, and support/resistance.",
    howItWorks:
      "Buy when price is above the cloud and conversion line crosses base line upwards. Sell when below cloud and cross downwards.",
    combineWith: "Pair with RSI to confirm entries in ranging markets.",
  },
  MACD: {
    title: "MACD (Moving Average Convergence Divergence)",
    whatItIs:
      "Shows trend direction and momentum using two moving averages and a signal line.",
    howItWorks:
      "Buy when MACD line crosses above Signal line. Sell when it crosses below.",
    combineWith: "Combine with ATR or Bollinger Bands to filter false signals.",
  },
  "On-Balance Volume": {
    title: "On-Balance Volume (OBV)",
    whatItIs:
      "Tracks cumulative buying and selling pressure by adding/subtracting volume based on price movement.",
    howItWorks: "Look for divergences between OBV and price to anticipate reversals.",
    combineWith: "Use with SMA to confirm that price moves align with volume trends.",
  },
  "Parabolic SAR": {
    title: "Parabolic SAR",
    whatItIs: "Places dots above/below price to indicate trend direction.",
    howItWorks: "Buy when dots flip below price, sell when they flip above.",
    combineWith: "Excellent for trend-following. Combine with ATR to manage stop-loss levels.",
  },
  RSI: {
    title: "RSI (Relative Strength Index)",
    whatItIs:
      "Momentum oscillator indicating overbought (>70) or oversold (<30) conditions.",
    howItWorks:
      "Buy when RSI crosses up from below 30, sell when it crosses down from above 70.",
    combineWith: "Best used in range-bound markets. Combine with SMA for trend confirmation.",
  },
  "Moving Average Crossover": {
    title: "SMA Crossover",
    whatItIs: "Trend-following strategy using a fast and slow moving average.",
    howItWorks: "Buy when fast MA crosses above slow MA, sell when it crosses below.",
    combineWith: "Combine with ATR or RSI for more reliable signals.",
  },
  "Stochastic Oscillator": {
    title: "Stochastic Oscillator",
    whatItIs:
      "Momentum indicator comparing closing price to its recent high-low range.",
    howItWorks:
      "Buy when %K line crosses %D below 20, sell when %K crosses %D above 80.",
    combineWith: "Use with MACD to filter false signals in strong trends.",
  },
};

// --- Default strategy state ---
const initialStrategyState = {
  name: "",
  description: "",
  params: { strategyType: "Moving Average Crossover", shortPeriod: 10, longPeriod: 50 },
};

const Strategies = () => {
  const [singleStrategies, setSingleStrategies] = useState([]);
  const [comboStrategies, setComboStrategies] = useState([]);
  const [newStrategy, setNewStrategy] = useState(initialStrategyState);
  const [newCombo, setNewCombo] = useState({ name: "", description: "", selectedStrategies: [] });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Fetch Single & Combo Strategies ---
  const fetchSingleStrategies = async () => {
    try {
      const res = await api.get("/strategy");
      setSingleStrategies(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

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

  // --- Handle single strategy form changes ---
  const handleStrategyChange = (e) => {
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
        "Ichimoku Cloud": { conversionLinePeriod: 9, baseLinePeriod: 26, laggingSpanPeriod: 26, leadingSpanBPeriod: 52 },
      };
      setNewStrategy((prev) => ({ ...prev, params: { strategyType: value, ...defaultParams[value] } }));
    } else if (newStrategy.params.hasOwnProperty(name)) {
      setNewStrategy((prev) => ({ ...prev, params: { ...prev.params, [name]: value } }));
    } else {
      setNewStrategy((prev) => ({ ...prev, [name]: value }));
    }
  };

  // --- Handle combo form changes ---
  const handleComboChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "selectedStrategies") {
      const updated = checked
        ? [...newCombo.selectedStrategies, value]
        : newCombo.selectedStrategies.filter((s) => s !== value);
      setNewCombo((prev) => ({ ...prev, selectedStrategies: updated }));
    } else {
      setNewCombo((prev) => ({ ...prev, [name]: value }));
    }
  };

  // --- Create single strategy ---
  const handleCreateStrategy = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/strategy", newStrategy);
      setSingleStrategies((prev) => [...prev, res.data]);
      setNewStrategy(initialStrategyState);
      setError(null);
      setSuccess("Single strategy created successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setSuccess(null);
      setError(err.response?.data?.message || err.message);
    }
  };

  // --- Create combo strategy ---
  const handleCreateCombo = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: newCombo.name,
        description: newCombo.description,
        strategies: newCombo.selectedStrategies,
      };
      const res = await api.post("/combos", payload);
      setComboStrategies((prev) => [...prev, res.data]);
      setNewCombo({ name: "", description: "", selectedStrategies: [] });
      setError(null);
      setSuccess("Combo strategy created successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setSuccess(null);
      setError(err.response?.data?.message || err.message);
    }
  };

  // --- Helper ---
  const formatLabel = (key) => key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());

  if (loading) return <p className="loading-banner">⏳ Loading strategies...</p>;

  return (
    <div className="strategies-container">
      <h1 className="header">My Trading Strategies</h1>

      {/* Alerts */}
      {error && <p className="error-banner">⚠️ {error}</p>}
      {success && <p className="success-banner">✅ {success}</p>}

      {/* Flex container for two sections */}
      <div className="strategies-flex">
        {/* Single Strategies */}
        <div className="strategy-section">
          <h2 className="card-title">Create a New Strategy</h2>
          <form onSubmit={handleCreateStrategy} className="strategy-form">
            <label>
              Strategy Type:
              <select
                name="strategyType"
                value={newStrategy.params.strategyType}
                onChange={handleStrategyChange}
                className="dashboard-dropdown"
              >
                {Object.keys(strategyGuides).sort().map((t) => (
                  <option key={t} value={t}>
                    {strategyGuides[t].title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Strategy Name:
              <input type="text" name="name" value={newStrategy.name} onChange={handleStrategyChange} required />
            </label>
            <label>
              Description:
              <textarea name="description" value={newStrategy.description} onChange={handleStrategyChange} />
            </label>

            <div className="parameters-form">
              {Object.entries(newStrategy.params)
                .filter(([key]) => key !== "strategyType")
                .map(([key, value]) => (
                  <label key={key}>
                    {formatLabel(key)}:
                    <input type="number" name={key} value={value} onChange={handleStrategyChange} />
                  </label>
                ))}
            </div>

            <button type="submit" className="button-add">➕ Create Strategy</button>
          </form>

          {/* Saved Single Strategies */}
          <div>
            <h3 className="card-title">Saved Single Strategies</h3>
            {singleStrategies.length > 0 ? (
              <ul className="strategy-list">
                {singleStrategies.map((s) => (
                  <li key={s._id} className="strategy-card">
                    <span className="strategy-name">{s.name}</span>
                    <span className="strategy-type">{s.params.strategyType}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="no-strategies">No strategies yet.</p>}
          </div>
        </div>

        {/* Combo Strategies */}
        <div className="strategy-section combo-section">
          <h2 className="card-title">Create a Combo Strategy</h2>
          <form onSubmit={handleCreateCombo} className="combo-form">
            <label>
              Combo Name:
              <input type="text" name="name" value={newCombo.name} onChange={handleComboChange} required />
            </label>
            <label>
              Description:
              <textarea name="description" value={newCombo.description} onChange={handleComboChange} />
            </label>

            <div className="combo-selection">
              <p>Select strategies to include:</p>
              {singleStrategies.map((s) => (
                <label key={s._id}>
                  <input
                    type="checkbox"
                    name="selectedStrategies"
                    value={s._id}
                    checked={newCombo.selectedStrategies.includes(s._id)}
                    onChange={handleComboChange}
                  />
                  {s.name} ({s.params.strategyType})
                </label>
              ))}
            </div>

            <button type="submit" className="button-add">➕ Create Combo</button>
          </form>

          {/* Saved Combo Strategies */}
          {comboStrategies.length > 0 && (
            <div className="saved-combos">
              <h3 className="card-title">Saved Combo Strategies</h3>
              <ul className="combo-list">
                {comboStrategies.map((c) => (
                  <li key={c._id} className="combo-card">
                    <strong>{c.name}</strong>: {c.description} <br />
                    Includes: {c.strategies.map((s) => s.name).join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Strategies;
