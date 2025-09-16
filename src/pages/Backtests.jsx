// File: src/pages/Backtests.jsx
import React, { useState } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
// import "./Backtests.css"; // Optional: you can define extra CSS here

export default function Backtests() {
  const {
    options,
    pastBacktests,
    loading,
    error,
    runNewBacktest,
    runNewBatchBacktest,
    getPastBacktests,
  } = useBacktest();

  const [formData, setFormData] = useState({
    strategyId: "",
    symbol: "",
    timeframe: "",
    balance: 1000,
    risk: "1%",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSingleBacktest = async () => {
    if (!formData.strategyId || !formData.symbol || !formData.timeframe) {
      alert("Please fill in all required fields.");
      return;
    }
    try {
      await runNewBacktest(formData);
      alert("Single backtest completed!");
    } catch (err) {
      console.error(err);
      alert(`Backtest failed: ${err.message}`);
    }
  };

  const handleBatchBacktest = async () => {
    if (!formData.strategyId || !formData.symbol || !formData.timeframe) {
      alert("Please fill in all required fields.");
      return;
    }
    try {
      // Wrap single formData in array for batch execution
      await runNewBatchBacktest([formData]);
      alert("Batch backtest completed!");
    } catch (err) {
      console.error(err);
      alert(`Batch backtest failed: ${err.message}`);
    }
  };

  return (
    <div className="backtests-container" style={{ backgroundColor: "#000", color: "#fff", minHeight: "100vh", padding: "2rem" }}>
      <h1>Backtests</h1>

      {/* Unified Form */}
      <div className="form-container" style={{ marginBottom: "2rem" }}>
        <label>
          Strategy:
          <select
            name="strategyId"
            value={formData.strategyId}
            onChange={handleChange}
            style={{ backgroundColor: "#000", color: "#fff", border: "1px solid #fff", marginLeft: "1rem" }}
          >
            <option value="">Select Strategy</option>
            {options.strategies?.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ marginLeft: "1rem" }}>
          Symbol:
          <select
            name="symbol"
            value={formData.symbol}
            onChange={handleChange}
            style={{ backgroundColor: "#000", color: "#fff", border: "1px solid #fff", marginLeft: "0.5rem" }}
          >
            <option value="">Select Symbol</option>
            {options.symbols?.map((sym) => (
              <option key={sym} value={sym}>
                {sym}
              </option>
            ))}
          </select>
        </label>

        <label style={{ marginLeft: "1rem" }}>
          Timeframe:
          <select
            name="timeframe"
            value={formData.timeframe}
            onChange={handleChange}
            style={{ backgroundColor: "#000", color: "#fff", border: "1px solid #fff", marginLeft: "0.5rem" }}
          >
            <option value="">Select Timeframe</option>
            {options.timeframes?.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>
        </label>

        <label style={{ marginLeft: "1rem" }}>
          Balance:
          <input
            type="number"
            name="balance"
            value={formData.balance}
            onChange={handleChange}
            style={{ backgroundColor: "#000", color: "#fff", border: "1px solid #fff", width: "100px", marginLeft: "0.5rem" }}
          />
        </label>

        <label style={{ marginLeft: "1rem" }}>
          Risk:
          <select
            name="risk"
            value={formData.risk}
            onChange={handleChange}
            style={{ backgroundColor: "#000", color: "#fff", border: "1px solid #fff", marginLeft: "0.5rem" }}
          >
            <option value="0.5%">0.5%</option>
            <option value="1%">1%</option>
            <option value="2%">2%</option>
          </select>
        </label>

        {/* Buttons */}
        <div style={{ marginTop: "1rem" }}>
          <button
            onClick={handleSingleBacktest}
            style={{ backgroundColor: "#222", color: "#fff", border: "1px solid #fff", padding: "0.5rem 1rem", marginRight: "1rem", cursor: "pointer" }}
          >
            Run Single Backtest
          </button>
          <button
            onClick={handleBatchBacktest}
            style={{ backgroundColor: "#222", color: "#fff", border: "1px solid #fff", padding: "0.5rem 1rem", cursor: "pointer" }}
          >
            Run Batch Backtest
          </button>
        </div>
      </div>

      {/* Past Backtests */}
      <div className="past-backtests">
        <h2>Past Backtests</h2>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p style={{ color: "red" }}>{error}</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", color: "#fff" }}>
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid #fff", padding: "0.5rem" }}>Date</th>
                <th style={{ borderBottom: "1px solid #fff", padding: "0.5rem" }}>Strategy</th>
                <th style={{ borderBottom: "1px solid #fff", padding: "0.5rem" }}>Symbol</th>
                <th style={{ borderBottom: "1px solid #fff", padding: "0.5rem" }}>Return</th>
                <th style={{ borderBottom: "1px solid #fff", padding: "0.5rem" }}>Trades</th>
              </tr>
            </thead>
            <tbody>
              {pastBacktests.results?.map((bt) => (
                <tr key={bt._id}>
                  <td style={{ borderBottom: "1px solid #fff", padding: "0.5rem" }}>{new Date(bt.createdAt).toLocaleString()}</td>
                  <td style={{ borderBottom: "1px solid #fff", padding: "0.5rem" }}>{bt.strategyName}</td>
                  <td style={{ borderBottom: "1px solid #fff", padding: "0.5rem" }}>{bt.symbol}</td>
                  <td style={{ borderBottom: "1px solid #fff", padding: "0.5rem" }}>{bt.totalReturn || "-"}</td>
                  <td style={{ borderBottom: "1px solid #fff", padding: "0.5rem" }}>{bt.totalTrades || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
