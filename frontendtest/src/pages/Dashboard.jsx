import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useBacktest } from "../hooks/useBacktest";

export default function Dashboard() {
  const { user } = useAuth();
  const { results, fetchBacktests } = useBacktest();

  // ✅ Fetch backtests for this user on load
  useEffect(() => {
    if (user?._id) {
      fetchBacktests(user._id);
    }
  }, [user]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Welcome, {user?.username}</h1>

      {/* --- Backtests Preview --- */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Recent Backtests</h2>
        {results.length === 0 ? (
          <p className="text-gray-500">No backtests found. Run one from the Backtests page.</p>
        ) : (
          <ul>
            {results.slice(0, 5).map((r, i) => (
              <li key={i} className="border-b py-2">
                <strong>{r.symbol}</strong> {r.timeframe} → Final Balance:{" "}
                {r.finalBalance}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* --- Quick Links --- */}
      <div className="flex gap-4">
        <a
          href="/backtests"
          className="bg-blue-600 text-white px-4 py-2 rounded shadow"
        >
          Go to Backtests
        </a>
        <a
          href="/tradingbot"
          className="bg-green-600 text-white px-4 py-2 rounded shadow"
        >
          Go to Trading Bot
        </a>
      </div>
    </div>
  );
}
