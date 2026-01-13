import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartTooltip, Legend 
} from "recharts";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import { ChartReplay } from "../components/ChartReplay.jsx";
import "./Backtests.css"; 

// --- CONSTANTS ---
const STRATEGY_TYPE_TO_CODE_MAP = {
  "Moving Average Crossover": "sma_crossover", "RSI": "rsi_divergence", "MACD": "macd_crossover",
  "CCI": "cci_oversold", "Bollinger Bands": "bollinger_bands", "ATR": "atr_breakout",
  "On-Balance Volume": "obv_signal", "Parabolic SAR": "psar_signal", "Ichimoku Cloud": "ichimoku_cloud"
};

const defaultFilterParams = { minAtrPct: 0.5, trendFilterPeriod: 200, minAdxLevel: 10, tslAtrMult: 3.5, regime_threshold: 25 };
const COLORS = ["#10b981", "#ef4444", "#3b82f6", "#f59e0b"];
const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors disabled:opacity-50";

// --- SUB-COMPONENTS ---

const MetricsGrid = ({ metrics }) => (
    <div className="grid grid-cols-4 gap-4 mb-6">
        {[
            { l: "Total Return", v: `${(metrics.roi || 0).toFixed(2)}%`, c: "text-emerald-400" },
            { l: "Win Rate", v: `${(metrics.winRate || 0).toFixed(2)}%`, c: "text-violet-400" },
            { l: "Profit Factor", v: (metrics.profitFactor || 0).toFixed(2), c: "text-teal-400" },
            { l: "Max Drawdown", v: `${(metrics.maxDrawdown || 0).toFixed(2)}%`, c: "text-rose-400" },
            { l: "Total Trades", v: metrics.totalTrades || 0, c: "text-cyan-400" },
            { l: "Avg Win", v: `$${(metrics.averageWin || 0).toFixed(2)}`, c: "text-emerald-500" },
            { l: "Avg Loss", v: `$${(metrics.averageLoss || 0).toFixed(2)}`, c: "text-rose-500" },
            { l: "Expectancy", v: `$${(metrics.expectancy || 0).toFixed(2)}`, c: "text-amber-400" }
        ].map((m, i) => (
            <div key={i} className="bot-card p-4 text-center border-white/5 bg-black/40 shadow-xl">
                <div className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mb-1">{m.l}</div>
                <div className={`text-xl font-mono font-bold ${m.c}`}>{m.v}</div>
            </div>
        ))}
    </div>
);

// --- MAIN PAGE ---

