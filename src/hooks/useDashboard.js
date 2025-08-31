// File: src/hooks/useDashboard.js
import { useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export function useDashboard() {
  const { user } = useAuth();
  const [botStatus, setBotStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch bot status
      const botRes = await fetch(`${import.meta.env.VITE_API_URL}/bots/status?userId=${user.id}`);
      const botData = await botRes.json();
      setBotStatus(botData.status || null);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Bot status: ${botData.status?.isRunning ? "Running" : "Stopped"}`
      ]);

      // Fetch live prices
      const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT"];
      const priceRes = await fetch(`${import.meta.env.VITE_API_URL}/prices?symbols=${symbols.join(",")}`);
      const priceData = await priceRes.json();
      if (priceData.success) setPrices(priceData.prices);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  return { botStatus, logs, prices, loading, error, fetchDashboardData };
}
