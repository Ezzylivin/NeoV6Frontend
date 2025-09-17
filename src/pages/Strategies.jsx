import React, { useState, useEffect } from 'react';
import api, { setAuthToken } from '../api/apiClient.js';

// Define a default state for the new strategy form
const initialStrategyState = {
  name: '',
  description: '',
  params: {
    strategyType: 'Moving Average Crossover',
    symbol: 'AAPL',
    timeframe: '1d',
    initialBalance: 1000,
    takeProfit: 5,
    stopLoss: 2,
  },
};

const Strategies = () => {
  const [strategies, setStrategies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newStrategy, setNewStrategy] = useState(initialStrategyState);

  // Function to fetch all strategies from the backend
  const fetchStrategies = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (token) {
        setAuthToken(token);
      }
      const response = await api.get("/strategy");

      let data = response.data;
      if (data && Array.isArray(data.strategies)) {
        setStrategies(data.strategies);
      } else {
        console.warn("API response format was unexpected.");
        setStrategies([]);
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message);
      console.error("Failed to fetch strategies:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  // Function to handle changes in the creation form
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Check if the parameter is nested within 'params'
    if (name in newStrategy.params) {
      setNewStrategy({
        ...newStrategy,
        params: {
          ...newStrategy.params,
          [name]: value,
        },
      });
    } else {
      setNewStrategy({
        ...newStrategy,
        [name]: value,
      });
    }
  };

  // Function to handle form submission for a new strategy
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // Send a POST request to create the new strategy
      const response = await api.post("/strategy", newStrategy);
      const createdStrategy = response.data;

      // Add the new strategy to the list and reset the form
      setStrategies([...strategies, createdStrategy]);
      setNewStrategy(initialStrategyState);
      console.log("Strategy created successfully:", createdStrategy);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
      console.error("Failed to create strategy:", e);
    }
  };

  // Function to handle deleting a strategy
  const handleDelete = async (strategyId) => {
    if (!window.confirm("Are you sure you want to delete this strategy?")) {
      return;
    }
    try {
      await api.delete(`/strategy/${strategyId}`);
      setStrategies(strategies.filter(s => s._id !== strategyId));
      console.log(`Strategy ${strategyId} deleted successfully.`);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
      console.error("Failed to delete strategy:", e);
    }
  };

  if (isLoading) {
    return <div>Loading strategies...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      {/* ---------------------------------- */}
      {/* SECTION 1: CREATE A NEW STRATEGY */}
      {/* ---------------------------------- */}
      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '20px' }}>
        <h2>Create a New Trading Strategy</h2>
        <p style={{ fontStyle: 'italic', marginBottom: '20px' }}>
          This is where you'll define a new trading strategy. Think of a strategy as a set of rules for your backtest.
          You can create simple rules, like "buy when a fast moving average crosses a slow one."
        </p>

        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Strategy Details */}
          <div>
            <h3>Strategy Details</h3>
            <label>
              Strategy Name:
              <input
                type="text"
                name="name"
                value={newStrategy.name}
                onChange={handleChange}
                required
                placeholder="e.g., MACD Crossover"
              />
              <p style={{ fontSize: '12px', color: '#666' }}>
                A unique and descriptive name for your strategy.
              </p>
            </label>
            <label>
              Description:
              <textarea
                name="description"
                value={newStrategy.description}
                onChange={handleChange}
                placeholder="e.g., A simple strategy to test the MACD indicator."
              />
              <p style={{ fontSize: '12px', color: '#666' }}>
                A brief summary of what your strategy does.
              </p>
            </label>
          </div>

          {/* Strategy Parameters */}
          <div>
            <h3>Strategy Parameters</h3>
            <label>
              Strategy Type:
              <select name="strategyType" value={newStrategy.params.strategyType} onChange={handleChange}>
                <option value="Moving Average Crossover">Moving Average Crossover</option>
                {/* Add other strategy types here */}
              </select>
              <p style={{ fontSize: '12px', color: '#666' }}>
                The core logic of your strategy. A Moving Average Crossover generates buy/sell signals when two moving averages cross each other.
              </p>
            </label>
            <label>
              Symbol:
              <input
                type="text"
                name="symbol"
                value={newStrategy.params.symbol}
                onChange={handleChange}
                required
                placeholder="e.g., AAPL, BTC/USD"
              />
              <p style={{ fontSize: '12px', color: '#666' }}>
                The asset you want to backtest your strategy on.
              </p>
            </label>
            <label>
              Timeframe:
              <select name="timeframe" value={newStrategy.params.timeframe} onChange={handleChange}>
                <option value="1d">1 Day</option>
                <option value="4h">4 Hours</option>
                <option value="1h">1 Hour</option>
                <option value="15m">15 Minutes</option>
              </select>
              <p style={{ fontSize: '12px', color: '#666' }}>
                The length of each candlestick (data point) on your chart.
              </p>
            </label>
            <label>
              Initial Balance:
              <input
                type="number"
                name="initialBalance"
                value={newStrategy.params.initialBalance}
                onChange={handleChange}
                required
              />
              <p style={{ fontSize: '12px', color: '#666' }}>
                The starting amount of money for your backtest.
              </p>
            </label>
            <label>
              Take Profit (%):
              <input
                type="number"
                name="takeProfit"
                value={newStrategy.params.takeProfit}
                onChange={handleChange}
              />
              <p style={{ fontSize: '12px', color: '#666' }}>
                Automatically close a winning trade once it hits this percentage gain.
              </p>
            </label>
            <label>
              Stop Loss (%):
              <input
                type="number"
                name="stopLoss"
                value={newStrategy.params.stopLoss}
                onChange={handleChange}
              />
              <p style={{ fontSize: '12px', color: '#666' }}>
                Automatically close a losing trade once it hits this percentage loss.
              </p>
            </label>
          </div>
          <div style={{ gridColumn: 'span 2', textAlign: 'center' }}>
            <button type="submit" style={{ padding: '10px 20px' }}>Create Strategy</button>
          </div>
        </form>
      </div>

      {/* ---------------------------------- */}
      {/* SECTION 2: VIEW & MANAGE STRATEGIES */}
      {/* ---------------------------------- */}
      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>My Existing Strategies</h2>
        {strategies.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {strategies.map((strategy) => (
              <li key={strategy._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee' }}>
                <span>{strategy.name || "Unnamed Strategy"}</span>
                <button onClick={() => handleDelete(strategy._id)}>Delete</button>
              </li>
            ))}
          </ul>
        ) : (
          <div>No strategies found. Start by creating one above!</div>
        )}
      </div>
    </div>
  );
};

export default Strategies;
