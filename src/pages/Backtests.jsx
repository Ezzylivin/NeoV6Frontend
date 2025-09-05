// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, Cell, ResponsiveContainer
} from "recharts";

export default function Backtests() {
  const { options, fetchOptions, runBacktest, runBatchBacktests } = useBacktest();

  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [selectedBalance, setSelectedBalance] = useState(1000);
  const [selectedStrategy, setSelectedStrategy] = useState({ name: "SMA", parameters: {} });
  const [selectedRisk, setSelectedRisk] = useState("Medium");
  const [selectedTP, setSelectedTP] = useState(null);
  const [selectedSL, setSelectedSL] = useState(null);

  const [backtests, setBacktests] = useState([]);
  const [loadingSingle, setLoadingSingle] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [error, setError] = useState(null);
  const [collapsedLogs, setCollapsedLogs] = useState({});
  const [viewMode, setViewMode] = useState("chart");

  useEffect(() => {
    async function loadOptions() {
      try {
        const resp = await fetchOptions();
        if (resp?.success && resp?.options) {
          if (!selectedSymbol) setSelectedSymbol(resp.options.symbols?.[0] || "BTCUSDT");
        }
      } catch (err) {
        console.error("Failed to fetch options:", err);
        setError("Could not load backtest options");
      }
    }
    loadOptions();
  }, [fetchOptions, selectedSymbol]);

  const normalizeNumber = (val) => {
    if (val === "" || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  const formatTimestamp = ts => ts ? new Date(ts).toLocaleString() : "";
  const toggleLog = idx => setCollapsedLogs(prev => ({ ...prev, [idx]: !prev[idx] }));

  // -------------------- Single Backtest --------------------
  const handleRunSingleBacktest = async () => {
    if (!selectedSymbol) return;
    setLoadingSingle(true);
    setError(null);
    setBacktests([]);
    try {
      const { saved, metrics, equityCurve, trades } = await runBacktest({
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        initialBalance: selectedBalance,
        strategy: selectedStrategy,
        risk: selectedRisk,
        takeProfit: normalizeNumber(selectedTP),
        stopLoss: normalizeNumber(selectedSL),
      });

      // Normalize data
      const normalizedEquity = (equityCurve || []).map((val, idx) => ({
        time: val.time || idx,
        equity: val.equity ?? val
      }));
      const normalizedTrades = (trades || []).map(t => ({
        exitTime: t.exitTime || t.time || t.exitIndex,
        profit: t.pnl ?? t.profit ?? 0
      }));

      setBacktests([{
        saved,
        metrics: {
          netProfit: metrics?.netProfit ?? 0,
          winRate: metrics?.winRate ?? 0,
          maxDrawdown: metrics?.maxDrawdown ?? 0,
          tradesCount: metrics?.tradesCount ?? 0
        },
        equityCurve: normalizedEquity,
        trades: normalizedTrades,
        label: "(New)",
        params: { symbol: selectedSymbol, timeframe: selectedTimeframe, balance: selectedBalance, strategy: selectedStrategy.name, risk: selectedRisk, takeProfit: selectedTP, stopLoss: selectedSL }
      }]);
    } catch (err) {
      console.error("Backtest failed:", err);
      setError("Backtest failed");
    } finally {
      setLoadingSingle(false);
    }
  };

  // -------------------- Batch Backtests --------------------
  const handleRunBatchBacktests = async () => {
    setLoadingBatch(true);
    setError(null);
    setBacktests([]);
    try {
      const { results, usedCombos } = await runBatchBacktests({
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        initialBalance: selectedBalance
      });

      const mapped = results.map((r, idx) => ({
        saved: r.saved,
        metrics: {
          netProfit: r.metrics?.netProfit ?? 0,
          winRate: r.metrics?.winRate ?? 0,
          maxDrawdown: r.metrics?.maxDrawdown ?? 0,
          tradesCount: r.metrics?.tradesCount ?? 0
        },
        equityCurve: (r.equityCurve || r.saved?.equityCurve || []).map((val, i) => ({
          time: val.time || i,
          equity: val.equity ?? val
        })),
        trades: (r.trades || r.saved?.tradeBreakdown || []).map(t => ({
          exitTime: t.exitTime || t.time || t.exitIndex,
          profit: t.pnl ?? t.profit ?? 0
        })),
        label: `(Batch #${idx + 1})`,
        params: usedCombos[idx] || {},
      }));

      setBacktests(mapped);
