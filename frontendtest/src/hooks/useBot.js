// File: src/hooks/useBot.js
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export function useBot() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startBot = async ({ symbol, timeframes, amount }) => {
    if (!user?.id) {
      setError("User ID is required to start bot.");
      return;
    }
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
          amount
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start bot");
      setStatus("Bot running");
      setLogs((prev) => [...prev, "Bot started"]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stopBot = async () => {
    if (!user?.id) {
      setError("User ID is required to stop bot.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/bots/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to stop bot");
      setStatus("Bot stopped");
      setLogs((prev) => [...prev, "Bot stopped"]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getBotStatus = async () => {
    if (!user?.id) {
      setError("User ID is required to check status.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/bots/status?userId=${user.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get bot status");
      setStatus(data.status?.isRunning ? "Running" : "Stopped");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { status, logs, loading, error, startBot, stopBot, getBotStatus };
}
