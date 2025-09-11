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
  Tooltip as ChartTooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export default function Backtests() {
  const { user } = useAuth();
  const userId = user?.id;

  const { options: hookOptions, currentBacktest, runBacktest, runBatchBacktests, defaultRealism } =
    useBacktest();

  const [options, setOptions] = useState({
    symbols: [],
    strategies: [],
    timeframes: [],
    balances: [],
    risks: [],
    positions: [],
    takeProfits: [],
    stopLosses: [],
    availableDates: {},
  });

  const [loadingSingle, setLoadingSingle] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);

  // User selections
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");
  const [selectedBalance, setSelectedBalance] = useState(1000);
  const [selectedRisk, setSelectedRisk] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [selectedTP, setSelectedTP] = useState("");
  const [selectedSL, setSelectedSL] = useState("");
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");

  const [strategyParams, setStrategyParams] = useState({});
  const [realism, setRealism] = useState(defaultRealism);

  // Tab state: presets | strategy | advanced
  const [activeTab, setActiveTab] = useState("presets");

  // Batch backtest
  const [batchMode, setBatchMode] = useState(false);
  const [selectedBatchStrategies, setSelectedBatchStrategies] = useState([]);

  // Beginner presets
  const beginnerPresets = [
    {
      name: "Conservative BTC Swing",
      symbol: "BTC/USDT",
      strategy: "Simple Moving Average",
      timeframe: "4h",
      balance: 1000,
      risk: "Low",
      position: "Long Only",
      takeProfit: 5,
      stopLoss: 2,
      params: { shortSMA: 10, longSMA: 50 },
    },
    {
      name: "Aggressive ETH Day Trade",
      symbol: "ETH/USDT",
      strategy: "RSI Momentum",
      timeframe: "1h",
      balance: 1000,
      risk: "High",
      position: "Both",
      takeProfit: 10,
      stopLoss: 5,
      params: { rsiPeriod: 14, overbought: 70, oversold: 30 },
    },
  ];

  // Populate options & set defaults
  useEffect(() => {
    if (!hookOptions) return;
    setOptions(hookOptions);
    setSelectedSymbol(hookOptions.symbols?.[0] || "");
    setSelectedStrategy(hookOptions.strategies?.[0]?.name || "");
    setSelectedTimeframe(hookOptions.timeframes?.[0] || "1h");
    setSelectedBalance(hookOptions.balances?.[0] || 1000);
    setSelectedRisk(hookOptions.risks?.[0] || "Medium");
    setSelectedPosition(hookOptions.positions?.[0] || "Both");
    setSelectedTP(hookOptions.takeProfits?.[0] || 0);
    setSelectedSL(hookOptions.stopLosses?.[0] || 0);
  }, [hookOptions]);

  // Update strategy params dynamically
  useEffect(() => {
    if (!selectedStrategy) return;
    const strat = options.strategies?.find((s) => s.name === selectedStrategy);
    if (!strat?.params) {
      setStrategyParams({});
      return;
    }
    const defaults = {};
    Object.keys(strat.params).forEach((key) => {
      const paramInfo = strat.params[key];
      const dynamicRange = paramInfo?.ranges?.[selectedSymbol]?.[selectedTimeframe];
      defaults[key] = paramInfo?.default ?? dynamicRange?.default ?? 0;
    });
    setStrategyParams(defaults);
  }, [selectedStrategy, selectedSymbol, selectedTimeframe, options.strategies]);

  // Auto-set available dates
  useEffect(() => {
    if (!selectedSymbol || !selectedTimeframe) return;
    const available = options.availableDates?.[selectedSymbol]?.[selectedTimeframe];
    if (!available) return;
    setSelectedStartDate(available.start);
    setSelectedEndDate(available.end);
  }, [selectedSymbol, selectedTimeframe, options.availableDates]);

  // Apply preset
  const applyPreset = (preset) => {
    setSelectedSymbol(preset.symbol);
    setSelectedStrategy(preset.strategy);
    setSelectedTimeframe(preset.timeframe);
    setSelectedBalance(preset.balance);
    setSelectedRisk(preset.risk);
    setSelectedPosition(preset.position);
    setSelectedTP(preset.takeProfit);
    setSelectedSL(preset.stopLoss);
    setStrategyParams(preset.params);
  };

  // Render strategy parameters dynamically
  const renderStrategyParams = () =>
    Object.keys(strategyParams).map((key) => {
      const strat = options.strategies?.find((s) => s.name === selectedStrategy);
      const paramInfo = strat?.params?.[key] ?? {};
      const dynamicRange = paramInfo?.ranges?.[selectedSymbol]?.[selectedTimeframe];
      const min = dynamicRange?.min ?? paramInfo.min ?? 0;
      const max = dynamicRange?.max ?? paramInfo.max ?? 1000;
      const step = dynamicRange?.step ?? paramInfo.step ?? 1;
      const example = dynamicRange?.example ?? paramInfo.example ?? paramInfo.default ?? 0;
      const description = paramInfo.description || "Adjust according to strategy.";
      const useCase = paramInfo.useCase || "Typical use: adjust strategy behavior.";

      return (
        <div key={key} className="flex flex-col mt-2">
          <label className="text-sm relative group">
            <div className="flex justify-between items-center">
              <span className="font-medium">{key}</span>
              <span className="text-xs text-gray-500">
                Example: {example}, Range: {min}-{max}
              </span>
            </div>
            <input
              type="number"
              value={strategyParams[key]}
              min={min}
              max={max}
              step={step}
              onChange={(e) =>
                setStrategyParams((prev) => ({ ...prev, [key]: Number(e.target.value) }))
              }
              className="border p-1 rounded w-full"
              placeholder={`Recommended: ${example}`}
            />
            <div className="absolute left-full ml-2 top-0 w-64 bg-gray-800 text-white p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity text-xs z-10">
              <div>{description}</div>
              <div className="mt-1 italic">{useCase}</div>
            </div>
          </label>
        </div>
      );
    });

  // Single backtest handler
  const handleRunBacktest = async () => {
    if (!userId) return alert("Login required to run backtests.");
    const matched = options.strategies?.find((s) => s.name === selectedStrategy) || {};
    const payload = {
      userId,
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      initialBalance: Number(selectedBalance) || 1000,
      strategyId: matched._id || null,
      strategy: { name: matched.name || selectedStrategy, parameters: strategyParams },
      risk: selectedRisk,
      takeProfit: selectedTP || undefined,
      stopLoss: selectedSL || undefined,
      startDate: selectedStartDate,
      endDate: selectedEndDate,
      useNews: realism.useNews,
      useSlippage: realism.useSlippage,
      useSpread: realism.useSpread,
      positionSide: selectedPosition,
      tradeConfig: {},
    };
    try {
      setLoadingSingle(true);
      await runBacktest(payload);
    } catch (err) {
      console.error("Backtest failed:", err);
    } finally {
      setLoadingSingle(false);
    }
  };

  // Batch backtest handler
  const handleRunBatch = async () => {
    if (!userId || selectedBatchStrategies.length === 0) return;
    try {
      setLoadingBatch(true);
      await runBatchBacktests({ userId, strategies: selectedBatchStrategies });
    } catch (err) {
      console.error("Batch backtest failed:", err);
    } finally {
      setLoadingBatch(false);
    }
  };

  const formatTimestamp = (ts) => (ts ? new Date(ts).toLocaleString() : "");

  const renderChart = (data) => {
    if (!data || !data.length) return null;
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
          <YAxis />
          <ChartTooltip labelFormatter={formatTimestamp} />
          <Legend />
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="balance" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Backtests</h1>

      {/* Tabs */}
      <div className="flex space-x-4 border-b mb-4">
        <button
          className={`px-4 py-2 ${activeTab === "presets" ? "border-b-2 border-blue-500" : ""}`}
          onClick={() => setActiveTab("presets")}
        >
          Presets
        </button>
        <button
          className={`px-4 py-2 ${activeTab === "strategy" ? "border-b-2 border-blue-500" : ""}`}
          onClick={() => setActiveTab("strategy")}
        >
          Strategy
        </button>
        <button
          className={`px-4 py-2 ${activeTab === "advanced" ? "border-b-2 border-blue-500" : ""}`}
          onClick={() => setActiveTab("advanced")}
        >
          Advanced
        </button>
      </div>

      {/* Presets Tab */}
      {activeTab === "presets" && (
        <div className="space-y-2">
          <label>
            Beginner Presets
            <select
              onChange={(e) => {
                const preset = beginnerPresets.find((p) => p.name === e.target.value);
                if (preset) applyPreset(preset);
              }}
            >
              <option value="">Select a preset</option>
              {beginnerPresets.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* Strategy Tab */}
      {activeTab === "strategy" && (
        <div className="space-y-2">
          {/* Symbol */}
          <label>
            Symbol
            <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)}>
              {options.symbols.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {/* Strategy */}
          <label>
            Strategy
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
            >
              {options.strategies.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          {/* Strategy parameters */}
          {renderStrategyParams()}

          {/* Timeframe */}
          <label>
            Timeframe
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
            >
              {options.timeframes.map((tf) => (
                <option key={tf} value={tf}>
                  {tf}
                </option>
              ))}
            </select>
          </label>

          {/* Balance */}
          <label>
            Balance
            <input
              type="number"
              value={selectedBalance}
              onChange={(e) => setSelectedBalance(Number(e.target.value))}
            />
          </label>

          {/* Risk */}
          <label>
            Risk
            <select value={selectedRisk} onChange={(e) => setSelectedRisk(e.target.value)}>
              {options.risks.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          {/* Position */}
          <label>
            Position
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
            >
              {options.positions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          {/* Take Profit */}
          <label>
            Take Profit
            <select value={selectedTP} onChange={(e) => setSelectedTP(e.target.value)}>
              {options.takeProfits.map((tp) => (
                <option key={tp} value={tp}>
                  {tp}
                </option>
              ))}
            </select>
          </label>

          {/* Stop Loss */}
          <label>
            Stop Loss
            <select value={selectedSL} onChange={(e) => setSelectedSL(e.target.value)}>
              {options.stopLosses.map((sl) => (
                <option key={sl} value={sl}>
                  {sl}
                </option>
              ))}
            </select>
          </label>

          {/* Run Single Backtest */}
          <div className="space-x-2 mt-2">
            <button
              onClick={handleRunBacktest}
              disabled={loadingSingle}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              {loadingSingle ? "Running..." : "Run Backtest"}
            </button>
          </div>
        </div>
      )}

      {/* Advanced Tab */}
      {activeTab === "advanced" && (
        <div className="space-y-2">
          <label>
            <input
              type="checkbox"
              checked={realism.useSlippage}
              onChange={(e) => setRealism({ ...realism, useSlippage: e.target.checked })}
            />
            Use Slippage
          </label>
          <label>
            <input
              type="checkbox"
              checked={realism.useSpread}
              onChange={(e) => setRealism({ ...realism, useSpread: e.target.checked })}
            />
            Use Spread
          </label>
          <label>
            <input
              type="checkbox"
              checked={realism.useNews}
              onChange={(e) => setRealism({ ...realism, useNews: e.target.checked })}
            />
            Use News Events
          </label>

          {/* Batch Backtesting */}
          <label className="mt-2 block">
            <input
              type="checkbox"
              checked={batchMode}
              onChange={(e) => setBatchMode(e.target.checked)}
            />
            Enable Batch Backtesting
          </label>

          {batchMode && (
            <label>
              Select Strategies for Batch:
              <select
                multiple
                value={selectedBatchStrategies}
                onChange={(e) =>
                  setSelectedBatchStrategies(
                    Array.from(e.target.selectedOptions, (opt) => opt.value)
                  )
                }
              >
                {options.strategies.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {batchMode && (
            <button
              className="px-4 py-2 bg-green-500 text-white rounded mt-2"
              onClick={handleRunBatch}
              disabled={loadingBatch}
            >
              {loadingBatch ? "Running Batch..." : "Run Batch Backtests"}
            </button>
          )}
        </div>
      )}

      {/* Render Chart */}
      {currentBacktest && renderChart(currentBacktest)}
    </div>
  );
}
