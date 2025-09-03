// File: src/pages/backtest.jsx
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

  // Fallback/default options
  const fallbackOptions = {
    symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"],
    timeframes: ["1m", "5m", "15m", "1h", "4h", "1d"],
    balances: [100, 300, 500, 1000, 5000, 10000],
    strategies: ["SMA", "EMA", "RSI", "MACD"],
    risks: ["Low", "Medium", "High"],
    stopLosses: [0.5, 1, 2, 3, 5],
    takeProfits: [1, 2, 3, 5, 10],
  };

  // Form state for backtests
  const [form, setForm] = useState({
    symbol: fallbackOptions.symbols[0],
    timeframe: fallbackOptions.timeframes[0],
    initialBalance: fallbackOptions.balances[2],
    strategy: fallbackOptions.strategies[0],
    risk: fallbackOptions.risks[1],
    stopLoss: fallbackOptions.stopLosses[0],
    takeProfit: fallbackOptions.takeProfits[0],
  });

  const [latest, setLatest] = useState(null);
  const [botChart, setBotChart] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [botStatus, setBotStatus] = useState(null);

  // Initialize options & fetch backtests
  useEffect(() => {
    if (user?._id) {
      fetchOptions();
      fetchBacktests();
      loadHistoryChart();
      fetchBotHistory();
    }
  }, [user]);

  // Update form defaults when options load
  useEffect(() => {
    const opts = options.symbols?.length ? options : fallbackOptions;
    setForm({
      symbol: opts.symbols[0],
      timeframe: opts.timeframes[0],
      initialBalance: opts.balances[2],
      strategy: opts.strategies[0],
      risk: opts.risks[1],
      stopLoss: opts.stopLosses[0],
      takeProfit: opts.takeProfits[0],
    });
  }, [options]);

  // Update form inputs
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: ["initialBalance", "stopLoss", "takeProfit"].includes(name) ? Number(value) : value }));
  };

  // Run single backtest
  const handleRunSingle = async () => {
    if (!form.symbol || !form.timeframe) return alert("Select symbol and timeframe!");
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
    const opts = options.symbols?.length ? options : fallbackOptions;
    for (const sl of opts.stopLosses) {
      for (const tp of opts.takeProfits) {
        for (const interval of opts.timeframes) {
          combos.push({ ...form, stopLoss: sl, takeProfit: tp, timeframe: interval });
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

  // Stats component
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

  // Trade dots for equity curve
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
          {(options.symbols || fallbackOptions.symbols).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="timeframe" value={form.timeframe} onChange={handleChange}>
          {(options.timeframes || fallbackOptions.timeframes).map(tf => <option key={tf} value={tf}>{tf}</option>)}
        </select>
        <select name="strategy" value={form.strategy} onChange={handleChange}>
          {(options.strategies || fallbackOptions.strategies).map(st => <option key={st} value={st}>{st}</option>)}
        </select>
        <select name="risk" value={form.risk} onChange={handleChange}>
          {(options.risks || fallbackOptions.risks).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select name="initialBalance" value={form.initialBalance} onChange={handleChange}>
          {(options.balances || fallbackOptions.balances).map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <button onClick={handleRunSingle} className="bg-blue-600 text-white px-4 py-2 rounded">{loading ? "Running..." : "Run Backtest"}</button>
        <button onClick={handleRunBatch} className="bg-green-600 text-white px-4 py-2 rounded">Run Batch Backtests</button>
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

      {/* Logs Section */}
      {logs.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-2xl shadow mt-6">
          <h2 className="text-lg font-semibold mb-2 border-b border-gray-200 pb-1">Logs</h2>
          <ul className="space-y-1 max-h-60 overflow-y-auto">
            {logs.map((log, idx) => (
              <li
                key={idx}
                className="text-sm text-gray-700 bg-gray-100 px-3 py-1 rounded flex items-center"
              >
                <span className="mr-2 text-gray-400">{idx + 1}.</span>
                <span>{log}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
