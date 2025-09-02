import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend
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
    fetchBacktests,
    runBacktest,
    runBatchBacktests
  } = useBacktest();

  const [form, setForm] = useState({
    symbol: "",
    timeframe: "",
    initialBalance: 1000,
    strategy: "",
    risk: "Medium",
    stopLoss: 1,
    takeProfit: 2
  });

  const [historyChart, setHistoryChart] = useState([]);
  const [filters, setFilters] = useState({ symbol: "", strategy: "", risk: "" });

  // Initialize form when options load
  useEffect(() => {
    if (options.symbols?.length && options.strategies?.length) {
      setForm({
        symbol: options.symbols[0],
        timeframe: options.timeframes[0],
        initialBalance: options.balances?.[2] || 1000,
        strategy: options.strategies[0],
        risk: options.risks?.[1] || "Medium",
        stopLoss: options.stopLosses?.[0] || 1,
        takeProfit: options.takeProfits?.[0] || 2,
      });
    }
  }, [options]);

  // Update chart whenever backtests change
  useEffect(() => {
    if (backtests.length) {
      const data = backtests.map(bt => ({
        time: new Date(bt.createdAt).toLocaleString(),
        initialBalance: bt.initialBalance,
        finalBalance: bt.results?.finalBalance ?? (bt.initialBalance + (bt.results?.profit ?? 0)),
        profit: bt.results?.profit ?? 0,
      }));
      setHistoryChart(data);
    }
  }, [backtests]);

  async function handleRun() {
    if (!form.symbol || !form.timeframe) return alert("Select symbol and timeframe!");
    await runBacktest(form);
  }

  async function handleBatchRun() {
    const paramCombos = options.symbols.flatMap(symbol =>
      options.strategies.map(strategy => ({
        symbol,
        timeframe: form.timeframe,
        strategy: { name: strategy },
        risk: form.risk,
        stopLoss: form.stopLoss,
        takeProfit: form.takeProfit,
        initialBalance: form.initialBalance
      }))
    );
    await runBatchBacktests(paramCombos, "coinbase");
  }

  const filteredBacktests = backtests.filter(bt =>
    (!filters.symbol || bt.symbol === filters.symbol) &&
    (!filters.strategy || bt.strategy === filters.strategy) &&
    (!filters.risk || bt.risk === filters.risk)
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Backtests</h1>

      {/* Simple controls */}
      <div className="flex space-x-4">
        <select value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })}>
          {options.symbols?.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={form.strategy} onChange={e => setForm({ ...form, strategy: e.target.value })}>
          {options.strategies?.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={handleRun} disabled={loading} className="bg-blue-500 text-white px-3 rounded">
          Run Backtest
        </button>
        <button onClick={handleBatchRun} disabled={loading} className="bg-green-500 text-white px-3 rounded">
          Run Batch
        </button>
      </div>

      {/* Chart */}
      {historyChart.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={historyChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="finalBalance" stroke="#8884d8" name="Final Balance" />
            <Line type="monotone" dataKey="profit" stroke="#82ca9d" name="Profit" />
          </LineChart>
        </ResponsiveContainer>
      )}

      {error && <p className="text-red-500 mt-2">{error}</p>}

      {/* Table of backtests */}
      <table className="min-w-full table-auto border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border px-2 py-1">Symbol</th>
            <th className="border px-2 py-1">Strategy</th>
            <th className="border px-2 py-1">Initial</th>
            <th className="border px-2 py-1">Final</th>
            <th className="border px-2 py-1">Profit</th>
          </tr>
        </thead>
        <tbody>
          {filteredBacktests.map(bt => (
            <tr key={bt._id}>
              <td className="border px-2 py-1">{bt.symbol}</td>
              <td className="border px-2 py-1">{bt.strategy}</td>
              <td className="border px-2 py-1">{bt.initialBalance}</td>
              <td className="border px-2 py-1">{bt.results?.finalBalance ?? (bt.initialBalance + (bt.results?.profit ?? 0))}</td>
              <td className="border px-2 py-1">{bt.results?.profit ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
