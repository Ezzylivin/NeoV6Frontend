// File: src/components/layouts/DeskLayout.jsx
// 🚀 UPGRADE: v3.0 - Tailwind Refactor & Pro UI
// 🛠 Fixes: Replaced inline styles with Tailwind CSS.
// 🛠 Features: Better responsive layout, pro-trading terminal look.

import React from "react";
import LiveTradingChart from "../LiveTradingChart";
// Assuming SharedComponents is in src/components/SharedComponents.jsx
// If DeskLayout is in src/components/layouts/, then ../SharedComponents is correct.
import { MetricsDisplay, LogsPanel, DecisionStream } from "../SharedComponents";

const DeskLayout = (props) => {
  const {
    formConfig, setFormConfig,
    setups, liveWinners,
    selectedSetupId, handleSetupSelect,
    selectedWinnerId, handleWinnerSelect,
    scanningWinners, fetchWinners,
    isRunning, botLoading,
    handleStart, handleStop,
    handleClearLogs,
    botStatus,
    logs, visibleLogs,
    chartData 
  } = props;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_340px] h-screen bg-neutral-950 text-neutral-200 font-sans overflow-hidden">
      
      {/* ---------------- LEFT COLUMN: COMMAND & CONTROL ---------------- */}
      <aside className="flex flex-col gap-5 p-5 bg-[#111] border-r border-white/5 overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center border-b-2 border-white/5 pb-3 mb-2">
          <h3 className="m-0 text-sm uppercase tracking-widest text-neutral-400 font-bold">Configuration</h3>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${isRunning ? 'bg-green-500 text-black' : 'bg-neutral-700 text-neutral-400'}`}>
            {isRunning ? 'RUNNING' : 'IDLE'}
          </span>
        </div>

        <form onSubmit={handleStart} className="flex flex-col gap-5">
          {/* 1. Strategy Source */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-neutral-500 uppercase">Load Strategy (DB)</label>
            <select 
              value={selectedSetupId} 
              onChange={handleSetupSelect} 
              disabled={isRunning}
              className="w-full bg-black/40 border border-white/10 text-neutral-200 p-2.5 rounded text-sm focus:border-yellow-500/50 focus:outline-none disabled:opacity-50 transition-colors"
            >
              <option value="">-- Saved Strategies --</option>
              {setups.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-neutral-500 uppercase">Load Alpha (File)</label>
              <button 
                type="button" 
                onClick={fetchWinners} 
                disabled={scanningWinners}
                className="text-yellow-500 hover:text-yellow-400 text-xs font-bold uppercase disabled:opacity-50"
              >
                {scanningWinners ? 'Scanning...' : '↻ Refresh'}
              </button>
            </div>
            <select 
              value={selectedWinnerId} 
              onChange={handleWinnerSelect} 
              disabled={isRunning}
              className="w-full bg-black/40 border border-white/10 text-neutral-200 p-2.5 rounded text-sm focus:border-yellow-500/50 focus:outline-none disabled:opacity-50 transition-colors"
            >
              <option value="">-- Optimizer Results --</option>
              {liveWinners.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          <div className="h-px bg-white/5 my-1"></div>

          {/* 2. Asset & Capital */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-neutral-500 uppercase">Symbol</label>
              <input value={formConfig.symbol} disabled className="w-full bg-black/40 border border-white/10 text-neutral-400 p-2.5 rounded text-sm font-mono" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-neutral-500 uppercase">Timeframe</label>
              <input value={formConfig.timeframe} disabled className="w-full bg-black/40 border border-white/10 text-neutral-400 p-2.5 rounded text-sm font-mono" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-neutral-500 uppercase">Capital Allocation ($)</label>
            <input 
              type="number" 
              value={formConfig.capitalAllocation} 
              onChange={e => setFormConfig(p => ({...p, capitalAllocation: e.target.value}))}
              disabled={isRunning}
              className="w-full bg-black/40 border border-white/10 text-yellow-400 p-2.5 rounded text-sm font-mono focus:border-yellow-500/50 focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="h-px bg-white/5 my-1"></div>

          {/* 3. Risk Management */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-neutral-500 uppercase">Risk Mode</label>
            <select 
              value={formConfig.riskManagementMode} 
              onChange={e => setFormConfig(p => ({...p, riskManagementMode: e.target.value}))}
              disabled={isRunning}
              className="w-full bg-black/40 border border-white/10 text-neutral-200 p-2.5 rounded text-sm focus:border-yellow-500/50 focus:outline-none disabled:opacity-50"
            >
              <option value="static">Static % (Aggressive)</option>
              <option value="dynamic">Dynamic (Safe)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-neutral-500 uppercase">Risk %</label>
              <input 
                type="number" 
                value={formConfig.riskPercentage} 
                onChange={e => setFormConfig(p => ({...p, riskPercentage: e.target.value}))}
                disabled={isRunning}
                step="0.1"
                className="w-full bg-black/40 border border-white/10 text-neutral-200 p-2.5 rounded text-sm focus:border-yellow-500/50 focus:outline-none disabled:opacity-50"
              />
            </div>
            {formConfig.riskManagementMode === 'dynamic' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-neutral-500 uppercase">Growth Tgt</label>
                <input 
                  type="number" 
                  value={formConfig.growthCapitalTarget} 
                  onChange={e => setFormConfig(p => ({...p, growthCapitalTarget: e.target.value}))}
                  disabled={isRunning}
                  className="w-full bg-black/40 border border-white/10 text-neutral-200 p-2.5 rounded text-sm focus:border-yellow-500/50 focus:outline-none disabled:opacity-50"
                />
              </div>
            )}
          </div>

          {/* 4. Actions */}
          <div className="mt-auto flex flex-col gap-3">
            <div className="flex bg-black/40 rounded p-1 border border-white/10">
              <button 
                type="button" 
                className={`flex-1 py-2 text-xs font-bold uppercase rounded transition-all ${formConfig.tradingMode === 'paper' ? 'bg-emerald-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                onClick={() => setFormConfig(p => ({...p, tradingMode: 'paper'}))}
                disabled={isRunning}
              >
                Paper
              </button>
              <button 
                type="button" 
                className={`flex-1 py-2 text-xs font-bold uppercase rounded transition-all ${formConfig.tradingMode === 'live' ? 'bg-red-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                onClick={() => setFormConfig(p => ({...p, tradingMode: 'live'}))}
                disabled={isRunning}
              >
                Live
              </button>
            </div>

            {!isRunning ? (
              <button 
                type="submit" 
                disabled={botLoading}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3.5 rounded shadow-lg shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wide text-sm"
              >
                {botLoading ? 'Initializing...' : 'Start Strategy'}
              </button>
            ) : (
              <button 
                type="button" 
                onClick={handleStop} 
                disabled={botLoading}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wide text-sm"
              >
                Stop Bot
              </button>
            )}
          </div>
        </form>
      </aside>

      {/* ---------------- CENTER COLUMN: MARKET & METRICS ---------------- */}
      <main className="flex flex-col h-full overflow-hidden bg-black relative">
        {/* Top Metrics Strip */}
        <div className="p-4 bg-[#111] border-b border-white/5 z-10">
          <MetricsDisplay data={botStatus} variant="desk" />
        </div>

        {/* Main Chart Area */}
        <div className="flex-1 relative w-full h-full">
          <LiveTradingChart 
            candles={chartData?.candleData || []} 
            trades={chartData?.tradeBreakdown || []}
            activePositions={botStatus?.positions || []}
          />
        </div>
      </main>

      {/* ---------------- RIGHT COLUMN: INTELLIGENCE ---------------- */}
      <aside className="flex flex-col h-full bg-[#111] border-l border-white/5">
        
        {/* Top: Decision Stream */}
        <div className="flex-1 flex flex-col min-h-0 border-b border-white/5 p-5 overflow-hidden">
          <div className="flex justify-between items-center border-b-2 border-white/5 pb-3 mb-2 shrink-0">
            <h3 className="m-0 text-sm uppercase tracking-widest text-neutral-400 font-bold">Decision Stream</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <DecisionStream logs={logs} limit={50} />
          </div>
        </div>

        {/* Bottom: System Logs */}
        <div className="flex-[0.8] flex flex-col min-h-0 p-5 bg-[#0a0a0a] overflow-hidden">
          <div className="flex justify-between items-center border-b-2 border-white/5 pb-3 mb-2 shrink-0">
            <h3 className="m-0 text-sm uppercase tracking-widest text-neutral-400 font-bold">System Logs</h3>
            <button onClick={handleClearLogs} className="text-xs text-neutral-500 hover:text-white uppercase font-bold transition-colors">Clear</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-xs bg-black/30 rounded border border-white/5 p-2">
            <LogsPanel logs={visibleLogs} />
          </div>
        </div>
      </aside>

    </div>
  );
};

export default DeskLayout;
