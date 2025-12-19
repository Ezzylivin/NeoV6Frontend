import React, { useEffect, useRef, useState } from "react";
import LiveTradingChart from "./LiveTradingChart"; 

// --- HELPERS ---
const safeParseDate = (dateStr) => {
  if (!dateStr) return null;
  let cleanStr = dateStr.replace(',', '.').replace(' ', 'T');
  if (!cleanStr.includes('Z') && !cleanStr.includes('+')) cleanStr += 'Z';
  const date = new Date(cleanStr);
  return isNaN(date.getTime()) ? new Date() : date;
};

const cleanLogMessage = (msg) => {
  if (!msg) return "";
  return msg.replace(/^([A-Z]+\s\|\s)+/, ""); 
};

// --- 1. METRICS DISPLAY (Now with Active Position) ---
export const MetricsDisplay = ({ data, variant = "default" }) => {
  // Destructure data safely
  const { currentBalance, performanceMetrics, positions, candles } = data || {};
  const { totalProfit, winRate, totalTrades, sharpeRatio } = performanceMetrics || {};
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => { if (data) setLastUpdate(new Date()); }, [data]);

  // 🛠 Active Position Calculation
  const activePos = positions && positions.length > 0 ? positions[0] : null;
  const currentPrice = candles && candles.length > 0 ? candles[candles.length - 1].close : 0;
  
  let uPnl = 0;
  let uPnlPct = 0;
  
  if (activePos && currentPrice) {
      if (activePos.side === 'long') {
          uPnl = (currentPrice - activePos.entry) * activePos.qty;
          uPnlPct = ((currentPrice - activePos.entry) / activePos.entry) * 100;
      } else {
          uPnl = (activePos.entry - currentPrice) * activePos.qty;
          uPnlPct = ((activePos.entry - currentPrice) / activePos.entry) * 100;
      }
  }

  const isPositive = totalProfit >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 w-full">
      
      {/* 1. ACTIVE POSITION CARD (Highlighted) */}
      {activePos ? (
        <div className={`flex flex-col border p-3 rounded shadow-sm relative overflow-hidden ${uPnl >= 0 ? 'bg-emerald-900/30 border-emerald-500/50' : 'bg-red-900/30 border-red-500/50'}`}>
            <div className={`absolute top-0 right-0 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${activePos.side === 'long' ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'}`}>
                {activePos.side}
            </div>
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Open Trade</span>
            <div className="flex items-baseline gap-2">
                <span className="text-xs text-neutral-300">Entry:</span>
                <span className="text-sm font-mono text-white font-bold">{activePos.entry.toFixed(0)}</span>
            </div>
            <span className={`text-sm font-mono font-bold mt-auto ${uPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {uPnl >= 0 ? '+' : ''}{uPnl.toFixed(2)} ({uPnlPct.toFixed(2)}%)
            </span>
        </div>
      ) : (
        <div className="flex flex-col bg-[#111] border border-white/10 p-3 rounded shadow-sm opacity-60">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Market Status</span>
            <span className="text-sm font-mono text-neutral-400 mt-1">SCANNING</span>
            <span className="text-[9px] text-neutral-600 mt-auto">No open trades</span>
        </div>
      )}

      {/* 2. Balance */}
      <div className="flex flex-col bg-[#111] border border-white/10 p-3 rounded shadow-sm">
        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Balance</span>
        <span className="text-lg font-bold text-yellow-400 font-mono">${currentBalance?.toFixed(2) || "0.00"}</span>
        <span className="text-[9px] text-neutral-600 mt-auto">{lastUpdate.toLocaleTimeString()}</span>
      </div>

      {/* 3. Total Profit */}
      <div className="flex flex-col bg-[#111] border border-white/10 p-3 rounded shadow-sm">
        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Total PnL</span>
        <span className={`text-lg font-bold font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
          {isPositive ? "+" : ""}{totalProfit?.toFixed(2) || "0.00"}
        </span>
      </div>

      {/* 4. Win Rate */}
      <div className="flex flex-col bg-[#111] border border-white/10 p-3 rounded shadow-sm">
        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Win Rate</span>
        <span className="text-lg font-bold text-white font-mono">{winRate ? winRate.toFixed(0) : 0}%</span>
      </div>

      {/* 5. Sharpe */}
      <div className="flex flex-col bg-[#111] border border-white/10 p-3 rounded shadow-sm">
        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Sharpe</span>
        <span className="text-lg font-bold text-white font-mono">{sharpeRatio?.toFixed(2) || "0.00"}</span>
      </div>

      {/* 6. Trades */}
      <div className="flex flex-col bg-[#111] border border-white/10 p-3 rounded shadow-sm">
        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Trades</span>
        <span className="text-lg font-bold text-white font-mono">{totalTrades || 0}</span>
      </div>
    </div>
  );
};

// --- 2. LOGS PANEL (System Events) ---
export const LogsPanel = ({ logs = [] }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const sortedLogs = [...logs]
    .filter(l => l.message)
    .sort((a, b) => safeParseDate(a.timestamp) - safeParseDate(b.timestamp));

  const formatTime = (isoString) => {
    const date = safeParseDate(isoString);
    if (!date) return "--:--:--";
    return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
  };

  return (
    <div className="flex flex-col gap-1 p-2 h-full font-mono text-[10px] leading-tight">
      {sortedLogs.length === 0 ? (
        <div className="text-neutral-600 italic mt-2">System initialized. Waiting for events...</div>
      ) : (
        sortedLogs.map((log, i) => (
          <div key={i} className={`flex gap-2 ${log.type === 'error' ? 'text-red-500' : 'text-neutral-400'}`}>
            <span className="opacity-50 min-w-[50px]">{formatTime(log.timestamp)}</span>
            <span className="break-all">{cleanLogMessage(log.message)}</span>
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
};

// --- 3. DECISION STREAM (Terminal Style) ---
export const DecisionStream = ({ logs = [], limit = 20 }) => {
  const streamLogs = logs
    .filter(l => l.message && (
      l.message.includes("DECISION") || 
      l.message.includes("VERDICT") || 
      l.message.includes("SNAPSHOT") ||
      l.message.includes("Bot Active") || 
      l.message.includes("EXECUTED") ||
      l.message.includes("ML Status") 
    ))
    .sort((a, b) => safeParseDate(b.timestamp) - safeParseDate(a.timestamp))
    .slice(0, limit);

  const formatFullTime = (isoString) => {
    const date = safeParseDate(isoString);
    if (!date) return "";
    return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] rounded border border-white/5 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] opacity-20 z-10"></div>

      {streamLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
          <span className="text-xs font-mono tracking-widest uppercase">Scanning Market...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-0 overflow-y-auto custom-scrollbar p-2 z-20">
          {streamLogs.map((log, i) => {
            const msg = cleanLogMessage(log.message);
            
            let rowClass = "border-l-2 border-neutral-800 bg-transparent text-neutral-400";
            let icon = "›";
            
            if (msg.includes("BUY")) { 
              rowClass = "border-l-2 border-emerald-500 bg-emerald-900/10 text-emerald-200"; 
              icon = "▲";
            }
            if (msg.includes("SELL")) { 
              rowClass = "border-l-2 border-red-500 bg-red-900/10 text-red-200"; 
              icon = "▼";
            }
            if (msg.includes("WAIT")) { 
              rowClass = "border-l-2 border-yellow-500/50 bg-yellow-900/5 text-yellow-200/80"; 
              icon = "⏸";
            }
            if (msg.includes("EXECUTED")) { 
              rowClass = "border-l-2 border-purple-500 bg-purple-900/20 text-white font-bold"; 
              icon = "⚡";
            }
            if (msg.includes("Active") || msg.includes("ML Status")) {
               rowClass = "border-l-2 border-blue-500/50 bg-blue-900/10 text-blue-200";
               icon = "ℹ";
            }

            return (
              <div key={i} className={`flex items-start gap-3 p-2 mb-1 text-xs font-mono transition-all hover:bg-white/5 ${rowClass}`}>
                <span className="opacity-40 min-w-[55px] pt-0.5">{formatFullTime(log.timestamp)}</span>
                <span className="text-[10px] pt-0.5 opacity-70">{icon}</span>
                <span className="break-words leading-relaxed flex-1">{msg}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- 4. CHART PANEL ---
export const ChartPanel = ({ chartData, formConfig, height }) => {
  const candles = chartData?.candleData || [];
  const trades = chartData?.tradeBreakdown || [];
  
  return (
    <div className="w-full relative bg-black" style={{ height: height || '100%' }}>
      <LiveTradingChart 
        candles={candles}
        trades={trades}
        activePositions={[]} 
      />
    </div>
  );
};
