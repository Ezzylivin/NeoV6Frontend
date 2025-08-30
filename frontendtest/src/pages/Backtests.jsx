// File: src/pages/Backtests.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function Backtests() {
  const { user } = useAuth();

  const [options, setOptions] = useState({
    symbols: [],
    timeframes: [],
    balances: [],
    strategies: [],
    risks: [],
  });

  const [symbol, setSymbol] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [initialBalance, setInitialBalance] = useState(0);
  const [strategy, setStrategy] = useState("");
  const [risk, setRisk] = useState("");

  const [backtests, setBacktests] = useState([]);

  // Load dropdown options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/backtests/options`);
        const data = await res.json();
        if (data.success) {
          setOptions(data.options);
          setSymbol(data.options.symbols[0]);
          setTimeframe(data.options.timeframes[0]);
          setInitialBalance(data.options.balances[0]);
          setStrategy(data.options.strategies[0]);
          setRisk(data.options.risks[0]);
        }
      } catch (err) {
        console.error("Error fetching options:", err);
      }
    };
    fetchOptions();
  }, []);

  // Load user backtests
  useEffect(() => {
    const fetchBacktests = async () => {
      if (!user?._id) return;
      try {
        const res = await fetch(`${BACKEND_URL}/api/backtests?userId=${user._id}`);
        const data = await res.json();
        setBacktests(data);
      } catch (err) {
        console.error("Error fetching backtests:", err);
      }
    };
    fetchBacktests();
  }, [user]);

  const runBacktest = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/api/backtests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, symbol, timeframe, initialBalance, strategy, risk }),
      });
      const data = await res.json();
      if (data.backtests) {
        setBacktests((prev) => [data.backtests[0], ...prev]);
      }
    } catch (err) {
      console.error("Error running backtest:", err);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-black text-white p-6">
      <div className="w-full max-w-3xl p-6 border border-gray-700 rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Backtests</h1>

        <form onSubmit={runBacktest} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Symbol */}
          <div>
            <label className="block mb-1">Symbol:</label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full p-2 rounded text-black"
            >
              {options.symbols.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Timeframe */}
          <div>
            <label className="block mb-1">Timeframe:</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full p-2 rounded text-black"
            >
              {options.timeframes.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
            </select>
          </div>

          {/* Initial Balance */}
          <div>
            <label className="block mb-1">Initial Balance ($):</label>
            <select
              value={initialBalance}
              onChange={(e) => setInitialBalance(Number(e.target.value))}
              className="w-full p-2 rounded text-black"
            >
              {options.balances.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Strategy */}
          <div>
            <label className="block mb-1">Strategy:</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full p-2 rounded text-black"
            >
              {options.strategies.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Risk */}
          <div>
            <label className="block mb-1">Risk:</label>
            <select
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              className="w-full p-2 rounded text-black"
            >
              {options.risks.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded w-full">
              Run Backtest
            </button>
          </div>
        </form>

        <h2 className="text-xl font-semibold mb-2">Previous Backtests</h2>
        {backtests.length === 0 ? (
          <p>No backtests yet.</p>
        ) : (
          <ul className="space-y-2">
            {backtests.map((bt) => (
              <li key={bt._id} className="p-3 border rounded bg-gray-900">
                <p>
                  <strong>{bt.symbol}</strong> | {bt.timeframe} | Strategy: {bt.strategy} | Risk: {bt.risk}
                </p>
                <p>Initial: ${bt.initialBalance} → Final: ${bt.finalBalance} | Profit: ${bt.profit}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
