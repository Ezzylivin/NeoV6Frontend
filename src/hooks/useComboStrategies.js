// File: src/hooks/useComboStrategies.js
import { useState, useEffect, useCallback } from "react";
import api from "../api/apiClient.js";

export function useComboStrategies() {
  const [comboStrategies, setComboStrategies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchComboStrategies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/combo-strategy"); // backend endpoint
      setComboStrategies(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createComboStrategy = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/combo-strategy", data);
      setComboStrategies((prev) => [...prev, response.data]);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || err.message;
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const deleteComboStrategy = async (id) => {
    try {
      await api.delete(`/combo-strategy/${id}`);
      setComboStrategies((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  useEffect(() => {
    fetchComboStrategies();
  }, [fetchComboStrategies]);

  return { comboStrategies, loading, error, fetchComboStrategies, createComboStrategy, deleteComboStrategy };
}
