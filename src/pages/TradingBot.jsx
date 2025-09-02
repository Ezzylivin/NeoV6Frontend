// File: src/pages/TradingBot.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBacktest } from "../hooks/useBacktest.js";

export default function TradingBot() {
  const { user } = useAuth();
  const { results: backtests, loading, error, fetchBacktests } = useBacktest();

  const [filteredBacktests, setFilteredBacktests] = useState([]);

  // Refresh backtests whenever user or results change
  useEffect(() => {
    if (user?._id) {
      fetchBacktests();
    }
  }, [user?._id]);

  useEffect(() => {
    setFilteredBacktests(backtests || []);
  }, [backtests]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Trading Bot</h1>

      {loading && <p>Loading backtests...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {filteredBacktests.length === 0 && !loading ? (
        <p>No backtests found for your account.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">Date</th>
                <th className="px-4 py-2 border">Symbol</th>
                <th className="px-4 py-2 border">Strategy</th>
                <th className="px-4 py-2 border">Risk</th>
                <th className="px-4 py-2 border">Initial</th>
                <th className="px-4 py-2 border">Final</th>
                <th className="px-4 py-2 border">Profit</th>
              </tr>
            </thead>
            <tbody>
              {filteredBacktests.map((bt) => (
                <tr key={bt?._id || Math.random()} className="text-center">
                  <td className="px-4 py-2 border">
                    {bt?.createdAt ? new Date(bt.createdAt).toLocaleString() : "N/A"}
                  </td>
                  <td className="px-4 py-2 border">{bt?.symbol || "N/A"}</td>
                  <td className="px-4 py-2 border">
                    {bt?.strategy?.name || bt?.strategy || "N/A"}
                  </td>
                  <td className="px-4 py-2 border">{bt?.risk || "N/A"}</td>
                  <td className="px-4 py-2 border">{bt?.initialBalance ?? "N/A"}</td>
                  <td className="px-4 py-2 border">
                    {bt?.results?.finalBalance ?? bt?.initialBalance ?? 0}
                  </td>
                  <td className="px-4 py-2 border">{bt?.results?.profit ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
