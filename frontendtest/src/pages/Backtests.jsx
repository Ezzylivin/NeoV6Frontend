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

  const [form, setForm] = useState({
    symbol: "",
    timeframe: "",
    initialBalance: "",
    strategy: "",
    risk: "",
  });

  const [backtests, setBacktests] = useState([]);

  // Load dropdown options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/backtests/options`);
        const data = await res.json();
        if (data.success) {
          setOptions(data.options);
          setForm({
            symbol: data.options.symbols[0],
            timeframe: data.options.timeframes[0],
            initialBalance: data.options.balances[0],
            strategy: data.options.strategies[0],
            risk: data.options.risks[0],
          });
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

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const runBacktest = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/api/backtests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, userId: user._id }),
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Backtests</h1>

      <form onSubmit={runBacktest} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/** Symbol **/}
        <div>
          <label>Symbol</label>
          <select name="symbol" value={form.symbol} onChange={handleChange} className="p-2 border rounded w-full">
            {options.symbols.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/** Timeframe **/}
        <div>
          <label>Timeframe</label>
          <select name="timeframe" value={form.timeframe} onChange={handleChange} className="p-2 border rounded w-full">
            {options.timeframes.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
          </select>
        </div>

        {/** Initial Balance **/}
        <div>
          <label>Initial Balance</label>
          <select name="initialBalance" value={form.initialBalance} onChange={handleChange} className="p-2 border rounded w-full">
            {options.balances.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/** Strategy **/}
        <div>
          <label>Strategy</label>
          <select name="strategy" value={form.strategy} onChange={handleChange} className="p-2 border rounded w-full">
            {options.strategies.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>

        {/** Risk **/}
        <div>
          <label>Risk</label>
          <select name="risk" value={form.risk} onChange={handleChange} className="p-2 border rounded w-full">
            {options.risks.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="flex items-end">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded w-full">
            Run Backtest
          </button>
        </div>
      </form>

      <h2 className="text-xl font-semibold mb-2">Previous Backtests</h2>
      {backtests.length === 0 ? <p>No backtests yet.</p> : (
        <ul className="space-y-2">
          {backtests.map((bt) => (
            <li key={bt._id} className="p-3 border rounded">
              <p><strong>{bt.symbol}</strong> | {bt.timeframe} | Strategy: {bt.strategy} | Risk: {bt.risk}</p>
              <p>Initial: ${bt.initialBalance} → Final: ${bt.finalBalance} | Profit: ${bt.profit}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
