import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = "https://neov6backend.onrender.com/api/strategies";

export function useStrategy(userId) {
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch strategy based on userId
  const fetchStrategy = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_BASE}/${userId}`);
      if (data.success) {
        setStrategy(data.strategy);
      } else {
        setError('Failed to fetch strategy');
      }
    } catch (err) {
      setError('Error fetching strategy');
      console.error("fetchStrategy error", err);
    } finally {
      setLoading(false);
    }
  };

  // Save the strategy
  const saveStrategy = async (params) => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API_BASE}/save`, { userId, params });
      if (data.success) {
        setStrategy(data.strategy);
      } else {
        setError('Failed to save strategy');
      }
    } catch (err) {
      setError('Error saving strategy');
      console.error("saveStrategy error", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch strategy when userId changes
  useEffect(() => {
    if (userId) fetchStrategy();
  }, [userId]);

  return { strategy, loading, error, fetchStrategy, saveStrategy };
}
