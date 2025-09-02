// File: src/pages/TradingBot.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";

export default function TradingBot() {
  const { user, token } = useAuth(); // include token if your API requires auth
  const [backtests, setBacktests] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?._id) return;

    const fetchBacktests = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/backtests/user/${user._id}`,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : undefined,
            },
          }
        );

        // Ensure proper response access
        if (res.data?.success) {
          setBacktests(res.data.backtests || []);
        } else {
          setBacktests([]);
          setError(res.data?.message || "Failed to fetch backtests");
        }
      } catch (err) {
        console.error("Failed to fetch backtests", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBacktests();
  }, [user, token]);

  if (loading) return <p className="p-6">Loading backtests...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Trading Bot</h1>

      {error && <p className="text-red-500 mb-2">Error: {error}</p>}

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
