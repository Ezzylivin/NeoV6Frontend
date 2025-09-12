// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Backtests() {
  const { user } = useAuth();
  const { options, loading, error, runBacktest } = useBacktest();

  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");
  const [selectedBalance, setSelectedBalance] = useState("");
  const [selectedRisk, setSelectedRisk] = useState("");
  const [result, setResult] = useState(null);

  // Initialize defaults when options load
  useEffect(() => {
    if (options?.strategies?.length && !selectedStrategy) {
      setSelectedStrategy(options.strategies[0]);
    }
    if (options?.symbols?.length && !selectedSymbol) {
      setSelectedSymbol(options.symbols[0]);
    }
    if (options?.timeframes?.length && !selectedTimeframe) {
      setSelectedTimeframe(options.timeframes[0]);
    }
    if (options?.balances?.length && !selectedBalance) {
      setSelectedBalance(options.balances[0]);
    }
    if (options?.risks?.length && !selectedRisk) {
      setSelectedRisk(options.risks[0]);
    }
  }, [options]);

  const handleRun = async () => {
    const params = {
      strategy: selectedStrategy,
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      balance: Number(selectedBalance),
      risk: selectedRisk,
    };
    const res = await runBacktest(params);
    setResult(res);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Backtesting</h1>

      {error && <div className="text-red-500 mb-4">Error: {error}</div>}
      {loading && <div className="text-gray-500 mb-4">Loading options...</div>}

      {/* Selection Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Strategy */}
        <label className="flex flex-col">
          <span className="font-medium">Strategy</span>
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value)}
            className="border rounded p-2"
          >
            {options.strategies?.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {/* Symbol */}
        <label className="flex flex-col">
          <span className="font-medium">Symbol</span>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="border rounded p-2"
          >
            {options.symbols?.map((sym) => (
              <option key={sym} value={sym}>
                {sym}
              </option>
            ))}
          </select>
        </label>

        {/* Timeframe */}
        <label className="flex flex-col">
          <span className="font-medium">Timeframe</span>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border rounded p-2"
          >
            {options.timeframes?.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>
        </label>

        {/* Balance */}
        <label className="flex flex-col">
          <span className="font-medium">Balance</span>
          <select
            value={selectedBalance}
            onChange={(e) => setSelectedBalance(e.target.value)}
            className="border rounded p-2"
          >
            {options.balances?.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        {/* Risk */}
        <label className="flex flex-col">
          <span className="font-medium">Risk</span>
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="border rounded p-2"
          >
            {options.risks?.map((r) => (
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
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50"
      >
        Run Backtest
      </button>

      {/* Results */}
      {result && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <h2 className="text-xl font-semibold mb-2">Results</h2>
          <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
