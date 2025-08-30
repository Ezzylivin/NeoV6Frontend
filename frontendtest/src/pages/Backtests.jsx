import React, { useEffect, useState } from "react";
import { useBacktest } from "../hooks/useBacktest";
import { useAuth } from "../context/AuthContext";

export default function Backtests() {
  const { user } = useAuth();
  const { results, fetchBacktests, runBacktests } = useBacktest();

  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("1h");
  const [initialBalance, setInitialBalance] = useState(1000);
  const [strategy, setStrategy] = useState("moving-average");
  const [risk, setRisk] = useState(2);

  // ✅ Fetch user’s backtests on load
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
    await fetchBacktests(user._id); // refresh after running
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Backtests</h1>

      {/* Run new backtest form */}
      <div className="mb-6 space-y-3">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Symbol"
          className="border px-2 py-1"
        />
        <input
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          placeholder="Timeframe"
          className="border px-2 py-1"
        />
        <input
          type="number"
          value={initialBalance}
          onChange={(e) => setInitialBalance(e.target.value)}
          placeholder="Initial Balance"
          className="border px-2 py-1"
        />
        <input
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          placeholder="Strategy"
          className="border px-2 py-1"
        />
        <input
          type="number"
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
          placeholder="Risk %"
          className="border px-2 py-1"
        />
        <button
          onClick={handleRun}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Run Backtest
        </button>
      </div>

      {/* Backtest results list */}
      <div>
        <h2 className="text-lg font-semibold mb-2">My Backtests</h2>
        <ul>
          {results.map((r, i) => (
            <li key={i} className="border-b py-2">
              <strong>{r.symbol}</strong> {r.timeframe} → Balance:{" "}
              {r.finalBalance}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
