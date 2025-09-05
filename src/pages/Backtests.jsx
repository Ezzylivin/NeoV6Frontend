import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function BacktestsPage({ userId }) {
  const { options, fetchUserBacktests } = useBacktest();
  const [backtests, setBacktests] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [viewMode, setViewMode] = useState("chart"); // chart | table

  useEffect(() => {
    fetchUserBacktests(userId).then(setBacktests);
  }, [userId]);

  const filteredBacktests = selectedStrategy
    ? backtests.filter(bt => bt.strategy?.name?.toUpperCase() === selectedStrategy.toUpperCase())
    : backtests;

  const equityCurveData = filteredBacktests.flatMap(bt =>
    (bt.equityCurve || []).map(p => ({ ...p, backtestId: bt._id }))
  );

  return (
    <div className="p-4">
      <h2>Backtests</h2>
      <select value={selectedStrategy} onChange={e => setSelectedStrategy(e.target.value)}>
        <option value="">All Strategies</option>
        {options.strategies.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <button onClick={() => setViewMode(viewMode === "chart" ? "table" : "chart")}>
        Toggle {viewMode === "chart" ? "Table" : "Chart"}
      </button>

      {viewMode === "chart" ? (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={equityCurveData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tickFormatter={t => new Date(t).toLocaleDateString()} />
            <YAxis />
            <Tooltip labelFormatter={t => new Date(t).toLocaleString()} />
            <Line type="monotone" dataKey="equity" stroke="#8884d8" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <table className="mt-4 border-collapse border border-gray-400">
          <thead>
            <tr>
              <th className="border border-gray-300 p-1">Symbol</th>
              <th className="border border-gray-300 p-1">Strategy</th>
              <th className="border border-gray-300 p-1">Trades</th>
              <th className="border border-gray-300 p-1">Net Profit</th>
              <th className="border border-gray-300 p-1">Win Rate</th>
              <th className="border border-gray-300 p-1">Max Drawdown</th>
            </tr>
          </thead>
          <tbody>
            {filteredBacktests.map(bt => (
              <tr key={bt._id}>
                <td className="border border-gray-300 p-1">{bt.symbol}</td>
                <td className="border border-gray-300 p-1">{bt.strategy?.name}</td>
                <td className="border border-gray-300 p-1">{bt.trades?.length || 0}</td>
                <td className="border border-gray-300 p-1">{bt.metrics?.netProfit ?? 0}</td>
                <td className="border border-gray-300 p-1">{bt.metrics?.winRate ?? 0}%</td>
                <td className="border border-gray-300 p-1">{bt.metrics?.maxDrawdown ?? 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
