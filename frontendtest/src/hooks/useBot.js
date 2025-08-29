// File: src/hooks/useBot.js
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export function useBot() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startBot = async ({ symbol, timeframes, amount, strategy, risk }) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/bots/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          symbol,
          timeframes,
          amount,
          strategy,
          risk,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start bot");

      await getBotStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stopBot = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/bots/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to stop bot");

      await getBotStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getBotStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL(`${import.meta.env.VITE_API_URL}/bots/status`);
      url.searchParams.set("userId", user.id);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get bot status");

      setStatus(data.status);
      // Also display important info in logs
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Bot status: ${data.status.isRunning ? "Running" : "Stopped"}, Symbol: ${data.status.symbol || "-"}, Balance: $${data.status.amount || 0}, Strategy: ${data.status.strategy || "-"}, Risk: ${data.status.risk || "-"}`
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { status, logs, loading, error, startBot, stopBot, getBotStatus };
}
