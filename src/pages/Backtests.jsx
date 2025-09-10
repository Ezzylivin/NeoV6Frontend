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

  // Auto-set defaults when options load
  useEffect(() => {
    if (!options.symbols?.length) return;
    setSelectedSymbol((prev) => prev || options.symbols[0]);
    setSelectedStrategy((prev) => prev || options.strategies?.[0]?.name || "");
    setSelectedTimeframe((prev) => prev || options.timeframes?.[0] || "1h");
    setSelectedBalance((prev) => prev || options.balances?.[0] || 1000);
    setSelectedRisk((prev) => prev || options.risks?.[0] || "Medium");
    setSelectedPosition((prev) => prev || options.positions?.[0] || "Both");
    const strat = options.strategies?.find((s) => s.name === selectedStrategy);
    if (strat?.parameters) setStrategyParams(strat.parameters);
  }, [options]);

  // Update strategy params when strategy changes
  useEffect(() => {
    const strat = options.strategies?.find((s) => s.name === selectedStrategy);
    setStrategyParams(strat?.parameters || {});
  }, [selectedStrategy, options.strategies]);

  // Auto-adjust start/end dates
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

    const payload = {
      userId,
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      initialBalance: selectedBalance,
      strategyId: options.strategies?.find((s) => s.name === selectedStrategy)?._id || null,
      strategy: { name: selectedStrategy, parameters: strategyParams },
      risk: selectedRisk,
      takeProfit: selectedTP,
      stopLoss: selectedSL,
      limit: undefined, 
      startDate: selectedStartDate || undefined,
      endDate: selectedEndDate || undefined,
      useNews: realism.useNews,
      useSlippage: realism.useSlippage,
      useSpread: realism.useSpread,
      useRandomEvents: realism.randomEventProb > 0,
      baseSlippageBps: realism.slippage_bps,
      positionSide: selectedPosition,
      tradeConfig: {},
    };

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
        initialBalance: selectedBalance,
        strategyId: options.strategies?.find((s) => s.name === selectedStrategy)?._id || null,
        strategy: { name: selectedStrategy, parameters: strategyParams },
        risk: selectedRisk,
        takeProfit: selectedTP,
        stopLoss: selectedSL,
        limit: undefined,
        startDate: selectedStartDate || undefined,
        endDate: selectedEndDate || undefined,
        useNews: realism.useNews,
        useSlippage: realism.useSlippage,
        useSpread: realism.useSpread,
        useRandomEvents: realism.randomEventProb > 0,
        baseSlippageBps: realism.slippage_bps,
        positionSide: selectedPosition,
        tradeConfig: {},
      },
    ];

    const payload = { userId, paramCombos };
    console.log("🚀 [Page] Final Batch Payload:", payload);

    try {
      const result = await runBatchBacktests(payload);
      console.log("✅ [Page] Batch results:", result);
    } catch (err) {
      console.error("❌ [Page] runBatchBacktests failed:", err);
    }
  };

  // Render strategy params
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

  // Render chart
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

  // Render summary
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg shadow">
        <label className="flex flex-col text-sm">
          Symbol
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="border p-1 rounded"
          >
            {options.symbols?.map((sym) => (
              <option key={sym} value={sym}>{sym}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          Strategy
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value)}
            className="border p-1 rounded"
          >
            {options.strategies?.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          Timeframe
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border p-1 rounded"
          >
            {options.timeframes?.map((tf) => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          Balance
          <select
            value={selectedBalance}
            onChange={(e) => setSelectedBalance(Number(e.target.value))}
            className="border p-1 rounded"
          >
            {options.balances?.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          Risk
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="border p-1 rounded"
          >
            {options.risks?.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          Take Profit
          <select
            value={selectedTP || ""}
            onChange={(e) => setSelectedTP(Number(e.target.value))}
            className="border p-1 rounded"
          >
            <option value="">None</option>
            {options.takeProfits?.map((tp) => (
              <option key={tp} value={tp}>{tp}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          Stop Loss
          <select
            value={selectedSL || ""}
            onChange={(e) => setSelectedSL(Number(e.target.value))}
            className="border p-1 rounded"
          >
            <option value="">None</option>
            {options.stopLosses?.map((sl) => (
              <option key={sl} value={sl}>{sl}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          Position
          <select
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            className="border p-1 rounded"
          >
            {options.positions?.map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          Start Date
          <input
            type="date"
            value={selectedStartDate}
            onChange={(e) => setSelectedStartDate(e.target.value)}
            className="border p-1 rounded"
          />
        </label>

        <label className="flex flex-col text-sm">
          End Date
          <input
            type="date"
            value={selectedEndDate}
            onChange={(e) => setSelectedEndDate(e.target.value)}
            className="border p-1 rounded"
          />
        </label>
      </div>

      {/* Strategy Params */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg shadow">
        {renderStrategyParams()}
      </div>

      {/* Realism */}
      <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-4 rounded-lg shadow">
        {Object.keys(defaultRealism).map((key) =>
          key !== "slippage_bps" ? (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={realism[key]}
                onChange={() =>
                  setRealism((prev) => ({ ...prev, [key]: !prev[key] }))
                }
              />
              {key}
            </label>
          ) : (
            <label key={key} className="flex items-center gap-2">
              Slippage Bps:
              <input
                type="number"
                min="0"
                max="100"
                value={realism.slippage_bps}
                onChange={(e) =>
                  setRealism((prev) => ({
                    ...prev,
                    slippage_bps: Number(e.target.value),
                  }))
                }
                className="border p-1 w-20 rounded"
              />
            </label>
          )
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-4">
        <button
          onClick={handleRunBacktest}
          disabled={loading}
          className="bg-blue-600 text-white p-2 rounded"
        >
          Run Backtest
        </button>
        <button
          onClick={handleRunBatch}
          disabled={loading}
          className="bg-green-600 text-white p-2 rounded"
        >
          Run Batch
        </button>
      </div>

      {/* Current Backtest */}
      {currentBacktest && (
        <div className="bg-white p-4 shadow rounded-lg space-y-4">
          <h3 className="text-lg font-bold">Current Backtest</h3>
          {renderChart(currentBacktest.equityCurve)}
          {renderSummary(currentBacktest)}
          <details class
          <details className="mt-2">
            <summary className="font-semibold cursor-pointer">View Full JSON</summary>
            <pre className="text-xs max-h-64 overflow-auto p-2 bg-gray-100 rounded">
              {JSON.stringify(currentBacktest, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Batch Results */}
      {batchResults?.length > 0 && (
        <div className="bg-white p-4 shadow rounded-lg space-y-6">
          <h3 className="text-lg font-bold">Batch Results</h3>
          {batchResults.map((bt, i) => (
            <div key={i} className="border p-2 rounded space-y-2">
              <h4 className="font-semibold">
                {bt.saved?.symbol || "Unknown Symbol"} - {bt.saved?.timeframe || "Unknown Timeframe"}
              </h4>
              {renderChart(bt.equityCurve, "#82ca9d")}
              {renderSummary(bt)}
              <details className="mt-1">
                <summary className="font-semibold cursor-pointer">View JSON</summary>
                <pre className="text-xs max-h-64 overflow-auto p-2 bg-gray-100 rounded">
                  {JSON.stringify(bt, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-red-600 font-semibold mt-2">
          Error: {error}
        </div>
      )}
    </div>
  );
}
