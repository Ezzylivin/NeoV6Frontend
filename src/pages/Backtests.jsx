// File: src/pages/Backtests.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";

export default function Backtests() {
  const { user } = useAuth();
  const {
    results: backtests,
    best,
    options,
    loading,
    error,
    fetchOptions,
    runBacktest,
    runBatchBacktests,
  } = useBacktest();

  const fallbackOptions = {
    symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"],
    timeframes: ["1m", "5m", "15m", "1h", "4h", "1d"],
    balances: [100, 300, 500, 1000, 5000, 10000],
    strategies: ["SMA", "EMA", "RSI", "MACD"],
    risks: ["Low", "Medium", "High"],
    stopLosses: [0.5, 1, 2, 3, 5],
    takeProfits: [1, 2, 3, 5, 10],
  };

  const [form, setForm] = useState({
    symbol: fallbackOptions.symbols[0],
    timeframe: fallbackOptions.timeframes[0],
    initialBalance: fallbackOptions.balances[2],
    strategy: fallbackOptions.strategies[0],
    risk: fallbackOptions.risks[1],
    stopLoss: fallbackOptions.stopLosses[0],
    takeProfit: fallbackOptions.takeProfits[0],
  });

  const [historyChart, setHistoryChart] = useState([]);
  const [filters, setFilters] = useState({ symbol: "", strategy: "", risk: "" });

  // Initialize form when options load (API or fallback)
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

  // Update chart history when backtests change
  useEffect(() => {
    const data = (backtests || []).filter(Boolean).map(bt => ({
      time: bt?.createdAt ? new Date(bt.createdAt).toLocaleString() : "N/A",
      initialBalance: bt?.initialBalance ?? 0,
      finalBalance: bt?.results?.finalBalance ?? ((bt?.initialBalance ?? 0) + (bt?.results?.profit ?? 0)),
      profit: bt?.results?.profit ?? 0,
    }));
    setHistoryChart(data);
  }, [backtests]);

  const handleRun = async () => {
    if (!form.symbol || !form.timeframe) return alert("Select symbol and timeframe!");
    await runBacktest(form);
  };

  const handleBatchRun = async () => {
    const opts = options.symbols?.length ? options : fallbackOptions;
    const paramCombos = opts.symbols.flatMap(symbol =>
      opts.strategies.map(strategy => ({
        symbol,
        timeframe: form.timeframe || opts.timeframes[0],
        strategy: { name: strategy, parameters: {} },
        risk: form.risk,
        stopLoss: Number(form.stopLoss),
        takeProfit: Number(form.takeProfit),
        initialBalance: Number(form.initialBalance),
      }))
    );
    await runBatchBacktests(paramCombos, "coinbasepro");
  };

  const filteredBacktests = (backtests || []).filter(bt =>
    (!filters.symbol || bt.symbol === filters.symbol) &&
    (!filters.strategy || (bt.strategy?.name || bt.strategy) === filters.strategy) &&
    (!filters.risk || bt.risk === filters.risk)
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Backtests</h1>

      {/* Form Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <select value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })} className="border p-2">
          {(options.symbols || fallbackOptions.symbols).map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={form.strategy} onChange={e => setForm({ ...form, strategy: e.target.value })} className="border p-2">
          {(options.strategies || fallbackOptions.strategies).map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <input type="number" value={form.initialBalance} onChange={e => setForm({ ...form, initialBalance: Number(e.target.value) })} className="border p-2" />

        <button onClick={handleRun} className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>
          Run Backtest
        </button>
      </div>

      <div>
        <button onClick={handleBatchRun} className="bg-green-600 text-white px-4 py-2 rounded mt-2" disabled={loading}>
          Run Batch Backtests
        </button>
      </div>

      {error && <p className="text-red-500 mt-2">{error}</p>}

      {/* History Chart */}
      {historyChart.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={historyChart}>
            <CartesianGrid stroke="#ccc" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="finalBalance" stroke="#8884d8" />
            <Line type="monotone" dataKey="initialBalance" stroke="#82ca9d" />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Backtests Table */}
      <div className="overflow-x-auto mt-4">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">Date</th>
              <th className="px-4 py-2 border">Symbol</th>
              <th className="px-4 py-2 border">Strategy</th>
              <th className="px-4 py-2 border">Risk</th>
              <th className="px-4 py-2 border">Initial</th>
              <th className="px-4 py-2 border">Final</th>
              <th className="px-4 py-2 border">Profit</th>
            </tr>
          </thead>
          <tbody>
            {filteredBacktests.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-4">No backtests found</td>
              </tr>
            )}
            {filteredBacktests.map(bt => (
              <tr key={bt?._id || Math.random()} className="text-center">
                <td className="px-4 py-2 border">{bt?.createdAt ? new Date(bt.createdAt).toLocaleString() : "N/A"}</td>
                <td className="px-4 py-2 border">{bt?.symbol || "N/A"}</td>
                <td className="px-4 py-2 border">{bt?.strategy?.name || bt?.strategy || "N/A"}</td>
                <td className="px-4 py-2 border">{bt?.risk || "N/A"}</td>
                <td className="px-4 py-2 border">{bt?.initialBalance ?? "N/A"}</td>
                <td className="px-4 py-2 border">{bt?.results?.finalBalance ?? bt?.initialBalance ?? 0}</td>
                <td className="px-4 py-2 border">{bt?.results?.profit ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Best Equity Curve */}
      {best?.saved?.equityCurve?.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-bold">
            Best Equity Curve: {best.saved.symbol} ({best.saved.strategy?.name || "N/A"})
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={best.saved.equityCurve}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tickFormatter={t => new Date(t).toLocaleTimeString()} />
              <YAxis />
              <Tooltip labelFormatter={t => new Date(t).toLocaleString()} />
              <Legend />
              <Line type="monotone" dataKey="equity" stroke="#8884d8" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
