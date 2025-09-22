// src/pages/Strategies.jsx
import React, { useState, useContext, useEffect } from "react";
import api from "../api/apiClient.js";
import { StrategyContext } from "../context/StrategyContext.jsx";

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
  const { strategies, setStrategies, loading: contextLoading } = useContext(StrategyContext);
  const [comboStrategies, setComboStrategies] = useState([]);
  const [error, setError] = useState(null);
  const [newStrategy, setNewStrategy] = useState(initialStrategyState);

  // --- Fetch combo strategies separately ---
  useEffect(() => {
    const fetchAllCombo = async () => {
      try {
        const { data } = await api.get("/strategy/combo"); // ✅ Backend endpoint for combo strategies
        setComboStrategies(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to fetch combo strategies:", e.response?.data?.message || e.message);
      }
    };
    fetchAllCombo();
  }, []);

  // --- Handle form input changes ---
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
        "Ichimoku Cloud": { conversionLinePeriod: 9, baseLinePeriod: 26, laggingSpanPeriod: 26, leadingSpanBPeriod: 52 },
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
      await api.post("/strategies", newStrategy);
      // ✅ Refresh all strategies including combos
      const { data } = await api.get("/strategies");
      setStrategies(Array.isArray(data) ? data : []);
      const { data: comboData } = await api.get("/strategy/combo");
      setComboStrategies(Array.isArray(comboData) ? comboData : []);
      setNewStrategy(initialStrategyState);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };

  // --- Delete strategy ---
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this strategy?")) return;

    try {
      await api.delete(`/strategies/${id}`);
      setStrategies((prev) => prev.filter((s) => s?._id !== id));
      setComboStrategies((prev) => prev.filter((s) => s?._id !== id));
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };

  // --- Render parameters & guide ---
  const renderParameters = () => {
    const p = newStrategy.params;
    const guide = strategyGuides[p.strategyType];
    return (
      <div>
        {Object.keys(p)
          .filter((k) => k !== "strategyType")
          .map((key) => (
            <label key={key} style={{ display: "block", marginBottom: "10px" }}>
              {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}:
              <input
                type="number"
                name={key}
                value={p[key]}
                onChange={handleChange}
                required
                style={{
                  backgroundColor: "#2e3d51",
                  color: "#eee",
                  border: "1px solid #3e4e60",
                  width: "100%",
                  padding: "6px",
                  marginTop: "4px",
                }}
              />
            </label>
          ))}
        {guide && (
          <div
            style={{
              marginTop: "20px",
              paddingTop: "15px",
              borderTop: "1px solid #3e4e60",
              fontSize: "13px",
              color: "#cbd5e1",
            }}
          >
            <h4 style={{ fontWeight: 600, color: "#94a3b8" }}>{guide.title} Guide</h4>
            <p>
              <strong>What it is:</strong> {guide.whatItIs}
            </p>
            <p>
              <strong>How it works:</strong> {guide.howItWorks}
            </p>
            <p>
              <strong>Combine With:</strong> {guide.combineWith}
            </p>
          </div>
        )}
      </div>
    );
  };

  if (contextLoading) return <div style={{ color: "#eee" }}>Loading strategies...</div>;
  if (error) return <div style={{ color: "#dc3545" }}>Error: {error}</div>;

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "1000px",
        margin: "auto",
        backgroundColor: "#121e2c",
        color: "#eee",
        fontFamily: "sans-serif",
      }}
    >
      <h1>My Trading Strategies</h1>
      <p style={{ color: "#aaa", fontSize: "16px" }}>
        Define trading rules to find market opportunities. Pick a strategy type and adjust parameters.
      </p>

      {/* Create Strategy Form */}
      <div
        style={{
          padding: "20px",
          marginBottom: "40px",
          borderRadius: "8px",
          backgroundColor: "#1e2b3c",
          border: "1px solid #3e4e60",
        }}
      >
        <h2>Create a New Strategy</h2>
        <form
          onSubmit={handleCreate}
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}
        >
          <div>
            <h3>Configuration</h3>
            <label>
              Strategy Type:
              <select
                name="strategyType"
                value={newStrategy.params.strategyType}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "4px",
                  marginBottom: "10px",
                  backgroundColor: "#2e3d51",
                  color: "#eee",
                  border: "1px solid #3e4e60",
                }}
              >
                {Object.keys(strategyGuides).map((t) => (
                  <option key={t} value={t}>
                    {strategyGuides[t].title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Strategy Name:
              <input
                type="text"
                name="name"
                value={newStrategy.name}
                onChange={handleChange}
                required
                placeholder="e.g., My MACD Trend Follower"
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "4px",
                  marginBottom: "10px",
                  backgroundColor: "#2e3d51",
                  color: "#eee",
                  border: "1px solid #3e4e60",
                }}
              />
            </label>
            <label>
              Description:
              <textarea
                name="description"
                value={newStrategy.description}
                onChange={handleChange}
                placeholder="Short note"
                style={{
                  width: "100%",
                  minHeight: "80px",
                  padding: "8px",
                  marginTop: "4px",
                  backgroundColor: "#2e3d51",
                  color: "#eee",
                  border: "1px solid #3e4e60",
                }}
              />
            </label>
          </div>

          <div>
            <h3>Parameters & Guide</h3>
            {renderParameters()}
          </div>

          <div style={{ gridColumn: "span 2", textAlign: "center", marginTop: "20px" }}>
            <button
              type="submit"
              style={{
                padding: "12px 24px",
                fontSize: "16px",
                fontWeight: "bold",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Create Strategy
            </button>
          </div>
        </form>
      </div>

      {/* Saved Strategies List */}
      <div
        style={{
          padding: "20px",
          borderRadius: "8px",
          backgroundColor: "#1e2b3c",
          border: "1px solid #3e4e60",
        }}
      >
        <h2>My Saved Strategies</h2>
        {strategies?.length + comboStrategies?.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {strategies.map(
              (s) =>
                s && (
                  <li
                    key={s._id || Math.random()}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "15px",
                      borderBottom: "1px solid #333",
                    }}
                  >
                    <span>
                      <strong>{s.name || "Unnamed Strategy"}</strong>
                      <br />
                      <span style={{ fontSize: "12px", color: "#888" }}>
                        Type: {s.params?.strategyType || "Unknown"}
                      </span>
                    </span>
                    <button
                      onClick={() => handleDelete(s._id)}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </li>
                )
            )}
            {comboStrategies.map(
              (s) =>
                s && (
                  <li
                    key={s._id || Math.random()}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "15px",
                      borderBottom: "1px solid #333",
                      backgroundColor: "#24344f",
                    }}
                  >
                    <span>
                      <strong>{s.name || "Unnamed Combo Strategy"} (Combo)</strong>
                      <br />
                      <span style={{ fontSize: "12px", color: "#888" }}>
                        Type: {s.params?.strategyType || "Unknown"}
                      </span>
                    </span>
                    <button
                      onClick={() => handleDelete(s._id)}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </li>
                )
            )}
          </ul>
        ) : (
          <p style={{ color: "#aaa" }}>No strategies yet. Use the form above to create one.</p>
        )}
      </div>
    </div>
  );
};

export default Strategies;
