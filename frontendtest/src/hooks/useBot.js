import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export function useBot() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;

  // Start the bot
  const startBot = async ({ symbol, timeframes, amount, strategy, risk }) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_URL}/bots/start`, {
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

      setLogs((prev) => [...prev, `Bot started: ${symbol} (${timeframes.join(", ")})`]);
      await getBotStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Stop the bot
  const stopBot = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_URL}/bots/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to stop bot");

      setLogs((prev) => [...prev, `Bot stopped`]);
      await getBotStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch current bot status
  const getBotStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/bots/status?userId=${user.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get bot status");
      setStatus(data.status);
    } catch (err) {
      setError(err.message);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return { status, logs, loading, error, startBot, stopBot, getBotStatus };
}
