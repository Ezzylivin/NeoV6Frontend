// File: src/pages/Strategies.jsx
import React, { useState, useEffect } from 'react';
import api, { setAuthToken } from '../api/apiClient.js';

// Initial state for a new strategy
const initialStrategyState = {
  name: '',
  description: '',
  params: {
    strategyType: 'Moving Average Crossover',
    shortPeriod: 10,
    longPeriod: 50,
  },
};

const Strategies = () => {
  const [strategies, setStrategies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newStrategy, setNewStrategy] = useState(initialStrategyState);

  // Fetch all user's strategies
  const fetchStrategies = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (token) setAuthToken(token);
      const response = await api.get("/strategy");
      const data = response.data;
      if (data && Array.isArray(data.strategies)) {
        // Only include strategies with valid _id
        setStrategies(data.strategies.filter(s => s._id));
      } else {
        setStrategies([]);
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchStrategies(); }, []);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name in newStrategy.params) {
      if (name === 'strategyType') {
        const defaults = {
          'Moving Average Crossover': { shortPeriod: 10, longPeriod: 50 },
          'RSI': { rsiPeriod: 14 },
          'Bollinger Bands': { period: 20, numStdDev: 2 },
          'Stochastic Oscillator': { kPeriod: 14, dPeriod: 3 },
          'MACD': { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
          'Parabolic SAR': { accelerationFactorStart: 0.02, accelerationFactorIncrement: 0.02, accelerationFactorMaximum: 0.2 },
          'On-Balance Volume': { obvPeriod: 10 },
          'CCI': { cciPeriod: 20 },
          'ATR': { atrPeriod: 14 },
          'Ichimoku Cloud': { conversionLinePeriod: 9, baseLinePeriod: 26, laggingSpanPeriod: 26, cloudSpanPeriod: 52 },
        };
        setNewStrategy({ ...newStrategy, params: { strategyType: value, ...defaults[value] } });
      } else {
        setNewStrategy({ ...newStrategy, params: { ...newStrategy.params, [name]: value } });
      }
    } else {
      setNewStrategy({ ...newStrategy, [name]: value });
    }
  };

  // Create a new strategy
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/strategy", newStrategy);
      setStrategies([...strategies, response.data]);
      setNewStrategy(initialStrategyState);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };

  // Delete a strategy
  const handleDelete = async (strategyId) => {
    if (!window.confirm("Are you sure you want to delete this strategy?")) return;
    try {
      await api.delete(`/strategy/${strategyId}`);
      setStrategies(strategies.filter(s => s._id !== strategyId));
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };

  // Render parameters based on strategy type
  const renderStrategyParameters = () => {
    const p = newStrategy.params;
    switch (p.strategyType) {
      case 'Moving Average Crossover':
        return (
          <>
            <label>
              Short Period:
              <input type="number" name="shortPeriod" value={p.shortPeriod} onChange={handleChange} required />
            </label>
            <label>
              Long Period:
              <input type="number" name="longPeriod" value={p.longPeriod} onChange={handleChange} required />
            </label>
          </>
        );
      case 'RSI':
        return <label>RSI Period: <input type="number" name="rsiPeriod" value={p.rsiPeriod} onChange={handleChange} required /></label>;
      case 'MACD':
        return (
          <>
            <label>Fast Period: <input type="number" name="fastPeriod" value={p.fastPeriod} onChange={handleChange} required /></label>
            <label>Slow Period: <input type="number" name="slowPeriod" value={p.slowPeriod} onChange={handleChange} required /></label>
            <label>Signal Period: <input type="number" name="signalPeriod" value={p.signalPeriod} onChange={handleChange} required /></label>
          </>
        );
      default: return null;
    }
  };

  if (isLoading) return <div>Loading strategies...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div>
      <h1>My Strategies</h1>
      <form onSubmit={handleCreate}>
        <input type="text" name="name" placeholder="Strategy Name" value={newStrategy.name} onChange={handleChange} required />
        <textarea name="description" placeholder="Description" value={newStrategy.description} onChange={handleChange} />
        <select name="strategyType" value={newStrategy.params.strategyType} onChange={handleChange}>
          <option value="Moving Average Crossover">Moving Average Crossover</option>
          <option value="RSI">RSI</option>
          <option value="MACD">MACD</option>
        </select>
        {renderStrategyParameters()}
        <button type="submit">Create Strategy</button>
      </form>

      <h2>Saved Strategies</h2>
      {strategies.length === 0 ? <p>No strategies yet.</p> : (
        <ul>
          {strategies.map(s => (
            <li key={s._id}>
              <strong>{s.name}</strong> ({s.params.strategyType})
              <button onClick={() => handleDelete(s._id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Strategies;
