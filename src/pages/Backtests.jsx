import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { ChartIndependent } from "../components/ChartIndependent.jsx";
import { ChartReplay } from "../components/ChartReplay.jsx";
import api from "../api/apiClient";
import "./Backtests.css";

const COLORS = ["#10b981", "#ef4444", "#14b8a6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#22c55e"];
const REASON_COLORS = ["#10b981", "#f59e0b", "#06b6d4", "#ec4899", "#64748b"];

const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
};

const initialFormData = {
  startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate,
  symbol: "BTC",
  timeframe: "1d",
  initialBalance: 1000,
  params: {},
  riskManagementMode: 'static',
  mlMode: "off",
  mlModel: "",
  mlThreshold: 0.5
};

export default function Backtests() {
  const { runNewBacktest } = useBacktest();
  const [formData, setFormData] = useState(initialFormData);
  const [backtestResults, setBacktestResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRun = async (e) => {
    e.preventDefault();
    console.log("[DEBUG: Form Data Sent to Backtest]", formData); // Log form data to track parameters

    setLoading(true);
    try {
      const result = await runNewBacktest(formData);
      console.log("[DEBUG: Backtest Results Received]", result); // Log received results to verify response
      setBacktestResults(result);
    } catch (error) {
      console.error("[DEBUG: Backtest Error]", error); // Log errors for traceability
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Backtest Runner with Debug Mode</h1>
      <form onSubmit={handleRun}>
        <div>
          <label>Start Date:</label>
          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
        </div>
        <div>
          <label>End Date:</label>
          <input
            type="date"
            name="endDate"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Running Backtest..." : "Run Backtest"}
        </button>
      </form>
      {backtestResults && (
        <div>
          <h2>Backtest Results</h2>
          <pre>{JSON.stringify(backtestResults, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
