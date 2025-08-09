import React, { useState } from 'react';
import { startBot, stopBot, getBotStatus } from '../api/bot';

export default function BotTraining() {
  const [symbol, setSymbol] = useState('');
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState([]);

  const handleStart = async () => {
    try {
      const res = await startBot(symbol);
      setStatus(res.status || 'Bot started');
    } catch (error) {
      console.error(error);
    }
  };

  const handleStop = async () => {
    try {
      const res = await stopBot(symbol);
      setStatus(res.status || 'Bot stopped');
    } catch (error) {
      console.error(error);
    }
  };

  const handleStatus = async () => {
    try {
      const res = await getBotStatus(symbol);
      setStatus(res.status || 'Unknown');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Bot Training</h1>

      <input
        type="text"
        placeholder="Enter symbol (e.g., BTC/USDT)"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
      />

      <div style={{ marginTop: '1rem' }}>
        <button onClick={handleStart}>Start Bot</button>
        <button onClick={handleStop}>Stop Bot</button>
        <button onClick={handleStatus}>Check Status</button>
      </div>

      {status && (
        <div style={{ marginTop: '1rem' }}>
          <strong>Status:</strong> {status}
        </div>
      )}

      {logs.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Logs:</h3>
          <ul>
            {logs.map((log, idx) => (
              <li key={idx}>{log}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
