// File: src/pages/Strategies.jsx
import React, { useState, useEffect } from "react";
import api from "../api/apiClient.js";
import "./Strategies.css";

// --- Strategy Guides ---
const strategyGuides = {
  ATR: {
    title: "ATR (Average True Range)",
    whatItIs: "ATR measures market volatility by analyzing the range of price movement over time.",
    howItWorks: "Traders often use ATR to set stop-loss levels or position sizing. A higher ATR means more volatility.",
    combineWith: "Combine with trend indicators like SMA or MACD for better entry/exit decisions."
  },
  "Bollinger Bands": {
    title: "Bollinger Bands",
    whatItIs: "Bollinger Bands use a moving average and standard deviation to form upper and lower bands.",
    howItWorks: "Price touching the bands can indicate overbought/oversold conditions. Mean reversion strategies use this.",
    combineWith: "Combine with RSI or a Stochastic Oscillator to confirm potential reversals."
  },
  CCI: {
    title: "CCI (Commodity Channel Index)",
    whatItIs: "CCI measures deviation of price from its statistical mean.",
    howItWorks: "Buy signals occur when CCI rises above -100 from oversold conditions. Sell signals occur when CCI falls below 100 from overbought.",
    combineWith: "Use with trend indicators like SMAs to avoid false signals."
  },
  "Ichimoku Cloud": {
    title: "Ichimoku Cloud",
    whatItIs: "A comprehensive indicator showing trend, momentum, and support/resistance.",
    howItWorks: "Buy when price is above the cloud and conversion line crosses base line upwards. Sell when below cloud and cross downwards.",
    combineWith: "Pair with RSI to confirm entries in ranging markets."
  },
  MACD: {
    title: "MACD (Moving Average Convergence Divergence)",
    whatItIs: "Shows trend direction and momentum using two moving averages and a signal line.",
    howItWorks: "Buy when MACD line crosses above Signal line. Sell when it crosses below.",
    combineWith: "Combine with ATR or Bollinger Bands to filter false signals."
  },
  "On-Balance Volume": {
    title: "On-Balance Volume (OBV)",
    whatItIs: "Tracks cumulative buying and selling pressure by adding/subtracting volume based on price movement.",
    howItWorks: "Look for divergences between OBV and price to anticipate reversals.",
    combineWith: "Use with SMA to confirm that price moves align with volume trends."
  },
  "Parabolic SAR": {
    title: "Parabolic SAR",
    whatItIs: "Places dots above/below price to indicate trend direction.",
    howItWorks: "Buy when dots flip below price, sell when they flip above.",
    combineWith: "Excellent for trend-following. Combine with ATR to manage stop-loss levels."
  },
  RSI: {
    title: "RSI (Relative Strength Index)",
    whatItIs: "Momentum oscillator indicating overbought (>70) or oversold (<30) conditions.",
    howItWorks: "Buy when RSI crosses up from below 30, sell when it crosses down from above 70.",
    combineWith: "Best used in range-bound markets. Combine with SMA for trend confirmation."
  },
  "Moving Average Crossover": {
    title: "SMA Crossover",
    whatItIs: "Trend-following strategy using a fast and slow moving average.",
    howItWorks: "Buy when fast MA crosses above slow MA, sell when it crosses below.",
    combineWith: "Combine with ATR or RSI for more reliable signals."
  },
  "Stochastic Oscillator": {
    title: "Stochastic Oscillator",
    whatItIs: "Momentum indicator comparing closing price to its recent high-low range.",
    howItWorks: "Buy when %K line crosses %D below 20, sell when %K crosses %D above 80.",
    combineWith: "Use with MACD to filter false signals in strong trends."
  }
};

// --- Default new strategy ---
const initialStrategyState = {
  name: "",
  description: "",
  params: { strategyType: "Moving Average Crossover", shortPeriod: 10, longPeriod: 50 },
  addToCombo: false // New flag for adding to combo
};

const Strategies = () => {
  const [singleStrategies, setSingleStrategies] = useState([]);
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

  // --- Initialize ---
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await fetchSingleStrategies();
      setLoading(false);
    };
    fetchAll();
  }, []);

  // --- Handle single strategy form changes ---
  const handleStrategyChange = (e) => {
    const { name, value, type, checked } = e.target;
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
      setNewStrategy(prev => ({ ...prev, params: { strategyType: value, ...defaultParams[value] } }));
    } else if (name === "addToCombo") {
      setNewStrategy(prev => ({ ...prev, addToCombo: checked }));
    } else if (newStrategy.params.hasOwnProperty(name)) {
      setNewStrategy(prev => ({ ...prev, params: { ...prev.params, [name]: value } }));
    } else {
      setNewStrategy(prev => ({ ...prev, [name]: value }));
    }
  };

  // --- Create single strategy ---
  const handleCreateStrategy = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newStrategy };
      if (!payload.addToCombo) delete payload.addToCombo; // optional field
      const res = await api.post("/strategy", payload);
      const saved = res.data;
      setSingleStrategies(prev => [...prev, saved]);
      setNewStrategy(initialStrategyState);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  if (loading) return <p className="no-strategies">Loading strategies...</p>;
  if (error) return <p className="error-banner">Error: {error}</p>;

  return (
    <div className="strategies-container">
      <h1 className="header">My Trading Strategies</h1>

      {/* --- Single Strategy Form --- */}
      <div className="strategy-form">
        <h2 className="card-title">Create a New Strategy</h2>
        <form onSubmit={handleCreateStrategy}>
          <label>
            Strategy Type:
            <select
              name="strategyType"
              value={newStrategy.params.strategyType}
              onChange={handleStrategyChange}
              className="dashboard-dropdown"
            >
              {Object.keys(strategyGuides).map(t => (
                <option key={t} value={t}>{strategyGuides[t].title}</option>
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

          {/* --- Add to Combo Checkbox --- */}
          <label>
            <input
              type="checkbox"
              name="addToCombo"
              checked={newStrategy.addToCombo}
              onChange={handleStrategyChange}
            />
            Add to Combo
          </label>

          {/* --- Parameters Section --- */}
          <div className="parameters-form">
            {Object.entries(newStrategy.params)
              .filter(([key]) => key !== "strategyType")
              .map(([key, value]) => (
                <label key={key}>
                  {key}:
                  <input type="number" name={key} value={value} onChange={handleStrategyChange} />
                </label>
              ))}
          </div>

          <button type="submit" className="button-add">Create Strategy</button>
        </form>
      </div>

      {/* --- Single Strategies List --- */}
      <div>
        <h2 className="card-title">Single Strategies</h2>
        {singleStrategies.length > 0 ? (
          <ul className="strategy-list">
            {singleStrategies.map(s => (
              <li key={s._id} className="strategy-card">
                <span>
                  <span className="strategy-name">{s.name}</span>
                  <span className="strategy-type">{s.params.strategyType}</span>
                  {s.addToCombo && <span className="combo-flag">[Add to Combo]</span>}
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="no-strategies">No single strategies yet.</p>}
      </div>
    </div>
  );
};

export default Strategies;
