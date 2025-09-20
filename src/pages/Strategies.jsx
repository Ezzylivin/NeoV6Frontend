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
      
      if (Array.isArray(data)) {
        setStrategies(data);
      } else if (data && Array.isArray(data.strategies)) {
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
    if (name === 'strategyType') {
        const resetParams = {
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
        setNewStrategy(prev => ({
            ...prev,
            params: {
                strategyType: value,
                ...resetParams[value],
            },
        }));
    } else if (Object.keys(newStrategy.params).includes(name)) {
        setNewStrategy(prev => ({
            ...prev,
            params: {
                ...prev.params,
                [name]: value,
            },
        }));
    } else {
        setNewStrategy(prev => ({
            ...prev,
            [name]: value,
        }));
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
    const p = newStrategy.params;
    switch (p.strategyType) {
      case 'Moving Average Crossover':
        return (
          <>
            <label>
              Short Period:
              <input type="number" name="shortPeriod" value={p.shortPeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                This is the **"fast"** moving average. A smaller number reacts faster to new price changes.
              </p>
            </label>
            <label>
              Long Period:
              <input type="number" name="longPeriod" value={p.longPeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                This is the **"slow"** moving average. This line shows the long-term trend.
              </p>
            </label>
            <p style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '14px', color: '#ddd' }}>
              **The rule:** Buy when the fast line crosses above the slow line, and sell when it crosses below. 
            </p>
          </>
        );
      case 'RSI':
        return (
          <>
            <label>
              RSI Period:
              <input type="number" name="rsiPeriod" value={p.rsiPeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                The RSI measures if an asset is overbought or oversold based on the last **{p.rsiPeriod}** periods.
              </p>
            </label>
            <p style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '14px', color: '#ddd' }}>
              **The rule:** Buy when RSI is low (e.g., below 30) and sell when it is high (e.g., above 70).
            </p>
          </>
        );
      case 'Bollinger Bands':
        return (
          <>
            <label>
              Period:
              <input type="number" name="period" value={p.period} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                The length for the central moving average line of the bands.
              </p>
            </label>
            <label>
              Standard Deviations:
              <input type="number" name="numStdDev" value={p.numStdDev} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
               <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                Sets how wide the bands are. A bigger number makes the bands wider.
              </p>
            </label>
            <p style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '14px', color: '#ddd' }}>
              **The rule:** Buy when the price touches the lower band and sell when it touches the upper band. 
            </p>
          </>
        );
      // ... other cases for other strategies
      default:
        return null;
    }
  };

  if (isLoading) return <div style={{ color: '#eee' }}>Loading strategies...</div>;
  if (error) return <div style={{ color: '#dc3545' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: 'auto', backgroundColor: '#121e2c', color: '#eee' }}>
      <h1>My Trading Strategies</h1>
      <p style={{ fontSize: '16px', color: '#aaa' }}>
        Welcome! Define the trading rules our system will use to find profitable opportunities. Pick a strategy type and adjust its parameters.
      </p>

      <div style={{ padding: '20px', border: '1px solid #3e4e60', borderRadius: '8px', marginBottom: '40px', backgroundColor: '#1e2b3c' }}>
        <h2>Step 1: Create a New Trading Strategy</h2>
        <p style={{ fontStyle: 'italic', marginBottom: '20px', color: '#aaa' }}>
          A strategy is a set of rules for your backtest. Give it a name and choose the rules that tell it when to buy or sell.
        </p>

        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          {/* LEFT COLUMN */}
          <div>
            <h3>Configure Your Strategy</h3>
            {/* ✅ MOVED: Strategy Type is now at the top */}
            <label>
              Strategy Type:
              <select name="strategyType" value={newStrategy.params.strategyType} onChange={handleChange} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }}>
                <option value="Moving Average Crossover">Moving Average Crossover</option>
                <option value="RSI">Relative Strength Index (RSI)</option>
                <option value="Bollinger Bands">Bollinger Bands</option>
                <option value="Stochastic Oscillator">Stochastic Oscillator</option>
                <option value="MACD">MACD</option>
                <option value="Parabolic SAR">Parabolic SAR</option>
                <option value="On-Balance Volume">On-Balance Volume</option>
                <option value="CCI">Commodity Channel Index (CCI)</option>
                <option value="ATR">Average True Range (ATR)</option>
                <option value="Ichimoku Cloud">Ichimoku Cloud</option>
              </select>
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                Pick one of the most popular trading rules.
              </p>
            </label>
            <label>
              Strategy Name:
              <input type="text" name="name" value={newStrategy.name} onChange={handleChange} required placeholder="e.g., The MACD Power Play" style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                Choose a unique and memorable name for your strategy.
              </p>
            </label>
            <label>
              Description:
              <textarea name="description" value={newStrategy.description} onChange={handleChange} placeholder="e.g., This strategy looks for trends using MACD." style={{ width: '100%', minHeight: '80px', padding: '8px', boxSizing: 'border-box', backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                A brief summary of what this strategy is designed to do.
              </p>
            </label>
          </div>

          {/* RIGHT COLUMN */}
          <div>
            <h3>Set the Strategy's Rules</h3>
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
          Here are all the strategies you have saved. You can use these to run backtests.
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

