// File: src/pages/TradingBot.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBacktest } from "../hooks/useBacktest.js";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"];
const TIMEFRAMES = ["1m", "5m", "10m", "15m", "30m", "1h", "4h", "1d"];
const BALANCES = [100, 300, 500, 1000, 5000, 10000, 50000];
const RISKS = ["low", "medium", "high"];

export default function TradingBot() {
  const { user } = useAuth();
  const { options, fetchOptions } = useBacktest();
  const [strategies, setStrategies] = useState([]);
  const [symbol, setSymbol] = useState(SYMBOLS[0]);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[0]);
  const [initialBalance, setInitialBalance] = useState(BALANCES[2]);
  const [strategy, setStrategy] = useState("");
  const [risk, setRisk] = useState(RISKS[1]);
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [miniChartData, setMiniChartData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com/api";

  // Load strategies
  useEffect(() => { fetchOptions(); }, []);
  useEffect(() => {
    if (options.strategies?.length) {
      setStrategies(options.strategies);
      setStrategy(options.strategies[0]);
    }
  }, [options.strategies]);

  // Fetch mini chart for selected symbol & timeframe
  useEffect(() => {
    const fetchMiniChart = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/candles?exchange=coinbase&symbol=${symbol}&timeframe=${timeframe}`
        );
        const data = res.data || [];
        setMiniChartData(data);
      } catch (err) {
        console.error("Mini chart fetch failed:", err);
      }
    };
    fetchMiniChart();
  }, [symbol, timeframe]);

  // Fetch main bot chart
  useEffect(() => {
    if (!user?._id) return;

    const fetchBotData = async () => {
      setChartLoading(true);
      try {
        const res = await axios.get(`${API_URL}/bots/history/${user._id}`);
        const data = res.data.history.map(point => ({
          time: new Date(point.timestamp).toLocaleString(),
          balance: point.balance,
          profit: point.profit ?? 0,
        }));
        setChartData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setChartLoading(false);
      }
    };
    fetchBotData();
  }, [user]);

  const startBot = async () => { /* ...same as before... */ };
  const stopBot = async () => { /* ...same as before... */ };
  const checkStatus = () => { /* ...same as before... */ };

  return (
    <div className="flex flex-col items-center min-h-screen bg-black text-white p-6">
      <div className="w-full max-w-4xl">
        <h1 className="text-2xl font-bold mb-4">Trading Bot</h1>

        {/* Controls + Mini Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="flex flex-col gap-2">
            <label>Symbol:</label>
            <select value={symbol} onChange={e => setSymbol(e.target.value)} className="p-2 rounded text-black w-full">
              {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <label>Timeframe:</label>
            <select value={timeframe} onChange={e => setTimeframe(e.target.value)} className="p-2 rounded text-black w-full">
              {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
            </select>

            <label>Initial Balance ($):</label>
            <select value={initialBalance} onChange={e => setInitialBalance(Number(e.target.value))} className="p-2 rounded text-black w-full">
              {BALANCES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <label>Strategy:</label>
            <select value={strategy} onChange={e => setStrategy(e.target.value)} className="p-2 rounded text-black w-full">
              {strategies.map(st => <option key={st} value={st}>{st}</option>)}
            </select>

            <label>Risk:</label>
            <select value={risk} onChange={e => setRisk(e.target.value)} className="p-2 rounded text-black w-full">
              {RISKS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            <div className="flex gap-2 mt-2">
              <button onClick={startBot} disabled={loading} className="bg-green-500 text-white px-4 py-2 rounded">{loading ? "Starting..." : "Start Bot"}</button>
              <button onClick={stopBot} disabled={loading} className="bg-red-500 text-white px-4 py-2 rounded">{loading ? "Stopping..." : "Stop Bot"}</button>
              <button onClick={checkStatus} className="bg-blue-500 text-white px-4 py-2 rounded">Check Status</button>
            </div>
          </div>

          {/* Mini Chart */}
          <div className="bg-gray-800 p-2 rounded shadow flex flex-col items-center">
            <h3 className="text-white font-semibold mb-1">{symbol} ({timeframe})</h3>
            {miniChartData.length > 0 ? (
              <div style={{ width: "100%", height: 150 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={miniChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="close"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={miniChartData.map((c, i) => ({
                        r: 4,
                        fill: c.close >= c.open ? "#10B981" : "#EF4444"
                      }))}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No mini chart data</p>
            )}
          </div>
        </div>

        {/* Main Bot Chart */}
        <div className="bg-white p-4 rounded-2xl shadow mb-6 text-black">
          <h2 className="text-xl font-semibold mb-4">Bot Performance Chart</h2>
          {chartLoading && <p>Loading chart...</p>}
          {!chartLoading && chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="balance" stroke="#10B981" strokeWidth={2} dot />
                <Line type="monotone" dataKey="profit" stroke="#F59E0B" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          )}
          {!chartLoading && chartData.length === 0 && <p className="text-gray-500">No chart data available.</p>}
        </div>
      </div>
    </div>
  );
}
