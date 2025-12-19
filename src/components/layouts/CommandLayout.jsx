// File: src/components/layouts/CommandLayout.jsx
// 🚀 UPGRADE: v3.0 - "War Room" Terminal UI
// 🛠 Fixes: Correctly maps 'currentBalance' from root botStatus.
// 🛠 Features: Responsive Grid, CRT Scanline effect, Dynamic Coloring.

import React from "react";

const CommandLayout = (props) => {
  const { botStatus, isRunning, latency } = props;
  
  // Data Safety Checks
  const metrics = botStatus?.performanceMetrics || {};
  const currentBalance = botStatus?.currentBalance || 0;
  const totalProfit = metrics.totalProfit || 0;
  
  const formatCurrency = (val) => val ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00";
  const formatPct = (val) => val ? `${val.toFixed(2)}%` : "0.00%";

  // Color logic
  const pnlColor = totalProfit >= 0 ? "text-emerald-400" : "text-red-500";
  const shadowColor = totalProfit >= 0 ? "shadow-emerald-500/20" : "shadow-red-500/20";

  return (
    <div className="relative min-h-screen bg-neutral-950 text-neutral-200 font-mono flex flex-col overflow-hidden">
      
      {/* 📺 CRT Scanline Overlay Effect */}
      <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20"></div>

      {/* HEADER */}
      <header className={`flex justify-between items-center p-6 border-b-4 ${isRunning ? 'border-emerald-600 bg-emerald-900/10' : 'border-red-600 bg-red-900/10'}`}>
        <div className="flex flex-col">
          <h1 className={`text-4xl font-black tracking-[0.2em] ${isRunning ? 'text-emerald-500' : 'text-red-500'}`}>
            {isRunning ? "SYSTEM OPERATIONAL" : "SYSTEM OFFLINE"}
          </h1>
          <span className="text-xs text-neutral-500 uppercase tracking-widest mt-1">
            Sovereign Executive v89.2 // Command Interface
          </span>
        </div>
        <div className="text-right">
          <div className="text-xs text-neutral-500 mb-1">NETWORK LATENCY</div>
          <div className={`text-xl font-bold ${latency < 200 ? 'text-emerald-400' : 'text-yellow-400'}`}>
            {latency ? `${latency}ms` : '--'}
          </div>
        </div>
      </header>

      {/* MAIN GRID */}
      <main className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-min">
        
        {/* 💰 BIG STAT: PnL (Spans full width on mobile, 2 cols on large) */}
        <div className={`col-span-1 md:col-span-2 lg:col-span-4 bg-[#0a0a0a] border border-white/10 p-10 flex flex-col items-center justify-center rounded-sm shadow-2xl ${shadowColor}`}>
          <span className="text-neutral-500 text-sm tracking-[0.3em] uppercase mb-4">Net Profit / Loss</span>
          <span className={`text-7xl md:text-9xl font-black tracking-tighter ${pnlColor} drop-shadow-lg`}>
            {formatCurrency(totalProfit)}
          </span>
        </div>

        {/* 🏦 Current Balance */}
        <div className="bg-[#0f0f0f] border border-white/5 p-6 flex flex-col justify-between hover:border-white/20 transition-colors">
          <span className="text-neutral-500 text-xs tracking-widest uppercase">Total Equity</span>
          <span className="text-4xl font-bold text-white mt-2">{formatCurrency(currentBalance)}</span>
        </div>

        {/* 📊 Total Trades */}
        <div className="bg-[#0f0f0f] border border-white/5 p-6 flex flex-col justify-between hover:border-white/20 transition-colors">
          <span className="text-neutral-500 text-xs tracking-widest uppercase">Total Executions</span>
          <span className="text-4xl font-bold text-blue-400 mt-2">{metrics.totalTrades || 0}</span>
        </div>

        {/* 🎯 Win Rate */}
        <div className="bg-[#0f0f0f] border border-white/5 p-6 flex flex-col justify-between hover:border-white/20 transition-colors">
          <span className="text-neutral-500 text-xs tracking-widest uppercase">Win Efficiency</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-bold text-yellow-400">{formatPct(metrics.winRate)}</span>
          </div>
        </div>

        {/* 📉 Max Drawdown */}
        <div className="bg-[#0f0f0f] border border-white/5 p-6 flex flex-col justify-between hover:border-white/20 transition-colors">
          <span className="text-neutral-500 text-xs tracking-widest uppercase">Max Drawdown</span>
          <span className="text-4xl font-bold text-red-500 mt-2">{formatPct(metrics.maxDrawdown)}</span>
        </div>

        {/* 📐 Profit Factor */}
        <div className="bg-[#0f0f0f] border border-white/5 p-6 flex flex-col justify-between hover:border-white/20 transition-colors">
          <span className="text-neutral-500 text-xs tracking-widest uppercase">Profit Factor</span>
          <span className="text-4xl font-bold text-purple-400 mt-2">{metrics.profitFactor?.toFixed(2) || "0.00"}</span>
        </div>

        {/* ⚙️ Active Configuration */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-[#0a0a0a] border border-white/10 p-6 flex items-center justify-between">
           <div>
             <div className="text-neutral-500 text-xs tracking-widest uppercase mb-1">Active Symbol</div>
             <div className="text-2xl font-bold text-white">{botStatus?.symbol || "NO SIGNAL"}</div>
           </div>
           <div>
             <div className="text-neutral-500 text-xs tracking-widest uppercase mb-1">Timeframe</div>
             <div className="text-2xl font-bold text-white">{botStatus?.timeframe || "--"}</div>
           </div>
           <div>
             <div className="text-neutral-500 text-xs tracking-widest uppercase mb-1">Positions</div>
             <div className="text-2xl font-bold text-white">{botStatus?.positions?.length || 0}</div>
           </div>
        </div>

      </main>
    </div>
  );
};

export default CommandLayout;
