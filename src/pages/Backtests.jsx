// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
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
    loading,
    error,
    currentBacktest,
    runBacktest,
    runBatchBacktests,
    defaultRealism,
  } = useBacktest();

  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [selectedBalance, setSelectedBalance] = useState(1000);
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedRisk, setSelectedRisk] = useState("Medium");
  const [selectedTP, setSelectedTP] = useState(null);
  const [selectedSL, setSelectedSL] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState("Both");

  const [realism, setRealism] = useState(defaultRealism);

  const [batchResults, setBatchResults] = useState([]);
  const [collapsedLogs, setCollapsedLogs] = useState({});

  // Set default selections when options load
  useEffect(() => {
    if (options.symbols?.length && !selectedSymbol) setSelectedSymbol(options.symbols[0]);
    if (options.strategies?.length && !selectedStrategy) setSelectedStrategy(options.strategies[0]?.name || "");
  }, [options]);

  const handleRunBacktest = async () => {
    const resp = await runBacktest({
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      initial_balance: selectedBalance,
      strategy: selectedStrategy,
      risk: selectedRisk,
      take_profit: selectedTP,
      stop_loss: selectedSL,
      position: selectedPosition,
      realism,
    });
    // Optionally add to a local results array if needed
  };

  const handleRunBatch = async () => {
    const resp = await runBatchBacktests({
      symbols: options.symbols || [],
      timeframes: options.timeframes || [],
      balances: options.balances || [],
      strategies: (options.strategies || []).map((s) => s.name),
      risks: options.risks || [],
      take_profits: options.takeProfits || [],
      stop_losses: options.stopLosses || [],
      positions: options.positions || [],
      realism,
    });
    setBatchResults(resp.results || []);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Backtesting</h2>

      {/* Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg shadow">
        {/* Symbol */}
        <label className="text-sm">
          Symbol
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="border p-2 rounded w-full bg-white"
          >
            {(options.symbols || []).map((sym) => (
              <option key={sym} value={sym}>{sym}</option>
            ))}
          </select>
        </label>

        {/* Strategy */}
        <label className="text-sm">
          Strategy
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value)}
            className="border p-2 rounded w-full bg-white"
          >
            {(options.strategies || []).map((strat) => (
              <option key={strat.name} value={strat.name}>{strat.name}</option>
            ))}
          </select>
        </label>

        {/* Timeframe */}
        <label className="text-sm">
          Timeframe
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border p-2 rounded w-full bg-white"
          >
            {(options.timeframes || []).map((tf) => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </label>

        {/* Balance */}
        <label className="text-sm">
          Balance
          <select
            value={selectedBalance}
            onChange={(e) => setSelectedBalance(Number(e.target.value))}
            className="border p-2 rounded w-full bg-white"
          >
            {(options.balances || []).map((bal) => (
              <option key={bal} value={bal}>${bal}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Realism factors */}
      <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-4 rounded-lg shadow">
        {Object.keys(defaultRealism).map((key) => (
          key !== "slippage_bps" ? (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={realism[key]}
                onChange={() => setRealism((prev) => ({ ...prev, [key]: !prev[key] }))}
              />
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
          ) : (
            <label key={key} className="text-sm flex items-center gap-2">
              Slippage Bps:
              <input
                type="number"
                min="0"
                max="100"
                value={realism.slippage_bps}
                onChange={(e) => setRealism((prev) => ({ ...prev, slippage_bps: Number(e.target.value) }))}
                className="border p-1 w-20 rounded"
              />
            </label>
          )
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleRunBacktest}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Run Backtest
        </button>
        <button
          onClick={handleRunBatch}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          Run Batch
        </button>
      </div>

      {error && <p className="text-red-600 mt-2">{error}</p>}

      {/* Single Backtest Chart */}
      {currentBacktest?.equityCurve?.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={currentBacktest.equityCurve}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="balance" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Batch Results */}
      {batchResults?.length > 0 && (
        <div className="space-y-6 mt-6">
          <h3 className="text-xl font-bold">Batch Backtests</h3>
          {batchResults.map((bt, idx) => (
            <div key={idx} className="bg-gray-50 p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">
                  Result #{idx + 1} - {bt.saved?.strategy || "Unknown Strategy"}
                </span>
                <button
                  className="text-blue-600 hover:underline"
                  onClick={() =>
                    setCollapsedLogs((prev) => ({ ...prev, [idx]: !prev[idx] }))
                  }
                >
                  {collapsedLogs[idx] ? "Expand Chart" : "Collapse Chart"}
                </button>
              </div>

              {/* Chart */}
              {!collapsedLogs[idx] && bt.equityCurve?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={bt.equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="balance" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                !collapsedLogs[idx] && <p>No equity data available.</p>
              )}

              {/* Mini Summary Table */}
              {!collapsedLogs[idx] && (
                <table className="w-full mt-2 text-sm border-collapse border border-gray-300">
                  <tbody>
                    <tr>
                      <td className="border p-1 font-semibold">Total Trades</td>
                      <td className="border p-1">{bt.trades?.length || 0}</td>
                    </tr>
                    <tr>
                      <td className="border p-1 font-semibold">Final Balance</td>
                      <td className="border p-1">${bt.equityCurve?.slice(-1)[0]?.balance?.toFixed(2) || 0}</td>
                    </tr>
                    <tr>
                      <td className="border p-1 font-semibold">Max Drawdown</td>
                      <td className="border p-1">{bt.metrics?.maxDrawdown?.toFixed(2) || 0}%</td>
                    </tr>
                    <tr>
                      <td className="border p-1 font-semibold">Profit %</td>
                      <td className="border p-1">{bt.metrics?.profitPct?.toFixed(2) || 0}%</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
