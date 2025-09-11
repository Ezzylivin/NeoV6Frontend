// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useAuth } from "../context/AuthContext.jsx";
import StrategyList from "../components/strategyList.jsx";
import StrategyForm from "../components/strategyForm.jsx";
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

  // --- Strategy management ---
  const [strategies, setStrategies] = useState([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState(null);

  useEffect(() => {
    if (!userId) return;
    const fetchStrategies = async () => {
      try {
        const response = await fetch(`/api/strategies/user/${userId}`);
        const data = await response.json();
        setStrategies(data);
      } catch (err) {
        console.error("Error fetching strategies:", err);
      }
    };
    fetchStrategies();
  }, [userId]);

  const handleEditStrategy = (strategyId) => setSelectedStrategyId(strategyId);

  const handleSubmitStrategy = async (formData) => {
    try {
      if (selectedStrategyId) {
        await fetch(`/api/strategies/${selectedStrategyId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch("/api/strategies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }

      // Refresh strategies
      const res = await fetch(`/api/strategies/user/${userId}`);
      const updated = await res.json();
      setStrategies(updated);
      setSelectedStrategyId(null);
    } catch (err) {
      console.error("Error submitting strategy:", err);
    }
  };

  // --- Auto-set defaults when options load ---
  useEffect(() => {
    if (options.symbols?.length && strategies.length) {
      setSelectedSymbol(options.symbols[0]);
      setSelectedStrategy(strategies[0]?.name || "");
      setSelectedTimeframe(options.timeframes?.[0] || "1h");
      setSelectedBalance(options.balances?.[0] || 1000);
      setSelectedRisk(options.risks?.[0] || "Medium");
      setSelectedPosition(options.positions?.[0] || "Both");
    }
  }, [options, strategies]);

  // --- Update strategy parameters when selected strategy changes ---
  useEffect(() => {
    if (!selectedStrategy) return;
    const strat = strategies.find((s) => s.name === selectedStrategy);
    const defaults = {};
    if (strat?.params) {
      Object.keys(strat.params).forEach((key) => {
        defaults[key] = strat.params[key] ?? 0;
      });
    }
    setStrategyParams(defaults);
  }, [selectedStrategy, strategies]);

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
    const strat = strategies.find((s) => s.name === selectedStrategy) || {};
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
    const paramCombos = strategies.map((s) => ({
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
      <h2 className="text-2xl font-bold">Backtests</h2>

      {/* Strategy List and Form */}
      <StrategyList strategies={strategies} onEdit={handleEditStrategy} />
      <StrategyForm strategyId={selectedStrategyId} onSubmit={handleSubmitStrategy} />

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        {/* Render select inputs for symbol, timeframe, balance, risk, position, etc. */}
      </div>

      {/* Strategy parameters */}
      <div className="mt-4">{renderStrategyParams()}</div>

      {/* Realism settings */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        {/* Realism checkboxes here */}
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

      {/* Results & Charts */}
      <div className="mt-6">
        {currentBacktest && (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={currentBacktest.results}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="balance" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
