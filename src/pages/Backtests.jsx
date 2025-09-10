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
    currentBacktest,
    batchResults,
    runBacktest,
    runBatchBacktests,
    defaultRealism,
    loadingSingle: hookLoadingSingle,
    loadingBatch: hookLoadingBatch,
  } = useBacktest();

  const [loadingSingle, setLoadingSingle] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);

  // --- Backtest controls ---
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");
  const [selectedBalance, setSelectedBalance] = useState(1000);
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
    if (options.symbols?.length && options.strategies?.length) {
      setSelectedSymbol(options.symbols[0]);
      setSelectedStrategy(options.strategies[0]?.name);
      setSelectedTimeframe(options.timeframes?.[0] || "1h");
      setSelectedBalance(options.balances?.[0] || 1000);
      setSelectedRisk(options.risks?.[0] || "Medium");
      setSelectedPosition(options.positions?.[0] || "Both");
    }
  }, [options]);

  // --- Update strategy parameters when selected strategy changes ---
  useEffect(() => {
    if (!selectedStrategy) return;
    const strat = options.strategies?.find((s) => s.name === selectedStrategy);
    const defaults = {};
    if (strat?.parameters) {
      Object.keys(strat.parameters).forEach((key) => {
        defaults[key] = strat.parameters[key] ?? 0;
      });
    }
    setStrategyParams(defaults);
  }, [selectedStrategy, options.strategies]);

  // --- Auto-adjust start/end dates ---
  useEffect(() => {
    if (!selectedSymbol || !selectedTimeframe) return;
    const available = options.availableDates?.[selectedSymbol]?.[selectedTimeframe];
    if (!available) return;
    setSelectedStartDate(available.start);
    setSelectedEndDate(available.end);
  }, [selectedSymbol, selectedTimeframe, options.availableDates]);

  // --- Run single backtest ---
  const handleRunBacktest = async () => {
    if (!userId) return alert("You must be logged in to run backtests.");
    const strat = options.strategies?.find((s) => s.name === selectedStrategy) || {};
    const payload = {
      userId,
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      initialBalance: Number(selectedBalance) || 1000,
      strategyId: strat._id || null,
      strategy: { name: strat.name || selectedStrategy, parameters: strategyParams },
      risk: selectedRisk,
      takeProfit: selectedTP ?? undefined,
      stopLoss: selectedSL ?? undefined,
      startDate: selectedStartDate,
      endDate: selectedEndDate,
      useNews: realism.useNews,
      useSlippage: realism.useSlippage,
      useSpread: realism.useSpread,
      useRandomEvents: realism.useRandomEvents ?? realism.randomEventProb > 0,
      baseSlippageBps: realism.slippage_bps,
      positionSide: selectedPosition,
      tradeConfig: {},
    };

    try {
      setLoadingSingle(true);
      await runBacktest(payload);
    } finally {
      setLoadingSingle(false);
    }
  };

  // --- Run batch backtests ---
  const handleRunBatch = async () => {
    if (!userId) return alert("You must be logged in to run batch backtests.");
    const paramCombos = options.strategies?.map((s) => ({
      userId,
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      initialBalance: Number(selectedBalance) || 1000,
      strategyId: s._id,
      strategy: { name: s.name, parameters: strategyParams },
      risk: selectedRisk,
      takeProfit: selectedTP ?? undefined,
      stopLoss: selectedSL ?? undefined,
      startDate: selectedStartDate,
      endDate: selectedEndDate,
      useNews: realism.useNews,
      useSlippage: realism.useSlippage,
      useSpread: realism.useSpread,
      useRandomEvents: realism.useRandomEvents ?? realism.randomEventProb > 0,
      baseSlippageBps: realism.slippage_bps,
      positionSide: selectedPosition,
      tradeConfig: {},
    }));

    try {
      setLoadingBatch(true);
      await runBatchBacktests({ paramCombos });
    } finally {
      setLoadingBatch(false);
    }
  };

  // --- Render strategy parameter inputs ---
  const renderStrategyParams = () =>
    Object.keys(strategyParams || {}).map((key) => (
      <label key={key} className="flex flex-col text-sm">
        {key}
        <input
          type="number"
          value={strategyParams[key]}
          onChange={(e) =>
            setStrategyParams((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
          className="border p-1 rounded w-full"
        />
      </label>
    ));

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Backtesting</h2>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4">
        {/* Render various select inputs for symbol, strategy, etc. */}
      </div>

      {/* Strategy parameters */}
      <div className="mt-4">{renderStrategyParams()}</div>

      {/* Realism settings */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        {/* Realism settings checkboxes */}
      </div>

      {/* Run Buttons */}
      <div className="mt-4 flex gap-4">
        <button
          onClick={handleRunBacktest}
          disabled={loadingSingle || hookLoadingSingle}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loadingSingle || hookLoadingSingle ? "Running..." : "Run Backtest"}
        </button>
        <button
          onClick={handleRunBatch}
          disabled={loadingBatch || hookLoadingBatch}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          {loadingBatch || hookLoadingBatch ? "Running..." : "Run Batch Backtests"}
        </button>
      </div>

      {/* Results and Summary */}
      {/* Render single and batch backtest results with charts and summaries */}
    </div>
  );
}
