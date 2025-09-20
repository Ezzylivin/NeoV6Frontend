import React, { useState, useEffect } from 'react';
import api, { setAuthToken } from '../api/apiClient.js';

// --- Data for Strategy Guides ---
const strategyGuides = {
    'ATR': {
        title: "ATR (Average True Range)",
        whatItIs: "ATR measures market volatility. Higher ATR means bigger price swings; lower ATR means a calmer market. It doesn't generate buy/sell signals on its own but is excellent for managing risk.",
        howItWorks: "A common use is setting a stop-loss. For a long entry, you might place a stop at 'entry price - (ATR × multiplier)'. This adapts your risk based on the current volatility.",
        combineWith: "Combine with trend indicators like SMA or MACD to confirm breakouts and manage risk."
    },
    'Bollinger Bands': {
        title: "Bollinger Bands",
        whatItIs: "These bands use a moving average plus standard deviations to show price volatility and relative price levels.",
        howItWorks: "The main idea is 'mean reversion'. A long entry is often triggered when the price touches or drops below the lower band (considered 'oversold'), with an exit when it hits the upper band.",
        combineWith: "Combine with RSI or a Stochastic Oscillator to get stronger confirmation of oversold or overbought conditions."
    },
    'CCI': {
        title: "CCI (Commodity Channel Index)",
        whatItIs: "CCI measures how far the current price has deviated from its statistical average. It's used to identify overbought or oversold levels.",
        howItWorks: "A long entry can be triggered when the CCI crosses up from below an oversold threshold (like -100). The exit could be when it crosses above an overbought threshold (like +100).",
        combineWith: "Use with trend indicators (like SMAs) to avoid taking trades that go against the dominant market direction."
    },
    'Ichimoku Cloud': {
        title: "Ichimoku Cloud",
        whatItIs: "Ichimoku is an all-in-one indicator showing trend, support/resistance levels, and momentum with multiple lines and a 'cloud'.",
        howItWorks: "A strong long entry signal occurs when the price is above the cloud and the 'Conversion Line' crosses above the 'Base Line'. The exit is the reverse.",
        combineWith: "It's a comprehensive system on its own, but can be paired with oscillators like RSI to confirm entries in ranging (sideways) markets."
    },
    'MACD': {
        title: "MACD (Moving Average Convergence Divergence)",
        whatItIs: "MACD is a popular indicator that shows both the trend's direction and its momentum by comparing two moving averages.",
        howItWorks: "A long entry is signaled when the main 'MACD line' crosses above the 'Signal line'. The exit is when it crosses back below.",
        combineWith: "Combine with ATR or Bollinger Bands to help avoid false signals ('whipsaws') when the market isn't trending strongly."
    },
    'On-Balance Volume': {
        title: "On-Balance Volume (OBV)",
        whatItIs: "OBV tracks the cumulative buying and selling pressure by looking at trading volume. A rising OBV suggests buyers are in control.",
        howItWorks: "A key signal is 'divergence'. If the price is making new highs but the OBV is not, it could mean the trend is losing steam and might reverse.",
        combineWith: "Use with a trend indicator like a Simple Moving Average (SMA) to confirm that the price action agrees with the volume pressure."
    },
    'Parabolic SAR': {
        title: "Parabolic SAR (Stop and Reverse)",
        whatItIs: "This indicator places dots on the chart that show the trend's direction. Dots below the price indicate an uptrend; dots above indicate a downtrend.",
        howItWorks: "A long entry is signaled when the dots flip from being above the price to below it. The exit is when they flip back above.",
        combineWith: "Excellent for trend-following. It can be paired with ATR to help manage your stop-loss distance dynamically."
    },
    'RSI': {
        title: "RSI (Relative Strength Index)",
        whatItIs: "RSI is a momentum oscillator that measures the speed and change of price movements to identify overbought (>70) and oversold (<30) conditions.",
        howItWorks: "A common long entry is when the RSI crosses up from below the oversold threshold (e.g., 30). The exit could be when it crosses the overbought threshold (e.g., 70).",
        combineWith: "Best in range-bound (sideways) markets. Use with a trend indicator like an SMA to avoid trading against a strong trend."
    },
    'Moving Average Crossover': {
        title: "SMA (Simple Moving Average) Crossover",
        whatItIs: "This classic trend-following strategy uses two moving averages: one short-term ('fast') and one long-term ('slow').",
        howItWorks: "A long entry is signaled when the fast moving average crosses above the slow moving average (a 'Golden Cross'). The exit is when it crosses back below (a 'Death Cross').",
        combineWith: "Works well in trending markets. Can be combined with ATR to filter for volatility or RSI for confirmation."
    },
    'Stochastic Oscillator': {
        title: "Stochastic Oscillator",
        whatItIs: "The Stochastic is a momentum indicator that compares a closing price to its price range over a certain period.",
        howItWorks: "A long entry is signaled when the main '%K' line crosses above the '%D' line in the oversold zone (e.g., below 20). The exit is when it crosses below in the overbought zone (e.g., above 80).",
        combineWith: "Great in range-bound markets. Use with a trend indicator like MACD to filter out false signals during strong trends."
    }
};

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

  const fetchStrategies = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (token) {
        setAuthToken(token);
      }
      const response = await api.get("/strategy");
      const data = response.data;
      setStrategies(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'strategyType') {
        const resetParams = {
            'Moving Average Crossover': { shortPeriod: 10, longPeriod: 50 },
            'RSI': { rsiPeriod: 14, overbought: 70, oversold: 30 },
            'Bollinger Bands': { period: 20, numStdDev: 2 },
            'Stochastic Oscillator': { kPeriod: 14, dPeriod: 3, overbought: 80, oversold: 20 },
            'MACD': { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
            'Parabolic SAR': { start: 0.02, increment: 0.02, max: 0.2 },
            'On-Balance Volume': { maPeriod: 20 },
            'CCI': { period: 20, overbought: 100, oversold: -100 },
            'ATR': { period: 14, multiplier: 2 },
            'Ichimoku Cloud': { conversionLinePeriod: 9, baseLinePeriod: 26, laggingSpanPeriod: 26, leadingSpanBPeriod: 52 },
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

  const handleDelete = async (strategyId) => {
    if (!window.confirm("Are you sure you want to delete this strategy?")) return;
    try {
      await api.delete(`/strategy/${strategyId}`);
      setStrategies(strategies.filter(s => s._id !== strategyId));
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };
  
  const renderStrategyParameters = () => {
    const p = newStrategy.params;
    const guide = strategyGuides[p.strategyType];
    let parameterInputs = null;

    // Dynamically generate inputs based on keys in params, excluding strategyType
    parameterInputs = Object.keys(p).filter(key => key !== 'strategyType').map(key => (
        <label key={key}>
            {/* Convert camelCase to Title Case for labels */}
            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
            <input 
                type="number" 
                name={key} 
                value={p[key]} 
                onChange={handleChange} 
                required 
                style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} 
            />
        </label>
    ));

    return (
        <div>
            {parameterInputs}
            {guide && (
                <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #3e4e60', color: '#cbd5e1', fontSize: '13px' }}>
                    <h4 style={{ fontWeight: '600', color: '#94a3b8' }}>{guide.title} Guide</h4>
                    <p style={{ marginTop: '8px' }}><strong>What it is:</strong> {guide.whatItIs}</p>
                    <p style={{ marginTop: '4px' }}><strong>How it works:</strong> {guide.howItWorks}</p>
                    <p style={{ marginTop: '4px' }}><strong>Combine With:</strong> {guide.combineWith}</p>
                </div>
            )}
        </div>
    );
  };

  if (isLoading) return <div style={{ color: '#eee' }}>Loading...</div>;
  if (error) return <div style={{ color: '#dc3545' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: 'auto', backgroundColor: '#121e2c', color: '#eee' }}>
      <h1>My Trading Strategies</h1>
      <p style={{ fontSize: '16px', color: '#aaa' }}>Define trading rules to find market opportunities. Pick a strategy type and adjust its parameters.</p>

      <div style={{ padding: '20px', border: '1px solid #3e4e60', borderRadius: '8px', marginBottom: '40px', backgroundColor: '#1e2b3c' }}>
        <h2>Create a New Trading Strategy</h2>
        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          {/* LEFT COLUMN */}
          <div>
            <h3>Configuration</h3>
            <label>
              Strategy Type:
              <select name="strategyType" value={newStrategy.params.strategyType} onChange={handleChange} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }}>
                 {Object.keys(strategyGuides).map(type => <option key={type} value={type}>{strategyGuides[type].title}</option>)}
              </select>
            </label>
            <label>
              Strategy Name:
              <input type="text" name="name" value={newStrategy.name} onChange={handleChange} required placeholder="e.g., My MACD Trend Follower" style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
            </label>
            <label>
              Description:
              <textarea name="description" value={newStrategy.description} onChange={handleChange} placeholder="A short note about this strategy." style={{ width: '100%', minHeight: '80px', padding: '8px', boxSizing: 'border-box', backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
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

