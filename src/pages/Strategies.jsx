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
          'Stochastic Oscillator': { kPeriod: 14, dPeriod: 3 },
          'MACD': { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
          'Parabolic SAR': { accelerationFactorStart: 0.02, accelerationFactorIncrement: 0.02, accelerationFactorMaximum: 0.2 },
          'On-Balance Volume': { obvPeriod: 10 },
          'CCI': { cciPeriod: 20 },
          'ATR': { atrPeriod: 14 },
          'Ichimoku Cloud': { conversionLinePeriod: 9, baseLinePeriod: 26, laggingSpanPeriod: 26, cloudSpanPeriod: 52 },
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
    const p = newStrategy.params;
    switch (p.strategyType) {
      case 'Moving Average Crossover':
        return (
          <>
            <label>
              Short Period:
              <input type="number" name="shortPeriod" value={p.shortPeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                This is the **"fast"** moving average. It looks at the last **{p.shortPeriod}** days (or hours, depending on your timeframe). A smaller number means it reacts faster to new price changes, but can also give false alarms. Think of it like a quick-response news alert.
              </p>
            </label>
            <label>
              Long Period:
              <input type="number" name="longPeriod" value={p.longPeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                This is the **"slow"** moving average. It looks at the last **{p.longPeriod}** days. This line is much smoother and shows the overall, long-term trend. Think of it like a newspaper that reports on a story much later.
              </p>
            </label>
            <p style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '14px', color: '#ddd' }}>
              **The rule:** The strategy will look to **buy** when the fast line crosses **above** the slow line, and **sell** when the fast line crosses **below** the slow one. 
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
                The **RSI (Relative Strength Index)** is a number that tells you if an asset has been bought or sold too much. This number is based on its price movements over the last **{p.rsiPeriod}** days.
              </p>
            </label>
            <p style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '14px', color: '#ddd' }}>
              **The rule:** The strategy will look to **buy** when the RSI is very low (below 30), suggesting the asset is "oversold," and **sell** when it is very high (above 70), suggesting it's "overbought" and a price drop might be coming. 

[Image of RSI Indicator]

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
                This sets the length for the central line of the Bollinger Bands, which is the average price over the last **{p.period}** days. This line shows the average price.
              </p>
            </label>
            <label>
              Standard Deviations:
              <input type="number" name="numStdDev" value={p.numStdDev} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                This number sets how wide the bands are. A bigger number makes the bands wider, meaning the price has to move more to reach them. The bands tell you if the price is unusually high or low on a relative basis.
              </p>
            </label>
            <p style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '14px', color: '#ddd' }}>
              **The rule:** This strategy looks for the price to touch the edges of the bands to identify overbought or oversold conditions. The general rule is to **buy** when the price touches the lower band and **sell** when it touches the upper band. 
            </p>
          </>
        );
      case 'Stochastic Oscillator':
        return (
          <>
            <label>
              %K Period:
              <input type="number" name="kPeriod" value={p.kPeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                The **Stochastic Oscillator** measures an asset's momentum and speed. The **%K period** compares a closing price to its price range over the last **{p.kPeriod}** days.
              </p>
            </label>
            <label>
              %D Period:
              <input type="number" name="dPeriod" value={p.dPeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                The **%D period** is a moving average of the %K line, used to smooth out the signals and reduce noise.
              </p>
            </label>
            <p style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '14px', color: '#ddd' }}>
              **The rule:** This strategy looks to **buy** when the %K line crosses **above** the %D line, and **sell** when the %K line crosses **below** the %D line. 

[Image of Stochastic Oscillator]

            </p>
          </>
        );
      case 'MACD':
        return (
          <>
            <label>
              Fast Period:
              <input type="number" name="fastPeriod" value={p.fastPeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                This is the **"fast"** moving average for the MACD, typically over 12 periods.
              </p>
            </label>
            <label>
              Slow Period:
              <input type="number" name="slowPeriod" value={p.slowPeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                This is the **"slow"** moving average, typically over 26 periods.
              </p>
            </label>
            <label>
              Signal Period:
              <input type="number" name="signalPeriod" value={p.signalPeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                A moving average of the MACD line itself, typically over 9 periods, which helps generate buy and sell signals.
              </p>
            </label>
            <p style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '14px', color: '#ddd' }}>
              **The rule:** The strategy will look to **buy** when the MACD line crosses **above** the signal line and **sell** when it crosses **below** the signal line. 
            </p>
          </>
        );
      case 'Parabolic SAR':
        return (
          <>
            <label>
              Acceleration Factor (Start):
              <input type="number" name="accelerationFactorStart" value={p.accelerationFactorStart} onChange={handleChange} required step="0.01" style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                This controls the sensitivity of the dots that appear above or below the price. A lower number makes the indicator less sensitive.
              </p>
            </label>
            <label>
              Acceleration Factor (Increment):
              <input type="number" name="accelerationFactorIncrement" value={p.accelerationFactorIncrement} onChange={handleChange} required step="0.01" style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                This is the amount by which the acceleration factor increases with each new trend high or low.
              </p>
            </label>
            <label>
              Acceleration Factor (Maximum):
              <input type="number" name="accelerationFactorMaximum" value={p.accelerationFactorMaximum} onChange={handleChange} required step="0.01" style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                This sets the upper limit for the acceleration factor, preventing the indicator from becoming too sensitive and giving false signals.
              </p>
            </label>
            <p style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '14px', color: '#ddd' }}>
              **The rule:** This strategy looks to **buy** when the dots flip from **above** the price to **below** it, and **sell** when the dots flip from **below** the price to **above** it. 
            </p>
          </>
        );
      case 'On-Balance Volume':
        return (
          <>
            <label>
              OBV Period:
              <input type="number" name="obvPeriod" value={p.obvPeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                The **OBV (On-Balance Volume)** measures volume flow to predict price changes. This sets the period for a moving average that is applied to the OBV line to help identify the underlying trend.
              </p>
            </label>
            <p style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '14px', color: '#ddd' }}>
              **The rule:** The main rule is to look for a divergence between the OBV line and the asset's price. For example, a rising price with a falling OBV suggests the uptrend is losing momentum. 
            </p>
          </>
        );
      case 'CCI':
        return (
          <>
            <label>
              CCI Period:
              <input type="number" name="cciPeriod" value={p.cciPeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                The **Commodity Channel Index (CCI)** measures the current price relative to an average price. A high CCI value suggests the price is above its average, which could indicate the beginning of an uptrend. A low value suggests the price is below its average.
              </p>
            </label>
            <p style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '14px', color: '#ddd' }}>
              **The rule:** This strategy looks to **buy** when the CCI crosses **above** 100, and **sell** when it crosses **below** -100. 
            </p>
          </>
        );
      case 'ATR':
        return (
          <>
            <label>
              ATR Period:
              <input type="number" name="atrPeriod" value={p.atrPeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                The **Average True Range (ATR)** measures how much an asset's price is moving on average over the last **{p.atrPeriod}** days. This number shows volatility but does not provide buy or sell signals on its own. It's best used for managing risk by setting your stop loss.
              </p>
            </label>
            <p style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '14px', color: '#ddd' }}>
              **The rule:** The ATR is primarily used for **risk management**. A common rule is to place a **stop loss** at a distance of 1.5 to 2 times the ATR from your entry price. 
            </p>
          </>
        );
      case 'Ichimoku Cloud':
        return (
          <>
            <label>
              Conversion Line Period (Tenkan-sen):
              <input type="number" name="conversionLinePeriod" value={p.conversionLinePeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                The fastest line, based on the average of the last 9 periods.
              </p>
            </label>
            <label>
              Base Line Period (Kijun-sen):
              <input type="number" name="baseLinePeriod" value={p.baseLinePeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                The slower line, based on the average of the last 26 periods.
              </p>
            </label>
            <label>
              Lagging Span Period (Chikou Span):
              <input type="number" name="laggingSpanPeriod" value={p.laggingSpanPeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                The current closing price shifted back 26 periods.
              </p>
            </label>
            <label>
              Cloud Span Period (Senkou Span):
              <input type="number" name="cloudSpanPeriod" value={p.cloudSpanPeriod} onChange={handleChange} required style={{ backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                The number of periods to look at for the "cloud" that forecasts price movement.
              </p>
            </label>
            <p style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '14px', color: '#ddd' }}>
              **The rule:** The core rule is to **buy** when the price is **above** the cloud and the fast line crosses **above** the slow line. You would **sell** when the opposite happens. 
            </p>
          </>
        );
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
              <input type="text" name="name" value={newStrategy.name} onChange={handleChange} required placeholder="e.g., The MACD Power Play" style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                Choose a unique and memorable name for your strategy. This helps you find it later.
              </p>
            </label>
            <label>
              Description:
              <textarea name="description" value={newStrategy.description} onChange={handleChange} placeholder="e.g., This strategy looks for trends using MACD." style={{ width: '100%', minHeight: '80px', padding: '8px', boxSizing: 'border-box', backgroundColor: '#2e3d51', color: '#eee', border: '1px solid #3e4e60' }} />
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
                <option value="Stochastic Oscillator">Stochastic Oscillator</option>
                <option value="MACD">MACD</option>
                <option value="Parabolic SAR">Parabolic SAR</option>
                <option value="On-Balance Volume">On-Balance Volume</option>
                <option value="CCI">Commodity Channel Index (CCI)</option>
                <option value="ATR">Average True Range (ATR)</option>
                <option value="Ichimoku Cloud">Ichimoku Cloud</option>
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
