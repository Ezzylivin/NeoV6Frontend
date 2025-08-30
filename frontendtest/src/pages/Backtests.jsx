// File: src/pages/Backtests.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// Default fallback options
const FALLBACK_OPTIONS = {
  symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT"],
  timeframes: ["1m", "5m", "15m", "1h", "4h", "1d"],
  balances: [100, 500, 1000, 5000, 10000],
  strategies: ["SMA", "EMA", "RSI", "MACD"],
  risks: ["Low", "Medium", "High"],
};

export default function Backtests() {
  const { user } = useAuth();

  const [options, setOptions] = useState(FALLBACK_OPTIONS);

  const [form, setForm] = useState({
    symbol: FALLBACK_OPTIONS.symbols[0],
    timeframe: FALLBACK_OPTIONS.timeframes[0],
    initialBalance: FALLBACK_OPTIONS.balances[0],
    strategy: FALLBACK_OPTIONS.strategies[0],
    risk: FALLBACK_OPTIONS.risks[0],
  });

  const [backtests, setBacktests] = useState([]);

  // Load dropdown options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/backtests/options`);
        const data = await res.json();
        if (data.success && data.options) {
          const opts = {
            symbols: data.options.symbols.length ? data.options.symbols : FALLBACK_OPTIONS.symbols,
            timeframes: data.options.timeframes.length ? data.options.timeframes : FALLBACK_OPTIONS.timeframes,
            balances: data.options.balances.length ? data.options.balances : FALLBACK_OPTIONS.balances,
            strategies: data.options.strategies.length ? data.options.strategies : FALLBACK_OPTIONS.strategies,
            risks: data.options.risks.length ? data.options.risks : FALLBACK_OPTIONS.risks,
          };
          setOptions(opts);

          // Set first values as default
          setForm({
            symbol: opts.symbols[0],
            timeframe: opts.timeframes[0],
            initialBalance: opts.balances[0],
            strategy: opts.strategies[0],
            risk: opts.risks[0],
          });
        }
      } catch (err) {
        console.error("Error fetching options, using defaults:", err);
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
        setBacktests(data || []);
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
    <div className="flex justify-center p-6">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-bold mb-4">Backtests</h1>

        <form onSubmit={runBacktest} className="bg-white p-6 rounded-2xl shadow space-y-4 mb-6">
          {/* Symbol */}
          <div>
            <label className="block mb-1">Symbol</label>
            <select name="symbol" value={form.symbol} onChange={handleChange} className="w-full p-2 rounded border text-black">
              {options.symbols.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Timeframe */}
          <div>
            <label className="block mb-1">Timeframe</label>
            <select name="timeframe" value={form.timeframe} onChange={handleChange} className="w-full p-2 rounded border text-black">
              {options.timeframes.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
            </select>
          </div>

          {/* Initial Balance */}
          <div>
            <label className="block mb-1">Initial Balance</label>
            <select name="initialBalance" value={form.initialBalance} onChange={handleChange} className="w-full p-2 rounded border text-black">
              {options.balances.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Strategy */}
          <div>
            <label className="block mb-1">Strategy</label>
            <select name="strategy" value={form.strategy} onChange={handleChange} className="w-full p-2 rounded border text-black">
              {options.strategies.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>

          {/* Risk */}
          <div>
            <label className="block mb-1">Risk</label>
            <select name="risk" value={form.risk} onChange={handleChange} className="w-full p-2 rounded border text-black">
              {options.risks.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white px-4 py-2 rounded">
            Run Backtest
          </button>
        </form>

        {/* Previous Backtests */}
        <h2 className="text-xl font-semibold mb-2">Previous Backtests</h2>
        {backtests.length === 0 ? (
          <p>No backtests yet.</p>
        ) : (
          <ul className="space-y-2">
            {backtests.map((bt) => (
              <li key={bt._id} className="bg-white p-4 rounded-2xl shadow">
                <p className="font-bold">{bt.symbol} | {bt.timeframe}</p>
                <p>Strategy: {bt.strategy} | Risk: {bt.risk}</p>
                <p>Initial: ${bt.initialBalance} → Final: ${bt.finalBalance} | Profit: ${bt.profit}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
