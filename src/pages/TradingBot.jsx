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
        // ✅ FIX: use the correct backend route
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/backtests/user/${user._id}`
        );
        setBacktests(res.data);
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
            <li
              key={bt._id}
              className="border p-3 rounded bg-gray-50 shadow-sm"
            >
              <p><strong>ID:</strong> {bt._id}</p>
              <p><strong>Name:</strong> {bt.name || "Untitled"}</p>
              <p><strong>Parameters:</strong> {JSON.stringify(bt.parameters || {})}</p>
              <p><strong>Profit:</strong> {bt.result?.profit ?? "N/A"}</p>
              <p><strong>Date:</strong> {bt.createdAt ? new Date(bt.createdAt).toLocaleString() : "Unknown"}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
