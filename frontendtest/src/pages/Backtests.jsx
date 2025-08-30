// File: src/pages/Backtests.jsx
import React, { useEffect, useState } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useAuth } from "../context/AuthContext";


const SYMBOLS = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT"];
const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];
const BALANCES = [100, 300, 500, 1000, 5000, 10000, 50000];
const STRATEGIES = ["default", "crossover", "momentum", "meanReversion"];
const RISKS = ["low", "medium", "high"];

export default function Backtests() {
  const { results, loading, error, runBacktests, fetchBacktests } = useBacktest();

  const [symbol, setSymbol] = useState(SYMBOLS[0]);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[0]);
  const [initialBalance, setInitialBalance] = useState(BALANCES[2]);
  const [strategy, setStrategy] = useState(STRATEGIES[0]);
  const [risk, setRisk] = useState(RISKS[1]);

  const { user } = useAuth();


useEffect(() => {
  if (user?._id) {
    fetchBacktests(user._id);
  }
}, [user]);


  const handleRun = async () => {
    await runBacktests({ symbol, timeframe, initialBalance, strategy, risk });
    await fetchBacktests();
  };

  const safeResults = Array.isArray(results) ? results : [];
  const filteredResults = safeResults.filter(
    (bt) =>
      (!symbol || bt.symbol === symbol) &&
      (!timeframe || bt.timeframe === timeframe)
  );

  return (
    <div className="flex justify-center items-center min-h-screen bg-black text-white">
      <div className="w-full max-w-4xl p-6 border border-gray-700 rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Backtests</h1>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block mb-1">Symbol:</label>
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="p-2 rounded text-black w-full">
              {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block mb-1">Timeframe:</label>
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="p-2 rounded text-black w-full">
              {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
            </select>
          </div>

          <div>
            <label className="block mb-1">Initial Balance ($):</label>
            <select value={initialBalance} onChange={(e) => setInitialBalance(Number(e.target.value))} className="p-2 rounded text-black w-full">
              {BALANCES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label className="block mb-1">Strategy:</label>
            <select value={strategy} onChange={(e) => setStrategy(e.target.value)} className="p-2 rounded text-black w-full">
              {STRATEGIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block mb-1">Risk:</label>
            <select value={risk} onChange={(e) => setRisk(e.target.value)} className="p-2 rounded text-black w-full">
              {RISKS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <button className="bg-green-500 px-4 py-2 rounded w-full" onClick={handleRun} disabled={loading}>
              {loading ? "Running..." : "Run Backtest"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && <div className="text-red-500 mb-4"><strong>Error:</strong> {error}</div>}

        {/* Results Table */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Results</h2>
          {safeResults.length === 0 ? (
            <p>No backtests found.</p>
          ) : (
            <table className="w-full border-collapse border border-gray-700">
              <thead>
                <tr className="bg-gray-800">
                  <th className="border border-gray-700 p-2">Symbol</th>
                  <th className="border border-gray-700 p-2">Timeframe</th>
                  <th className="border border-gray-700 p-2">Initial</th>
                  <th className="border border-gray-700 p-2">Final</th>
                  <th className="border border-gray-700 p-2">Profit</th>
                  <th className="border border-gray-700 p-2">Strategy</th>
                  <th className="border border-gray-700 p-2">Risk</th>
                  <th className="border border-gray-700 p-2">Trades</th>
                  <th className="border border-gray-700 p-2">Candles</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((bt, idx) => (
                  <tr key={idx} className="text-center">
                    <td className="border border-gray-700 p-2">{bt.symbol}</td>
                    <td className="border border-gray-700 p-2">{bt.timeframe}</td>
                    <td className="border border-gray-700 p-2">${bt.initialBalance}</td>
                    <td className="border border-gray-700 p-2">${bt.finalBalance}</td>
                    <td className={`border border-gray-700 p-2 ${bt.profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                      ${bt.profit}
                    </td>
                    <td className="border border-gray-700 p-2">{bt.strategy}</td>
                    <td className="border border-gray-700 p-2">{bt.risk}</td>
                    <td className="border border-gray-700 p-2">{bt.totalTrades}</td>
                    <td className="border border-gray-700 p-2">{bt.candlesTested}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
