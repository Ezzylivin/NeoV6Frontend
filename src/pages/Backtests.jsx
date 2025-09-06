// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter } from "recharts";

export default function Backtests() {
  const {
    options,
    backtests,
    currentBacktest,
    fetchUserBacktests,
    runBacktest,
    loading,
  } = useBacktest();

  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedRisk, setSelectedRisk] = useState("Medium");
  const [takeProfit, setTakeProfit] = useState(null);
  const [stopLoss, setStopLoss] = useState(null);
  const [selectedBacktest, setSelectedBacktest] = useState(null);
  const [showTradeLog, setShowTradeLog] = useState(true);

  // Initialize defaults when options load
  useEffect(() => {
    if (options.symbols?.length) setSelectedSymbol(options.symbols[0]);
    if (options.timeframes?.length) setSelectedTimeframe(options.timeframes[0]);
    if (options.strategies?.length) setSelectedStrategy(options.strategies[0]?.name || "");
    if (options.risks?.length) setSelectedRisk(options.risks[0]);
  }, [options]);

  // Run backtest
  const handleRunBacktest = async () => {
    if (!selectedSymbol || !selectedTimeframe || !selectedStrategy) return;

    const payload = {
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      strategy: { name: selectedStrategy },
      risk: selectedRisk,
      takeProfit: takeProfit ? Number(takeProfit) : null,
      stopLoss: stopLoss ? Number(stopLoss) : null,
    };

    const result = await runBacktest(payload);
    if (result?.saved) setSelectedBacktest(result.saved);
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Backtests</h1>

      {/* === Selectors === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block font-medium">Symbol</label>
          <select value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)} className="w-full border p-2 rounded">
            {options.symbols?.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-medium">Timeframe</label>
          <select value={selectedTimeframe} onChange={e => setSelectedTimeframe(e.target.value)} className="w-full border p-2 rounded">
            {options.timeframes?.map(tf => <option key={tf} value={tf}>{tf}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-medium">Strategy</label>
          <select value={selectedStrategy} onChange={e => setSelectedStrategy(e.target.value)} className="w-full border p-2 rounded">
            {options.strategies?.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-medium">Risk</label>
          <select value={selectedRisk} onChange={e => setSelectedRisk(e.target.value)} className="w-full border p-2 rounded">
            {options.risks?.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-medium">Take Profit (%)</label>
          <input type="number" value={takeProfit || ""} onChange={e => setTakeProfit(e.target.value)} className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="block font-medium">Stop Loss (%)</label>
          <input type="number" value={stopLoss || ""} onChange={e => setStopLoss(e.target.value)} className="w-full border p-2 rounded" />
        </div>
      </div>

      <button onClick={handleRunBacktest} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        {loading ? 'Running...' : 'Run Backtest'}
      </button>

      {/* === Performance Summary Cards === */}
      {selectedBacktest?.metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 border rounded">Net Profit: ${selectedBacktest.metrics.netProfit}</div>
          <div className="p-4 border rounded">Win Rate: {selectedBacktest.metrics.winRate}%</div>
          <div className="p-4 border rounded">Max Drawdown: {selectedBacktest.metrics.maxDrawdown}%</div>
          <div className="p-4 border rounded">CAGR: {selectedBacktest.metrics.cagr}%</div>
        </div>
      )}

      {/* === Equity Curve Chart === */}
      {selectedBacktest?.equityCurve && (
        <ResponsiveContainer width="100%" height={300} className="mt-6">
          <LineChart data={selectedBacktest.equityCurve} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="equity" stroke="#8884d8" dot={false} />
            {/* Wins/Losses Scatter */}
            <Scatter data={selectedBacktest.trades?.filter(t => t.result === 'win').map(t => ({ time: t.exitTime, equity: t.exitPrice }))} fill="green" />
            <Scatter data={selectedBacktest.trades?.filter(t => t.result === 'loss').map(t => ({ time: t.exitTime, equity: t.exitPrice }))} fill="red" />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* === Past Backtests Table === */}
      <div className="mt-6">
        <h2 className="font-bold mb-2">Previous Backtests</h2>
        <table className="w-full border-collapse border">
          <thead>
            <tr>
              <th className="border p-2">Symbol</th>
              <th className="border p-2">Timeframe</th>
              <th className="border p-2">Strategy</th>
              <th className="border p-2">Profit</th>
              <th className="border p-2">Trades</th>
              <th className="border p-2">Date</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {backtests?.map(bt => (
              <tr key={bt._id} className="hover:bg-gray-100">
                <td className="border p-2">{bt.symbol}</td>
                <td className="border p-2">{bt.timeframe}</td>
                <td className="border p-2">{bt.strategy?.name}</td>
                <td className="border p-2">${bt.profit}</td>
                <td className="border p-2">{bt.totalTrades}</td>
                <td className="border p-2">{new Date(bt.createdAt).toLocaleString()}</td>
                <td className="border p-2">
                  <button className="px-2 py-1 bg-gray-300 rounded" onClick={() => setSelectedBacktest(bt)}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* === Trade Log Toggle === */}
      {selectedBacktest?.tradeBreakdown && (
        <div className="mt-6">
          <button onClick={() => setShowTradeLog(prev => !prev)} className="px-2 py-1 bg-gray-200 rounded mb-2">
            {showTradeLog ? "Hide Trade Log" : "Show Trade Log"}
          </button>
          {showTradeLog && (
            <table className="w-full border-collapse border">
              <thead>
                <tr>
                  <th className="border p-2">Entry</th>
                  <th className="border p-2">Exit</th>
                  <th className="border p-2">Position</th>
                  <th className="border p-2">Profit</th>
                  <th className="border p-2">Duration</th>
                  <th className="border p-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {selectedBacktest.tradeBreakdown?.map((t, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border p-2">{new Date(t.entryTime).toLocaleString()}</td>
                    <td className="border p-2">{new Date(t.exitTime).toLocaleString()}</td>
                    <td className="border p-2">{t.position}</td>
                    <td className="border p-2">${t.profit}</td>
                    <td className="border p-2">{t.duration}</td>
                    <td className="border p-2">{t.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
