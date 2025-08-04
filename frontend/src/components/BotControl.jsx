// File: src/components/BotControl.jsx
import React, { useState } from 'react';
import { startBot, stopBot, getBotStatus } from '../api/bot';

const BotControl = ({ accessToken }) => {
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [timeframes, setTimeframes] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  // Optional: Load current bot status on mount
  React.useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await getBotStatus();
        setStatus(res.data);
      } catch {
        setStatus(null);
      }
    }
    fetchStatus();
  }, []);

  const handleStart = async () => {
    try {
      await startBot(symbol, amount, timeframes);
      setStatus('Running');
      setError('');
    } catch (err) {
      setError('Failed to start bot');
    }
  };

  const handleStop = async () => {
    try {
      await stopBot();
      setStatus('Stopped');
      setError('');
    } catch {
      setError('Failed to stop bot');
    }
  };

  return (
    <div>
      <h3>Bot Control</h3>
      <input
        type="text"
        placeholder="Symbol"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
      />
      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <input
        type="text"
        placeholder="Timeframes (comma-separated)"
        value={timeframes}
        onChange={(e) => setTimeframes(e.target.value)}
      />
      <div>
        <button onClick={handleStart}>Start Bot</button>
        <button onClick={handleStop}>Stop Bot</button>
      </div>
      {status && <p>Status: {status}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default BotControl;
