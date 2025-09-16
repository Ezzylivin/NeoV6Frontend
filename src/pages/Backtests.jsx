// File: src/pages/Backtests.jsx
import React, { useState } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import "./Backtests.css";

export default function Backtests() {
  const { options, runNewBacktest, runNewBatchBacktest, pastBacktests, loading, error } = useBacktest();
  const [formData, setFormData] = useState({ strategyId:"", symbol:"BTCUSDT", timeframe:"1h", startDate:"", endDate:"", tp:"", sl:"" });
  const [batchConfigs, setBatchConfigs] = useState([]);
  const [results, setResults] = useState([]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const runSingle = async () => {
    const res = await runNewBacktest(formData);
    setResults([res]);
  };

  const runBatch = async () => {
    const res = await runNewBatchBacktest(batchConfigs);
    setResults(res);
  };

  return (
    <div className="backtest-container">
      <h2>Backtests</h2>
      {error && <div className="error-banner">{error}</div>}

      <div className="form-section">
        <label>Strategy</label>
        <select name="strategyId" value={formData.strategyId} onChange={handleChange}>
          <option value="">Select strategy</option>
          {options.strategies?.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>

        <label>Symbol</label>
        <select name="symbol" value={formData.symbol} onChange={handleChange}>
          {options.symbols?.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <label>Timeframe</label>
        <select name="timeframe" value={formData.timeframe} onChange={handleChange}>
          {options.timeframes?.map(tf => <option key={tf} value={tf}>{tf}</option>)}
        </select>

        <label>Start Date</label>
        <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} />

        <label>End Date</label>
        <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} />

        <label>Take Profit</label>
        <select name="tp" value={formData.tp} onChange={handleChange}>
          <option value="">None</option>
          <option value="1%">1%</option>
          <option value="2%">2%</option>
          <option value="3%">3%</option>
        </select>

        <label>Stop Loss</label>
        <select name="sl" value={formData.sl} onChange={handleChange}>
          <option value="">None</option>
          <option value="1%">1%</option>
          <option value="2%">2%</option>
          <option value="3%">3%</option>
        </select>

        <button onClick={runSingle} disabled={loading}>Run Single Backtest</button>
        <button onClick={runBatch} disabled={loading}>Run Batch Backtests</button>
      </div>

      <div className="metrics-section">
        {results.map((b, idx) => (
          <div className="metric-card" key={idx}>
            <h3>{b.strategyName} | {b.symbol}</h3>
            <p>Total Profit: {b.metrics.totalProfit}</p>
            <p>Trades: {b.metrics.totalTrades}</p>
            <p>Win Rate: {(b.metrics.winRate*100).toFixed(2)}%</p>
            <p>Avg Trade: {b.metrics.avgTrade.toFixed(2)}</p>
            <p>Max Drawdown: {b.metrics.maxDrawdown.toFixed(2)}</p>
            <p>Sharpe Ratio: {b.metrics.sharpeRatio.toFixed(2)}</p>
            <p>Profit Factor: {b.metrics.profitFactor.toFixed(2)}</p>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={b.metrics.equityCurve}>
                  <XAxis dataKey="time" stroke="#A0AEC0"/>
                  <YAxis stroke="#A0AEC0"/>
                  <Tooltip />
                  <CartesianGrid stroke="#4A5568"/>
                  <Line type="monotone" dataKey="equity" stroke="#3182CE" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
