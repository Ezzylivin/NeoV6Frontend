import React, { useState, useEffect } from 'react';
import api, { setAuthToken } from '../api/apiClient.js';

// --- Data for Strategy Guides ---
const strategyGuides = {
    'ATR': {
        whatItIs: "ATR measures market volatility. Higher ATR = bigger price swings, lower ATR = calmer market. ATR itself isn’t a signal generator—it tells you how much a price typically moves.",
        howItWorks: "Long Entry: Price breaks above previous close + (ATR × multiplier) → a volatility breakout. Long Exit: Price drops below entry - (ATR × multiplier) → stop-loss.",
        combineWith: "Combine With: Momentum or trend indicators (SMA, MACD) to filter false breakouts."
    },
    'Bollinger Bands': {
        whatItIs: "Bollinger Bands use a moving average + standard deviations to show price volatility.",
        howItWorks: "Long Entry: Price touches or drops below the lower band (oversold). Long Exit: Price touches or crosses the upper band.",
        combineWith: "Combine With: RSI or ATR for confirmation of oversold/overbought conditions."
    },
    'CCI': {
        whatItIs: "CCI measures deviation from the average price; identifies overbought/oversold levels.",
        howItWorks: "Long Entry: CCI crosses below oversold threshold (e.g., -100). Long Exit: CCI crosses above overbought threshold (e.g., 100).",
        combineWith: "Combine With: Trend indicators to avoid counter-trend trades."
    },
    'Ichimoku Cloud': {
        whatItIs: "Ichimoku combines multiple lines and a “cloud” to show trend, support/resistance, and momentum.",
        howItWorks: "Long Entry: Price above cloud + conversion line crosses above base line. Long Exit: Price drops below cloud or conversion crosses below base.",
        combineWith: "Combine With: Oscillators (RSI, Stochastic) to confirm entries in ranging markets."
    },
    'MACD': {
        whatItIs: "MACD shows momentum and trend direction using fast & slow EMA differences.",
        howItWorks: "Long Entry: MACD line crosses above signal line. Long Exit: MACD line crosses below signal line.",
        combineWith: "Combine With: ATR or Bollinger Bands to avoid whipsaws in sideways markets."
    },
    'On-Balance Volume': {
        whatItIs: "OBV tracks cumulative buying/selling pressure via volume. Divergence signals potential trend reversal.",
        howItWorks: "Long Entry: OBV crosses below its moving average → buy before trend rises. Long Exit: OBV crosses above MA.",
        combineWith: "Combine With: SMA or MACD to confirm price trend aligns with volume."
    },
    'Parabolic SAR': {
        whatItIs: "Parabolic SAR (Stop and Reverse) generates trend-based signals. Dots above price → downtrend, dots below → uptrend.",
        howItWorks: "Long Entry: Price closes above SAR dot. Long Exit: Price closes below SAR dot.",
        combineWith: "Combine With: ATR to manage stop-loss dynamically."
    },
    'RSI': {
        whatItIs: "RSI measures overbought and oversold conditions.",
        howItWorks: "Long Entry: RSI crosses below oversold threshold (30). Long Exit: RSI crosses above overbought threshold (70).",
        combineWith: "Combine With: Trend indicators like SMA or Ichimoku to avoid counter-trend trades."
    },
    'Moving Average Crossover': {
        whatItIs: "Simple Moving Average crossover strategy uses fast and slow MA lines.",
        howItWorks: "Long Entry: Fast MA crosses above slow MA. Long Exit: Fast MA crosses below slow MA.",
        combineWith: "Combine With: ATR for volatility filter or RSI for oversold/overbought confirmation."
    },
    'Stochastic Oscillator': {
        whatItIs: "Stochastic measures momentum relative to recent high/low.",
        howItWorks: "Long Entry: %K crosses above %D in oversold zone (<20). Long Exit: %K crosses below %D in overbought zone (>80).",
        combineWith: "Combine With: Trend indicators like SMA or MACD to filter false signals during strong trends."
    }
};

