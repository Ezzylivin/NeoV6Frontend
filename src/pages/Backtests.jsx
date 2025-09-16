// File: src/pages/Backtests.jsx
import React, { useState } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import "./Backtests.css";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export default function Backtests() {
  const {
    options,
    pastBacktests,
    loading,
    error,
    runNewBacktest,
    runNewBatchBacktest,
  } = useBacktest();

  // --- Form state ---
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [selectedTakeProfit, setSelectedTakeProfit] = useState("");
  const [selectedStopLoss, setSelectedStopLoss] = useState("");

  const handleRunBacktest = async () => {
    if (!selectedStrategy || !selectedSymbol) return;
    try {
      await runNewBacktest({
        strategy: selectedStrategy,
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        startDate: selectedStartDate,
        endDate: selectedEndDate,
        takeProfit: selectedTakeProfit,
        stopLoss: selectedStopLoss,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunBatchBacktest = async () => {
    const batchConfigs = options.strategies.map((strat) => ({
      strategy: strat,
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      startDate: selectedStartDate,
      endDate: selectedEndDate,
      takeProfit: selectedTakeProfit,
      stopLoss: selectedStopLoss,
    }));
    try {
      await runNewBatchBacktest(batchConfigs);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="dashboard-container">
      <h1 className="header">Backtests</h1>

      {error && <div className="error-banner">{error}</div>}

      {/* --- Backtest Form --- */}
      <div className="form-card">
        <h2 className="sub-header">New Backtest</h2>
        <div className="form-grid">
          <label>
            Strategy
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
            >
              <option value="">Select Strategy</option>
              {options.strategies?.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label>
            Symbol
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
            >
              <option value="">Select Symbol</option>
              {options.symbols?.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label>
            Timeframe
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
            >
              <option value="">Select Timeframe</option>
              {options.timeframes?.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label>
            Start Date
            <input
              type="date"
              value={selectedStartDate}
              onChange={(e) => setSelectedStartDate(e.target.value)}
            />
          </label>

          <label>
            End Date
            <input
              type="date"
              value={selectedEndDate}
              onChange={(e) => setSelectedEndDate(e.target.value)}
            />
          </label>

          <label>
            Take Profit
            <select
              value={selectedTakeProfit}
              onChange={(e) => setSelectedTakeProfit(e.target.value)}
            >
              <option value="">Select TP</option>
              {options.takeProfits?.map((tp) => (
                <option key={tp} value={tp}>{tp}%</option>
              ))}
            </select>
          </label>

          <label>
            Stop Loss
            <select
              value={selectedStopLoss}
              onChange={(e) => setSelectedStopLoss(e.target.value)}
            >
              <option value="">Select SL</option>
              {options.stopLosses?.map((sl) => (
                <option key={sl} value={sl}>{sl}%</option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-actions">
          <button onClick={handleRunBacktest}>Run Single Backtest</button>
          <button onClick={handleRunBatchBacktest}>Run Batch Backtest</button>
        </div>
      </div>

      {/* --- Past Backtests --- */}
      <h2 className="sub-header">Past Backtests</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="backtests-grid">
          {pastBacktests.results.map((b) => (
            <div key={b._id} className="backtest-card">
              <div className="card-title">{b.symbol} - {b.strategy}</div>
              <div className="card-metrics">
                <div>Profit: {b.metrics?.profit?.toFixed(2)}</div>
                <div>Max Drawdown: {b.metrics?.maxDrawdown?.toFixed(2)}%</div>
                <div>Trades: {b.metrics?.trades}</div>
                <div>Win Rate: {b.metrics?.winRate?.toFixed(2)}%</div>
                <div>Sharpe Ratio: {b.metrics?.sharpeRatio?.toFixed(2)}</div>
              </div>

              {/* --- Equity Chart --- */}
              {b.equityCurve?.length > 0 && (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={b.equityCurve}>
                      <CartesianGrid stroke="#ccc" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="value" stroke="#3182CE" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
