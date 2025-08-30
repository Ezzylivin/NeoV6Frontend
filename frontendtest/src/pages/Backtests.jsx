import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function Backtests() {
  const { user } = useAuth();

  const [options, setOptions] = useState({
    symbols: ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT"],
    timeframes: ["1m", "5m", "15m", "30m", "1h", "4h", "1d"],
    balances: [100, 300, 500, 1000, 5000, 10000, 50000],
    strategies: ["default", "crossover", "momentum", "meanReversion"],
    risks: ["low", "medium", "high"],
  });

  const [form, setForm] = useState({
    symbol: "BTC/USDT",
    timeframe: "1h",
    initialBalance: 1000,
    strategy: "default",
    risk: "medium",
  });

  const [backtests, setBacktests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch dropdown options dynamically if backend provides
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/backtests/options`);
        const data = await res.json();
        if (data.success && data.options) {
          setOptions(data.options);

          // Initialize form with first options
          setForm({
            symbol: data.options.symbols[0] || "BTC/USDT",
            timeframe: data.options.timeframes[0] || "1h",
            initialBalance: data.options.balances[0] || 1000,
            strategy: data.options.strategies[0] || "default",
            risk: data.options.risks[0] || "medium",
          });
        }
      } catch (err) {
        console.warn("Backend options not available, using defaults");
      }
    };
    fetchOptions();
  }, []);

  // Fetch user backtests
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
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "initialBalance" ? Number(value) : value,
    }));
  };

  const handleRunBacktest = async (e) => {
    e.preventDefault();
    if (!user?._id) {
      setError("User not loaded. Cannot run backtest.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${BACKEND_URL}/api/backtests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, userId: user._id }),
      });
      const data = await res.json();
      if (data.backtests) {
        setBacktests((prev) => [data.backtests[0], ...prev]);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to run backtest.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-black text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Backtests</h1>

      <form onSubmit={handleRunBacktest} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Symbol */}
        <div>
          <label className="block mb-1">Symbol</label>
          <select
            name="symbol"
            value={form.symbol}
            onChange={handleChange}
            className="w-full p-2 rounded bg-white text-black"
          >
            {options.symbols.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Timeframe */}
        <div>
          <label className="block mb-1">Timeframe</label>
          <select
            name="timeframe"
            value={form.timeframe}
            onChange={handleChange}
            className="w-full p-2 rounded bg-white text-black"
          >
            {options.timeframes.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
          </select>
        </div>

        {/* Initial Balance */}
        <div>
          <label className="block mb-1">Initial Balance</label>
          <select
            name="initialBalance"
            value={form.initialBalance}
            onChange={handleChange}
            className="w-full p-2 rounded bg-white text-black"
          >
            {options.balances.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Strategy */}
        <div>
          <label className="block mb-1">Strategy</label>
          <select
            name="strategy"
            value={form.strategy}
            onChange={handleChange}
            className="w-full p-2 rounded bg-white text-black"
          >
            {options.strategies.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>

        {/* Risk */}
        <div>
          <label className="block mb-1">Risk</label>
          <select
            name="risk"
            value={form.risk}
            onChange={handleChange}
            className="w-full p-2 rounded bg-white text-black"
          >
            {options.risks.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded"
            disabled={loading}
          >
            {loading ? "Running..." : "Run Backtest"}
          </button>
        </div>
      </form>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <h2 className="text-xl font-semibold mb-2">Previous Backtests</h2>
      {backtests.length === 0 ? (
        <p>No backtests yet.</p>
      ) : (
        <table className="w-full border-collapse border border-gray-700">
          <thead>
            <tr className="bg-gray-800">
              <th className="border border-gray-700 p-2">Symbol</th>
              <th className="border border-gray-700 p-2">Timeframe</th>
              <th className="border border-gray-700 p-2">Initial</th>
              <th className="border border-gray-700 p-2">Final</th>
              <th className="border border-gray-700 p-2">Profit</th>
              <th className="border border-gray-700 p-2">Strategy</th>
              <th className="border border-gray-700 p-2">Risk</th>
              <th className="border border-gray-700 p-2">Trades</th>
              <th className="border border-gray-700 p-2">Candles</th>
            </tr>
          </thead>
          <tbody>
            {backtests.map((bt) => (
              <tr key={bt._id} className="text-center">
                <td className="border border-gray-700 p-2">{bt.symbol}</td>
                <td className="border border-gray-700 p-2">{bt.timeframe}</td>
                <td className="border border-gray-700 p-2">${bt.initialBalance}</td>
                <td className="border border-gray-700 p-2">${bt.finalBalance}</td>
                <td className={`border border-gray-700 p-2 ${bt.profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                  ${bt.profit}
                </td>
                <td className="border border-gray-700 p-2">{bt.strategy}</td>
                <td className="border border-gray-700 p-2">{bt.risk}</td>
                <td className="border border-gray-700 p-2">{bt.totalTrades}</td>
                <td className="border border-gray-700 p-2">{bt.candlesTested}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
