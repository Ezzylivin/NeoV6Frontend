import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartTooltip, Legend 
} from "recharts";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import { ChartReplay } from "../components/ChartReplay.jsx";
import "./Backtests.css"; 

const STRATEGY_TYPE_TO_CODE_MAP = {
  "Moving Average Crossover": "sma_crossover", "RSI": "rsi_divergence", "MACD": "macd_crossover",
  "CCI": "cci_oversold", "Bollinger Bands": "bollinger_bands", "ATR": "atr_breakout"
};

const defaultFilterParams = { minAtrPct: 0.5, trendFilterPeriod: 200, minAdxLevel: 10, tslAtrMult: 3.5 };
const COLORS = ["#10b981", "#ef4444", "#3b82f6", "#f59e0b"];

// --- HELPERS ---

const computeMonthlyReturns = (trades) => {
    const monthly = {};
    trades.forEach(t => {
        const date = new Date(t.exitTime || t.exit_time);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        monthly[key] = (monthly[key] || 0) + (t.profit || 0);
    });
    return Object.entries(monthly).map(([month, profit]) => ({ month, profit }));
};

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

const MonthlyAnalytics = ({ trades }) => {
    const data = computeMonthlyReturns(trades);
    return (
        <div className="bot-card p-6 bg-black/40 border-white/5 h-full">
            <h4 className="text-white text-xs font-bold uppercase mb-4 tracking-tighter">Monthly Breakdown</h4>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {data.map((d, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-neutral-400 text-sm font-mono">{d.month}</span>
                        <span className={`font-bold ${d.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {d.profit >= 0 ? '+' : ''}${d.profit.toFixed(2)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const WinLossPie = ({ trades }) => {
    const wins = trades.filter(t => t.profit > 0).length;
    const losses = trades.filter(t => t.profit <= 0).length;
    const data = [{ name: 'Wins', value: wins }, { name: 'Losses', value: losses }];

    return (
        <div className="bot-card p-6 bg-black/40 border-white/5 flex flex-col items-center justify-center">
            <h4 className="text-white text-xs font-bold uppercase mb-4 self-start">Win/Loss Distribution</h4>
            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {data.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <RechartTooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---

export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, fetchOptions } = useBacktest(); 
  const { options = {} } = state || {};
  const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors disabled:opacity-50";

  const [displayMode, setDisplayMode] = useState('static');
  const [isSimulating, setIsSimulating] = useState(false);
  const [liveWinners, setLiveWinners] = useState([]);
  const [backtestResults, setBacktestResults] = useState(null);

  const [formData, setFormData] = useState({ 
    symbol: "", timeframe: "", startDate: "2025-01-11", endDate: "2026-01-11", 
    initialBalance: 1000, strategyId: "", code: "", riskManagementMode: 'static', riskPercentage: 1, 
    params: {...defaultFilterParams}, mlMode: "off" 
  });

  const loadWinners = useCallback(async () => {
      try {
        const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners", { 
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } 
        });
        setLiveWinners(Array.isArray(res.data) ? res.data : (res.data.winners || []));
      } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { 
      if (typeof fetchOptions === 'function') fetchOptions(); 
      loadWinners();
  }, [fetchOptions, loadWinners]);

  const processed = useMemo(() => {
    if (!backtestResults) return null;
    const res = backtestResults.combinedResult || backtestResults;
    // 🟢 CRITICAL: Ensure candleData extraction is robust
    const candles = backtestResults.candleData || res.candleData || [];
    const trades = backtestResults.trades || res.trades || res.tradeBreakdown || [];
    
    console.log("📊 UI Pipeline Check:", { candleCount: candles.length, tradeCount: trades.length });
    
    return { candleData: candles, trades: trades, metrics: { ...res.metrics } };
  }, [backtestResults]);

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setIsSimulating(true); 
    const res = await runNewBacktest(formData);
    if (res) setBacktestResults(res);
    setIsSimulating(false);
  };

  return (
    <div className="backtest-container p-6 space-y-8">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-4">
            <div className="bot-card p-6 bg-black/60 border-emerald-500/10">
              <h2 className="text-white font-bold mb-6 flex items-center gap-2">🧪 Strategy Sandbox</h2>
              <form onSubmit={handleRun} className="space-y-6">
                <button type="submit" disabled={isSimulating} className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all ${isSimulating ? 'bg-neutral-800 text-neutral-500 animate-pulse' : 'bg-emerald-500 text-black hover:scale-105'}`}>
                    {isSimulating ? 'Simulation in Progress...' : '▶ Run Simulation'}
                </button>
              </form>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8">
            {processed ? (
              <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                    <div className="flex gap-2">
                        <button onClick={() => setDisplayMode('static')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${displayMode === 'static' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-neutral-400 hover:bg-white/5'}`}>Static View</button>
                        <button onClick={() => setDisplayMode('replay')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${displayMode === 'replay' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-neutral-400 hover:bg-white/5'}`}>Interactive Replay</button>
                    </div>
                </div>

                <MetricsGrid metrics={processed.metrics} />

                <div className="bot-card p-6 h-[500px] border-white/5 shadow-2xl relative">
                  {displayMode === 'static' ? (
                    <ChartIndependent results={processed} symbol={formData.symbol} />
                  ) : (
                    <ChartReplay results={processed} symbol={formData.symbol} />
                  )}
                </div>

                {/* Restore Bottom Analytics */}
                <div className="grid grid-cols-12 gap-6 mt-6">
                    <div className="col-span-12 lg:col-span-8">
                        <MonthlyAnalytics trades={processed.trades} />
                    </div>
                    <div className="col-span-12 lg:col-span-4">
                        <WinLossPie trades={processed.trades} />
                    </div>
                </div>
              </div>
            ) : (
              <div className="bot-card p-20 flex flex-col items-center justify-center min-h-[700px] border-dashed border-2 border-white/5 bg-black/20"> 
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 text-5xl bg-emerald-500/5 border border-emerald-500/20 ${isSimulating ? 'animate-spin' : ''}`}> {isSimulating ? '⚙️' : '🧪'} </div> 
                <h3 className="text-white text-2xl mb-4 font-bold">{isSimulating ? 'Processing Historical Data...' : 'Strategy Sandbox Ready'}</h3> 
                <p className="text-neutral-500 text-center max-w-sm">Load an alpha configuration or choose your parameters to generate a visual backtest result.</p>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