// --- Initial state for a new strategy ---
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
      const data = response.data;
      
      if (Array.isArray(data)) {
        setStrategies(data);
      } else if (data && Array.isArray(data.strategies)) {
        setStrategies(data.strategies);
      } else {
        setStrategies([]);
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message);
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
            params: { ...prev.params, [name]: value },
        }));
    } else {
        setNewStrategy(prev => ({ ...prev, [name]: value }));
    }
  };

  // Function to handle form submission for a new strategy
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

  // Function to handle deleting a strategy
  const handleDelete = async (strategyId) => {
    if (!window.confirm("Are you sure you want to delete this strategy?")) return;
    try {
      await api.delete(`/strategy/${strategyId}`);
      setStrategies(strategies.filter(s => s._id !== strategyId));
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };
  
  // A helper function to render dynamic parameters and guides
  const renderStrategyParameters = () => {
    const p = newStrategy.params;
    const guide = strategyGuides[p.strategyType];
    
    let parameterInputs = null;

    switch (p.strategyType) {
        case 'Moving Average Crossover':
            parameterInputs = (
              <>
                <label>Short Period:<input type="number" name="shortPeriod" value={p.shortPeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} /></label>
                <label>Long Period:<input type="number" name="longPeriod" value={p.longPeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} /></label>
              </>
            );
            break;
        case 'RSI':
            parameterInputs = <label>RSI Period:<input type="number" name="rsiPeriod" value={p.rsiPeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} /></label>;
            break;
        case 'Bollinger Bands':
             parameterInputs = (
              <>
                <label>Period:<input type="number" name="period" value={p.period} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} /></label>
                <label>Standard Deviations:<input type="number" name="numStdDev" value={p.numStdDev} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} /></label>
              </>
            );
            break;
        // ... other cases for other strategies
        default:
            parameterInputs = null;
    }

    return (
        <div>
            {parameterInputs}
            {guide && (
                <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #3e4e60', color: '#cbd5e1' }}>
                    <h4 style={{ fontWeight: '600', color: '#94a3b8' }}>Strategy Guide</h4>
                    <p style={{ fontSize: '12px', marginTop: '8px' }}><strong>What it is:</strong> {guide.whatItIs}</p>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}><strong>How it works:</strong> {guide.howItWorks}</p>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}><strong>Combine With:</strong> {guide.combineWith}</p>
                </div>
            )}
        </div>
    );
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
        <h2>Create a New Trading Strategy</h2>
        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          {/* LEFT COLUMN */}
          <div>
            <h3>Configuration</h3>
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
            </label>
            <label>
              Strategy Name:
              <input type="text" name="name" value={newStrategy.name} onChange={handleChange} required placeholder="e.g., The MACD Power Play" style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
            </label>
            <label>
              Description:
              <textarea name="description" value={newStrategy.description} onChange={handleChange} placeholder="e.g., This strategy looks for trends using MACD." style={{ width: '100%', minHeight: '80px', padding: '8px', boxSizing: 'border-box', backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
            </label>
          </div>

          {/* RIGHT COLUMN */}
          <div>
            <h3>Parameters & Guide</h3>
            {renderStrategyParameters()}
          </div>
          
          <div style={{ gridColumn: 'span 2', textAlign: 'center', marginTop: '20px' }}>
            <button type="submit" style={{ padding: '12px 24px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Create Strategy</button>
          </div>
        </form>
      </div>

      <div style={{ padding: '20px', border: '1px solid #3e4e60', borderRadius: '8px', backgroundColor: '#1e2b3c' }}>
        <h2>My Saved Strategies</h2>
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
          <p style={{ color: '#aaa' }}>You haven't created any strategies yet. Get started by using the form above!</p>
        )}
      </div>
    </div>
  );
};

export default Strategies;

