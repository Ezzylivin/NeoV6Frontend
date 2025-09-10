// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export default function Backtests() {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    options,
    loading,
    error,
    currentBacktest,
    runBacktest,
    batchResults,
    runBatchBacktests,
    defaultRealism,
  } = useBacktest();

  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");
  const [selectedBalance, setSelectedBalance] = useState(0);
  const [selectedRisk, setSelectedRisk] = useState("");
  const [selectedTP, setSelectedTP] = useState(null);
  const [selectedSL, setSelectedSL] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState("");
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [strategyParams, setStrategyParams] = useState({});
  const [realism, setRealism] = useState(defaultRealism);

  // --- Auto-set defaults when options load ---
  useEffect(() => {
    if (!options.symbols?.length || !options.strategies?.length) return;

    setSelectedSymbol((prev) => prev || options.symbols[0]);
    setSelectedStrategy((prev) => prev || options.strategies[0].name);
    setSelectedTimeframe((prev) => prev || options.timeframes?.[0] || "1h");
    setSelectedBalance((prev) => prev || options.balances?.[0] || 1000);
    setSelectedRisk((prev) => prev || options.risks?.[0] || "Medium");
    setSelectedPosition((prev) => prev || options.positions?.[0] || "Both");
  }, [
    options.symbols,
    options.strategies,
    options.timeframes,
    options.balances,
    options.risks,
    options.positions,
  ]);

  // --- Update strategy parameters when selected strategy changes ---
  useEffect(() => {
    if (!selectedStrategy) return;
    const strat = options.strategies?.find((s) => s.name === selectedStrategy);
    setStrategyParams(strat?.parameters || {});
  }, [selectedStrategy, options.strategies]);

  // --- Auto-adjust start/end dates ---
  useEffect(() => {
    if (!selectedSymbol || !selectedTimeframe) return;
    const available = options.availableDates?.[selectedSymbol]?.[selectedTimeframe];
    if (!available) return;
    setSelectedStartDate((prev) => prev || available.start);
    setSelectedEndDate((prev) => prev || available.end);
  }, [selectedSymbol, selectedTimeframe, options.availableDates]);

  // --- RUN SINGLE BACKTEST ---
  const handleRunBacktest = async () => {
    if (!userId) {
      alert("You must be logged in to run backtests.");
      return;
    }

    const strategy = options.strategies?.find((s) => s.name === selectedStrategy) || options.strategies?.[0];

    const payload = {
      userId,
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      initialBalance: selectedBalance > 0 ? selectedBalance : 1000,
      strategyId: strategy?._id || null,
      strategy: { name: selectedStrategy, parameters: strategyParams || {} },
      risk: selectedRisk || "Medium",
      takeProfit: selectedTP || undefined,
      stopLoss: selectedSL || undefined,
      limit: undefined,
      startDate: selectedStartDate || undefined,
      endDate: selectedEndDate || undefined,
      useNews: realism.useNews,
      useSlippage: realism.useSlippage,
      useSpread: realism.useSpread,
      useRandomEvents: realism.randomEventProb > 0,
      baseSlippageBps: realism.slippage_bps,
      positionSide: selectedPosition || "Both",
      tradeConfig: {},
    };

    console.log("⚙️ Strategy Params:", strategyParams);
    console.log("🎭 Realism Settings:", realism);
    console.log("🚀 [Page] Single Payload Sent:", payload);

    try {
      const result = await runBacktest(payload);
      console.log("✅ [Page] Backtest result:", result);
    } catch (err) {
      console.error("❌ [Page] runBacktest failed:", err);
    }
  };

  // --- RUN BATCH BACKTESTS ---
  const handleRunBatch = async () => {
    if (!userId) {
      alert("You must be logged in to run batch backtests.");
      return;
    }

    const paramCombos = [
      {
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        initialBalance: selectedBalance > 0 ? selectedBalance : 1000,
        strategyId:
          options.strategies?.find((s) => s.name === selectedStrategy)?._id || null,
        strategy: { name: selectedStrategy, parameters: strategyParams || {} },
        risk: selectedRisk || "Medium",
        takeProfit: selectedTP || undefined,
        stopLoss: selectedSL || undefined,
        limit: undefined,
        startDate: selectedStartDate || undefined,
        endDate: selectedEndDate || undefined,
        useNews: realism.useNews,
        useSlippage: realism.useSlippage,
        useSpread: realism.useSpread,
        useRandomEvents: realism.randomEventProb > 0,
        baseSlippageBps: realism.slippage_bps,
        positionSide: selectedPosition || "Both",
        tradeConfig: {},
      },
    ];

    const payload = { userId, paramCombos };

    console.log("⚙️ Strategy Params (Batch):", strategyParams);
    console.log("🎭 Realism Settings (Batch):", realism);
    console.log("🚀 [Page] Final Batch Payload:", payload);

    try {
      const result = await runBatchBacktests(payload);
      console.log("✅ [Page] Batch results:", result);
    } catch (err) {
      console.error("❌ [Page] runBatchBacktests failed:", err);
    }
  };

  // --- Render functions ---
  const renderStrategyParams = () =>
    Object.keys(strategyParams || {}).map((key) => (
      <label key={key} className="flex flex-col text-sm">
        {key}
        <input
          type="number"
          value={strategyParams[key]}
          onChange={(e) =>
            setStrategyParams((prev) => ({ ...prev, [key]: Number(e.target.value) }))
          }
          className="border p-1 rounded w-full"
        />
      </label>
    ));

  const renderChart = (data, color = "#8884d8") =>
    data?.length > 0 ? (
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="equity" stroke={color} />
        </LineChart>
      </ResponsiveContainer>
    ) : (
      <p>No equity data.</p>
    );

  const renderSummary = (bt) => (
    <table className="w-full mt-2 text-sm border-collapse border border-gray-300">
      <tbody>
        <tr>
          <td className="border p-1 font-semibold">Trades</td>
          <td className="border p-1">{bt.trades?.length || 0}</td>
        </tr>
        <tr>
          <td className="border p-1 font-semibold">Final Balance</td>
          <td className="border p-1">
            ${bt.equityCurve?.slice(-1)[0]?.equity?.toFixed(2) || 0}
          </td>
        </tr>
        <tr>
          <td className="border p-1 font-semibold">Max Drawdown</td>
          <td className="border p-1">{bt.metrics?.maxDrawdown?.toFixed(2) || 0}%</td>
        </tr>
        <tr>
          <td className="border p-1 font-semibold">Net Profit</td>
          <td className="border p-1">{bt.metrics?.netProfit?.toFixed(2) || 0}</td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Backtesting</h2>
      {/* Controls, Strategy Params, Realism, Buttons, Current Backtest, Batch Results */}
      {/* ...keep all JSX as in original, unchanged except payload fixes above */}
    </div>
  );
}
