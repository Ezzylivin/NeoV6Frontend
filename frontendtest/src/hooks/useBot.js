import { useState, useCallback } from "react";
import axios from "axios";

export function useBot() {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]); // ✅ initialize as array
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBotData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/bot/status", { withCredentials: true });
      setStatus(data.status);
      setLogs(data.logs || []); // ✅ fallback to []
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { status, logs, loading, error, fetchBotData };
}
