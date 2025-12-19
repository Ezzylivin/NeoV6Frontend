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

// --- 1. METRICS DISPLAY ---
export const MetricsDisplay = ({ data, variant = "default" }) => {
  const { currentBalance, performanceMetrics } = data || {};
  const { totalProfit, winRate, totalTrades, sharpeRatio } = performanceMetrics || {};
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => { if (data) setLastUpdate(new Date()); }, [data]);
  const isPositive = totalProfit >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full">
      <div className="flex flex-col bg-white/5 border border-white/10 p-3 rounded-lg">
        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Current Balance</span>
        <span className="text-xl font-bold text-yellow-400 font-mono">${currentBalance?.toFixed(2) || "0.00"}</span>
        <span className="text-[9px] text-neutral-500 mt-1">Updated: {lastUpdate.toLocaleTimeString()}</span>
      </div>
      <div className="flex flex-col bg-white/5 border border-white/10 p-3 rounded-lg">
        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Total Profit</span>
        <span className={`text-xl font-bold font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
          {isPositive ? "+" : ""}{totalProfit?.toFixed(2) || "0.00"}
        </span>
      </div>
      <div className="flex flex-col bg-white/5 border border-white/10 p-3 rounded-lg">
        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Win Rate</span>
        <span className="text-xl font-bold text-white font-mono">{winRate || 0}%</span>
      </div>
      <div className="flex flex-col bg-white/5 border border-white/10 p-3 rounded-lg">
        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Sharpe Ratio</span>
        <span className="text-xl font-bold text-white font-mono">{sharpeRatio?.toFixed(2) || "0.00"}</span>
      </div>
      <div className="flex flex-col bg-white/5 border border-white/10 p-3 rounded-lg">
        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Trades</span>
        <span className="text-xl font-bold text-white font-mono">{totalTrades || 0}</span>
      </div>
    </div>
  );
};

// --- 2. LOGS PANEL ---
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
    <div className="flex flex-col gap-2 p-2 h-full">
      {sortedLogs.length === 0 ? (
        <div className="text-center text-neutral-500 italic mt-4 text-xs">System initialized. Waiting for data...</div>
      ) : (
        sortedLogs.map((log, i) => (
          <div key={i} className={`flex gap-3 text-xs font-mono border-b border-white/5 pb-1 ${log.type === 'error' ? 'text-red-400' : (log.type === 'decision' ? 'text-blue-300' : 'text-neutral-300')}`}>
            <span className="text-neutral-500 min-w-[60px]">{formatTime(log.timestamp)}</span>
            <span className="text-neutral-600">›</span>
            <span className="break-words flex-1">{cleanLogMessage(log.message)}</span>
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
};

// --- 3. DECISION STREAM ---
export const DecisionStream = ({ logs = [], limit = 15 }) => {
  const streamLogs = logs
    .filter(l => l.message && (l.message.includes("DECISION") || l.message.includes("ANALYSIS") || l.message.includes("VERDICT")))
    .sort((a, b) => safeParseDate(b.timestamp) - safeParseDate(a.timestamp))
    .slice(0, limit);

  const formatFullTime = (isoString) => {
    const date = safeParseDate(isoString);
    if (!date) return "";
    return date.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      {streamLogs.length === 0 ? (
        <div className="text-center text-neutral-500 text-xs mt-4">Waiting for market analysis...</div>
      ) : (
        streamLogs.map((log, i) => {
          let borderColor = "border-neutral-700";
          let bgColor = "bg-white/5";
          if (log.message.includes("BUY")) { borderColor = "border-emerald-500"; bgColor = "bg-emerald-900/10"; }
          if (log.message.includes("SELL")) { borderColor = "border-red-500"; bgColor = "bg-red-900/10"; }

          return (
            <div key={i} className={`flex flex-col p-2 rounded-r border-l-2 ${borderColor} ${bgColor} text-xs`}>
              <div className="flex justify-between mb-1 opacity-70">
                <span className="font-mono">{formatFullTime(log.timestamp)}</span>
                <span className="uppercase tracking-widest text-[10px]">DECISION</span>
              </div>
              <div className="font-medium text-neutral-200 whitespace-pre-wrap leading-relaxed">
                {cleanLogMessage(log.message)}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

// --- 4. CHART PANEL (The Wrapper for LabLayout) ---
export const ChartPanel = ({ chartData, formConfig, height, showTradeMarkers, activeIndicators }) => {
  // Safe destructuring
  const candles = chartData?.candleData || [];
  const trades = chartData?.tradeBreakdown || [];
  
  return (
    <div className="w-full relative bg-black" style={{ height: height || '100%' }}>
      <LiveTradingChart 
        candles={candles}
        trades={trades}
        activePositions={[]} // Lab mode usually implies backtest data, no live positions overlay yet
      />
    </div>
  );
};
