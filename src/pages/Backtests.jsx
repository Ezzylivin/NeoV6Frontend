// File: src/pages/Backtests.jsx
// 🚀 UPGRADE: v66.1 - "Manual Run Mode & Emerald Theme"

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import {
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
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

const defaultFilterParams = { minAtrPct: 0.5, trendFilterPeriod: 200, minAdxLevel: 20, tslAtrMult: 3.5, regime_threshold: 25 };

// --- HELPER FUNCTIONS ---
const safeNum = (v, def = 0) => {
    const n = Number(v);
    return isNaN(n) ? def : n;
};

const formatDate = d => d ? new Date(d).toISOString().split('T')[0] : '';
const formatChartDate = t => {
    const d = new Date(t);
    return isNaN(d) ? '' : `${d.getMonth()+1}/${d.getDate()}`;
};

const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

// 🚀 METRICS CALCULATION (Geometric Compounding Aware)
const computeMetricsFromTrades = (trades, initialBalance) => {
    if (!trades || trades.length === 0) return null;
    let balance = initialBalance;
    let peak = initialBalance;
    let maxDrawdown = 0;
    let wins = 0;
    let totalWin = 0;
    let totalLoss = 0;
    let maxLosingStreak = 0;
    let currentLosingStreak = 0;
    let totalHoldTimeMs = 0;

    trades.forEach(t => {
        balance += t.profit;
        if (balance > peak) peak = balance;
        const dd = (peak - balance) / peak;
        if (dd > maxDrawdown) maxDrawdown = dd;
        if (t.profit > 0) {
            wins++; totalWin += t.profit; currentLosingStreak = 0;
        } else {
            totalLoss += Math.abs(t.profit); currentLosingStreak++;
            if (currentLosingStreak > maxLosingStreak) maxLosingStreak = currentLosingStreak;
        }
        const entry = new Date(t.entryTime).getTime();
        const exit = new Date(t.exitTime).getTime();
        if (!isNaN(entry) && !isNaN(exit)) totalHoldTimeMs += (exit - entry);
    });

    const totalTrades = trades.length;
    const avgWin = wins > 0 ? totalWin / wins : 0;
    const avgLoss = (totalTrades - wins) > 0 ? totalLoss / (totalTrades - wins) : 0;

    return {
        totalReturn: ((balance - initialBalance) / initialBalance) * 100,
        profitFactor: totalLoss === 0 ? totalWin : totalWin / totalLoss,
        maxDrawdown: maxDrawdown * 100,
        winRate: (wins / totalTrades) * 100,
        totalTrades, winningTrades: wins, losingTrades: totalTrades - wins,
        averageWin: avgWin, averageLoss: avgLoss, finalBalance: balance,
        maxLosingStreak, avgHoldTime: totalHoldTimeMs / totalTrades / 3600000,
        expectancy: ((wins/totalTrades) * avgWin) - ((1 - (wins/totalTrades)) * avgLoss)
    };
};

const initialFormData = {
  strategyId: "", code: "", symbol: "BTC-USD", timeframe: "1h", 
  startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate,
  initialBalance: 1000, params: { ...defaultFilterParams, maxPyramiding: 1 },
  riskManagementMode: 'static', riskPercentage: 2, 
  mlMode: "off", mlModel: "", mlThreshold: 0.65, mlHorizon: 1
};

// --- MAIN PAGE COMPONENT ---
export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, resetBacktest } = useBacktest(); 
  const { loading = 'idle', error = null, options = {} } = state || {};

  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [backtestResults, setBacktestResults] = useState({ main: null });
  const [activeTab, setActiveTab] = useState('single');
  const [liveWinners, setLiveWinners] = useState([]);
  const [scanningWinners, setScanningWinners] = useState(false);
  const [chartMode, setChartMode] = useState('standard'); 
  const [isSimulating, setIsSimulating] = useState(false); 

  useEffect(() => { fetchWinners(); }, []);

  const fetchWinners = async () => {
      setScanningWinners(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners", { headers: { Authorization: `Bearer ${token}` } });
        if (res.data) setLiveWinners(res.data);
      } catch (err) { console.error(err); } 
      finally { setScanningWinners(false); }
  };

  const handleWinnerSelect = (e) => {
      const filename = e.target.value;
      if (!filename) return;
      setSelectedWinnerId(filename);
      const selectedWinner = liveWinners.find(w => w.id === filename);
      if (!selectedWinner) return;

      // 🚀 CRITICAL: Clear charts so user knows to run simulation manually
      setBacktestResults({ main: null });

      const data = selectedWinner.config || selectedWinner;
      const rootParams = data.params || {};
      const modelToSet = data.mlModel || rootParams.mlModel || "";
      
      // Force UI into combo mode for Alphas
      setActiveTab('combo');
      setFormData(prev => ({
          ...prev,
          symbol: data.symbol || prev.symbol,
          timeframe: data.timeframe || prev.timeframe,
          mlMode: modelToSet ? "predictions" : "off",
          mlModel: modelToSet,
          mlThreshold: safeNum(data.mlThreshold, 0.65),
          params: { ...prev.params, ...rootParams, riskPercentage: safeNum(data.riskPercentage, 2) }
      }));
      console.log(`✅ Alpha Inputs Loaded: ${filename}. Please click RUN.`);
  };

  const handleRun = async (e, isCombo) => {
    e.preventDefault();
    setBacktestResults({ main: null });
    setIsSimulating(true); 
    try {
      const res = isCombo ? await runComboBacktest?.(formData) : await runNewBacktest?.(formData);
      if (res) setBacktestResults({ main: res });
    } catch (err) { console.error(err); } 
    finally { setIsSimulating(false); }
  };

  // ... [useMemo for processedData and Metrics remains here, using actualStartDate logic from previous fix] ...

  return (
    <div className="backtest-container">
       {/* Header Section */}
       <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-2xl">📈</div>
              <h1 className="text-3xl font-bold text-white">Alpha Backtester <span className="text-emerald-500 text-sm">v66.1</span></h1>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            {/* Left: Inputs */}
            <div className="col-span-12 lg:col-span-4">
               <div className="bot-card p-6">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
                    <label className="text-emerald-400 block mb-2 font-bold text-xs uppercase">🏆 Load Alpha Strategy</label>
                    <select value={selectedWinnerId} onChange={handleWinnerSelect} className="w-full bg-black border border-white/10 rounded-lg p-2 text-white">
                        <option value="">-- Manual Configuration --</option>
                        {liveWinners.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  
                  {/* Form fields here using the common input components */}
                  <form onSubmit={(e) => handleRun(e, activeTab === 'combo')}>
                      {/* ... Inputs ... */}
                      <button type="submit" disabled={isSimulating} className="button-start w-full mt-4">
                          {isSimulating ? "SIMULATING..." : "▶ RUN SIMULATION"}
                      </button>
                  </form>
               </div>
            </div>

            {/* Right: Results */}
            <div className="col-span-12 lg:col-span-8">
                {isSimulating ? (
                    <div className="bot-card p-20 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-emerald-500 font-mono">CRUNCHING HISTORICAL DATA...</p>
                    </div>
                ) : backtestResults.main ? (
                    <div className="space-y-6">
                        {/* Results UI Components: Metrics, AdvancedMetrics, Charts */}
                    </div>
                ) : (
                    <div className="bot-card p-20 border-dashed border-white/5 flex flex-col items-center justify-center opacity-50">
                        <div className="text-5xl mb-4">🧪</div>
                        <p className="text-white font-bold">Ready for Simulation</p>
                        <p className="text-neutral-500 text-sm">Load a strategy or configure manually then click run.</p>
                    </div>
                )}
            </div>
          </div>
       </div>
    </div>
  );
}
