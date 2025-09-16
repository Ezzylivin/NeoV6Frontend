// File: src/pages/Backtests.jsx
// UPGRADED: This file is now fixed to correctly load all 5 dropdowns.

import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useAuth } from "../context/AuthContext.jsx";

// --- FIX #1: Define static options here instead of from the API ---
const BALANCE_OPTIONS = [100, 300, 500, 1000, 10000];
const RISK_OPTIONS = ["Low", "Medium", "High"];

export default function Backtests() {
  const { user } = useAuth();
  // Your hook correctly provides API-driven options
  const { options, loading, error, runBacktest } = useBacktest();

  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");
  const [selectedBalance, setSelectedBalance] = useState(BALANCE_OPTIONS[3]); // Default to 1000
  const [selectedRisk, setSelectedRisk] = useState(RISK_OPTIONS[1]); // Default to Medium
  const [result, setResult] = useState(null);
  
  // Create a combined list of strategies (from your other component)
  const allStrategies = [
    { _id: 'python_sma_crossover', name: 'SMA Crossover (Python Engine)' },
    ...(options.strategies || [])
  ];

  // Initialize defaults when API options load
  useEffect(() => {
    // Set defaults from the API-driven options
    if (allStrategies.length && !selectedStrategy) {
      setSelectedStrategy(allStrategies[0]._id); // Use the strategy _id
    }
    if (options?.symbols?.length && !selectedSymbol) {
      setSelectedSymbol(options.symbols[0]);
    }
    if (options?.timeframes?.length && !selectedTimeframe) {
      setSelectedTimeframe(options.timeframes[0]);
    }
    // Note: Balance and Risk defaults are already set in useState
  }, [options]); // This effect now only depends on 'options'

  const handleRun = async () => {
    setResult(null);
    const params = {
      // Send the ID, not the name string
      strategyId: selectedStrategy,
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      initialBalance: Number(selectedBalance),
      risk: selectedRisk,
    };
    const res = await runBacktest(params); // This needs to match your 'Backtests.jsx'
    setResult(res);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Backtesting</h1>

      {error && <div className="text-red-500 mb-4">Error: {error}</div>}
      {/* Show a single loading indicator for the initial data load */}
      {loading && !result && <div className="text-gray-500 mb-4">Loading options...</div>}

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
            {/* --- FIX #2: Map the strategy *objects* correctly --- */}
            {allStrategies.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        {/* Symbol (This will work as is) */}
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

        {/* Timeframe (This will work as is) */}
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

        {/* Balance (FIXED) */}
        <label className="flex flex-col">
          <span className="font-medium">Balance</span>
          <select
            value={selectedBalance}
            onChange={(e) => setSelectedBalance(e.target.value)}
            className="border rounded p-2"
          >
            {/* --- FIX #1: Map the local constant array --- */}
            {BALANCE_OPTIONS.map((b) => (
              <option key={b} value={b}>
                ${b.toLocaleString()}
              </option>
            ))}
          </select>
        </label>

        {/* Risk (FIXED) */}
        <label className="flex flex-col">
          <span className="font-medium">Risk</span>
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="border rounded p-2"
          >
            {/* --- FIX #1: Map the local constant array --- */}
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
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Running..." : "Run Backtest"}
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
