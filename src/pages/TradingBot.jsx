import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBacktest } from "../hooks/useBacktest.js";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

export default function TradingBot() {
  const { user } = useAuth();
  const { results, options, loading, error, fetchOptions, fetchBacktests } = useBacktest();

  const SYMBOLS = options.symbols || ["BTCUSDT", "ETHUSDT"];
  const TIMEFRAMES = options.timeframes || ["1m", "5m"];
  const BALANCES = options.balances || [100, 500, 1000];
  const RISKS = options.risks || ["Low", "Medium", "High"];

  const [form, setForm] = useState({
    symbol: SYMBOLS[0],
    timeframe: TIMEFRAMES[0],
    initialBalance: BALANCES[1],
    strategy: options.strategies?.[0] || "",
    risk: RISKS[1],
  });

  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com/api";

  useEffect(() => {
    if (user?._id) {
      fetchOptions();
      fetchBacktests();
    }
  }, [user]);

  useEffect(() => {
    if (options.strategies?.length) {
      setForm(f => ({ ...f, strategy: options.strategies[0] }));
    }
  }, [options]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === "initialBalance" ? Number(value) : value }));
  };

  const startBot = async () => {
    setLogs(prev => [...prev, `Starting bot with ${form.strategy} on ${form.symbol}`]);
    try {
      await axios.post(`${API_URL}/bots/start`, { userId: user._id, ...form });
      setStatus({ isRunning: true, ...form });
    } catch (err) {
      setLogs(prev => [...prev, "Failed to start bot"]);
    }
  };

  const stopBot = async () => {
    try {
      await axios.post(`${API_URL}/bots/stop`, { userId: user._id });
      setStatus({ isRunning: false });
      setLogs(prev => [...prev, "Bot stopped"]);
    } catch (err) {
      setLogs(prev => [...prev, "Failed to stop bot"]);
    }
  };

  const handleUseBacktest = (bt) => {
    // Pre-fill bot form with this backtest's strategy & params
    setForm({
      symbol: bt.symbol,
      timeframe: bt.timeframe,
      strategy: bt.strategy,
      risk: bt.risk,
      initialBalance: bt.initialBalance,
    });
    setLogs(prev => [...prev, `Using strategy from backtest: ${bt.strategy}`]);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Trading Bot</h1>

      {/* Live Bot Controls */}
      <div className="bg-gray-100 p-4 rounded-2xl flex flex-wrap gap-4 items-end">
        <div>
          <label>Symbol:</label>
          <select name="symbol" value={form.symbol} onChange={handleChange}>
            {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label>Timeframe:</label>
          <select name="timeframe" value={form.timeframe} onChange={handleChange}>
            {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
          </select>
        </div>
        <div>
          <label>Strategy:</label>
          <select name="strategy" value={form.strategy} onChange={handleChange}>
            {options.strategies?.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>
        <div>
          <label>Risk:</label>
          <select name="risk" value={form.risk} onChange={handleChange}>
            {RISKS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label>Initial Balance:</label>
          <select name="initialBalance" value={form.initialBalance} onChange={handleChange}>
            {BALANCES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2 mt-2">
          <button onClick={startBot} className="bg-green-500 text-white px-4 py-2 rounded">Start Bot</button>
          <button onClick={stopBot} className="bg-red-500 text-white px-4 py-2 rounded">Stop Bot</button>
        </div>
      </div>

      {/* Backtests History */}
      <div className="mt-6">
        <h2 className="font-semibold text-xl mb-2">Backtest History</h2>
        {results.map(bt => (
          <div key={bt._id} className="bg-white p-3 rounded flex justify-between items-center mb-2 shadow">
            <div>
              <p>{bt.symbol} | {bt.timeframe} | {bt.strategy} | Profit: ${bt.results?.profit?.toFixed(2)}</p>
            </div>
            <button
              onClick={() => handleUseBacktest(bt)}
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              Use This Strategy
            </button>
          </div>
        ))}
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div>
          <h2 className="font-semibold mt-4">Logs:</h2>
          <ul className="list-disc list-inside">
            {logs.map((log, idx) => <li key={idx}>{log}</li>)}
          </ul>
        </div>
      )}

      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
