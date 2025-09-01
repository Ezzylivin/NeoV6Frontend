// File: src/pages/Backtests.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBacktest } from "../hooks/useBacktest.js";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

export default function Backtests() {
  const { user } = useAuth();
  const { results: backtests, options, loading, error, fetchOptions, fetchBacktests, runBacktest } = useBacktest();
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState(null);
  const [form, setForm] = useState({
    symbol: "",
    timeframe: "",
    initialBalance: 1000,
    strategy: "",
    risk: "Medium",
  });
  const [expandedId, setExpandedId] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com/api";

  useEffect(() => {
    if (user?._id) {
      fetchOptions();
      fetchBacktests();
      fetchChartData();
    }
  }, [user]);

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

  const fetchChartData = async () => {
    if (!user?._id) return;
    setChartLoading(true);
    try {
      const res = await axios.get(`${API_URL}/backtests`, { params: { userId: user._id } });
      const data = res.data.backtests.map(bt => ({
        time: new Date(bt.createdAt).toLocaleString(),
        initialBalance: bt.initialBalance,
        finalBalance: bt.finalBalance,
        profit: bt.profit,
      }));
      setChartData(data);
    } catch (err) {
      console.error(err);
      setChartError("Failed to fetch chart data");
    } finally {
      setChartLoading(false);
    }
  };

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === "initialBalance" ? Number(value) : value }));
  };
  const handleRun = () => {
    if (!form.symbol || !form.timeframe) return alert("Select symbol and timeframe!");
    runBacktest(form);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Backtests</h1>

      {/* Form */}
      <div className="bg-gray-100 p-4 rounded-2xl flex flex-wrap gap-4 items-end">
        {/* Symbol */}
        <div>
          <label className="block text-sm font-medium">Symbol</label>
          <select name="symbol" value={form.symbol} onChange={handleChange} className="border p-1 rounded">
            {options.symbols?.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Timeframe */}
        <div>
          <label className="block text-sm font-medium">Timeframe</label>
          <select name="timeframe" value={form.timeframe} onChange={handleChange} className="border p-1 rounded">
            {options.timeframes?.map(tf => <option key={tf} value={tf}>{tf}</option>)}
          </select>
        </div>

        {/* Strategy */}
        <div>
          <label className="block text-sm font-medium">Strategy</label>
          <select name="strategy" value={form.strategy} onChange={handleChange} className="border p-1 rounded">
            {options.strategies?.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>

        {/* Risk */}
        <div>
          <label className="block text-sm font-medium">Risk</label>
          <select name="risk" value={form.risk} onChange={handleChange} className="border p-1 rounded">
            {options.risks?.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Initial Balance */}
        <div>
          <label className="block text-sm font-medium">Initial Balance</label>
          <select name="initialBalance" value={form.initialBalance} onChange={handleChange} className="border p-1 rounded w-24">
            {options.balances?.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <button onClick={handleRun} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" disabled={loading}>
          {loading ? "Running..." : "Run Backtest"}
        </button>
      </div>

      {/* Chart */}
      <div className="bg-white p-4 rounded-2xl shadow mt-6">
        <h2 className="text-xl font-semibold mb-4">Performance Chart</h2>
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
              <Line type="monotone" data
