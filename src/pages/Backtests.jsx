// src/pages/Backtests.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBacktest } from "../hooks/useBacktest.js";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, ReferenceDot,
} from "recharts";

export default function Backtests() {
  const { user } = useAuth();
  const { results: backtests, options, loading, error, fetchOptions, fetchBacktests } = useBacktest();

  const API_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com/api";

  const [form, setForm] = useState({
    symbol: "",
    timeframe: "",
    initialBalance: 1000,
    strategy: "",
    risk: "Medium",
  });

  const [historyChart, setHistoryChart] = useState([]);
  const [latest, setLatest] = useState(null); // {metrics, equityCurve, trades}

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
        strategy: options.strategies[0],
        risk: options.risks?.[1] || "Medium",
      });
    }
  }, [options]);

  async function loadHistoryChart() {
    if (!user?._id) return;
    try {
      const res = await axios.get(`${API_URL}/backtests`, { params: { userId: user._id } });
      const data = (res.data.backtests || []).map(bt => ({
        time: new Date(bt.createdAt).toLocaleString(),
        initialBalance: bt.initialBalance,
        finalBalance: bt.finalBalance,
        profit: bt.profit,
      }));
      setHistoryChart(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRun() {
    if (!form.symbol || !form.timeframe) return alert("Select symbol and timeframe!");
    try {
      const res = await axios.post(`${API_URL}/backtests/run`, {
        userId: user._id,
        ...form,
      });
      // latest detailed result for display
      setLatest({
        metrics: res.data.metrics,
        equityCurve: (res.data.equityCurve || []).map(p => ({
          // recharts prefers numbers for X if we want compact ticks; we’ll keep display as local time in tooltip
          time: new Date(p.time).getTime(),
          equity: p.equity,
        })),
        trades: res.data.trades || [],
      });

      // refresh history
      fetchBacktests();
      loadHistoryChart();
    } catch (err) {
      console.error(err);
      alert("Backtest failed: " + (err?.response?.data?.message || err.message));
    }
  }

  const Stats = ({ m }) => {
    if (!m) return null;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        <div className="p-3 rounded bg-gray-100">
          <div className="text-xs text-gray-500">Final Balance</div>
          <div className="text-lg font-semibold">${m.finalBalance.toLocaleString()}</div>
        </div>
        <div className="p-3 rounded bg-gray-100">
          <div className="text-xs text-gray-500">Net Profit</div>
          <div className={`text-lg font-semibold ${m.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${m.netProfit.toLocaleString()}
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
        <div className="p-3 rounded bg-gray-100">
          <div className="text-xs text-gray-500">Profit Factor</div>
          <div className="text-lg font-semibold">{m.profitFactor === Infinity ? "∞" : m.profitFactor}</div>
        </div>
        <div className="p-3 rounded bg-gray-100">
          <div className="text-xs text-gray-500">Sharpe</div>
          <div className="text-lg font-semibold">{m.sharpeRatio}</div>
        </div>
        <div className="p-3 rounded bg-gray-100">
          <div className="text-xs text-gray-500">CAGR</div>
          <div className="text-lg font-semibold">{m.cagr}%</div>
        </div>
        <div className="p-3 rounded bg-gray-100">
          <div className="text-xs text-gray-500">Trades</div>
          <div className="text-lg font-semibold">{m.tradesCount}</div>
        </div>
      </div>
    );
  };

  const TradeDots = ({ trades }) => {
    // show small green/red dots at trade exits on the equity curve
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
      return (
        <ReferenceDot
          key={idx}
          x={near.time}
          y={near.equity}
          r={4}
          stroke="none"
          fill={t.profit > 0 ? "#10B981" : "#EF4444"}
        />
      );
    });
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Backtests</h1>

      {/* Controls */}
      <div className="bg-gray-100 p-4 rounded-2xl flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium">Symbol</label>
          <select name="symbol" value={form.symbol}
                  onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}
                  className="border p-1 rounded">
            {options.symbols?.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Timeframe</label>
          <select name="timeframe" value={form.timeframe}
                  onChange={e => setForm(f => ({ ...f, timeframe: e.target.value }))}
                  className="border p-1 rounded">
            {options.timeframes?.map(tf => <option key={tf} value={tf}>{tf}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Strategy</label>
          <select name="strategy" value={form.strategy}
                  onChange={e => setForm(f => ({ ...f, strategy: e.target.value }))}
                  className="border p-1 rounded">
            {options.strategies?.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Risk</label>
          <select name="risk" value={form.risk}
                  onChange={e => setForm(f => ({ ...f, risk: e.target.value }))}
                  className="border p-1 rounded">
            {options.risks?.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Initial Balance</label>
          <select name="initialBalance" value={form.initialBalance}
                  onChange={e => setForm(f => ({ ...f, initialBalance: Number(e.target.value) }))}
                  className="border p-1 rounded w-28">
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

      {/* Latest result (equity curve + stats) */}
      {latest && (
        <div className="bg-white p-4 rounded-2xl shadow">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Latest Backtest – Equity Curve</h2>
            <div className="text-sm text-gray-600">
              {form.symbol} • {form.timeframe} • {form.strategy} • {form.risk}
            </div>
          </div>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latest.equityCurve}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tickFormatter={(ts) => new Date(ts).toLocaleString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(ts) => new Date(ts).toLocaleString()}
                  formatter={(v, n) => (n === "equity" ? `$${v.toLocaleString()}` : v)}
                />
                <Legend />
                <Line type="monotone" dataKey="equity" stroke="#3B82F6" dot={false} />
                <TradeDots trades={latest.trades} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <Stats m={latest.metrics} />
        </div>
      )}

      {/* Historical summary chart (existing) */}
      <div className="bg-white p-4 rounded-2xl shadow">
        <h2 className="text-xl font-semibold mb-4">Backtests History</h2>
        {historyChart.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historyChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="initialBalance" stroke="#F59E0B" strokeWidth={2} dot />
              <Line type="monotone" dataKey="finalBalance" stroke="#3B82F6" strokeWidth={2} dot />
              <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500">No chart data.</p>
        )}
      </div>

      {/* List existing backtests as before */}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
