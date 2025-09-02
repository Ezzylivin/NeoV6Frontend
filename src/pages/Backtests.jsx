// File: src/pages/Backtests.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
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
    runBatchBacktests,
  } = useBacktest();

  const [form, setForm] = useState({
    symbol: "",
    timeframe: "",
    initialBalance: 1000,
    strategy: "",
    risk: "Medium",
    stopLoss: 1,
    takeProfit: 2,
  });

  const [historyChart, setHistoryChart] = useState([]);
  const [filters, setFilters] = useState({ symbol: "", strategy: "", risk: "" });

  // Initialize form when options are loaded
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

  // Load chart history from user backtests
  useEffect(() => {
    loadHistoryChart();
  }, [backtests]);

  const loadHistoryChart = () => {
    const data = backtests.map((bt) => ({
      time: new Date(bt.createdAt).toLocaleString(),
      initialBalance: bt.initialBalance,
      finalBalance:
        bt.results?.finalBalance ?? bt.initialBalance + (bt.results?.profit ?? 0),
      profit: bt.results?.profit ?? 0,
    }));
    setHistoryChart(data);
  };

  const handleRun = async () => {
    if (!form.symbol || !form.timeframe) return alert("Select symbol and timeframe!");
    await runBacktest(form);
  };

  const handleBatchRun = async () => {
    const paramCombos = options.symbols.flatMap((symbol) =>
      options.strategies.map((strategy) => ({
        symbol,
        timeframe: form.timeframe,
        strategy: { name: strategy, parameters: {} },
        risk: form.risk,
        stopLoss: form.stopLoss,
        takeProfit: form.takeProfit,
        initialBalance: form.initialBalance,
      }))
    );
    await runBatchBacktests(paramCombos, "coinbasepro");
  };

  const filteredBacktests = backtests.filter(
    (bt) =>
      (!filters.symbol || bt.symbol === filters.symbol) &&
      (!filters.strategy || (bt.strategy?.name || bt.strategy) === filters.strategy) &&
      (!filters.risk || bt.risk === filters.risk)
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Backtests</h1>

      {/* Form Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <select
          value={form.symbol}
          onChange={(e) => setForm({ ...form, symbol: e.target.value })}
          className="border p-2"
        >
          {options.symbols?.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={form.strategy}
          onChange={(e) => setForm({ ...form, strategy: e.target.value })}
          className="border p-2"
        >
          {options.strategies?.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <input
          type="number"
          value={form.initialBalance}
          onChange={(e) =>
            setForm({ ...form, initialBalance: Number(e.target.value) })
          }
          className="border p-2"
        />

        <button
          onClick={handleRun}
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          Run Backtest
        </button>
      </div>

      <div>
        <button
          onClick={handleBatchRun}
          className="bg-green-600 text-white px-4 py-2 rounded mt-2"
          disabled={loading}
        >
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
            {filteredBacktests.map((bt) => (
              <tr key={bt._id} className="text-center">
                <td className="px-4 py-2 border">
                  {new Date(bt.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2 border">{bt.symbol}</td>
                <td className="px-4 py-2 border">{bt.strategy?.name || bt.strategy}</td>
                <td className="px-4 py-2 border">{bt.risk}</td>
                <td className="px-4 py-2 border">{bt.initialBalance}</td>
                <td className="px-4 py-2 border">{bt.results?.finalBalance}</td>
                <td className="px-4 py-2 border">{bt.results?.profit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
