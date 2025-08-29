// File: src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useDashboard } from "../hooks/useDashboard.js";

export default function Dashboard() {
  const { user } = useAuth();
  const { botStatus, logs, loading, error, fetchDashboardData } = useDashboard();
  const [prices, setPrices] = useState({});

  // 🔹 Fetch bot + logs
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // 🔹 Fetch live prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch(
          "https://neov6backend.onrender.com/api/prices?symbols=BTCUSDT,ETHUSDT,BNBUSDT"
        );
        const data = await res.json();
        if (data.success) setPrices(data.prices);
      } catch (err) {
        console.error("Price fetch error:", err);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-black text-white p-6 rounded-lg border border-gray-700 space-y-6">
      {/* 👋 Greeting */}
      <h2 className="text-2xl font-semibold">
        Welcome, {user?.username || "User"}!
      </h2>

      {/* 📊 Bot Status */}
      <section>
        <h3 className="text-xl font-semibold mb-2">🤖 Bot Status</h3>
        {loading ? (
          <p className="text-blue-400">Loading...</p>
        ) : error ? (
          <p className="text-red-400">Error: {error}</p>
        ) : (
          <p>{botStatus?.status || (botStatus?.isRunning ? "Running" : "Stopped")}</p>
        )}
      </section>

      {/* 📝 Logs */}
      <section>
        <h3 className="text-xl font-semibold mb-2">📜 Recent Logs</h3>
        {logs.length === 0 ? (
          <p>No logs found.</p>
        ) : (
          <ul className="list-disc ml-6 space-y-1">
            {logs.map((log, idx) => (
              <li key={idx}>
                [{new Date(log.timestamp).toLocaleString()}] {log.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 💰 Live Prices */}
      <section>
        <h3 className="text-xl font-semibold mb-4">📈 Live Prices</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(prices).map(([symbol, price]) => (
            <div
              key={symbol}
              className="bg-white text-black shadow rounded-2xl p-4 text-center"
            >
              <h3 className="font-bold text-lg">{symbol}</h3>
              <p className="text-2xl font-mono">
                ${price ? price.toFixed(2) : "..."}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
