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
  "CCI": "cci_oversold", "Bollinger Bands": "bollinger_bands", "ATR": "atr_breakout"
};

const DEFAULT_MODEL_OPTIONS = [
    { id: "btc_1h_xgboost", name: "BTC 1H XGBoost" },
    { id: "btc_1h_lightgbm", name: "BTC 1H LightGBM" }
];

const defaultFilterParams = { minAtrPct: 0, trendFilterPeriod: 200, minAdxLevel: 0, tslAtrMult: 3.5, regime_threshold: 25 };

// --- HELPER FUNCTIONS ---
const formatDate = dateString => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

const formatChartDate = timestamp => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? '' : `${date.getMonth()+1}/${date.getDate()}`;
};

const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

// 🟢 FIXED: Safe Metrics Calculation (Handles division by zero)
const computeMetricsFromTrades = (trades, initialBalance) => {
    if (!trades || trades.length === 0) return { totalReturn: 0, expectancy: 0, winningTrades: 0, losingTrades: 0, totalTrades: 0 };
    let balance = initialBalance;
    let wins = 0;
    let totalWin = 0;
    let totalLoss = 0;

    trades.forEach(t => {
        balance += t.profit;
        if (t.profit > 0) { wins++; totalWin += t.profit; }
        else { totalLoss += Math.abs(t.profit); }
    });

    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) : 0;
    const avgWin = wins > 0 ? totalWin / wins : 0;
    const avgLoss = (totalTrades - wins) > 0 ? totalLoss / (totalTrades - wins) : 0;

    return {
        totalReturn: ((balance - initialBalance) / initialBalance) * 100,
        winRate: winRate * 100,
        totalTrades,
        winningTrades: wins,
        losingTrades: totalTrades - wins,
        averageWin: avgWin,
        averageLoss: avgLoss,
        finalBalance: balance,
        // 🟢 FIX: Safe Expectancy Calculation
        expectancy: (winRate * avgWin) - ((1 - winRate) * avgLoss)
    };
};

const initialFormData = {
  strategyId: "", code: "", symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate,
  initialBalance: 1000, params: { ...defaultFilterParams, maxPyramiding: 1 },
  riskManagementMode: 'static', riskPercentage: 1, mlMode: "off"
};

// --- MAIN COMPONENT ---
export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, fetchOptions } = useBacktest(); 
  const { loading = 'idle', options = {} } = state || {};
  const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";

  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [activeTab, setActiveTab] = useState('single');
  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState({ ...initialFormData, strategies: [] });
  const [backtestResults, setBacktestResults] = useState(null);
  const [liveWinners, setLiveWinners] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false); 

  useEffect(() => { if (typeof fetchOptions === 'function') fetchOptions(); }, []);

  // 🟢 FIXED: Processed Data Memo (Now includes candleData)
  const processed = useMemo(() => {
    if (!backtestResults) return null;
    
    // Ensure we handle both wrapped and unwrapped results
    const res = backtestResults.combinedResult || backtestResults;
    const trades = (res.tradeBreakdown || res.trades || []).map(t => ({ 
        ...t, 
        entryTime: t.entry_time || t.entryTime, 
        exitTime: t.exit_time || t.exitTime, 
        profit: t.profit || 0 
    }));

    const localMetrics = computeMetricsFromTrades(trades, formData.initialBalance);

    return { 
        // 🟢 REQUIRED FOR CHART RENDERING:
        candleData: res.candleData || [], 
        trades: trades,
        equityCurve: (res.equityCurve || []).map(p => ({ timestamp: new Date(p.timestamp || p.time).getTime(), balance: p.balance })),
        metrics: { ...res.metrics, ...localMetrics } 
    };
  }, [backtestResults, formData.initialBalance]);

  const handleWinnerSelect = async (e) => {
    const id = e.target.value;
    setSelectedWinnerId(id);
    const win = liveWinners.find(w => (w.botId || w.id) === id);
    if (!win) return;
    const config = win.config || win;
    setFormData(prev => ({ 
        ...prev, 
        symbol: (config.symbol || "BTC-USD").replace("/", "-"), 
        timeframe: config.timeframe || "1h" 
    }));
  };

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setIsSimulating(true); 
    const res = activeTab === 'single' ? await runNewBacktest(formData) : await runComboBacktest(comboData);
    if (res) setBacktestResults(res);
    setIsSimulating(false);
  };

  return (
    <div className="backtest-container p-4">
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-5">
          <div className="bot-card p-6">
            <h2 className="text-xl font-bold text-white mb-4">Configuration</h2>
            <select value={selectedWinnerId} onChange={handleWinnerSelect} className={inputClass + " mb-6"}>
              <option value="">-- Load Alpha Strategy --</option>
              {liveWinners.map(w => <option key={w.id} value={w.id}>{w.symbol} (ROI: {w.roi || 0}%)</option>)}
            </select>
            <form onSubmit={handleRun}>
              <CommonBacktestInputs data={formData} onChange={(e) => setFormData({...formData, [e.target.name]: e.target.value})} options={{ symbolOptions: options.symbols || [] }} />
              <button type="submit" disabled={isSimulating} className="w-full py-4 bg-emerald-500 text-black font-bold rounded-xl mt-4">
                {isSimulating ? 'Running...' : '▶ Run Simulation'}
              </button>
            </form>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 space-y-6">
          {processed ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                  <div className="bot-card p-4 text-center">
                      <div className="text-neutral-400 text-xs">Expectancy</div>
                      <div className="text-2xl font-bold text-white">
                          ${processed.metrics.expectancy?.toFixed(2) || "0.00"}
                      </div>
                  </div>
              </div>
              
              {/* 🟢 THE CHART COMPONENT */}
              <div className="bot-card p-6">
                <div style={{height: '500px'}}>
                  <ChartIndependent 
                    results={processed} 
                    symbol={formData.symbol} 
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="bot-card p-20 text-center text-neutral-500">
                Ready to Test Your Strategy. Define parameters and click Run.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Minimal placeholder sub-components for context
const MetricsDisplay = ({ metrics }) => null;
const AdvancedMetricsDisplay = ({ metrics }) => null;
