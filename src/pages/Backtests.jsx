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

const STRATEGY_TYPE_TO_CODE_MAP = {
  "Moving Average Crossover": "sma_crossover", "RSI": "rsi_divergence", "MACD": "macd_crossover",
  "Stochastic Oscillator": "stochastic_crossover", "CCI": "cci_oversold", "Bollinger Bands": "bollinger_bands",
  "Ichimoku Cloud": "ichimoku_cloud", "ATR": "atr_breakout", "On-Balance Volume": "obv_signal", "Parabolic SAR": "psar_signal"
};

const DEFAULT_MODEL_OPTIONS = [
    { id: "btc_1h_xgboost", name: "BTC 1H XGBoost" },
    { id: "btc_1h_lightgbm", name: "BTC 1H LightGBM" },
    { id: "eth_1h_transformer", name: "ETH 1H Transformer" },
    { id: "sol_15m_lstm", name: "SOL 15m LSTM" }
];

const defaultFilterParams = { minAtrPct: 0, trendFilterPeriod: 200, minAdxLevel: 0, tslAtrMult: 3.5, regime_threshold: 25 };

const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
};

// --- INITIAL FORM DATA ---
const initialFormData = {
  strategyId: "", code: "", symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate,
  initialBalance: 1000, params: { ...defaultFilterParams, maxPyramiding: 1 },
  riskManagementMode: 'static', riskPercentage: 1, growthCapitalTarget: 2000, 
  mlMode: "off", mlModel: "", mlThreshold: 0.5
};

export default function Backtests() {
  const { state, runNewBacktest, fetchOptions } = useBacktest(); 
  const { loading = 'idle', error = null, options = {}, winners = [] } = state || {};

  const [formData, setFormData] = useState(initialFormData);
  const [backtestResults, setBacktestResults] = useState(null);
  const [chartMode, setChartMode] = useState('standard'); 
  const [isSimulating, setIsSimulating] = useState(false);

  const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";

  useEffect(() => {
    if (fetchOptions && options?.symbols?.length === 0) fetchOptions();
  }, [options, fetchOptions]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRun = async (e) => {
    e.preventDefault();
    setIsSimulating(true); 
    setBacktestResults(null); 

    try {
      const result = await runNewBacktest(formData);
      setBacktestResults(result);
      console.log("Backtest Results: ", result); // Debugging line
    } catch (err) { 
        console.error("Error running backtest: ", err); // Debugging line
    } finally {
        setIsSimulating(false); 
    }
  };

  const renderCharts = () => {
    if (!backtestResults || !backtestResults.equityCurve) return null;

    const processedData = backtestResults.equityCurve.map((point) => ({
      timestamp: new Date(point.timestamp).getTime(),
      balance: point.balance,
    }));

    return (
      <div className="charts">
        <div className="bot-card">
          <div className="panel-header">
            <h3>Equity vs Buy & Hold</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={processedData}>
                <CartesianGrid />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="balance" stroke="#10b981" fillOpacity={1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="backtest-container container mx-auto">
      <div className="config">
        <form onSubmit={handleRun}>
          <div>
            <label>Symbol</label>
            <input
              type="text"
              name="symbol"
              value={formData.symbol}
              onChange={handleFormChange}
              className={inputClass}
            />
          </div>
          <div>
            <label>Timeframe</label>
            <input
              type="text"
              name="timeframe"
              value={formData.timeframe}
              onChange={handleFormChange}
              className={inputClass}
            />
          </div>
          <div>
            <label>Start Date</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleFormChange}
              className={inputClass}
            />
          </div>
          <div>
            <label>End Date</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleFormChange}
              className={inputClass}
            />
          </div>
          <button className="button-start" type="submit" disabled={isSimulating}>
            {isSimulating ? "Running backtest..." : "Run Backtest"}
          </button>
        </form>
      </div>

      <div className="results">
        {!backtestResults ? (
          <p>No results yet. Run a backtest to see the results.</p>
        ) : (
          renderCharts()
        )}
      </div>
    </div>
  );
}
