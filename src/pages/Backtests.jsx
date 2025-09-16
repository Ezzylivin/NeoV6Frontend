// File: src/pages/Backtests.jsx
// UPGRADED: Correctly sets result state from the nested API response.
// FIXED: This is the full, complete file, correcting the previous truncation error.

import React, { useState, useEffect, useCallback } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useAuth } from "../context/AuthContext.jsx";

// Define static options here
const BALANCE_OPTIONS = [100, 300, 500, 1000, 10000];
const RISK_OPTIONS = ["Low", "Medium", "High"];

// NEW: A dedicated component to display backtest results
const ResultDisplay = ({ result }) => {
  if (!result || !result.metrics) {
    return null;
  }

  const { metrics, trades, equityCurve } = result;

  return (
    <div className="mt-6 p-4 border rounded-lg bg-white shadow-md">
      <h2 className="text-xl font-semibold mb-4">Backtest Results ✨</h2>
      
      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-600">Total Return</h3>
          <p className="text-2xl font-bold text-blue-600">
            {metrics.totalReturn ? `${metrics.totalReturn.toFixed(2)}%` : 'N/A'}
          </p>
        </div>
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-600">Win Rate</h3>
          <p className="text-2xl font-bold text-green-600">
            {metrics.winRate ? `${(metrics.winRate * 100).toFixed(2)}%` : 'N/A'}
          </p>
        </div>
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-600">Total Trades</h3>
          <p className="text-2xl font-bold text-gray-800">
            {metrics.totalTrades || 'N/A'}
          </p>
        </div>
      </div>
      
      {/* Equity Curve (Optional) */}
      {equityCurve && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Equity Curve</h3>
          <p className="text-sm text-gray-500">
            [Chart placeholder] - You can integrate a charting library here (e.g., react-chartjs-2, nivo).
          </p>
        </div>
      )}
      
      {/* Trade History (Optional) */}
      {trades && trades.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-2">Trade History</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exit Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trades.map((trade, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(trade.entryTime).toLocaleString()}</td>
          _id} value={s._id}>
              {s.name}
            </option>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(trade.exitTime).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {trade.profit.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};


export default function Backtests() {
  const { user } = useAuth();
  const { options, loading, error, runNewBacktest } = useBacktest();

  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");
  const [selectedBalance, setSelectedBalance] = useState(BALANCE_OPTIONS[3]);
  const [selectedRisk, setSelectedRisk] = useState(RISK_OPTIONS[1]);
  const [result, setResult] = useState(null);
  const [isBacktestRunning, setIsBacktestRunning] = useState(false);

  const allStrategies = [
    { _id: 'python_sma_crossover', name: 'SMA Crossover (Python Engine)' },
    ...(options.strategies || [])
  ];

  useEffect(() => {
    if (allStrategies.length && !selectedStrategy) {
  s._id} value={s._id}>
              {s.name}
            </option>
    }
    if (options?.symbols?.length && !selectedSymbol) {
      setSelectedSymbol(options.symbols[0]);
    }
    if (options?.timeframes?.length && !selectedTimeframe) {
      setSelectedTimeframe(options.timeframes[0]);
    }
  }, [options, allStrategies, selectedStrategy, selectedSymbol, selectedTimeframe]);

  const handleRun = useCallback(async () => {
    setIsBacktestRunning(true);
    setResult(null);
    try {
      const params = {
        strategyId: selectedStrategy,
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        initialBalance: Number(selectedBalance),
        risk: selectedRisk,
      };
      // The hook returns { success: true, data: {...} }
      const res = await runNewBacktest(params);
      
      // --- THE FIX ---
      // We must set the nested `data` object to state
      // so that `result.metrics` is available in ResultDisplay
      setResult(res.data); 

    } catch (err) {
      console.error("Backtest failed:", err);
      // Error is already set by the hook
    } finally {
      setIsBacktestRunning(false);
    }
  }, [selectedStrategy, selectedSymbol, selectedTimeframe, selectedBalance, selectedRisk, runNewBacktest]);

  return (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-6">Backtesting</h1>

    {error && <div className="text-red-500 mb-4 font-medium">Error: {error}</div>}
    
    {/* Loading indicator */}
    {(loading || isBacktestRunning) && (
      <div className="text-gray-500 mb-4 font-medium">
        {loading ? "Loading options..." : "Running backtest..."}
      </div>
    )}
    
    {/* Selection Form */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <label className="flex flex-col">
        <span className="font-medium">Strategy</span>
        <select
          value={selectedStrategy}
          onChange={(e) => setSelectedStrategy(e.target.value)}
          className="border rounded p-2"
          disabled={isBacktestRunning}
        >
          {allStrategies.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col">
        <span className="font-medium">Symbol</span>
        <select
          value={selectedSymbol}
  All
          className="border rounded p-2"
          disabled={isBacktestRunning}
        >
          {options.symbols?.map((sym) => (
            <option key={sym} value={sym}>
              {sym}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col">
        <span className="font-medium">Timeframe</span>
        <select
          value={selectedTimeframe}
          onChange={(e) => setSelectedTimeframe(e.target.value)}
          className="border rounded p-2"
          disabled={isBacktestRunning}
        >
          {options.timeframes?.map((tf) => (
s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col">
        <span className="font-medium">Balance</span>
        <select
          value={selectedBalance}
          onChange={(e) => setSelectedBalance(e.target.value)}
          className="border rounded p-2"
          disabled={isBacktestRunning}
        >
          {BALANCE_OPTIONS.map((b) => (
            <option key={b} value={b}>
              ${b.toLocaleString()}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col">
        <span className="font-medium">Risk</span>
        <select
          value={selectedRisk}
          onChange={(e) => setSelectedRisk(e.target.value)}
          className="border rounded p-2"
          disabled={isBacktestRunning}
        >
          {RISK_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
    </div>
    
    {/* Run Button */}
    <button
      onClick={handleRun}
      disabled={loading || isBacktestRunning || !selectedStrategy || !selectedSymbol || !selectedTimeframe}
      className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50"
    >
      {isBacktestRunning ? "Running..." : "Run Backtest"}
    </button>
    
    {/* Results Display */}
    <ResultDisplay result={result} />
  </div>
);
}
