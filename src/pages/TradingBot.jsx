// File: src/pages/TradingBot.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBacktest } from "../hooks/useBacktest.js";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

// Hardcoded dropdowns
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"];
const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];
const BALANCES = [100, 300, 500, 1000, 5000, 10000, 50000];
const RISKS = ["low", "medium", "high"];

export default function TradingBot() {
  const { user } = useAuth();
  const { options, fetchOptions } = useBacktest(); // fetch strategies dynamically
  const [strategies, setStrategies] = useState([]);
  const [symbol, setSymbol] = useState(SYMBOLS[0]);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[0]);
  const [initialBalance, setInitialBalance] = useState(BALANCES[2]);
  const [strategy, setStrategy] = useState("");
  const [risk, setRisk] = useState(RISKS[1]);
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com/api";

  // Fetch backend options (strategies)
  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (options.strategies?.length) {
      setStrategies(options.strategies);
      setStrategy(options.strategies[0]); // default
    }
  }, [options.strategies]);

  // Fetch trading bot history for chart
  useEffect(() => {
    if (!user?._id) return;

    const fetchBotData = async () => {
      setChartLoading(true);
      try {
        const res = await axios.get(`${API_URL}/tradingbot/history/${user._id}`);
        const data = res.data.history.map(point => ({
          time: new Date(point.timestamp).toLocaleString(),
          balance: point.balance,
          profit: point.profit ?? 0,
        }));
        setChartData(data);
      } catch (err) {
        console.error(err);
        setChartError("Failed to fetch bot data");
      } finally {
        setChartLoading(false);
      }
    };

    fetchBotData();
  }, [user]);

  const startBot = async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise(r => setTimeout(r, 500));
      setStatus({ isRunning: true, symbol, amount: initialBalance, strategy, risk });
      setLogs(prev => [...prev, `Bot started with ${symbol} at ${timeframe}`]);
    } catch (err) {
      setError("Failed to start bot");
    } finally {
      setLoading(false);
    }
  };

  const stopBot = async () => {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 300));
      setStatus({ isRunning: false });
      setLogs(prev => [...prev, "Bot stopped"]);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = () => {
    if (!status) setLogs(prev => [...prev, "Bot status: unknown"]);
    else setLogs(prev => [...prev, `Bot is ${status.isRunning ? "running" : "stopped"}`]);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-black text-white p-6">
      <div className="w-full max-w-4xl">
        <h1 className="text-2xl font-bold mb-4">Trading Bot</h1>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label>Symbol:</label>
            <select value={symbol} onChange={e => setSymbol(e.target.value)} className="p-2 rounded text-black w-full">
              {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label>Timeframe:</label>
            <select value={timeframe} onChange={e => setTimeframe(e.target.value)} className="p-2 rounded text-black w-full">
              {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
            </select>
          </div>

          <div>
            <label>Initial Balance ($):</label>
            <select value={initialBalance} onChange={e => setInitialBalance(Number(e.target.value))} className="p-2 rounded text-black w-full">
              {BALANCES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label>Strategy:</label>
            <select value={strategy} onChange={e => setStrategy(e.target.value)} className="p-2 rounded text-black w-full">
              {strategies.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>

          <div>
            <label>Risk:</label>
            <select value={risk} onChange={e => setRisk(e.target.value)} className="p-2 rounded text-black w-full">
              {RISKS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <button onClick={startBot} disabled={loading} className="bg-green-500 text-white px-4 py-2 rounded">
              {loading ? "Starting..." : "Start Bot"}
            </button>
            <button onClick={stopBot} disabled={loading} className="bg-red-500 text-white px-4 py-2 rounded">
              {loading ? "Stopping..." : "Stop Bot"}
            </button>
            <button onClick={checkStatus} className="bg-blue-500 text-white px-4 py-2 rounded">
              Check Status
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white p-4 rounded-2xl shadow mb-6 text-black">
          <h2 className="text-xl font-semibold mb-4">Bot Performance Chart</h2>
          {chartLoading && <p>Loading chart...</p>}
          {chartError && <p className="text-red-500">{chartError}</p>}
          {!chartLoading && !chartError && chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="balance" stroke="#10B981" strokeWidth={2} dot />
                <Line type="monotone" dataKey="profit" stroke="#F59E0B" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          )}
          {!chartLoading && chartData.length === 0 && <p className="text-gray-500">No chart data available.</p>}
        </div>

        {/* Status */}
        {status && (
          <div className="mb-4">
            <strong>Status:</strong> {status.isRunning ? "Running" : "Stopped"} <br />
            Symbol: {status.symbol || "-"}, Balance: ${status.amount || 0}, Strategy: {status.strategy || "-"}, Risk: {status.risk || "-"}
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Logs:</h2>
            <ul className="list-disc list-inside text-black">
              {logs.map((log, idx) => <li key={idx}>{log}</li>)}
            </ul>
          </div>
        )}

        {/* Error */}
        {error && <div className="text-red-500 mt-4">{error}</div>}
      </div>
    </div>
  );
}
