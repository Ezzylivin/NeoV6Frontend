import React, { useState, useEffect } from "react";
import { fetchOptions, runBacktest, runBatchBacktests } from "../api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

export default function Backtests() {
  // -------------------------------
  // Default options fallback
  // -------------------------------
  const defaultOptions = {
    symbols: [],
    timeframes: ["1m", "5m", "15m", "30m", "1h", "4h", "1d"],
    balances: [100, 500, 1000, 5000, 10000],
    strategies: [],
    risks: ["Low", "Medium", "High"],
    takeProfits: [null, 1, 2, 3, 5, 10],
    stopLosses: [null, 0.5, 1, 2, 3, 5],
    positions: ["Long", "Short", "Both"],
  };

  const [options, setOptions] = useState(defaultOptions);

  // -------------------------------
  // Form selections
  // -------------------------------
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [selectedBalance, setSelectedBalance] = useState(1000);
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedRisk, setSelectedRisk] = useState("Medium");
  const [selectedTP, setSelectedTP] = useState(null);
  const [selectedSL, setSelectedSL] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState("Both");

  // -------------------------------
  // Realism factors
  // -------------------------------
  const [useNews, setUseNews] = useState(true);
  const [useSlippage, setUseSlippage] = useState(true);
  const [useSpreads, setUseSpreads] = useState(true);
  const [useRandom, setUseRandom] = useState(false);
  const [slippageBps, setSlippageBps] = useState(5);

  // -------------------------------
  // Results & UI states
  // -------------------------------
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("chart"); // chart or table
  const [batchResults, setBatchResults] = useState([]);
  const [collapsedLogs, setCollapsedLogs] = useState({});

  // -------------------------------
  // Load options from backend
  // -------------------------------
  useEffect(() => {
    async function loadOptions() {
      try {
        const resp = await fetchOptions();
        setOptions((prev) => ({
          symbols: resp.symbols?.length ? resp.symbols : prev.symbols,
          timeframes: resp.timeframes?.length ? resp.timeframes : prev.timeframes,
          balances: resp.balances?.length ? resp.balances : prev.balances,
          strategies: resp.strategies?.length ? resp.strategies : prev.strategies,
          risks: resp.risks?.length ? resp.risks : prev.risks,
          takeProfits: resp.takeProfits?.length ? resp.takeProfits : prev.takeProfits,
          stopLosses: resp.stopLosses?.length ? resp.stopLosses : prev.stopLosses,
          positions: resp.positions?.length ? resp.positions : prev.positions,
        }));
      } catch (err) {
        setError("Failed to fetch options.");
      }
    }
    loadOptions();
  }, []);

  // -------------------------------
  // Set initial symbol & strategy defaults
  // -------------------------------
  useEffect(() => {
    if (!selectedSymbol && options.symbols.length > 0) {
      setSelectedSymbol(options.symbols[0]);
    }
    if (!selectedStrategy && options.strategies.length > 0) {
      setSelectedStrategy(options.strategies[0].name);
    }
  }, [options, selectedSymbol, selectedStrategy]);

  // -------------------------------
  // Run single backtest
  // -------------------------------
  async function handleRunBacktest() {
    setLoading(true);
    setError(null);
    try {
      const resp = await runBacktest({
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        initial_balance: selectedBalance,
        strategy: selectedStrategy,
        risk: selectedRisk,
        take_profit: selectedTP,
        stop_loss: selectedSL,
        position: selectedPosition,
        realism: {
          news: useNews,
          slippage: useSlippage,
          spreads: useSpreads,
          random: useRandom,
          slippage_bps: slippageBps,
        },
      });
      setResults((prev) => [...prev, resp]);
    } catch (err) {
      setError("Backtest failed.");
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------
  // Run batch backtests
  // -------------------------------
  async function handleRunBatch() {
    setLoading(true);
    setError(null);
    try {
      const resp = await runBatchBacktests({
        symbols: options.symbols,
        timeframes: options.timeframes,
        balances: options.balances,
        strategies: options.strategies.map((s) => s.name),
        risks: options.risks,
        take_profits: options.takeProfits,
        stop_losses: options.stopLosses,
        positions: options.positions,
        realism: {
          news: useNews,
          slippage: useSlippage,
          spreads: useSpreads,
          random: useRandom,
          slippage_bps: slippageBps,
        },
      });
      setBatchResults(resp);
    } catch (err) {
      setError("Batch backtest failed.");
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------
  // Render
  // -------------------------------
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Backtesting</h2>

      {/* Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg shadow">
        {/* Symbol */}
        <label className="text-sm">
          Symbol
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="border p-2 rounded w-full bg-white"
          >
            {options.symbols.map((sym) => (
              <option key={sym} value={sym}>
                {sym}
              </option>
            ))}
          </select>
        </label>

        {/* Timeframe */}
        <label className="text-sm">
          Timeframe
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border p-2 rounded w-full bg-white"
          >
            {options.timeframes.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>
        </label>

        {/* Balance */}
        <label className="text-sm">
          Balance
          <select
            value={selectedBalance}
            onChange={(e) => setSelectedBalance(Number(e.target.value))}
            className="border p-2 rounded w-full bg-white"
          >
            {options.balances.map((bal) => (
              <option key={bal} value={bal}>
                ${bal}
              </option>
            ))}
          </select>
        </label>

        {/* Strategy */}
        <label className="text-sm">
          Strategy
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value)}
            className="border p-2 rounded w-full bg-white"
          >
            {options.strategies.map((strat) => (
              <option key={strat.name} value={strat.name}>
                {strat.name}
              </option>
            ))}
          </select>
        </label>

        {/* Risk */}
        <label className="text-sm">
          Risk
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="border p-2 rounded w-full bg-white"
          >
            {options.risks.map((risk) => (
              <option key={risk} value={risk}>
                {risk}
              </option>
            ))}
          </select>
        </label>

        {/* Take Profit */}
        <label className="text-sm">
          Take Profit
          <select
            value={selectedTP ?? ""}
            onChange={(e) => setSelectedTP(e.target.value ? Number(e.target.value) : null)}
            className="border p-2 rounded w-full bg-white"
          >
            {options.takeProfits.map((tp, idx) => (
              <option key={idx} value={tp ?? ""}>
                {tp ? `${tp}%` : "None"}
              </option>
            ))}
          </select>
        </label>

        {/* Stop Loss */}
        <label className="text-sm">
          Stop Loss
          <select
            value={selectedSL ?? ""}
            onChange={(e) => setSelectedSL(e.target.value ? Number(e.target.value) : null)}
            className="border p-2 rounded w-full bg-white"
          >
            {options.stopLosses.map((sl, idx) => (
              <option key={idx} value={sl ?? ""}>
                {sl ? `${sl}%` : "None"}
              </option>
            ))}
          </select>
        </label>

        {/* Position */}
        <label className="text-sm">
          Position
          <select
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            className="border p-2 rounded w-full bg-white"
          >
            {options.positions.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Realism factors */}
      <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-4 rounded-lg shadow">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={useNews} onChange={() => setUseNews(!useNews)} />
          News
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={useSlippage} onChange={() => setUseSlippage(!useSlippage)} />
          Slippage
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={useSpreads} onChange={() => setUseSpreads(!useSpreads)} />
          Spreads
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={useRandom} onChange={() => setUseRandom(!useRandom)} />
          Random events
        </label>
        <label className="text-sm flex items-center gap-2">
          Slippage Bps:
          <input
            type="number"
            min="0"
            max="100"
            value={slippageBps}
            onChange={(e) => setSlippageBps(Number(e.target.value))}
            className="border p-1 w-20 rounded"
          />
        </label>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleRunBacktest}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Running..." : "Run Backtest"}
        </button>
        <button
          onClick={handleRunBatch}
          disabled={loading}
          className="bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? "Running..." : "Run Batch"}
        </button>
      </div>

      {/* Error */}
      {error && <p className="text-red-600">{error}</p>}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <h3 className="text-xl font-semibold">Results</h3>
            <button
              onClick={() => setViewMode(viewMode === "chart" ? "table" : "chart")}
              className="bg-gray-200 px-3 py-1 rounded"
            >
              {viewMode === "chart" ? "Switch to Table" : "Switch to Chart"}
            </button>
          </div>

          {results.map((res, idx) => (
            <div key={idx} className="border p-4 rounded shadow bg-white">
              <h4 className="font-bold">
                {res.strategy} on {res.symbol} ({res.timeframe})
              </h4>
              <div className="text-sm text-gray-700 mb-2">
                Net Profit: {res.metrics.net_profit} | Win Rate: {res.metrics.win_rate}% | Max Drawdown:{" "}
                {res.metrics.max_drawdown}
              </div>

              {/* Toggle logs */}
              <button
                onClick={() =>
                  setCollapsedLogs((prev) => ({ ...prev, [idx]: !prev[idx] }))
                }
                className="text-xs text-blue-600 underline"
              >
                {collapsedLogs[idx] ? "Show Details" : "Hide Details"}
              </button>

              {!collapsedLogs[idx] && (
                <>
                  {viewMode === "chart" ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={res.equity_curve}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="equity" stroke="#2563eb" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border px-2 py-1">Timestamp</th>
                            <th className="border px-2 py-1">Side</th>
                            <th className="border px-2 py-1">Price</th>
                            <th className="border px-2 py-1">Profit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {res.trades.map((t, i) => (
                            <tr key={i}>
                              <td className="border px-2 py-1">{t.timestamp}</td>
                              <td className="border px-2 py-1">{t.side}</td>
                              <td className="border px-2 py-1">{t.price}</td>
                              <td
                                className={`border px-2 py-1 ${
                                  t.profit > 0 ? "text-green-600" : t.profit < 0 ? "text-red-600" : ""
                                }`}
                              >
                                {t.profit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Batch results summary */}
      {batchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Batch Comparison</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={batchResults}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="strategy" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="metrics.net_profit" fill="#2563eb" name="Net Profit" />
              <Bar dataKey="metrics.win_rate" fill="#16a34a" name="Win Rate" />
              <Bar dataKey="metrics.max_drawdown" fill="#dc2626" name="Max Drawdown" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
