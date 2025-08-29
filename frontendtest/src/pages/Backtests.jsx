import React from "react";
import { useBacktest } from "../hooks/useBacktest.js";

export default function Backtests() {
  const {
    results,
    symbol, setSymbol,
    timeframe, setTimeframe,
    initialBalance, setInitialBalance,
    SYMBOLS, TIMEFRAMES, BALANCES,
    executeBacktest,
    loading, error
  } = useBacktest();

  return (
    <div className="flex justify-center min-h-screen bg-black text-white p-4">
      <div className="w-full max-w-4xl p-6 border border-gray-700 rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Backtest Results</h1>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <select
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            className="border p-2 rounded text-black"
          >
            {SYMBOLS.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
          </select>

          <select
            value={timeframe}
            onChange={e => setTimeframe(e.target.value)}
            className="border p-2 rounded text-black"
          >
            {TIMEFRAMES.map((tf, idx) => <option key={idx} value={tf}>{tf}</option>)}
          </select>

          <select
            value={initialBalance}
            onChange={e => setInitialBalance(parseInt(e.target.value))}
            className="border p-2 rounded text-black"
          >
            {BALANCES.map((b, idx) => <option key={idx} value={b}>${b}</option>)}
          </select>

          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={executeBacktest}
            disabled={loading}
          >
            {loading ? "Running Backtest..." : "Run Backtest"}
          </button>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {results.length === 0 && !loading ? (
          <p>No backtest results yet.</p>
        ) : (
          <ul>
            {results.map(bt => (
              <li key={bt._id} className="border-b py-2">
                <strong>Timeframe:</strong> {bt.timeframe} |{" "}
                <strong>Profit:</strong> ${bt.profit} |{" "}
                <strong>Trades:</strong> {bt.totalTrades} |{" "}
                <strong>Initial:</strong> ${bt.initialBalance} |{" "}
                <strong>Final:</strong> ${bt.finalBalance}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
