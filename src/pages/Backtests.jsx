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
    if (!options.symbols?.length || !options.strategies?.length) return;

    setSelectedSymbol(options.symbols[0]);
    setSelectedStrategy(options.strategies[0].name);
    setSelectedTimeframe(options.timeframes?.[0] || "1h");
    setSelectedBalance(options.balances?.[0] || 1000);
    setSelectedRisk(options.risks?.[0] || "Medium");
    setSelectedPosition(options.positions?.[0] || "Both");
  }, [options.symbols, options.strategies, options.timeframes, options.balances, options.risks, options.positions]);

  // --- Update strategy parameters when selected strategy changes ---
  useEffect(() => {
    if (!selectedStrategy) return;
    const strat = options.strategies?.find((s) => s.name === selectedStrategy);
    // Fill parameters with defaults if defined, else 0
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
    if (!userId) {
      alert("You must be logged in to run backtests.");
      return;
    }

    const strat = options.strategies?.find((s) => s.name === selectedStrategy) || options.strategies[0];

    const payload = {
      userId,
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      initialBalance: selectedBalance > 0 ? selectedBalance : 1000,
      strategyId: strat._id,
      strategy: { name: strat.name, parameters: strategyParams },
      risk: selectedRisk || "Medium",
      takeProfit: selectedTP ?? undefined,
      stopLoss: selectedSL ?? undefined,
      startDate: selectedStartDate ?? undefined,
      endDate: selectedEndDate ?? undefined,
      useNews: realism.useNews,
      useSlippage: realism.useSlippage,
      useSpread: realism.useSpread,
      useRandomEvents: realism.useRandomEvents ?? realism.randomEventProb > 0,
      baseSlippageBps: realism.slippage_bps,
      positionSide: selectedPosition || "Both",
      tradeConfig: {},
    };

    console.log("🚀 [Backtests] Single Payload:", payload);

    try {
      const result = await runBacktest(payload);
      console.log("✅ [Backtests] Single Result:", result);
    } catch (err) {
      console.error("❌ [Backtests] runBacktest failed:", err);
    }
  };

  // --- Run batch backtests ---
  const handleRunBatch = async () => {
    if (!userId) {
      alert("You must be logged in to run batch backtests.");
      return;
    }

    const paramCombos = options.strategies?.map((s) => ({
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      initialBalance: selectedBalance > 0 ? selectedBalance : 1000,
      strategyId: s._id,
      strategy: { name: s.name, parameters: strategyParams },
      risk: selectedRisk || "Medium",
      takeProfit: selectedTP ?? undefined,
      stopLoss: selectedSL ?? undefined,
      startDate: selectedStartDate ?? undefined,
      endDate: selectedEndDate ?? undefined,
      useNews: realism.useNews,
      useSlippage: realism.useSlippage,
      useSpread: realism.useSpread,
      useRandomEvents: realism.useRandomEvents ?? realism.randomEventProb > 0,
      baseSlippageBps: realism.slippage_bps,
      positionSide: selectedPosition || "Both",
      tradeConfig: {},
    }));

    const payload = { userId, paramCombos };

    console.log("🚀 [Backtests] Batch Payload:", payload);

    try {
      const result = await runBatchBacktests(payload);
      console.log("✅ [Backtests] Batch Results:", result);
    } catch (err) {
      console.error("❌ [Backtests] runBatchBacktests failed:", err);
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
            setStrategyParams((prev) => ({ ...prev, [key]: Number(e.target.value) }))
          }
          className="border p-1 rounded w-full"
        />
      </label>
    ));

  // --- Render equity chart ---
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

  // --- Render summary table ---
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

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4">
        <label>
          Symbol
          <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)}>
            {options.symbols?.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label>
          Strategy
          <select value={selectedStrategy} onChange={(e) => setSelectedStrategy(e.target.value)}>
            {options.strategies?.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </label>

        <label>
          Timeframe
          <select value={selectedTimeframe} onChange={(e) => setSelectedTimeframe(e.target.value)}>
            {options.timeframes?.map((tf) => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </label>

        <label>
          Balance
          <input type="number" value={selectedBalance} onChange={(e) => setSelectedBalance(Number(e.target.value))} />
        </label>

        <label>
          Risk
          <select value={selectedRisk} onChange={(e) => setSelectedRisk(e.target.value)}>
            {options.risks?.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        <label>
          Position
          <select value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)}>
            {options.positions?.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <label>
          Start Date
          <input type="date" value={selectedStartDate} onChange={(e) => setSelectedStartDate(e.target.value)} />
        </label>

        <label>
          End Date
          <input type="date" value={selectedEndDate} onChange={(e) => setSelectedEndDate(e.target.value)} />
        </label>
      </div>

      {/* Strategy parameters */}
      <div className="mt-4">{renderStrategyParams()}</div>

      {/* Realism settings */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <label>
          <input
            type="checkbox"
            checked={realism.useNews}
            onChange={(e) => setRealism((prev) => ({ ...prev, useNews: e.target.checked }))}
          />
          Use News
        </label>
        <label>
          <input
            type="checkbox"
            checked={realism.useSlippage}
            onChange={(e) => setRealism((prev) => ({ ...prev, useSlippage: e.target.checked }))}
          />
          Use Slippage
        </label>
        <label>
          <input
            type="checkbox"
            checked={realism.useSpread}
            onChange={(e) => setRealism((prev) => ({ ...prev, useSpread: e.target.checked }))}
          />
          Use Spread
        </label>
      </div>

      {/* Run Buttons */}
      <div className="mt-4 flex gap-4">
        <button onClick={handleRunBacktest} className="px-4 py-2 bg-blue-600 text-white rounded">
          {loading ? "Running..." : "Run Backtest"}
        </button>
        <button onClick={handleRunBatch} className="px-4 py-2 bg-green-600 text-white rounded">
          {loading ? "Running..." : "Run Batch Backtests"}
        </button>
      </div>

      {/* Error message */}
      {error && <p className="text-red-600">{error}</p>}

      {/* Single Backtest Result */}
      {currentBacktest && (
        <div className="mt-6 space-y-4">
          <h3 className="font-semibold">Single Backtest</h3>
          {renderChart(currentBacktest.equityCurve)}
          {renderSummary(currentBacktest)}
        </div>
      )}

      {/* Batch Backtest Results */}
      {batchResults?.length > 0 && (
        <div className="mt-6 space-y-6">
          <h3 className="font-semibold">Batch Backtests</h3>
          {batchResults.map((bt, i) => (
            <div key={i} className="border p-2 rounded">
              <h4 className="font-medium">{bt.strategy?.name || `Strategy ${i + 1}`}</h4>
              {renderChart(bt.equityCurve, `hsl(${(i * 60) % 360}, 70%, 50%)`)}
              {renderSummary(bt)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
