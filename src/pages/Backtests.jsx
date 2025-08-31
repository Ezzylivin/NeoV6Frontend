// File: src/pages/Backtests.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBacktest } from "../hooks/useBacktest.js";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

export default function Backtests() {
  const { user } = useAuth();
  const { results: backtests, options, loading, error, fetchOptions, fetchBacktests, runBacktest } = useBacktest();
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({
    symbol: "",
    timeframe: "",
    initialBalance: 1000,
    strategy: "",
    risk: "Medium",
  });
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com/api";

  // Fetch options and backtests when user is available
  useEffect(() => {
    if (user?._id) {
      fetchOptions();
      fetchBacktests();
      fetchChartData();
    }
  }, [user]);

  // Initialize form defaults after fetching options
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
      const res = await axios.get(`${API_URL}/backtests/recent/${user._id}`);
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

      {/* Run Backtest Form */}
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

        <button
          onClick={handleRun}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
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
              <Line type="monotone" dataKey="initialBalance" stroke="#F59E0B" strokeWidth={2} dot />
              <Line type="monotone" dataKey="finalBalance" stroke="#3B82F6" strokeWidth={2} dot />
              <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        )}
        {!chartLoading && chartData.length === 0 && <p className="text-gray-500">No chart data available.</p>}
      </div>

      {error && <p className="text-red-500">{error}</p>}

      {/* Backtest List */}
      {backtests.length === 0 ? (
        <p className="text-gray-500">No backtests yet.</p>
      ) : backtests.map(bt => (
        <div key={bt._id} className="bg-white shadow rounded-2xl p-4 border border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">{bt.symbol} ({bt.timeframe})</h2>
              <p className="text-sm text-gray-600">
                Strategy: {bt.strategy?.name || bt.strategy} | Trades: {bt.totalTrades}
              </p>
              <p className="text-sm text-gray-600">
                Initial: ${bt.initialBalance} → Final: ${bt.finalBalance}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <p className={`font-bold ${bt.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                P/L: ${bt.profit?.toFixed(2) ?? "0.00"}
              </p>
              <button onClick={() => toggleExpand(bt._id)} className="text-blue-500 hover:underline text-sm mt-1">
                {expandedId === bt._id ? "Hide Trades ▲" : "Show Trades ▼"}
              </button>
            </div>
          </div>

          {expandedId === bt._id && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border text-sm text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">Entry</th>
                    <th className="p-2 border">Exit</th>
                    <th className="p-2 border">Position</th>
                    <th className="p-2 border">Entry Price</th>
                    <th className="p-2 border">Exit Price</th>
                    <th className="p-2 border">Profit</th>
                    <th className="p-2 border">Result</th>
                    <th className="p-2 border">Duration (min)</th>
                  </tr>
                </thead>
                <tbody>
                  {bt.tradeBreakdown?.length ? bt.tradeBreakdown.map((trade,i)=>(
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-2 border">{trade.entryTime ? new Date(trade.entryTime).toLocaleString() : "-"}</td>
                      <td className="p-2 border">{trade.exitTime ? new Date(trade.exitTime).toLocaleString() : "-"}</td>
                      <td className="p-2 border capitalize">{trade.position || "-"}</td>
                      <td className="p-2 border">{trade.entryPrice ?? "-"}</td>
                      <td className="p-2 border">{trade.exitPrice ?? "-"}</td>
                      <td className={`p-2 border ${(trade.profit ?? 0) >=0 ? "text-green-600" : "text-red-600"}`}>
                        {trade.profit?.toFixed(2) ?? "0.00"}
                      </td>
                      <td className={`p-2 border capitalize ${trade.result==="win"?"text-green-600":trade.result==="loss"?"text-red-600":"text-gray-500"}`}>
                        {trade.result || "-"}
                      </td>
                      <td className="p-2 border">{trade.duration ? `${trade.duration}m` : "-"}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td className="p-2 border text-center text-gray-500" colSpan="8">No trades recorded</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
