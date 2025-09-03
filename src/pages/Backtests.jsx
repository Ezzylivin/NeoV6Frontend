// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import useBacktest from "../hooks/useBacktest.js";

// Fallback crypto options if API doesn't respond yet
const fallbackOptions = {
  symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT"],
  timeframes: ["1m", "5m", "15m", "1h", "4h", "1d"],
  stopLosses: [0.01, 0.02, 0.05],
  takeProfits: [0.02, 0.05, 0.1],
};

export default function Backtests() {
  const {
    options,
    fetchOptions,
    runBacktest,
    runBatchBacktests,
    backtests,
    loading,
    error,
  } = useBacktest();

  const [form, setForm] = useState({
    symbol: "BTCUSDT",
    timeframe: "1h",
    stopLoss: 0.02,
    takeProfit: 0.05,
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    runBacktest(form);
  };

  const handleBatch = () => {
    runBatchBacktests([form]); // Example: run batch with one config
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Crypto Backtests</h1>

      {/* Error Message */}
      {error && <p className="text-red-500">{error}</p>}

      {/* Run Single Backtest Form */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 gap-4 max-w-lg bg-white p-4 rounded-xl shadow"
      >
        {/* Symbol Dropdown */}
        <label className="flex flex-col">
          Symbol
          <select
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            className="border rounded p-2"
          >
            {(options?.symbols || fallbackOptions.symbols).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {/* Timeframe Dropdown */}
        <label className="flex flex-col">
          Timeframe
          <select
            value={form.timeframe}
            onChange={(e) => setForm({ ...form, timeframe: e.target.value })}
            className="border rounded p-2"
          >
            {(options?.timeframes || fallbackOptions.timeframes).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        {/* Stop Loss Dropdown */}
        <label className="flex flex-col">
          Stop Loss
          <select
            value={form.stopLoss}
            onChange={(e) =>
              setForm({ ...form, stopLoss: parseFloat(e.target.value) })
            }
            className="border rounded p-2"
          >
            {(options?.stopLosses || fallbackOptions.stopLosses).map((sl) => (
              <option key={sl} value={sl}>
                {sl}
              </option>
            ))}
          </select>
        </label>

        {/* Take Profit Dropdown */}
        <label className="flex flex-col">
          Take Profit
          <select
            value={form.takeProfit}
            onChange={(e) =>
              setForm({ ...form, takeProfit: parseFloat(e.target.value) })
            }
            className="border rounded p-2"
          >
            {(options?.takeProfits || fallbackOptions.takeProfits).map((tp) => (
              <option key={tp} value={tp}>
                {tp}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="col-span-2 bg-blue-600 text-white rounded-lg p-2 hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Running..." : "Run Backtest"}
        </button>
      </form>

      {/* Batch Button */}
      <div>
        <button
          onClick={handleBatch}
          disabled={loading}
          className="bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 disabled:opacity-50"
        >
          Run Batch Backtests
        </button>
      </div>

      {/* Logs Section */}
      <div className="bg-gray-900 text-gray-100 rounded-xl shadow-lg p-4 max-h-96 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-2">Backtest Logs</h2>
        {backtests.length === 0 ? (
          <p className="text-gray-400">No backtests yet.</p>
        ) : (
          <ul className="space-y-3">
            {backtests.map((bt) => (
              <li
                key={bt._id}
                className="border-b border-gray-700 pb-2 last:border-0"
              >
                <p className="text-sm">
                  <span className="font-bold">{bt.symbol}</span> —{" "}
                  {bt.timeframe} | SL: {bt.stopLoss} | TP: {bt.takeProfit}
                </p>
                <p className="text-xs text-gray-400">
                  Profit: {bt.result?.profit ?? "N/A"} | Trades:{" "}
                  {bt.result?.trades ?? 0}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(bt.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
