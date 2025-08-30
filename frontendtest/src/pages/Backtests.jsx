import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useBacktest } from "../hooks/useBacktest";

export default function Backtests() {
  const { user } = useAuth();
  const { results, fetchBacktests, runBacktests } = useBacktest();

  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("1h");
  const [initialBalance, setInitialBalance] = useState(1000);
  const [strategy, setStrategy] = useState("SMA");
  const [risk, setRisk] = useState("Low");

  useEffect(() => {
    if (user?._id) {
      fetchBacktests(user._id);
    }
  }, [user]);

  const handleRun = async () => {
    if (!user?._id) return;
    await runBacktests({
      userId: user._id,
      symbol,
      timeframe,
      initialBalance,
      strategy,
      risk,
    });
    await fetchBacktests(user._id);
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Backtesting</h1>

      {/* --- Backtest Form --- */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Symbol */}
        <div>
          <label className="block mb-1">Symbol</label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="border px-3 py-2 rounded w-full"
          >
            <option value="BTCUSDT">BTC/USDT</option>
            <option value="ETHUSDT">ETH/USDT</option>
            <option value="BNBUSDT">BNB/USDT</option>
          </select>
        </div>

        {/* Timeframe */}
        <div>
          <label className="block mb-1">Timeframe</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="border px-3 py-2 rounded w-full"
          >
            <option value="1m">1 Minute</option>
            <option value="5m">5 Minutes</option>
            <option value="15m">15 Minutes</option>
            <option value="1h">1 Hour</option>
            <option value="4h">4 Hours</option>
            <option value="1d">1 Day</option>
          </select>
        </div>

        {/* Initial Balance */}
        <div>
          <label className="block mb-1">Initial Balance</label>
          <select
            value={initialBalance}
            onChange={(e) => setInitialBalance(Number(e.target.value))}
            className="border px-3 py-2 rounded w-full"
          >
            <option value={100}>$100</option>
            <option value={500}>$500</option>
            <option value={1000}>$1000</option>
            <option value={5000}>$5000</option>
            <option value={10000}>$10,000</option>
          </select>
        </div>

        {/* Strategy */}
        <div>
          <label className="block mb-1">Strategy</label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="border px-3 py-2 rounded w-full"
          >
            <option value="SMA">SMA (Simple Moving Average)</option>
            <option value="EMA">EMA (Exponential Moving Average)</option>
            <option value="RSI">RSI (Relative Strength Index)</option>
            <option value="MACD">MACD</option>
          </select>
        </div>

        {/* Risk */}
        <div>
          <label className="block mb-1">Risk Level</label>
          <select
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
            className="border px-3 py-2 rounded w-full"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleRun}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Run Backtest
      </button>

      {/* --- Backtest Results --- */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Your Backtests</h2>
        {results.length === 0 ? (
          <p className="text-gray-500">No backtests found.</p>
        ) : (
          <ul>
            {results.map((r, i) => (
              <li key={i} className="border-b py-2">
                <strong>{r.symbol}</strong> {r.timeframe} → Final Balance:{" "}
                {r.finalBalance}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
