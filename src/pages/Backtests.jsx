// File: src/pages/Backtests.jsx
import React, { useState } from "react";
import { useBacktest } from "../hooks/useBacktest.js";

export default function Backtests() {
  const {
    options,
    pastBacktests,
    loading,
    error,
    runNewBacktest,
    runNewBatchBacktest,
  } = useBacktest();

  const [form, setForm] = useState({
    strategyId: "",
    symbol: "",
    timeframe: "",
    startDate: "",
    endDate: "",
    takeProfit: options.takeProfits[0],
    stopLoss: options.stopLosses[0],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await runNewBacktest(form);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="backtests-page p-6">
      <h2 className="text-2xl font-bold mb-4 text-white">Run Backtests</h2>

      <div className="backtest-panel bg-[#1f1f2f] rounded-xl p-6 mb-6 shadow-md">
        <form className="form-grid grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={handleSubmit}>
          {/* Strategy */}
          <div>
            <label className="text-sm text-gray-300">Strategy</label>
            <select
              name="strategyId"
              value={form.strategyId}
              onChange={handleChange}
              className="form-input"
            >
              <option value="">Select Strategy</option>
              {options.strategies?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Symbol */}
          <div>
            <label className="text-sm text-gray-300">Symbol</label>
            <select name="symbol" value={form.symbol} onChange={handleChange} className="form-input">
              <option value="">Select Symbol</option>
              {options.symbols?.map((sym) => (
                <option key={sym} value={sym}>{sym}</option>
              ))}
            </select>
          </div>

          {/* Timeframe */}
          <div>
            <label className="text-sm text-gray-300">Timeframe</label>
            <select name="timeframe" value={form.timeframe} onChange={handleChange} className="form-input">
              <option value="">Select Timeframe</option>
              {options.timeframes?.map((tf) => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div>
            <label className="text-sm text-gray-300">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300">End Date</label>
            <input
              type="date"
              name="endDate"
              value={form.endDate}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          {/* TP / SL */}
          <div>
            <label className="text-sm text-gray-300">Take Profit (%)</label>
            <select
              name="takeProfit"
              value={form.takeProfit}
              onChange={handleChange}
              className="form-input"
            >
              {options.takeProfits?.map((tp) => (
                <option key={tp} value={tp}>{tp}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-300">Stop Loss (%)</label>
            <select
              name="stopLoss"
              value={form.stopLoss}
              onChange={handleChange}
              className="form-input"
            >
              {options.stopLosses?.map((sl) => (
                <option key={sl} value={sl}>{sl}</option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <div className="flex items-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
              disabled={loading}
            >
              {loading ? "Running..." : "Run Backtest"}
            </button>
          </div>
        </form>

        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      {/* Past Backtests */}
      <div className="past-backtests bg-[#1f1f2f] rounded-xl p-6 shadow-md">
        <h3 className="text-xl font-semibold text-white mb-4">Past Backtests</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="py-2 px-4">Strategy</th>
                <th className="py-2 px-4">Symbol</th>
                <th className="py-2 px-4">Timeframe</th>
                <th className="py-2 px-4">Start</th>
                <th className="py-2 px-4">End</th>
                <th className="py-2 px-4">TP</th>
                <th className="py-2 px-4">SL</th>
                <th className="py-2 px-4">Result</th>
              </tr>
            </thead>
            <tbody>
              {pastBacktests.results?.length ? (
                pastBacktests.results.map((b) => (
                  <tr key={b.id} className="hover:bg-[#2a2a3d] transition">
                    <td className="py-2 px-4">{b.strategyName}</td>
                    <td className="py-2 px-4">{b.symbol}</td>
                    <td className="py-2 px-4">{b.timeframe}</td>
                    <td className="py-2 px-4">{b.startDate}</td>
                    <td className="py-2 px-4">{b.endDate}</td>
                    <td className="py-2 px-4">{b.takeProfit}%</td>
                    <td className="py-2 px-4">{b.stopLoss}%</td>
                    <td className="py-2 px-4">{b.result}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-gray-400 py-4 text-center">
                    No backtests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
