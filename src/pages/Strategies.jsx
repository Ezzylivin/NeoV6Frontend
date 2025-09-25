// File: src/pages/Strategies.jsx
import React, { useState, useEffect, useContext } from "react";
import api from "../api/apiClient.js";
import { StrategyContext } from "../context/StrategyContext.jsx"; // <-- new shared context
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
  params: { strategyType: "Moving Average Crossover", shortPeriod: 10, longPeriod: 50 }
};

const Strategies = () => {
  // --- State ---
  const [newStrategy, setNewStrategy] = useState(initialStrategyState);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Shared context for strategies ---
  const { singleStrategies, setSingleStrategies, comboStrategies, setComboStrategies } = useContext(StrategyContext);

  // --- Fetch strategies from backend ---
  const fetchStrategies = async () => {
    try {
      setLoading(true);
      const [singleRes, comboRes] = await Promise.all([api.get("/strategy"), api.get("/combos")]);

      setSingleStrategies(singleRes.data?.strategies || singleRes.data || []);
      setComboStrategies(comboRes.data?.combos || comboRes.data || []);
    } catch (err) {
      console.error("❌ Error fetching strategies:", err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  // --- Handle form changes ---
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
        "Ichimoku Cloud": { conversionLinePeriod: 9, baseLinePeriod: 26, laggingSpanPeriod: 26, leadingSpanBPeriod: 52 }
      };
      setNewStrategy((prev) => ({ ...prev, params: { strategyType: value, ...defaultParams[value] } }));
    } else if (newStrategy.params.hasOwnProperty(name)) {
      setNewStrategy((prev) => ({ ...prev, params: { ...prev.params, [name]: value } }));
    } else {
      setNewStrategy((prev) => ({ ...prev, [name]: value }));
    }
  };

  // --- Create new strategy ---
  const handleCreateStrategy = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/strategy", newStrategy);
      const saved = res.data;

      // ✅ Automatically add to Strategies context (so page updates immediately)
      setSingleStrategies((prev) => [...prev, saved]);

      setNewStrategy(initialStrategyState);
      setError(null);
      setSuccess("Strategy created successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("❌ Error creating strategy:", err);
      setSuccess(null);
      setError(err.response?.data?.message || err.message);
    }
  };

  // --- Format label ---
  const formatLabel = (key) => key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());

  if (loading) return <p className="loading-banner">⏳ Loading strategies...</p>;

  return (
    <div className="strategies-container">
      <h1 className="header">My Trading Strategies</h1>

      {/* Alerts */}
      {error && <p className="error-banner">⚠️ {error}</p>}
      {success && <p className="success-banner">✅ {success}</p>}

      {/* Create Strategy Form */}
      <div className="strategy-form">
        <h2 className="card-title">Create a New Strategy</h2>
        <form onSubmit={handleCreateStrategy}>
          <label>
            Strategy Type:
            <select name="strategyType" value={newStrategy.params.strategyType} onChange={handleStrategyChange} className="dashboard-dropdown">
              {Object.keys(strategyGuides)
                .sort()
                .map((t) => (
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

          {/* Parameters */}
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

          <button type="submit" className="button-add">
            ➕ Create Strategy
          </button>
        </form>

        {/* Strategy Guide */}
        {newStrategy.params.strategyType && (
          <div className="strategy-guide">
            <h3 className="card-title">Parameters & Guide</h3>
            <div className="strategy-description">
              <p>
                <strong>What it is:</strong> {strategyGuides[newStrategy.params.strategyType]?.whatItIs}
              </p>
              <p>
                <strong>How it works:</strong> {strategyGuides[newStrategy.params.strategyType]?.howItWorks}
              </p>
              <p>
                <strong>Combine with:</strong> {strategyGuides[newStrategy.params.strategyType]?.combineWith}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Single Strategies */}
      <div>
        <h2 className="card-title">Saved Single Strategies</h2>
        {singleStrategies.length > 0 ? (
          <ul className="strategy-list">
            {singleStrategies.map((s) => (
              <li key={s._id} className="strategy-card">
                <span className="strategy-name">{s.name}</span>
                <span className="strategy-type">{s.params.strategyType}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-strategies">No strategies yet. Create your first one above!</p>
        )}
      </div>

      {/* Combo Strategies */}
      <div>
        <h2 className="card-title">Saved Combo Strategies</h2>
        {comboStrategies.length > 0 ? (
          <ul className="strategy-list">
            {comboStrategies.map((c) => {
              let strategyNames = "No strategies";
              if (Array.isArray(c.strategies)) {
                strategyNames = c.strategies.map((s) => s.params?.strategyType || s.name || "Unknown").join(" + ");
              } else if (c.comboConfig?.strategyCodes) {
                strategyNames = c.comboConfig.strategyCodes.join(" + ");
              } else if (c.strategyIds) {
                strategyNames = c.strategyIds.join(" + ");
              }
              return (
                <li key={c._id} className="strategy-card">
                  <span className="strategy-name">{c.name}</span>
                  <span className="strategy-type">{strategyNames}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="no-strategies">No combo strategies yet.</p>
        )}
      </div>
    </div>
  );
};

export default Strategies;
