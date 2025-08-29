import React, { useState, useEffect } from 'react';
import { useBot } from '../hooks/useBot.js';

const SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT'];
const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
const BALANCES = [100, 300, 500, 1000, 5000, 10000, 50000];
const STRATEGIES = ['default', 'crossover', 'mean-reversion', 'momentum'];
const RISKS = ['low', 'medium', 'high'];

export default function TradingBot() {
  const { status, logs, loading, error, startBot, stopBot, getBotStatus } = useBot();

  const [symbol, setSymbol] = useState(SYMBOLS[0]);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[0]);
  const [initialBalance, setInitialBalance] = useState(BALANCES[2]);
  const [strategy, setStrategy] = useState(STRATEGIES[0]);
  const [risk, setRisk] = useState(RISKS[1]);

  useEffect(() => {
    getBotStatus();
  }, []);

  const handleStart = async () => {
    await startBot({
      symbol,
      timeframes: [timeframe],
      amount: initialBalance,
      strategy,
      risk,
    });
  };

  const handleStop = async () => {
    await stopBot();
  };

  const handleStatus = async () => {
    await getBotStatus();
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-black text-white">
      <div className="w-full max-w-3xl p-6 border border-gray-700 rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Trading Bot</h1>

        {/* Symbol */}
        <div className="mb-4">
          <label className="block mb-1">Select Symbol:</label>
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="w-full p-2 rounded text-black">
            {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Timeframe */}
        <div className="mb-4">
          <label className="block mb-1">Select Timeframe:</label>
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="w-full p-2 rounded text-black">
            {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
          </select>
        </div>

        {/* Initial Balance */}
        <div className="mb-4">
          <label className="block mb-1">Initial Balance ($):</label>
          <select value={initialBalance} onChange={(e) => setInitialBalance(Number(e.target.value))} className="w-full p-2 rounded text-black">
            {BALANCES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Strategy */}
        <div className="mb-4">
          <label className="block mb-1">Strategy:</label>
          <select value={strategy} onChange={(e) => setStrategy(e.target.value)} className="w-full p-2 rounded text-black">
            {STRATEGIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Risk */}
        <div className="mb-4">
          <label className="block mb-1">Risk Level:</label>
          <select value={risk} onChange={(e) => setRisk(e.target.value)} className="w-full p-2 rounded text-black">
            {RISKS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 mb-4">
          <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={handleStart} disabled={loading}>
            {loading ? 'Starting...' : 'Start Bot'}
          </button>
          <button className="bg-red-500 text-white px-4 py-2 rounded" onClick={handleStop} disabled={loading}>
            {loading ? 'Stopping...' : 'Stop Bot'}
          </button>
          <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleStatus} disabled={loading}>
            {loading ? 'Checking...' : 'Check Status'}
          </button>
        </div>

        {/* Status & Logs */}
        {error && <div className="text-red-500 mb-4"><strong>Error:</strong> {error}</div>}
        {status && <div className="mb-4"><strong>Status:</strong> {JSON.stringify(status)}</div>}

        {logs.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Logs:</h3>
            <ul className="list-disc list-inside">
              {logs.map((log, idx) => <li key={idx}>{log}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
