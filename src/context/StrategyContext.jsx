// src/context/StrategyContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/apiClient.js';
import { useAuth } from './AuthContext.jsx';

export const StrategyContext = createContext();

export const StrategyProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth(); // ✅ useAuth hook
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStrategies = async () => {
      if (!isAuthenticated || !user?.token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/strategy', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setStrategies(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Failed to fetch strategies:', err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStrategies();
  }, [isAuthenticated, user]);

  return (
    <StrategyContext.Provider value={{ strategies, setStrategies, loading }}>
      {children}
    </StrategyContext.Provider>
  );
};
