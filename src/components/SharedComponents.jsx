// File: src/components/SharedComponents.jsx
// 🚀 UPGRADE: v2.7 - "Terminal Mode"
// 🛠 Fixes: Logs sorted Oldest -> Newest (Standard Terminal Order).
// 🛠 Fixes: Auto-scrolls to the bottom so you always see the latest message.

import React, { useEffect, useRef, useState } from "react";

// --- HELPER: DATE PARSER ---
const safeParseDate = (dateStr) => {
  if (!dateStr) return null;
  let cleanStr = dateStr.replace(',', '.').replace(' ', 'T');
  if (!cleanStr.includes('Z') && !cleanStr.includes('+')) cleanStr += 'Z';
  const date = new Date(cleanStr);
  return isNaN(date.getTime()) ? new Date() : date;
};

// --- HELPER: CLEANER ---
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
    <div className={`metrics-grid ${variant}`}>
      <div className="metric-card">
        <span className="label">Current Balance</span>
        <span className="value highlight">${currentBalance?.toFixed(2) || "0.00"}</span>
        <span className="sub-label">Updated: {lastUpdate.toLocaleTimeString()}</span>
      </div>
      <div className="metric-card">
        <span className="label">Total Profit</span>
        <span className={`value ${isPositive ? "text-green-400" : "text-red-400"}`}>
          {isPositive ? "+" : ""}{totalProfit?.toFixed(2) || "0.00"}
        </span>
      </div>
      <div className="metric-card">
        <span className="label">Win Rate</span>
        <span className="value">{winRate || 0}%</span>
      </div>
      <div className="metric-card">
        <span className="label">Sharpe Ratio</span>
        <span className="value">{sharpeRatio?.toFixed(2) || "0.00"}</span>
      </div>
      <div className="metric-card">
        <span className="label">Trades</span>
        <span className="value">{totalTrades || 0}</span>
      </div>
      <style>{`
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 15px; width: 100%; }
        .metric-card { display: flex; flex-direction: column; background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 10px; border-radius: 6px; }
        .label { font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .sub-label { font-size: 0.6rem; color: var(--text-secondary); margin-top: 4px; opacity: 0.7; }
        .value { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); font-family: 'Roboto Mono', monospace; }
        .value.highlight { color: #fbbf24; }
        .text-green-400 { color: #4ade80; }
        .text-red-400 { color: #f87171; }
      `}</style>
    </div>
  );
};

// --- 2. LOGS PANEL (Oldest Top -> Newest Bottom) ---
export const LogsPanel = ({ logs = [] }) => {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom whenever logs update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Sort Oldest First (Ascending)
  const sortedLogs = [...logs]
    .filter(l => l.message)
    .sort((a, b) => safeParseDate(a.timestamp) - safeParseDate(b.timestamp));

  const formatTime = (isoString) => {
    const date = safeParseDate(isoString);
    if (!date) return "--:--:--";
    return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
  };

  return (
    <div className="logs-wrapper">
      {sortedLogs.length === 0 ? (
        <div className="empty-logs">System initialized. Waiting for data...</div>
      ) : (
        sortedLogs.map((log, i) => (
          <div key={i} className={`log-line ${log.type}`}>
            <span className="timestamp">{formatTime(log.timestamp)}</span>
            <span className="separator">›</span>
            <span className="message">{cleanLogMessage(log.message)}</span>
          </div>
        ))
      )}
      <div ref={bottomRef} /> {/* Invisible element to scroll to */}

      <style>{`
        .logs-wrapper {
          padding: 10px;
          font-family: 'Roboto Mono', monospace;
          font-size: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
          max-height: 100%;
        }
        .empty-logs { color: var(--text-secondary); font-style: italic; text-align: center; padding-top: 20px; }
        .log-line { display: flex; gap: 8px; line-height: 1.4; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 4px; align-items: flex-start; }
        .timestamp { color: var(--text-secondary); min-width: 60px; opacity: 0.7; font-size: 0.7rem; }
        .separator { color: var(--accent); opacity: 0.5; }
        .message { word-break: break-word; color: #e5e7eb; }
        .log-line.error .message { color: #ef4444; }
        .log-line.buy .message { color: #22c55e; font-weight: bold; }
        .log-line.sell .message { color: #ef4444; font-weight: bold; }
      `}</style>
    </div>
  );
};

// --- 3. DECISION STREAM (Newest Top) ---
export const DecisionStream = ({ logs = [], limit = 15 }) => {
  // Decision stream usually stays Newest First for quick reading
  const streamLogs = logs
    .filter(l => l.message && (l.message.includes("DECISION") || l.message.includes("ANALYSIS") || l.message.includes("VERDICT")))
    .sort((a, b) => safeParseDate(b.timestamp) - safeParseDate(a.timestamp))
    .slice(0, limit);

  const formatFullTime = (isoString) => {
    const date = safeParseDate(isoString);
    if (!date) return "";
    return date.toLocaleString('en-US', { 
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
    });
  };

  return (
    <div className="decision-wrapper">
      {streamLogs.length === 0 ? (
        <div className="empty-stream">Waiting for market analysis...</div>
      ) : (
        streamLogs.map((log, i) => {
          let typeClass = "neutral";
          if (log.message.includes("BUY")) typeClass = "buy";
          if (log.message.includes("SELL")) typeClass = "sell";
          
          return (
            <div key={i} className={`stream-item ${typeClass}`}>
              <div className="stream-header">
                <span className="stream-time">{formatFullTime(log.timestamp)}</span>
                <span className="stream-badge">DECISION</span>
              </div>
              <div className="stream-content">{cleanLogMessage(log.message)}</div>
            </div>
          );
        })
      )}
      <style>{`
        .decision-wrapper { padding: 0 10px; display: flex; flex-direction: column; gap: 8px; }
        .empty-stream { padding: 20px; text-align: center; color: var(--text-secondary); font-size: 0.85rem; }
        .stream-item { background: rgba(255,255,255,0.03); border-left: 3px solid var(--text-secondary); padding: 10px; border-radius: 0 4px 4px 0; font-size: 0.8rem; }
        .stream-item.buy { border-left-color: #22c55e; background: rgba(34, 197, 94, 0.05); }
        .stream-item.sell { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.05); }
        .stream-header { display: flex; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px; }
        .stream-time { font-size: 0.7rem; color: var(--text-secondary); font-family: monospace; font-weight: bold; }
        .stream-badge { font-size: 0.6rem; color: var(--text-secondary); text-transform: uppercase; opacity: 0.7; letter-spacing: 1px; }
        .stream-content { color: var(--text-primary); white-space: pre-wrap; line-height: 1.3; font-weight: 500; }
      `}</style>
    </div>
  );
};
