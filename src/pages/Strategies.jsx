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
  params: { strategyType: "Moving Average Crossover", shortPeriod: 10, longPeriod: 50 }
};

// --- Default new combo ---
const initialComboState = {
  name: "",
  description: "",
  symbol: "BTC-USD",
  timeframe: "1m",
  isCombo: true,
  comboConfig: {
    strategyCodes: [], // human-friendly selection
    params: [], // array [{ code, params }]
    combinationRule: "OR"
  }
};

const Strategies = () => {
  const [singleStrategies, setSingleStrategies] = useState([]);
  const [comboStrategies, setComboStrategies] = useState([]);
  const [newStrategy, setNewStrategy] = useState(initialStrategyState);
  const [newCombo, setNewCombo] = useState(initialComboState);
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

  // --- Initialize ---
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await fetchSingleStrategies();
      await fetchComboStrategies();
      setLoading(false);
    };
    fetchAll();

    const handleStrategySaved = (event) => {
      const saved = event.detail;
      if (saved) setSingleStrategies(prev => [...prev, saved]);
    };
    const handleComboSaved = (event) => {
      const saved = event.detail;
      if (saved) setComboStrategies(prev => [...prev, saved]);
    };
    window.addEventListener("strategySaved", handleStrategySaved);
    window.addEventListener("comboSaved", handleComboSaved);

    return () => {
      window.removeEventListener("strategySaved", handleStrategySaved);
      window.removeEventListener("comboSaved", handleComboSaved);
    };
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
        "Ichimoku Cloud": { conversionLinePeriod: 9, baseLinePeriod: 26, laggingSpanPeriod: 26, leadingSpanBPeriod: 52 }
      };
      setNewStrategy(prev => ({ ...prev, params: { strategyType: value, ...defaultParams[value] } }));
    } else if (newStrategy.params.hasOwnProperty(name)) {
      setNewStrategy(prev => ({ ...prev, params: { ...prev.params, [name]: value } }));
    } else {
      setNewStrategy(prev => ({ ...prev, [name]: value }));
    }
  };

  // --- Handle combo form changes ---
  const handleComboChange = (e) => {
    const { name, value } = e.target;
    setNewCombo(prev => ({ ...prev, [name]: value }));
  };

  const handleComboStrategySelection = (code) => {
    setNewCombo(prev => {
      const exists = prev.comboConfig.strategyCodes.includes(code);
      let strategyCodes, params;
      if (exists) {
        strategyCodes = prev.comboConfig.strategyCodes.filter(c => c !== code);
        params = prev.comboConfig.params.filter(p => p.code !== code);
      } else {
        strategyCodes = [...prev.comboConfig.strategyCodes, code];
        const defaultParams = { strategyType: code };
        params = [...prev.comboConfig.params, { code, params: defaultParams }];
      }
      return {
        ...prev,
        comboConfig: { ...prev.comboConfig, strategyCodes, params }
      };
    });
  };

  const handleComboParamChange = (code, key, value) => {
    setNewCombo(prev => {
      const updatedParams = prev.comboConfig.params.map(p => {
        if (p.code === code) {
          return { ...p, params: { ...p.params, [key]: value } };
        }
        return p;
      });
      return { ...prev, comboConfig: { ...prev.comboConfig, params: updatedParams } };
    });
  };

  // --- Create single strategy ---
  const handleCreateStrategy = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/strategy", newStrategy);
      const saved = res.data;
      setSingleStrategies(prev => [...prev, saved]);
      window.dispatchEvent(new CustomEvent("strategySaved", { detail: saved }));
      setNewStrategy(initialStrategyState);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  // --- Create combo strategy (matches backend schema) ---
  const handleCreateCombo = async (e) => {
    e.preventDefault();
    try {
      // Map codes to backend strategy IDs
      const strategyIdMap = {};
      singleStrategies.forEach(s => {
        strategyIdMap[s.params.strategyType] = s._id;
      });

      const strategies = newCombo.comboConfig.strategyCodes
        .map(code => strategyIdMap[code])
        .filter(Boolean);

      const params = {};
      newCombo.comboConfig.params.forEach(p => {
        const strategyId = strategyIdMap[p.code];
        if (strategyId) params[strategyId] = p.params;
      });

      const payload = {
        name: newCombo.name,
        description: newCombo.description,
        symbol: newCombo.symbol,
        timeframe: newCombo.timeframe,
        isCombo: true,
        strategies,
        params
      };

      const res = await api.post("/combos", payload);
      const saved = res.data;
      setComboStrategies(prev => [...prev, saved]);
      window.dispatchEvent(new CustomEvent("comboSaved", { detail: saved }));
      setNewCombo(initialComboState);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  // --- Delete strategy ---
  const handleDelete = async (id, type) => {
    if (!window.confirm("Are you sure you want to delete this strategy?")) return;
    try {
      await api.delete(`/${type}/${id}`);
      if (type === "strategy") setSingleStrategies(prev => prev.filter(s => s._id !== id));
      if (type === "combos") setComboStrategies(prev => prev.filter(c => c._id !== id));
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
          <button type="submit" className="button-add">Create Strategy</button>
        </form>

        <div className="strategy-guide">
          <h3 className="card-title">Parameters & Guide</h3>
          {newStrategy.params.strategyType && (
            <div className="guide-content">
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
              <div className="strategy-description">
                <p><strong>What it is:</strong> {strategyGuides[newStrategy.params.strategyType]?.whatItIs}</p>
                <p><strong>How it works:</strong> {strategyGuides[newStrategy.params.strategyType]?.howItWorks}</p>
                <p><strong>Combine with:</strong> {strategyGuides[newStrategy.params.strategyType]?.combineWith}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Combo Strategy Form --- */}
      <div className="strategy-form">
        <h2 className="card-title">Create a Combo Strategy</h2>
        <form onSubmit={handleCreateCombo}>
          <label>
            Combo Name:
            <input type="text" name="name" value={newCombo.name} onChange={handleComboChange} required />
          </label>
          <label>
            Description:
            <textarea name="description" value={newCombo.description} onChange={handleComboChange} />
          </label>
          <label>
            Symbol:
            <input type="text" name="symbol" value={newCombo.symbol} onChange={handleComboChange} required />
          </label>
          <label>
            Timeframe:
            <input type="text" name="timeframe" value={newCombo.timeframe} onChange={handleComboChange} required />
          </label>

          {/* --- Strategy selection checkboxes --- */}
          <div className="combo-strategy-selection">
            {Object.keys(strategyGuides).map(code => (
              <label key={code}>
                <input
                  type="checkbox"
                  checked={newCombo.comboConfig.strategyCodes.includes(code)}
                  onChange={() => handleComboStrategySelection(code)}
                />
                {strategyGuides[code].title}
              </label>
            ))}
          </div>

          {/* --- Editable params for selected strategies --- */}
          <div className="combo-parameters">
            {newCombo.comboConfig.params.map(p => (
              <div key={p.code} className="strategy-param-card">
                <h4>{p.code}</h4>
                {Object.entries(p.params).map(([key, value]) => (
                  <label key={key}>
                    {key}:
                    <input
                      type="number"
                      value={value}
                      onChange={e => handleComboParamChange(p.code, key, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            ))}
          </div>

          <label>
            Combination Rule:
            <select
              name="combinationRule"
              value={newCombo.comboConfig.combinationRule}
              onChange={e =>
                setNewCombo(prev => ({
                  ...prev,
                  comboConfig: { ...prev.comboConfig, combinationRule: e.target.value }
                }))
              }
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
          </label>

          <button type="submit" className="button-add">Create Combo Strategy</button>
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
                </span>
                <button className="button-remove" onClick={() => handleDelete(s._id, "strategy")}>Delete</button>
              </li>
            ))}
          </ul>
        ) : <p className="no-strategies">No single strategies yet.</p>}
      </div>

      {/* --- Combo Strategies List --- */}
      <div>
        <h2 className="card-title">Combo Strategies</h2>
        {comboStrategies.length > 0 ? (
          <ul className="strategy-list">
            {comboStrategies.map(c => (
              <li key={c._id} className="strategy-card combo">
                <div>
                  <span className="strategy-name">{c.name}</span>
                  <span className="strategy-type">Combo ({c.strategies.length} strategies)</span>
                </div>
                <div className="combo-params">
                  {c.params && Object.entries(c.params).map(([strategyId, params]) => {
                    const s = singleStrategies.find(s => s._id === strategyId);
                    const code = s?.params?.strategyType || "Unknown";
                    return (
                      <div key={strategyId} className="strategy-param-card">
                        <h4>{code}</h4>
                        {Object.entries(params).map(([k, v]) => (
                          <p key={k}><strong>{k}:</strong> {v}</p>
                        ))}
                        <p><strong>Guide:</strong> {strategyGuides[code]?.whatItIs}</p>
                      </div>
                    );
                  })}
                </div>
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
