import React, { useState, useEffect } from 'react';
import api, { setAuthToken } from '../api/apiClient.js';

// Define the initial state for a new strategy, including its parameters
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

  // Function to fetch all strategies from the backend
  const fetchStrategies = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (token) {
        setAuthToken(token);
      }
      const response = await api.get("/strategy");

      let data = response.data;
      
      // FIX: Correctly access the nested 'strategies' array from the API response
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
    if (name in newStrategy.params) {
      if (name === 'strategyType') {
        const resetParams = {
          'Moving Average Crossover': { shortPeriod: 10, longPeriod: 50 },
          'RSI': { rsiPeriod: 14 },
          'Bollinger Bands': { period: 20, numStdDev: 2 },
        };
        setNewStrategy({
          ...newStrategy,
          params: {
            strategyType: value,
            ...resetParams[value],
          },
        });
      } else {
        setNewStrategy({
          ...newStrategy,
          params: {
            ...newStrategy.params,
            [name]: value,
          },
        });
      }
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
      const response = await api.post("/strategy", newStrategy);
      const createdStrategy = response.data;
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
  
  // A helper function to render dynamic parameters based on the strategy type
  const renderStrategyParameters = () => {
    switch (newStrategy.params.strategyType) {
      case 'Moving Average Crossover':
        return (
          <>
            <label>
              Short Period:
              <input
                type="number"
                name="shortPeriod"
                value={newStrategy.params.shortPeriod}
                onChange={handleChange}
                required
                style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }}
              />
              <p style={{ fontSize: '12px', color: '#aaa' }}>
                This is the **"fast"** moving average. It looks at the last **{newStrategy.params.shortPeriod}** days (or hours, depending on your timeframe). A smaller number means it reacts faster to new price changes, but can also give false alarms.
              </p>
            </label>
            <label>
              Long Period:
              <input
                type="number"
                name="longPeriod"
                value={newStrategy.params.longPeriod}
                onChange={handleChange}
                required
                style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }}
              />
              <p style={{ fontSize: '12px', color: '#aaa' }}>
                This is the **"slow"** moving average. It looks at the last **{newStrategy.params.longPeriod}** days. This line is much smoother and shows the overall, long-term trend.
              </p>
            </label>
            <p style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '14px', color: '#ddd' }}>
              **The rule:** The strategy will look to **buy** when the fast line crosses **above** the slow line, and **sell** when the fast line crosses **below** the slow line.
            </p>
          </>
        );
      case 'RSI':
        return (
          <>
            <label>
              RSI Period:
              <input
                type="number"
                name="rsiPeriod"
                value={newStrategy.params.rsiPeriod}
                onChange={handleChange}
                required
                style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }}
              />
              <p style={{ fontSize: '12px', color: '#aaa' }}>
                The **RSI (Relative Strength Index)** is a number that tells you if an asset has been bought or sold too much. This number is based on its price movements over the last **{newStrategy.params.rsiPeriod}** days. The common rule is to look to **buy** when the RSI is very low (below 30) and **sell** when it is very high (above 70).
              </p>
            </label>
          </>
        );
      case 'Bollinger Bands':
        return (
          <>
            <label>
              Period:
              <input
                type="number"
                name="period"
                value={newStrategy.params.period}
                onChange={handleChange}
                required
                style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }}
              />
              <p style={{ fontSize: '12px', color: '#aaa' }}>
                This sets the length for the central line of the Bollinger Bands, which is an average of the last **{newStrategy.params.period}** days. This line shows the average price.
              </p>
            </label>
            <label>
              Standard Deviations:
              <input
                type="number"
                name="numStdDev"
                value={newStrategy.params.numStdDev}
                onChange={handleChange}
                required
                style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }}
              />
              <p style={{ fontSize: '12px', color: '#aaa' }}>
                This number sets how wide the bands are. A bigger number makes the bands wider, meaning the price has to move more to reach them. The bands tell you if the price is unusually high or low. The general rule is to **buy** when the price touches the lower band and **sell** when it touches the upper band.
              </p>
            </label>
          </>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return <div style={{ color: '#eee' }}>Loading strategies...</div>;
  }

  if (error) {
    return <div style={{ color: '#dc3545' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: 'auto', backgroundColor: '#121e2c', color: '#eee' }}>
      <h1>My Trading Strategies</h1>
      <p style={{ fontSize: '16px', color: '#aaa' }}>
        Welcome! This is where you can define the trading rules that our system will use to find profitable opportunities in the market. You don't need to be an expert to get started. Just pick a strategy type and adjust its simple parameters.
      </p>

      <div style={{ padding: '20px', border: '1px solid #3e4e60', borderRadius: '8px', marginBottom: '40px', backgroundColor: '#1e2b3c' }}>
        <h2>Step 1: Create a New Trading Strategy</h2>
        <p style={{ fontStyle: 'italic', marginBottom: '20px', color: '#aaa' }}>
          Think of a strategy as a set of rules for your backtest. You'll give it a name and a set of simple, powerful rules that tell it when to buy or sell.
        </p>

        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div>
            <h3>Give Your Strategy a Name</h3>
            <label>
              Strategy Name:
              <input
                type="text"
                name="name"
                value={newStrategy.name}
                onChange={handleChange}
                required
                placeholder="e.g., The MACD Power Play"
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }}
              />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                Choose a unique and memorable name for your strategy. This helps you find it later.
              </p>
            </label>
            <label>
              Description:
              <textarea
                name="description"
                value={newStrategy.description}
                onChange={handleChange}
                placeholder="e.g., This strategy looks for trends using MACD."
                style={{ width: '100%', minHeight: '80px', padding: '8px', boxSizing: 'border-box', backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }}
              />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                A brief summary of what your strategy is designed to do. This is just for your own notes.
              </p>
            </label>
            
            <label>
              Strategy Type:
              <select name="strategyType" value={newStrategy.params.strategyType} onChange={handleChange} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }}>
                <option value="Moving Average Crossover">Moving Average Crossover</option>
                <option value="RSI">Relative Strength Index (RSI)</option>
                <option value="Bollinger Bands">Bollinger Bands</option>
              </select>
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                Pick one of the most popular trading rules. Each one uses a different mathematical tool to find buy and sell signals.
              </p>
            </label>
          </div>

          <div>
            <h3>Choose Your Strategy Type and Rules</h3>
            {renderStrategyParameters()}
          </div>
          <div style={{ gridColumn: 'span 2', textAlign: 'center', marginTop: '20px' }}>
            <button type="submit" style={{ padding: '12px 24px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Create Strategy</button>
          </div>
        </form>
      </div>

      <div style={{ padding: '20px', border: '1px solid #3e4e60', borderRadius: '8px', backgroundColor: '#1e2b3c' }}>
        <h2>Step 2: My Saved Strategies</h2>
        <p style={{ fontStyle: 'italic', marginBottom: '20px', color: '#aaa' }}>
          Here are all the strategies you have saved. You can use these strategies to run a backtest on different assets and timeframes.
        </p>

        {strategies.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {strategies.map((strategy) => (
              <li key={strategy._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid #333' }}>
                <span>
                  <strong>{strategy.name || "Unnamed Strategy"}</strong>
                  <br />
                  <span style={{ fontSize: '12px', color: '#888' }}>
                    Type: {strategy.params.strategyType}
                  </span>
                </span>
                <button onClick={() => handleDelete(strategy._id)} style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Delete</button>
              </li>
            ))}
          </ul>
        ) : (
          <div>
            <p style={{ color: '#aaa' }}>You haven't created any strategies yet. Get started by using the form above!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Strategies;
