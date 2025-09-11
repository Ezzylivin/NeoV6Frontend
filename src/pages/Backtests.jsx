// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useAuth } from "../context/AuthContext.jsx";
import axios from "../api/apiClient.js";
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

  const { options: hookOptions, currentBacktest, runBacktest, defaultRealism } = useBacktest();

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
  const [loadingPreview, setLoadingPreview] = useState(false);

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
  const [previewBacktest, setPreviewBacktest] = useState(null);

  // Populate options when hookOptions updates
  useEffect(() => {
    if (!hookOptions) return;
    setOptions(hookOptions);

    // Set defaults
    setSelectedSymbol(hookOptions.symbols?.[0] || "");
    setSelectedStrategy(hookOptions.strategies?.[0]?.name || "");
    setSelectedTimeframe(hookOptions.timeframes?.[0] || "1h");
    setSelectedBalance(hookOptions.balances?.[0] || 1000);
    setSelectedRisk(hookOptions.risks?.[0] || "Medium");
    setSelectedPosition(hookOptions.positions?.[0] || "Both");
    setSelectedTP(hookOptions.takeProfits?.[0] || "");
    setSelectedSL(hookOptions.stopLosses?.[0] || "");
  }, [hookOptions]);

  // Update strategy params when selection changes
  useEffect(() => {
    if (!selectedStrategy) return;
    const strat = options.strategies?.find((s) => s.name === selectedStrategy);
    if (!strat?.params) {
      setStrategyParams({});
      return;
    }
    const defaults = {};
    Object.keys(strat.params).forEach((k) => {
      defaults[k] = strat.params[k]?.default ?? 0;
    });
    setStrategyParams(defaults);
  }, [selectedStrategy, options.strategies]);

  // Auto adjust dates if available
  useEffect(() => {
    if (!selectedSymbol || !selectedTimeframe) return;
    const available = options.availableDates?.[selectedSymbol]?.[selectedTimeframe];
    if (!available) return;
    setSelectedStartDate(available.start);
    setSelectedEndDate(available.end);
  }, [selectedSymbol, selectedTimeframe, options.availableDates]);

  const renderStrategyParams = () =>
    Object.keys(strategyParams).map((key) => {
      const strat = options.strategies?.find((s) => s.name === selectedStrategy);
      const paramInfo = strat?.params?.[key] ?? {};
      const desc = paramInfo?.description || "";
      const example =
        paramInfo?.default !== undefined ? `Example: ${paramInfo.default}` : "";
      return (
        <div key={key} className="flex flex-col mt-1">
          <label className="text-sm">
            <div className="flex justify-between items-center">
              <span>{key}</span>
              <span className="text-xs text-gray-500">{example}</span>
            </div>
            <div className="text-xs text-gray-500 mb-1">{desc}</div>
            <input
              type="number"
              value={strategyParams[key]}
              onChange={(e) =>
                setStrategyParams((prev) => ({ ...prev, [key]: Number(e.target.value) }))
              }
              className="border p-1 rounded w-full"
            />
          </label>
        </div>
      );
    });

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

  const formatTimestamp = (ts) => (ts ? new Date(ts).toLocaleString() : "");

  const renderChart = (data) => {
    if (!data || !data.length) return null;
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
          <YAxis />
          <Tooltip labelFormatter={formatTimestamp} />
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

      {/* Single Backtest */}
      <div className="space-y-2">
        <label>
          Symbol
          <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)}>
            {options.symbols.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Strategy
          <select value={selectedStrategy} onChange={(e) => setSelectedStrategy(e.target.value)}>
            {options.strategies.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </label>
        {renderStrategyParams()}

        <label>
          Timeframe
          <select value={selectedTimeframe} onChange={(e) => setSelectedTimeframe(e.target.value)}>
            {options.timeframes.map((tf) => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </label>

        <label>
          Balance
          <input
            type="number"
            value={selectedBalance}
            onChange={(e) => setSelectedBalance(Number(e.target.value))}
          />
        </label>

        <label>
          Risk
          <select value={selectedRisk} onChange={(e) => setSelectedRisk(e.target.value)}>
            {options.risks.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        <label>
          Position
          <select value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)}>
            {options.positions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <label>
          Take Profit
          <select value={selectedTP} onChange={(e) => setSelectedTP(e.target.value)}>
            {options.takeProfits.map((tp) => (
              <option key={tp} value={tp}>{tp}</option>
            ))}
          </select>
        </label>

        <label>
          Stop Loss
          <select value={selectedSL} onChange={(e) => setSelectedSL(e.target.value)}>
            {options.stopLosses.map((sl) => (
              <option key={sl} value={sl}>{sl}</option>
            ))}
          </select>
        </label>

        <div className="space-x-2 mt-2">
          <button
            onClick={handleRunBacktest}
            disabled={loadingSingle}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            {loadingSingle ? "Running..." : "Run Backtest"}
          </button>
        </div>

        {currentBacktest && (
          <div className="mt-4">
            <h2 className="font-bold">Backtest Result</h2>
            {renderChart(currentBacktest.balanceOverTime)}
          </div>
        )}
      </div>
    </div>
  );
}
