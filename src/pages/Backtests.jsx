import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { ChartIndependent } from "../components/ChartIndependent.jsx";
import { ChartReplay } from "../components/ChartReplay.jsx";
import { MetricsDisplay } from "../components/MetricsDisplay.jsx";
import { AdvancedMetricsDisplay } from "../components/AdvancedMetricsDisplay.jsx";
import "./Backtests.css";

const COLORS = ["#10b981", "#ef4444", "#14b8a6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#22c55e"];

const DEFAULT_FORM_DATA = {
  symbol: "BTC",
  timeframe: "1h",
  startDate: "",
  endDate: "",
  strategy: "moving_average",
  initialBalance: 1000,
};

export default function BacktestsPage() {
  const { fetchingOptions } = useBacktest(); // Hook for fetching strategy options
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [isLoading, setIsLoading] = useState(false); // Backtest loading state
  const [backtestResults, setBacktestResults] = useState(null); // Backtest results state

  // Debugging State
  const [debugMode, setDebugMode] = useState(false); // Toggle debug mode

  // Handle Form Change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  // Run Backtest
  const handleRunBacktest = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("Running Backtest with Form Data:", formData);
      const response = await axios.post("/api/backtest", formData);
      setBacktestResults(response.data);
      console.log("Backtest Results:", response.data);
    } catch (err) {
      console.error("Backtest Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="backtest-page">
      <header>
        <h1>Backtesting Page</h1>
        {/* Debug Mode Toggle */}
        <label className="debug-toggle">
          <input
            type="checkbox"
            checked={debugMode}
            onChange={(e) => setDebugMode(e.target.checked)}
          />
          Debug Mode
        </label>
      </header>

      <main>
        <form onSubmit={handleRunBacktest}>
          <div>
            <label>Symbol:</label>
            <input
              type="text"
              name="symbol"
              value={formData.symbol}
              onChange={handleFormChange}
            />
          </div>

          <div>
            <label>Timeframe:</label>
            <select
              name="timeframe"
              value={formData.timeframe}
              onChange={handleFormChange}
            >
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1d">1 Day</option>
            </select>
          </div>

          <div>
            <label>Start Date:</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleFormChange}
            />
          </div>

          <div>
            <label>End Date:</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleFormChange}
            />
          </div>

          <button type="submit">
            {isLoading ? "Running Backtest..." : "Run Backtest"}
          </button>
        </form>

        {/* Debug Info */}
        {debugMode && (
          <div className="debug-info">
            <h3>Debug Information</h3>
            <pre>{JSON.stringify(formData, null, 2)}</pre>
          </div>
        )}

        {/* Backtest Results */}
        {backtestResults && (
          <div className="results-section">
            <h3>Backtest Results</h3>
            <MetricsDisplay metrics={backtestResults} />
            <AdvancedMetricsDisplay metrics={backtestResults} />
            {/* Render charts */}
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={backtestResults?.chartData || []}>
                <defs>
                  <linearGradient id="color" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Area dataKey="balance" stroke="#10b981" fill="url(#color)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </main>
    </div>
  );
}
