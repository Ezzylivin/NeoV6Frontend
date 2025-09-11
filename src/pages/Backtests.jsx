// File: src/pages/Backtests.jsx
import { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";

export default function Backtests() {
  const { options, runBacktest, runBatchBacktests } = useBacktest();

  const [activeTab, setActiveTab] = useState("backtests");

  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");
  const [selectedBalance, setSelectedBalance] = useState(1000);
  const [selectedRisk, setSelectedRisk] = useState("Medium");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [results, setResults] = useState([]);

  const [strategyName, setStrategyName] = useState("");
  const [strategyParams, setStrategyParams] = useState({});

  useEffect(() => {
    if (options.symbols?.length && !selectedSymbol) {
      setSelectedSymbol(options.symbols[0]);
    }
    if (options.timeframes?.length && !selectedTimeframe) {
      setSelectedTimeframe(options.timeframes[0]);
    }
    if (options.strategies?.length && !selectedStrategy) {
      setSelectedStrategy(options.strategies[0]?.name || "");
    }
  }, [options]);

  async function handleRunBacktest() {
    const result = await runBacktest({
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      initialBalance: selectedBalance,
      risk: selectedRisk,
      strategy: selectedStrategy,
    });
    setResults((prev) => [...prev, result]);
  }

  async function handleBatchBacktests() {
    const result = await runBatchBacktests({
      symbol: selectedSymbol,
      timeframes: options.timeframes,
      initialBalance: selectedBalance,
      risk: selectedRisk,
      strategy: selectedStrategy,
    });
    setResults((prev) => [...prev, ...result]);
  }

  function handleCreateStrategy() {
    const newStrategy = {
      name: strategyName,
      parameters: strategyParams,
    };
    console.log("New Strategy Created:", newStrategy);
    setStrategyName("");
    setStrategyParams({});
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Backtests & Strategies</h2>

      {/* Tabs */}
      <div className="flex space-x-4 border-b mb-6">
        <button
          className={`py-2 px-4 ${
            activeTab === "backtests"
              ? "border-b-2 border-blue-500 font-bold"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("backtests")}
        >
          Backtests
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === "strategies"
              ? "border-b-2 border-blue-500 font-bold"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("strategies")}
        >
          Strategies
        </button>
      </div>

      {/* Backtests Tab */}
      {activeTab === "backtests" && (
        <div className="space-y-4">
          <div className="border p-4 rounded space-y-2">
            <h3 className="font-semibold">Run Backtests</h3>

            <label>
              Symbol
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
              >
                {options.symbols?.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Timeframe
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
              >
                {options.timeframes?.map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
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
              <select
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
              >
                {options.risks?.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Strategy
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
              >
                {options.strategies?.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex space-x-2">
              <button
                onClick={handleRunBacktest}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Run Backtest
              </button>
              <button
                onClick={handleBatchBacktests}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Run Batch
              </button>
            </div>
          </div>

          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">Results</h3>
            <ul>
              {results.map((r, i) => (
                <li key={i} className="border-b py-1">
                  {r?.symbol} | {r?.timeframe} | Final Balance:{" "}
                  {r?.metrics?.finalBalance}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Strategies Tab */}
      {activeTab === "strategies" && (
        <div className="space-y-4">
          <div className="border p-4 rounded space-y-2">
            <h3 className="font-semibold">Create Strategy</h3>
            <label>
              Name
              <input
                type="text"
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
              />
            </label>
            <label>
              Parameters (JSON)
              <textarea
                value={JSON.stringify(strategyParams, null, 2)}
                onChange={(e) => {
                  try {
                    setStrategyParams(JSON.parse(e.target.value));
                  } catch {
                    // ignore parse errors while typing
                  }
                }}
              />
            </label>
            <button
              onClick={handleCreateStrategy}
              className="bg-purple-500 text-white px-4 py-2 rounded"
            >
              Save Strategy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
