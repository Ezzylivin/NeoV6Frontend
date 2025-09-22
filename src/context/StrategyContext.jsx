// src/context/StrategyContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import api from '../api/apiClient.js';
import { useAuth } from './AuthContext.jsx';

export const StrategyContext = createContext();

export const StrategyProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth(); // ✅ wait for auth
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Fetch strategies when user logs in ---
  useEffect(() => {
    const fetchStrategies = async () => {
      if (!isAuthenticated || !user?.token) {
        setStrategies([]); // reset strategies if logged out
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await api.get('/strategy', {
          headers: { Authorization: `Bearer ${user.token}` }
        });

        // Ensure we always store an array
        setStrategies(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error(
          'Failed to fetch strategies:',
          err.response?.data?.message || err.message
        );
        setStrategies([]); // fallback to empty
      } finally {
        setLoading(false);
      }
    };

    fetchStrategies();
  }, [isAuthenticated, user]);

  return (
    <StrategyContext.Provider
      value={{ strategies, setStrategies, loading }}
    >
      {children}
    </StrategyContext.Provider>
  );
};
