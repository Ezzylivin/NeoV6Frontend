import React, { useState, useEffect, useCallback } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import "./Backtests.css"; 

// --- STYLING CONSTANTS ---
const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-all text-sm outline-none";

// --- SUB-COMPONENT: PROGRESS BAR ---
const ProgressShield = ({ progress, statusMsg, symbol }) => (
    <div className="w-full max-w-md space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="flex justify-between items-end">
            <div className="flex flex-col">
                <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Active Simulation</span>
                <span className="text-white text-lg font-black">{symbol}</span>
            </div>
            <span className="text-emerald-400 font-mono font-bold text-xl">{progress}%</span>
        </div>
        
        {/* Outer Track */}
        <div className="w-full h-3 bg-white/5 rounded-full border border-white/10 overflow-hidden p-[2px]">
            {/* Inner Glow Bar */}
            <div 
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                style={{ width: `${progress}%` }}
            />
        </div>
        
        <div className="flex items-center gap-3 justify-center">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            <p className="text-emerald-400/80 text-[10px] font-mono tracking-tighter uppercase">
                {statusMsg || "Synchronizing Neural Latency..."}
            </p>
        </div>
    </div>
);

// ... (StrategyParamInputs and MetricsGrid stay the same)

export default function Backtests() {
  const { runNewBacktest, runComboBacktest } = useBacktest(); 
  const [activeTab, setActiveTab] = useState('single');
  const [isSimulating, setIsSimulating] = useState(false);
  const [backtestResults, setBacktestResults] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);
  
  // 🟢 NEW STATE FOR REAL-TIME TRACKING
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("Idle");

  // --- POLLING LOGIC ---
  useEffect(() => {
    let poller;
    if (isSimulating) {
      poller = setInterval(async () => {
        try {
          const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/backtest/status`);
          if (res.data) {
            setProgress(res.data.progress || 0);
            setStatusMsg(res.data.status || "Processing...");
            
            // If the backend says finished, but the main request is still pending
            if (res.data.progress === 100) {
                setStatusMsg("Finalizing Report Card...");
            }
          }
        } catch (e) {
          console.error("Heartbeat Lost");
        }
      }, 1000); // Poll every 1 second
    } else {
      setProgress(0);
    }
    return () => clearInterval(poller);
  }, [isSimulating]);

  // ... (loadModels and onParamChange stay the same)

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setIsSimulating(true);
    setProgress(1); // Visual trigger
    setStatusMsg("Booting Sovereign Engine...");

    const sanitizedData = { /* ... your existing sanitization ... */ };

    try {
        const runner = activeTab === 'combo' ? runComboBacktest : runNewBacktest;
        const res = await runner(sanitizedData);
        if (res) {
            setBacktestResults(res);
            setStatusMsg("Results Certified.");
        }
    } catch (err) {
        setStatusMsg("Engine Link Failure.");
    } finally {
        setIsSimulating(false);
    }
  };

  return (
    <div className="backtest-container p-6 bg-[#030303] text-white min-h-screen">
        <div className="grid grid-cols-12 gap-10 max-w-[1800px] mx-auto">
          
          {/* LEFT COLUMN: SETTINGS (unchanged) */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* ... Existing sidebar form code ... */}
          </div>

          {/* RIGHT COLUMN: RESULTS / PROGRESS */}
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
                    {isSimulating ? (
                        <ProgressShield 
                            progress={progress} 
                            statusMsg={statusMsg} 
                            symbol={data.symbol} 
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="text-4xl animate-bounce">🔬</div>
                            <h3 className="text-white text-xl font-black uppercase tracking-widest">Ensemble Sandbox Ready</h3>
                            <p className="text-neutral-500 text-xs">Configure your Alpha Shield and launch simulation.</p>
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>
    </div>
  );
}
