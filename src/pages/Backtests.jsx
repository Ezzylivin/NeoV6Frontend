import React, { useState, useEffect, useCallback } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import "./Backtests.css"; 

// --- DYNAMIC API URL ---
const API_BASE = import.meta.env.VITE_API_URL || "http://74.208.28.77:8000";

const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-all text-sm outline-none";

const ProgressShield = ({ progress, statusMsg, symbol }) => (
    <div className="w-full max-w-md space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="flex justify-between items-end">
            <div className="flex flex-col text-left">
                <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Active Simulation</span>
                <span className="text-white text-lg font-black">{symbol}</span>
            </div>
            <span className="text-emerald-400 font-mono font-bold text-xl">{progress}%</span>
        </div>
        <div className="w-full h-3 bg-white/5 rounded-full border border-white/10 overflow-hidden p-[2px]">
            <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center gap-3 justify-center">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            <p className="text-emerald-400/80 text-[10px] font-mono uppercase">{statusMsg || "Awaiting Neural Sync..."}</p>
        </div>
    </div>
);

const MetricsGrid = ({ metrics }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {[
            { l: "ROI", v: `${(metrics.roi || 0).toFixed(2)}%`, c: "text-emerald-400" },
            { l: "Win Rate", v: `${(metrics.winRate || 0).toFixed(2)}%`, c: "text-violet-400" },
            { l: "Drawdown", v: `${(metrics.maxDrawdown || 0).toFixed(2)}%`, c: "text-rose-400" },
            { l: "Trades", v: metrics.totalTrades || 0, c: "text-cyan-400" },
            { l: "Profit Factor", v: (metrics.profitFactor || 0).toFixed(2), c: "text-teal-400" },
            { l: "Calmar", v: (metrics.calmarRatio || 0).toFixed(2), c: "text-amber-400" }
        ].map((m, i) => (
            <div key={i} className="bot-card p-4 text-center bg-white/5 rounded-2xl border border-white/5">
                <div className="text-neutral-500 text-[9px] uppercase font-black mb-1">{m.l}</div>
                <div className={`text-lg font-mono font-bold ${m.c}`}>{m.v}</div>
            </div>
        ))}
    </div>
);

