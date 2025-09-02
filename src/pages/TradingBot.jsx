// File: src/pages/TradingBot.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";

export default function TradingBot() {
  const { user } = useAuth();
  const [backtests, setBacktests] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?._id) return;

    const fetchBacktests = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/backtests/${user._id}`);
        if (res.data.success) {
          setBacktests(res.data.backtests);
        } else {
          setBacktests([]);
        }
      } catch (err) {
        console.error("Failed to fetch backtests", err);
        setError(err.message);
      }
    };

    fetchBacktests();
  }, [user]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Trading Bot</h1>

      {error && <p className="text-red-500">Error: {error}</p>}

      <h2 className="text-xl mb-2">Your Backtests</h2>
      {backtests.length === 0 ? (
        <p>No backtests found for your account.</p>
      ) : (
        <ul className="space-y-2">
          {backtests.map((bt) => (
            <li key={bt._id} className="border p-3 rounded bg-gray-50 shadow-sm">
              <p><strong>ID:</strong> {bt._id}</p>
              <p><strong>Symbol:</strong> {bt.symbol}</p>
              <p><strong>Strategy:</strong> {bt.strategy?.name || bt.strategy}</p>
              <p><strong>Risk:</strong> {bt.risk}</p>
              <p><strong>Initial Balance:</strong> {bt.initialBalance}</p>
              <p><strong>Profit:</strong> {bt.metrics?.profit ?? 0}</p>
              <p><strong>Date:</strong> {bt.createdAt ? new Date(bt.createdAt).toLocaleString() : "Unknown"}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
