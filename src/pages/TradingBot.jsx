// File: src/pages/TradingBot.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBacktest } from "../hooks/useBacktest.js";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, ReferenceDot
} from "recharts";

export default function TradingBot() {
  const { user } = useAuth();
  const {
    results: backtests,
    best,
    options,
    loading,
    error,
    fetchOptions,
    fetchBacktests,
    runBacktest,
    runBatchBacktests
  } = useBacktest();

  const API_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com/api";

  // Form state for backtests
  const [form, setForm] = useState({
    symbol: "",
    timeframe: "",
    initialBalance: 1000,
    strategy: "",
    risk: "Medium",
  });

  // Batch optimization params
  const [batchParams, setBatchParams] = useState({
    stopLoss: [0.01, 0.02],
    takeProfit: [0.03, 0.05],
    interval: ["5m","15m"]
  });

  // Live bot state
  const [botStatus, setBotStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [botChart, setBotChart] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState(null);

  // Latest backtest result for equity curve display
  const [latest, setLatest] = useState(null);

  // Initialize options & fetch backtests
  useEffect(() => {
    if (user?._id) {
      fetchOptions();
      fetchBacktests();
      loadHistoryChart();
      fetchBotHistory();
    }
  }, [user]);

  // Set default form when options load
  useEffect(() => {
    if (options.symbols?.length && options.strategies?.length) {
      setForm({
        symbol: options.symbols[0],
        timeframe: options.timeframes[0],
        initialBalance: options.balances?.[2] || 1000,
        strategy: options.strategies[0],
        risk: options.risks?.[1] || "Medium",
      });
    }
  }, [options]);

  // Update form inputs
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === "initialBalance" ? Number(value) : value }));
  };

  // Run single backtest
  const handleRunSingle = async () => {
    try {
      const res = await axios.post(`${API_URL}/backtests/run`, { userId: user._id, ...form });
      if (res.data.success) {
        setLatest({
          metrics: res.data.metrics,
          equityCurve: (res.data.equityCurve || []).map(p => ({
            time: new Date(p.time).getTime(),
            equity: p.equity
          })),
          trades: res.data.trades || []
        });
        fetchBacktests();
        loadHistoryChart();
      }
    } catch (err) {
      console.error(err);
      alert("Backtest failed: " + (err?.response?.data?.message || err.message));
    }
  };

  // Run batch backtests
  const handleRunBatch = () => {
    const combos = [];
    for (const sl of batchParams.stopLoss) {
      for (const tp of batchParams.takeProfit) {
        for (const interval of batchParams.interval) {
          combos.push({ ...form, stopLoss: sl, takeProfit: tp, interval });
        }
      }
    }
    runBatchBacktests(combos);
  };

  // Load historical backtests chart
  async function loadHistoryChart() {
    try {
      const res = await axios.get(`${API_URL}/backtests`, { params: { userId: user._id } });
      const data = (res.data.backtests || []).map(bt => ({
        time: new Date(bt.createdAt).toLocaleString(),
        initialBalance: bt.initialBalance,
        finalBalance: bt.finalBalance,
        profit: bt.profit
      }));
      setBotChart(data);
    } catch (err) {
      console.error(err);
    }
  }

  // Fetch live bot history
  const fetchBotHistory = async () => {
    if (!user?._id) return;
    setChartLoading(true);
    try {
      const res = await axios.get(`${API_URL}/bots/history/${user._id}`);
      const data = res.data.history.map(p => ({
        time: new Date(p.timestamp).toLocaleString(),
        balance: p.balance,
        profit: p.profit ?? 0
      }));
      setBotChart(data);
    } catch (err) {
      console.error(err);
      setChartError("Failed to fetch bot history");
    } finally {
      setChartLoading(false);
    }
  };

  // Start live bot
  const startBot = async () => {
    try {
      await axios.post(`${API_URL}/bots/start`, { userId: user._id, ...form });
      setBotStatus({ isRunning: true, ...form });
      setLogs(prev => [...prev, `Bot started with ${form.symbol} at ${form.timeframe}`]);
    } catch (err) {
      console.error(err);
      alert("Failed to start bot");
    }
  };

  // Stop live bot
  const stopBot = async () => {
    try {
      await axios.post(`${API_URL}/bots/stop`, { userId: user._id });
      setBotStatus({ isRunning: false });
      setLogs(prev => [...prev, "Bot stopped"]);
    } catch (err) {
      console.error(err);
      alert("Failed to stop bot");
    }
  };

  const Stats = ({ m }) => {
    if (!m) return null;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        <div className="p-3 rounded bg-gray-100">
          <div className="text-xs text-gray-500">Final Balance</div>
          <div className="text-lg font-semibold">${m.finalBalance?.toLocaleString()}</div>
        </div>
        <div className="p-3 rounded bg-gray-100">
          <div className="text-xs text-gray-500">Net Profit</div>
          <div className={`text-lg font-semibold ${m.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${m.netProfit?.toLocaleString()}
          </div>
        </div>
        <div className="p-3 rounded bg-gray-100">
          <div className="text-xs text-gray-500">Win Rate</div>
          <div className="text-lg font-semibold">{m.winRate}%</div>
        </div>
        <div className="p-3 rounded bg-gray-100">
          <div className="text-xs text-gray-500">Max Drawdown</div>
          <div className="text-lg font-semibold">{m.maxDrawdown}%</div>
        </div>
      </div>
    );
  };

  const TradeDots = ({ trades }) => {
    if (!latest?.equityCurve?.length) return null;
    const firstTs = latest.equityCurve[0]?.time;
    const lastTs = latest.equityCurve[latest.equityCurve.length - 1]?.time;

    return trades?.map((t, idx) => {
      if (!t.exitTime) return null;
      const when = new Date(t.exitTime).getTime();
      if (when < firstTs || when > lastTs) return null;
      const near = latest.equityCurve.reduce((a, b) =>
        Math.abs(b.time - when) < Math.abs(a.time - when) ? b : a
      );
      return <ReferenceDot key={idx} x={near.time} y={near.equity} r={4} stroke="none" fill={t.profit > 0 ? "#10B981" : "#EF4444"} />;
    });
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Trading Bot + Backtests</h1>

      {/* Controls */}
      <div className="bg-gray-100 p-4 rounded-2xl flex flex-wrap gap-4 items-end">
        <select name="symbol" value={form.symbol} onChange={handleChange}>
          {options.symbols?.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="timeframe" value={form.timeframe} onChange={handleChange}>
          {options.timeframes?.map(tf => <option key={tf} value={tf}>{tf}</option>)}
        </select>
        <select name="strategy" value={form.strategy} onChange={handleChange}>
          {options.strategies?.map(st => <option key={st} value={st}>{st}</option>)}
        </select>
        <select name="risk" value={form.risk} onChange={handleChange}>
          {options.risks?.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select name="initialBalance" value={form.initialBalance} onChange={handleChange}>
          {options.balances?.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <button onClick={handleRunSingle} className="bg-blue-600 text-white px-4 py-2 rounded">{loading ? "Running..." : "Run Backtest"}</button>
        <button onClick={handleRunBatch} className="bg-green-600 text-white px-4 py-2 rounded">Run Batch Backtests</button>
        <button onClick={startBot} className="bg-green-500 text-white px-4 py-2 rounded">Start Bot</button>
        <button onClick={stopBot} className="bg-red-500 text-white px-4 py-2 rounded">Stop Bot</button>
      </div>

      {/* Latest Backtest */}
      {latest && (
        <div className="bg-white p-4 rounded-2xl shadow">
          <h2 className="text-xl font-semibold">Latest Backtest – Equity Curve</h2>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={latest.equityCurve}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tickFormatter={ts => new Date(ts).toLocaleString()} />
              <YAxis />
              <Tooltip labelFormatter={ts => new Date(ts).toLocaleString()} formatter={(v) => `$${v.toLocaleString()}`} />
              <Legend />
              <Line type="monotone" dataKey="equity" stroke="#3B82F6" dot={false} />
              <TradeDots trades={latest.trades} />
            </LineChart>
          </ResponsiveContainer>
          <Stats m={latest.metrics} />
        </div>
      )}

      {/* Historical Backtests */}
      <div className="bg-white p-4 rounded-2xl shadow">
        <h2 className="text-xl font-semibold mb-4">Backtests History</h2>
        {botChart.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={botChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="balance" stroke="#10B981" strokeWidth={2} dot />
              <Line type="monotone" dataKey="profit" stroke="#F59E0B" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-gray-500">No chart data.</p>}
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Logs:</h2>
          <ul className="list-disc list-inside">{logs.map((log, idx) => <li key={idx}>{log}</li>)}</ul>
        </div>
      )}

      {error && <p className="text-red-500">{error}</p>}
      {best && <p className="text-green-600">Best batch profit: ${best.results.profit.toFixed(2)}</p>}
    </div>
  );
}
