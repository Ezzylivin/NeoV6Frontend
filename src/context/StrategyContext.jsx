// File: src/context/StrategyContext.jsx
import React, { createContext, useState, useEffect } from "react";
import api, { setAuthToken } from "../api/apiClient.js";

export const StrategyContext = createContext();

export const StrategyProvider = ({ children }) => {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStrategies = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("userToken");
      if (token) setAuthToken(token);

      const response = await api.get("/strategy");
      setStrategies(Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const addStrategy = (strategy) => setStrategies(prev => [...prev, strategy]);
  const removeStrategy = (strategyId) =>
    setStrategies(prev => prev.filter(s => s._id !== strategyId));

  useEffect(() => { fetchStrategies(); }, []);

  return (
    <StrategyContext.Provider value={{ strategies, loading, error, fetchStrategies, addStrategy, removeStrategy }}>
      {children}
    </StrategyContext.Provider>
  );
};
