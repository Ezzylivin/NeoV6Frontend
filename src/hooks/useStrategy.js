// File: src/hooks/useStrategy.js
import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = "https://neov6backend.onrender.com/api/strategies";

export function useStrategy(userId) {
  const [strategy, setStrategy] = useState(null);

  const fetchStrategy = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/${userId}`);
      if (data.success) setStrategy(data.strategy);
    } catch (err) {
      console.error("fetchStrategy error", err);
    }
  };

  const saveStrategy = async (params) => {
    try {
      const { data } = await axios.post(`${API_BASE}/save`, { userId, params });
      if (data.success) setStrategy(data.strategy);
    } catch (err) {
      console.error("saveStrategy error", err);
    }
  };

  useEffect(() => {
    if (userId) fetchStrategy();
  }, [userId]);

  return { strategy, fetchStrategy, saveStrategy };
}
