// File: src/pages/Backtests.jsx
import React, { useState } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import "./Backtests.css";

export default function Backtests() {
  const { options, pastBacktests, runNewBacktest, runNewBatchBacktest, loading, error } = useBacktest();
  const [formData, setFormData] = useState({
    strategyId: "",
    symbol: "",
    timeframe: "1h",
    startDate: "",
    endDate: "",
    takeProfit: options.takeProfits?.[0] || 1,
    stopLoss: options.stopLosses?.[0] || 1
  });

  const [batchConfigs, setBatchConfigs] = useState([]);
  const [showCharts, setShowCharts] = useState(null);

  const handleChange = e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSingleBacktest = async e => {
    e.preventDefault();
    try {
      const result = await runNewBacktest(formData);
      setShowCharts(result);
    } catch (err) { console.error(err); }
  };

  const handleBatchBacktest = async e => {
    e.preventDefault();
    try {
      const result = await runNewBatchBacktest(batchConfigs);
      setShowCharts(result[0]); // show first result chart
    } catch (err) { console.error(err); }
  };

  return (
    <div className="backtest-page">
      <h2>Run Backtest</h2>
      {error && <p className="error">{error}</p>}
      <form className="backtest-form">
        <label>
          Strategy
          <select name="strategyId" value={formData.strategyId} onChange={handleChange}>
            <option value="">Select</option>
            {options.strategies.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </label>
        <label>
          Symbol
          <select name="symbol" value={formData.symbol} onChange={handleChange}>
            <option value="">Select</option>
            {options.symbols.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>
          Timeframe
          <select name="timeframe" value={formData.timeframe} onChange={handleChange}>
            {options.timeframes.map(tf => <option key={tf} value={tf}>{tf}</option>)}
          </select>
        </label>
        <label>
          Start Date
          <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
        </label>
        <label>
          End Date
          <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} />
        </label>
        <label>
          Take Profit (%)
          <select name="takeProfit" value={formData.takeProfit} onChange={handleChange}>
            {options.takeProfits?.map(tp => <option key={tp} value={tp}>{tp}</option>)}
          </select>
        </label>
        <label>
          Stop Loss (%)
          <select name="stopLoss" value={formData.stopLoss} onChange={handleChange}>
            {options.stopLosses?.map(sl => <option key={sl} value={sl}>{sl}</option>)}
          </select>
        </label>

        <div className="button-group">
          <button type="submit" onClick={handleSingleBacktest} disabled={loading}>Run Single Backtest</button>
          <button type="submit" onClick={handleBatchBacktest} disabled={loading}>Run Batch Backtest</button>
        </div>
      </form>

      {showCharts && (
        <div className="charts">
          <h3>Equity Curve</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={showCharts.equityCurve}>
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <CartesianGrid stroke="#eee" />
              <Line type="monotone" dataKey="equity" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>

          <h3>Metrics</h3>
          <ul>
            <li>Total Return: {showCharts.metrics.totalReturn}%</li>
            <li>Win Rate: {showCharts.metrics.winRate}%</li>
            <li>Sharpe Ratio: {showCharts.metrics.sharpeRatio}</li>
            <li>Total Trades: {showCharts.metrics.totalTrades}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