export default function Backtests() {
  const { runNewBacktest, runComboBacktest } = useBacktest(); 
  const [activeTab, setActiveTab] = useState('single');
  const [isSimulating, setIsSimulating] = useState(false);
  const [backtestResults, setBacktestResults] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");

  const [data, setData] = useState({
    symbol: "SOL-USD", timeframe: "1h", 
    startDate: "2025-06-01", endDate: "2026-01-31", 
    initialBalance: 1000, risk_percentage: 1.0, 
    mlMode: "on", combinationRule: "OR",
    code: "rsi_threshold",
    params: { 
        model_type: "stacking", 
        long_threshold: 0.81, 
        short_threshold: 0.95,
        take_profit: 0.052, 
        stop_loss: 0.019,
        tslAtrMult: 3.0,     // Trailing Stop Multiplier
        atrPeriod: 14,      // ATR Period
        minAdxLevel: 25,    // ADX Trend Filter
        commission: 0.004, 
        slippage: 0.0008,
        session_start: 0, 
        session_end: 23
    }
  });

  const onParamChange = (name, val) => {
    setData(p => ({ ...p, params: { ...p.params, [name]: val } }));
  };

  useEffect(() => {
    let poller;
    if (isSimulating) {
      poller = setInterval(async () => {
        try {
          const res = await axios.get(`${API_BASE}/api/backtest/status`);
          if (res.data) {
            setProgress(res.data.progress || 0);
            setStatusMsg(res.data.status || "Processing...");
            if (res.data.progress >= 100) {
                setIsSimulating(false);
                clearInterval(poller);
            }
          }
        } catch (e) { console.error("API link failed. Check Mixed Content settings."); }
      }, 1500);
    }
    return () => clearInterval(poller);
  }, [isSimulating]);

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setIsSimulating(true);
    setProgress(1);
    try {
        const runner = activeTab === 'combo' ? runComboBacktest : runNewBacktest;
        const res = await runner(data);
        if (res) setBacktestResults(res);
    } catch (err) { setStatusMsg("Backtest Initialisation Failed."); setIsSimulating(false); }
  };

  return (
    <div className="p-6 bg-[#030303] text-white min-h-screen">
        <div className="grid grid-cols-12 gap-10 max-w-[1800px] mx-auto">
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bot-card p-7 bg-[#0a0a0a] rounded-3xl border border-white/10 sticky top-10">
              <h2 className="text-white font-black text-xs uppercase mb-6 italic">🧪 Sovereign Sandbox v7.5</h2>
              
              <form onSubmit={handleRun} className="space-y-6 h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl space-y-4">
                    <h4 className="text-emerald-400 font-black text-[9px] uppercase border-b border-emerald-500/10 pb-2">Execution Shield</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[8px] text-neutral-500 uppercase font-bold">TSL ATR Mult</label><input type="number" step="0.1" value={data.params.tslAtrMult} onChange={(e)=>onParamChange('tslAtrMult', parseFloat(e.target.value))} className={inputClass}/></div>
                        <div><label className="text-[8px] text-neutral-500 uppercase font-bold">ATR Period</label><input type="number" value={data.params.atrPeriod} onChange={(e)=>onParamChange('atrPeriod', parseInt(e.target.value))} className={inputClass}/></div>
                        <div><label className="text-[8px] text-neutral-500 uppercase font-bold">TP %</label><input type="number" step="0.001" value={data.params.take_profit} onChange={(e)=>onParamChange('take_profit', parseFloat(e.target.value))} className={inputClass}/></div>
                        <div><label className="text-[8px] text-neutral-500 uppercase font-bold">SL %</label><input type="number" step="0.001" value={data.params.stop_loss} onChange={(e)=>onParamChange('stop_loss', parseFloat(e.target.value))} className={inputClass}/></div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2"><label className="text-[8px] uppercase text-neutral-500 font-bold">Asset</label>
                        <select value={data.symbol} onChange={(e)=>setData({...data, symbol: e.target.value})} className={inputClass}>
                            <option value="BTC-USD">BTC-USD</option><option value="SOL-USD">SOL-USD</option>
                        </select>
                    </div>
                    <div><label className="text-[8px] uppercase text-neutral-500 font-bold">Risk %</label><input type="number" step="0.1" value={data.risk_percentage} onChange={(e)=>setData({...data, risk_percentage: parseFloat(e.target.value)})} className={inputClass}/></div>
                    <div><label className="text-[8px] uppercase text-neutral-500 font-bold">Min ADX</label><input type="number" value={data.params.minAdxLevel} onChange={(e)=>onParamChange('minAdxLevel', parseInt(e.target.value))} className={inputClass}/></div>
                </div>

                <button type="submit" disabled={isSimulating} className="w-full py-5 font-black uppercase rounded-2xl bg-emerald-500 text-black hover:scale-[1.02] transition-all disabled:opacity-50">
                    {isSimulating ? '🔬 SIMULATING...' : '▶ Launch Backtest'}
                </button>
              </form>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8">
            {backtestResults ? (
                <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <MetricsGrid metrics={backtestResults.metrics || {}} />
                    <div className="bot-card p-5 h-[700px] bg-black/40 border border-white/5 rounded-[40px]">
                        <ChartIndependent results={backtestResults} symbol={data.symbol} />
                    </div>
                </div>
            ) : (
                <div className="h-[80vh] flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[48px]">
                    {isSimulating ? <ProgressShield progress={progress} statusMsg={statusMsg} symbol={data.symbol} /> : <p className="text-neutral-500">Configure Parameters & Execute</p>}
                </div>
            )}
          </div>
        </div>
    </div>
  );
}
