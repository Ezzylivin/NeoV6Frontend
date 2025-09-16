// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";

export default function Backtests() {
  const { options, pastBacktests, loading, error, runNewBacktest } = useBacktest();

  const [strategy, setStrategy] = useState("");
  const [symbol, setSymbol] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [takeProfit, setTakeProfit] = useState(options.takeProfits[0]);
  const [stopLoss, setStopLoss] = useState(options.stopLosses[0]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    setTakeProfit(options.takeProfits[0]);
    setStopLoss(options.stopLosses[0]);
  }, [options]);

  const handleRun = async () => {
    if (!strategy || !symbol || !timeframe) return;
    try {
      await runNewBacktest({ strategyId: strategy, symbol, timeframe, startDate, endDate, takeProfit, stopLoss });
      alert("Backtest completed!");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="backtests-page">
      <h2>Run Backtest</h2>
      {error && <div className="error">{error}</div>}
      <div className="backtest-form">
        {/* strategy, symbol, timeframe, TP/SL dropdowns and dates */}
        <select value={strategy} onChange={e => setStrategy(e.target.value)}>
          <option value="">Select Strategy</option>
          {options.strategies.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={symbol} onChange={e => setSymbol(e.target.value)}>
          <option value="">Select Symbol</option>
          {options.symbols.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={timeframe} onChange={e => setTimeframe(e.target.value)}>
          <option value="">Select Timeframe</option>
          {options.timeframes.map(tf => <option key={tf} value={tf}>{tf}</option>)}
        </select>
        <select value={takeProfit} onChange={e => setTakeProfit(Number(e.target.value))}>
          {options.takeProfits.map(tp => <option key={tp} value={tp}>{tp}%</option>)}
        </select>
        <select value={stopLoss} onChange={e => setStopLoss(Number(e.target.value))}>
          {options.stopLosses.map(sl => <option key={sl} value={sl}>{sl}%</option>)}
        </select>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        <button onClick={handleRun} disabled={loading}>{loading ? "Running..." : "Run Backtest"}</button>
      </div>

      <h3>Past Backtests</h3>
      <table>
        <thead>
          <tr>
            <th>Symbol</th><th>Strategy</th><th>Timeframe</th><th>Start</th><th>End</th><th>TP/SL</th><th>Profit</th>
          </tr>
        </thead>
        <tbody>
          {pastBacktests.results.map(bt => (
            <tr key={bt._id}>
              <td>{bt.symbol}</td>
              <td>{bt.strategyName}</td>
              <td>{bt.timeframe}</td>
              <td>{new Date(bt.startDate).toLocaleDateString()}</td>
              <td>{new Date(bt.endDate).toLocaleDateString()}</td>
              <td>{bt.tp}/{bt.sl}</td>
              <td>{bt.metrics?.totalProfit ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
