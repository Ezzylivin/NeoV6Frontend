// File: src/pages/TradingBot.jsx
import React, { useState, useEffect } from "react";
import { useBot } from "../hooks/useBot.js";

const SYMBOLS = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT"];
const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];
const BALANCES = [100, 300, 500, 1000, 5000, 10000, 50000];
const STRATEGIES = ["default", "crossover", "momentum", "mean-reversion"];
const RISKS = ["low", "medium", "high"];

export default function TradingBot() {
  const { status, logs, loading, error, startBot, stopBot, getBotStatus } = useBot();

  const [symbol, setSymbol] = useState(SYMBOLS[0]);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[0]);
  const [initialBalance, setInitialBalance] = useState(BALANCES[2]);
  const [strategy, setStrategy] = useState(STRATEGIES[0]);
  const [risk, setRisk] = useState(RISKS[1]);
  const [showJSON, setShowJSON] = useState(false);

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

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Symbol */}
          <div>
            <label className="block mb-1">Symbol:</label>
            <select value={symbol} onChange={e => setSymbol(e.target.value)} className="p-2 rounded text-black">
              {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Timeframe */}
          <div>
            <label className="block mb-1">Timeframe:</label>
            <select value={timeframe} onChange={e => setTimeframe(e.target.value)} className="p-2 rounded text-black">
              {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
            </select>
          </div>

          {/* Initial Balance */}
          <div>
            <label className="block mb-1">Initial Balance ($):</label>
            <select value={initialBalance} onChange={e => setInitialBalance(Number(e.target.value))} className="p-2 rounded text-black">
              {BALANCES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Strategy */}
          <div>
            <label className="block mb-1">Strategy:</label>
            <select value={strategy} onChange={e => setStrategy(e.target.value)} className="p-2 rounded text-black">
              {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Risk */}
          <div>
            <label className="block mb-1">Risk:</label>
            <select value={risk} onChange={e => setRisk(e.target.value)} className="p-2 rounded text-black">
              {RISKS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={handleStart} className="bg-green-500 px-4 py-2 rounded" disabled={loading}>
            {loading ? "Starting..." : "Start Bot"}
          </button>
          <button onClick={handleStop} className="bg-red-500 px-4 py-2 rounded" disabled={loading}>
            {loading ? "Stopping..." : "Stop Bot"}
          </button>
          <button onClick={handleStatus} className="bg-blue-500 px-4 py-2 rounded" disabled={loading}>
            {loading ? "Checking..." : "Check Status"}
          </button>
          <button onClick={() => setShowJSON(prev => !prev)} className="bg-gray-600 px-4 py-2 rounded">
            {showJSON ? "Hide JSON" : "Show JSON"}
          </button>
        </div>

        {/* Error */}
        {error && <div className="text-red-500 mb-4"><strong>Error:</strong> {error}</div>}

        {/* Status */}
        {status && (
          <div className="mb-4 border border-gray-700 p-2 rounded">
            <strong>Status:</strong>
            <div>Symbol: {status.symbol}</div>
            <div>Balance: ${status.amount}</div>
            <div>Timeframes: {status.timeframes?.join(", ")}</div>
            <div>Strategy: {status.strategy}</div>
            <div>Risk: {status.risk}</div>
            <div>Running: {status.isRunning ? "Yes" : "No"}</div>

            {/* JSON Debug */}
            {showJSON && <pre className="bg-gray-800 text-sm p-2 mt-2 overflow-auto">{JSON.stringify(status, null, 2)}</pre>}
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Logs:</h3>
            <ul className="list-disc list-inside">
              {logs.map((log, idx) => (
                <li key={idx}>
                  {log.symbol && <span>Symbol: {log.symbol}, </span>}
                  {log.amount && <span>Balance: ${log.amount}, </span>}
                  {log.strategy && <span>Strategy: {log.strategy}, </span>}
                  {log.risk && <span>Risk: {log.risk}, </span>}
                  {log.message || JSON.stringify(log)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