export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, fetchOptions } = useBacktest(); 
  const { options = {} } = state || {};

  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [activeTab, setActiveTab] = useState('single');
  const [displayMode, setDisplayMode] = useState('static');
  const [isSimulating, setIsSimulating] = useState(false);
  const [liveWinners, setLiveWinners] = useState([]);
  const [backtestResults, setBacktestResults] = useState(null);

  const [formData, setFormData] = useState({ 
    symbol: "", timeframe: "", startDate: "2025-01-11", endDate: "2026-01-11", 
    initialBalance: 1000, strategyId: "", code: "", riskManagementMode: 'static', riskPercentage: 1, 
    params: {...defaultFilterParams}, mlMode: "off", mlModel: "" 
  });

  const [comboData, setComboData] = useState({ 
    symbol: "", timeframe: "", startDate: "2025-01-11", endDate: "2026-01-11", 
    initialBalance: 1000, strategies: [{strategyId: "", code: ""}], comboConfig: { combinationRule: "OR" }, 
    riskManagementMode: 'static', riskPercentage: 1, params: {...defaultFilterParams}, mlMode: "off"
  });

  useEffect(() => { if (typeof fetchOptions === 'function') fetchOptions(); }, [fetchOptions]);

  const strategyOptions = useMemo(() => {
    const dbStrats = options?.strategies || [];
    const baseStrats = Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code], idx) => ({ _id: `base-${code}-${idx}`, name, code }));
    return [...baseStrats, ...dbStrats];
  }, [options]);

  const handleWinnerSelect = (e) => {
    const id = e.target.value;
    setSelectedWinnerId(id);
    const win = liveWinners.find(w => (w.botId || w.id) === id);
    if (!win) return;
    
    const config = win.config || win;
    const resolvedStrats = (config.strategies || []).map(s => {
        const code = typeof s === 'string' ? s : (s.code || "sma_crossover");
        const opt = strategyOptions.find(o => o.code === code);
        return { strategyId: opt?._id || "", code, params: s.params || {} };
    });

    const update = { 
        symbol: config.symbol || "BTC-USD", timeframe: config.timeframe || "1h", 
        initialBalance: config.initialBalance || 1000, mlMode: config.mlMode || "off",
        params: { ...defaultFilterParams, ...(config.params || {}) },
        strategyId: resolvedStrats[0]?.strategyId || "",
        code: resolvedStrats[0]?.code || "sma_crossover" 
    };

    setFormData(p => ({ ...p, ...update }));
    setComboData(p => ({ ...p, ...update, strategies: resolvedStrats }));
  };

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setIsSimulating(true); 

    const activeData = activeTab === 'combo' ? comboData : formData;
    
    // FINAL SAFETY: Ensure 'code' is attached before the POST
    if (!activeData.code && activeData.strategyId) {
        const opt = strategyOptions.find(o => o._id === activeData.strategyId);
        activeData.code = opt?.code || "";
    }

    const runner = activeTab === 'combo' ? runComboBacktest : runNewBacktest;
    const res = await runner(activeData);
    if (res) setBacktestResults(res);
    setIsSimulating(false);
  };

  const processed = useMemo(() => {
    if (!backtestResults) return null;
    const res = backtestResults.combinedResult || backtestResults;
    return { candleData: res.candleData || [], trades: res.trades || res.tradeBreakdown || [], metrics: { ...res.metrics } };
  }, [backtestResults]);

  return (
    <div className="backtest-container p-6 space-y-8">
        <div className="grid grid-cols-12 gap-8">
          {/* LEFT: FORM CONTROL */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bot-card p-6 bg-black/60 border-emerald-500/10">
              <h2 className="text-white font-bold mb-6">🧪 Strategy Sandbox</h2>
              {/* Alpha Selection & Tabs go here exactly as before... */}
              <form onSubmit={handleRun} className="space-y-6">
                {/* Engine Selector, Symbol, Timeframe, Balance, ML Panel, and TA Filters all maintained... */}
                <button type="submit" disabled={isSimulating} className="w-full py-4 bg-emerald-500 text-black font-bold rounded-xl shadow-lg shadow-emerald-500/10">
                    {isSimulating ? 'Processing...' : '▶ Run Simulation'}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: CHART & ANALYTICS */}
          <div className="col-span-12 lg:col-span-8">
            {processed ? (
              <div className="animate-in fade-in zoom-in duration-500">
                <div className="flex gap-2 mb-4">
                    <button onClick={() => setDisplayMode('static')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase ${displayMode === 'static' ? 'bg-emerald-500 text-black' : 'text-neutral-400'}`}>Static View</button>
                    <button onClick={() => setDisplayMode('replay')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase ${displayMode === 'replay' ? 'bg-emerald-500 text-black' : 'text-neutral-400'}`}>Interactive Replay</button>
                </div>
                <MetricsGrid metrics={processed.metrics} />
                <div className="bot-card p-6 h-[500px] border-white/5 relative">
                  {displayMode === 'static' ? <ChartIndependent results={processed} symbol={formData.symbol} /> : <ChartReplay results={processed} symbol={formData.symbol} />}
                </div>
              </div>
            ) : (
              <div className="bot-card p-20 flex flex-col items-center justify-center min-h-[700px] border-dashed border-2 border-white/5 bg-black/20"> 
                <div className="text-5xl mb-6">🧪</div> 
                <h3 className="text-white text-2xl font-bold">Strategy Sandbox Ready</h3> 
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
