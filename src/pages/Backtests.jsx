import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import "./Backtests.css"; 

// --- UPDATED FEE TIERS (US STANDARD 2026) ---
const FEE_TIERS = [
  { label: "CB Advanced (0.6%)", val: 0.006, slip: 0.001, desc: "Standard Retail Taker" }, //
  { label: "CB Advanced (0.4%)", val: 0.004, slip: 0.0008, desc: "Standard Retail Maker" }, //
  { label: "High Volume (0.2%)", val: 0.002, slip: 0.0005, desc: ">$100k Monthly Vol" }   //
];

// --- DESCRIPTIVE PROGRESS COMPONENT ---
const ProgressMonitor = ({ progress, status, timeRemaining }) => (
  <div className="mt-6 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-[32px] animate-in fade-in zoom-in duration-500">
    <div className="flex justify-between items-end mb-4">
      <div>
        <h4 className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em] mb-1">Processing Engine</h4>
        <p className="text-white text-xs font-mono italic">{status}...</p>
      </div>
      <div className="text-right">
        <span className="text-emerald-500 font-black text-xl">{progress}%</span>
        <p className="text-[8px] text-neutral-500 uppercase mt-1">Est. Time: {timeRemaining}s</p>
      </div>
    </div>
    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
      <div 
        className="bg-emerald-500 h-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(16,185,129,0.5)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

// (MetricsGrid and StrategyParamInputs remain same as provided)
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
            <div key={i} className="bot-card p-4 text-center">
                <div className="text-neutral-500 text-[9px] uppercase font-black tracking-widest mb-1">{m.l}</div>
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
  const [availableModels, setAvailableModels] = useState([]);
  
  // --- NEW PROGRESS STATE ---
  const [simProgress, setSimProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [estSeconds, setEstSeconds] = useState(0);

  const [data, setData] = useState({
    symbol: "BTC-USD", timeframe: "1h", 
    startDate: "2025-12-01", endDate: "2026-01-22", 
    initialBalance: 10000, risk_percentage: 1.0, 
    mlMode: "on", regime_mode: "adaptive",
    params: { 
        model_type: "stacking", long_threshold: 0.65, short_threshold: 0.35,
        tslAtrMult: 3.0, minAdxLevel: 25, trendFilterPeriod: 200,
        commission: 0.006, // Defaulted to US Standard
        slippage: 0.001,
        squeeze_threshold: 0.003, vol_multiplier: 1.02
    }
  });

  // --- ENGINE FEED LOGIC ---
  const simulateProgress = () => {
    let current = 0;
    setEstSeconds(12); // Average time for 5000 bars
    
    const interval = setInterval(() => {
      current += Math.random() * 8;
      if (current > 98) current = 98;
      
      setSimProgress(Math.floor(current));
      setEstSeconds(prev => Math.max(0, prev - 1));

      if (current < 15) setStatusMsg("Synchronizing Exchange Data");
      else if (current < 40) setStatusMsg("Calculating Technical Indicators");
      else if (current < 70) setStatusMsg("Executing Machine Learning Inference");
      else if (current < 90) setStatusMsg("Auditing Council Agreement");
      else setStatusMsg("Finalizing Metrics & Equity Curve");
    }, 800);

    return interval;
  };

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setIsSimulating(true);
    setSimProgress(0);
    
    const progressInterval = simulateProgress();
    const runner = activeTab === 'combo' ? runComboBacktest : runNewBacktest;
    
    try {
      const res = await runner(data);
      if (res) {
          setSimProgress(100);
          setStatusMsg("Simulation Complete");
          setBacktestResults(res);
      }
    } catch (err) {
      setStatusMsg("Engine Error - Check Logs");
    } finally {
      clearInterval(progressInterval);
      setIsSimulating(false);
    }
  };

  const onParamChange = (name, val) => {
    setData(p => ({ ...p, params: { ...p.params, [name]: val } }));
  };

  return (
    <div className="backtest-container p-6 bg-[#030303] text-white min-h-screen">
        <div className="grid grid-cols-12 gap-10 max-w-[1800px] mx-auto">
          
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bot-card p-7 sticky top-10">
              <h2 className="text-white font-black text-xs tracking-widest uppercase mb-6">🧪 Strategy Sandbox</h2>

              {/* (Atomic/Hybrid toggle and form sections same as before...) */}

              <form onSubmit={handleRun} className="space-y-6 h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                
                {/* ... (AI HUB and ALPHA SHIELD sections) ... */}

                {/* 💰 UPDATED FEE TIERS SECTION */}
                <div className="p-5 bg-cyan-500/5 border border-cyan-500/10 rounded-[24px] space-y-4">
                    <h4 className="text-cyan-400 font-black text-[9px] tracking-widest uppercase border-b border-cyan-500/10 pb-2">Fee Tiers & Slippage</h4>
                    <div className="grid grid-cols-1 gap-2">
                        {FEE_TIERS.map(t => (
                            <button key={t.label} type="button" 
                                onClick={() => { onParamChange('commission', t.val); onParamChange('slippage', t.slip); }}
                                className={`py-4 px-4 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex justify-between items-center ${data.params.commission === t.val ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-black/40 text-neutral-500 border-white/10 hover:border-emerald-500/50'}`}>
                                <div className="flex flex-col items-start">
                                    <span>{t.label}</span>
                                    <span className="text-[7px] text-neutral-500 mt-1">{t.desc}</span>
                                </div>
                                <span className="text-[9px] opacity-60">SLIP: {t.slip}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <button type="submit" disabled={isSimulating} className={`w-full py-5 font-black uppercase tracking-[0.2em] rounded-2xl bg-emerald-500 text-black ${isSimulating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] shadow-xl shadow-emerald-500/10'}`}>
                    {isSimulating ? '🔬 CRUNCHING...' : '▶ Launch Backtest'}
                </button>

                {/* --- REAL-TIME PROGRESS FEED --- */}
                {isSimulating && (
                  <ProgressMonitor 
                    progress={simProgress} 
                    status={statusMsg} 
                    timeRemaining={estSeconds} 
                  />
                )}
              </form>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8 space-y-6">
            {backtestResults ? (
                <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <MetricsGrid metrics={backtestResults.metrics || {}} />
                    <div className="bot-card p-5 h-[720px] bg-black/40 border border-white/5 rounded-[40px] relative">
                        <ChartIndependent results={backtestResults} symbol={data.symbol} />
                    </div>
                </div>
            ) : (
                <div className="h-[90vh] flex flex-col items-center justify-center border-2 border-dashed border-white/5 bg-black/20 rounded-[48px] text-center p-10">
                    {!isSimulating ? (
                      <>
                        <div className="text-4xl mb-4">🔬</div>
                        <h3 className="text-white text-xl font-black uppercase tracking-widest">Ensemble Sandbox Ready</h3>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-6xl animate-bounce">⚡</div>
                        <h3 className="text-white text-xl font-black uppercase tracking-widest">Processing {data.symbol} History</h3>
                        <p className="text-neutral-500 text-sm max-w-sm mx-auto font-mono uppercase italic tracking-wider">
                          The Council is currently analyzing 5,000 bars of price data against your Alpha Shield parameters.
                        </p>
                      </div>
                    )}
                </div>
            )}
          </div>
        </div>
    </div>
  );
}
