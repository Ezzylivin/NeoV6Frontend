// src/components/BotControl.jsx
import React, { useState } from 'react';

const BotControl = ({ accessToken }) => {
  const [mode, setMode] = useState('standard');
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [amount, setAmount] = useState(0.001);
  const [timeframes, setTimeframes] = useState(['5m']);
  const [status, setStatus] = useState('');

  const availableTimeframes = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d'];

  const toggleTimeframe = (tf) => {
    if (timeframes.includes(tf)) {
      setTimeframes(timeframes.filter((t) => t !== tf));
    } else {
      setTimeframes([...timeframes, tf]);
    }
  };

  const startBot = async () => {
    if (!symbol || !amount || timeframes.length === 0) {
      alert('Please fill in symbol, amount, and select at least one timeframe.');
      return;
    }

    try {
      const res = await fetch('/api/bot/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ mode, symbol, amount, timeframes }),
      });
      const data = await res.json();
      setStatus(data.status || 'Started');
    } catch (err) {
      setStatus('Error starting bot: ' + err.message);
    }
  };

  const stopBot = async () => {
    try {
      const res = await fetch('/api/bot/stop', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setStatus(data.status || 'Stopped');
    } catch (err) {
      setStatus('Error stopping bot: ' + err.message);
    }
  };

  return (
    <div>
      <label>
        Mode:
        <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ marginLeft: 8 }}>
          <option value="standard">Standard</option>
          <option value="pro">Pro</option>
        </select>
      </label>

      <br />

      <label>
        Symbol:
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="e.g. BTC/USDT"
          style={{ marginLeft: 8 }}
        />
      </label>

      <br />

      <label>
        Amount:
        <input
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value))}
          placeholder="Trade amount"
          style={{ marginLeft: 8 }}
        />
      </label>

      <br />

      <fieldset style={{ border: '1px solid #ccc', padding: '10px', marginTop: '10px' }}>
        <legend>Select Timeframes (Polling):</legend>
        {availableTimeframes.map((tf) => (
          <label key={tf} style={{ marginRight: '10px' }}>
            <input
              type="checkbox"
              checked={timeframes.includes(tf)}
              onChange={() => toggleTimeframe(tf)}
            />
            {tf}
          </label>
        ))}
      </fieldset>

      <br />

      <button onClick={startBot}>Start Bot</button>
      <button onClick={stopBot} style={{ marginLeft: '10px' }}>
        Stop Bot
      </button>

      <p>Status: {status}</p>
    </div>
  );
};

export default BotControl;

