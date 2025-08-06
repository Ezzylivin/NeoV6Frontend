import React, { useEffect, useState } from 'react';
import { startBot, stopBot, getBotStatus } from '../api/bot';
import AuthContext from '../context/AuthContext';

const BotControlPanel = () => {
  const { token } = useContext(AuthContext);

  const [status, setStatus] = useState(null);
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [timeframes, setTimeframes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchStatus = async () => {
    try {
      const data = await getBotStatus(token);
      setStatus(data);
    } catch (err) {
      setMessage('Failed to fetch bot status');
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleStart = async () => {
    setLoading(true);
    setMessage('');
    try {
      const tfArray = timeframes.split(',').map(tf => tf.trim());
      await startBot(token, symbol, parseFloat(amount), tfArray);
      setMessage('✅ Bot started!');
      fetchStatus();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    setMessage('');
    try {
      await stopBot(token);
      setMessage('🛑 Bot stopped!');
      fetchStatus();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>🤖 Bot Control Panel</h2>

      <p><strong>Status:</strong> {status?.isRunning ? '🟢 Running' : '🔴 Stopped'}</p>

      <div style={{ marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Symbol (e.g. BTC/USDT)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          style={{ width: '100%', padding: 8 }}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <input
          type="number"
          placeholder="Amount (e.g. 100)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ width: '100%', padding: 8 }}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Timeframes (comma separated, e.g. 5m,1h)"
          value={timeframes}
          onChange={(e) => setTimeframes(e.target.value)}
          style={{ width: '100%', padding: 8 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={handleStart} disabled={loading} style={{ padding: '8px 16px' }}>
          🚀 Start Bot
        </button>
        <button onClick={handleStop} disabled={loading} style={{ padding: '8px 16px' }}>
          🛑 Stop Bot
        </button>
      </div>

      {message && <p style={{ marginTop: 10 }}>{message}</p>}
    </div>
  );
};

export default BotControlPanel;
