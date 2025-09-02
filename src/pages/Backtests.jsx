// File: src/pages/Backtests.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBacktest } from "../hooks/useBacktest.js"; // matches named export
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
        strategy: { name: strategy },
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
    (!filters.strategy || bt.strategy === filters.strategy) &&
    (!filters.risk || bt.risk === filters.risk)
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Backtests</h1>
      {/* Controls, Filters, Table, and Chart... */}
      {/* (Keep the same JSX from your original Backtests.jsx) */}
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}
