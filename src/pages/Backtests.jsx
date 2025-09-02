import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend
} from "recharts";

export default function Backtests() {
  const { user } = useAuth();
  const { results: backtests, best, options, loading, error, fetchOptions, fetchBacktests, runBacktest, runBatchBacktests } = useBacktest();

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

  useEffect(() => {
    if (user?._id) {
      fetchOptions();
      fetchBacktests();
      loadHistoryChart();
    }
  }, [user]);

  useEffect(() => {
    if (options.symbols?.length && options.strategies?.length) {
      setForm({
        symbol: options.symbols[0],
        timeframe: options.timeframes[0],
        initialBalance: options.balances?.[2] || 1000,
        strategy: options.strategies[0]?.name || options.strategies[0], // handle object
        risk: options.risks?.[1] || "Medium",
        stopLoss: options.stopLosses?.[0] || 1,
        takeProfit: options.takeProfits?.[0] || 2,
      });
    }
  }, [options]);

  async function loadHistoryChart() {
    await fetchBacktests();
    const data = backtests.map(bt => ({
      time: new Date(bt.createdAt).toLocaleString(),
      initialBalance: bt.initialBalance,
      finalBalance: bt.finalBalance ?? ((bt.results?.profit ?? 0) + bt.initialBalance),
      profit: bt.results?.profit ?? 0,
    }));
    setHistoryChart(data);
  }

  async function handleRun() {
    if (!form.symbol || !form.timeframe) return alert("Select symbol and timeframe!");
    await runBacktest(form);
    loadHistoryChart();
  }

  async function handleBatchRun() {
    const paramCombos = options.symbols.flatMap(symbol =>
      options.strategies.map(strategy => ({
        symbol,
        timeframe: form.timeframe,
        strategy: typeof strategy === "string" ? { name: strategy } : strategy,
        risk: form.risk,
        stopLoss: form.stopLoss,
        takeProfit: form.takeProfit,
        initialBalance: form.initialBalance
      }))
    );
    await runBatchBacktests(paramCombos, "coinbase");
    loadHistoryChart();
  }

  const filteredBacktests = backtests.filter(bt =>
    (!filters.symbol || bt.symbol === filters.symbol) &&
    (!filters.strategy || bt.strategy?.name === filters.strategy || bt.strategy === filters.strategy) &&
    (!filters.risk || bt.risk === filters.risk)
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Backtests</h1>

      {/* Controls */}
      <div className="bg-gray-100 p-4 rounded-2xl flex flex-wrap gap-4 items-end">
        <select value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}>
          {options.symbols?.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={form.timeframe} onChange={e => setForm(f => ({ ...f, timeframe: e.target.value }))}>
          {options.timeframes?.map(tf => <option key={tf} value={tf}>{tf}</option>)}
        </select>

        <select value={form.strategy} onChange={e => setForm(f => ({ ...f, strategy: e.target.value }))}>
          {options.strategies?.map(st => {
            const name = typeof st === "string" ? st : st.name;
            return <option key={name} value={name}>{name}</option>
          })}
        </select>

        <select value={form.risk} onChange={e => setForm(f => ({ ...f, risk: e.target.value }))}>
          {options.risks?.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select value={form.stopLoss} onChange={e => setForm(f => ({ ...f, stopLoss: Number(e.target.value) }))}>
          {options.stopLosses?.map(sl => <option key={sl} value={sl}>{sl}%</option>)}
        </select>

        <select value={form.takeProfit} onChange={e => setForm(f => ({ ...f, takeProfit: Number(e.target.value) }))}>
          {options.takeProfits?.map(tp => <option key={tp} value={tp}>{tp}%</option>)}
        </select>

        <select value={form.initialBalance} onChange={e => setForm(f => ({ ...f, initialBalance: Number(e.target.value) }))}>
          {options.balances?.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <button onClick={handleRun} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
          {loading ? "Running..." : "Run Backtest"}
        </button>

        <button onClick={handleBatchRun} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded">
          {loading ? "Running..." : "Run Batch Backtests"}
        </button>
      </div>

      {/* Table of Backtests */}
      <div className="overflow-x-auto mt-4">
        <table className="min-w-full bg-white rounded-lg overflow-hidden shadow">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-4 py-2">Symbol</th>
              <th className="px-4 py-2">Strategy</th>
              <th className="px-4 py-2">Risk</th>
              <th className="px-4 py-2">Stop Loss %</th>
              <th className="px-4 py-2">Take Profit %</th>
              <th className="px-4 py-2">Initial Balance</th>
              <th className="px-4 py-2">Profit</th>
              <th className="px-4 py-2">Final Balance</th>
            </tr>
          </thead>
          <tbody>
            {filteredBacktests.map(bt => {
              const isBest = best?._id === bt._id;
              const strategyName = bt.strategy?.name || bt.strategy;
              return (
                <tr key={bt._id} className={isBest ? "bg-yellow-100 font-bold" : ""}>
                  <td className="px-4 py-2">{bt.symbol}</td>
                  <td className="px-4 py-2">{strategyName}</td>
                  <td className="px-4 py-2">{bt.risk}</td>
                  <td className="px-4 py-2">{bt.stopLoss}</td>
                  <td className="px-4 py-2">{bt.takeProfit}</td>
                  <td className="px-4 py-2">{bt.initialBalance}</td>
                  <td className="px-4 py-2">{bt.results?.profit?.toFixed(2)}</td>
                  <td className="px-4 py-2">{bt.finalBalance?.toFixed(2) ?? (bt.initialBalance + bt.results?.profit).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* History Chart */}
      {historyChart.length > 0 && (
        <div className="bg-white p-4 rounded-2xl shadow mt-6">
          <h2 className="font-semibold mb-2">Backtest History Chart</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historyChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="finalBalance" stroke="#10B981" dot={false} />
              <Line type="monotone" dataKey="profit" stroke="#F59E0B" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}
