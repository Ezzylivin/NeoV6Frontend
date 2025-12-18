// File: src/components/SharedComponents.jsx
// 🚀 UPGRADE: v2.0 - Enhanced Time & Transparency
// 🛠 Features: Real-time Timestamps, Date Formatting, "Last Updated" Indicator

import React, { useEffect, useRef, useState } from "react";

// --- 1. METRICS DISPLAY (Top Strip) ---
export const MetricsDisplay = ({ data, variant = "default" }) => {
  const { currentBalance, performanceMetrics } = data || {};
  const { totalProfit, winRate, totalTrades, maxDrawdown, sharpeRatio } = performanceMetrics || {};

  // Track the last time data was received
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (data) setLastUpdate(new Date());
  }, [data]);

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
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 15px;
          width: 100%;
        }
        .metric-card {
          display: flex;
          flex-direction: column;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          padding: 10px;
          border-radius: 6px;
          position: relative;
        }
        .label {
          font-size: 0.7rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .sub-label {
          font-size: 0.6rem;
          color: var(--text-secondary);
          margin-top: 4px;
          opacity: 0.7;
        }
        .value {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
          font-family: 'Roboto Mono', monospace;
        }
        .value.highlight { color: #fbbf24; } /* Amber-400 */
        .text-green-400 { color: #4ade80; }
        .text-red-400 { color: #f87171; }
      `}</style>
    </div>
  );
};

// --- 2. LOGS PANEL (Scrolling Text) ---
export const LogsPanel = ({ logs = [] }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Helper to format full date-time
  const formatTime = (isoString) => {
    if (!isoString) return "--:--:--";
    const date = new Date(isoString);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString([], { hour12: false })}`;
  };

  return (
    <div className="logs-wrapper">
      {logs.length === 0 ? (
        <div className="empty-logs">System initialized. Waiting for data...</div>
      ) : (
        logs.map((log, i) => (
          <div key={i} className={`log-line ${log.type}`}>
            <span className="timestamp">[{formatTime(log.timestamp)}]</span>
            <span className="message">{log.message}</span>
          </div>
        ))
      )}
      <div ref={bottomRef} />

      <style>{`
        .logs-wrapper {
          padding: 10px;
          font-family: 'Roboto Mono', monospace;
          font-size: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .empty-logs {
          color: var(--text-secondary);
          font-style: italic;
          text-align: center;
          padding-top: 20px;
        }
        .log-line {
          display: flex;
          gap: 8px;
          line-height: 1.4;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          padding-bottom: 2px;
        }
        .timestamp {
          color: var(--text-secondary);
          min-width: 95px;
          opacity: 0.8;
        }
        .log-line.error { color: #ef4444; }
        .log-line.status { color: #f59e0b; }
        .log-line.buy { color: #22c55e; font-weight: bold; }
        .log-line.sell { color: #ef4444; font-weight: bold; }
        .log-line.info { color: var(--text-primary); }
      `}</style>
    </div>
  );
};

// --- 3. DECISION STREAM (Visual Feed) ---
export const DecisionStream = ({ logs = [], limit = 10 }) => {
  const streamLogs = logs
    .filter(l => l.message && (l.message.includes("DECISION") || l.message.includes("ANALYSIS") || l.message.includes("VERDICT")))
    .slice(-limit);

  const formatFullTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleString('en-US', { 
      month: 'numeric', day: 'numeric', 
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
    });
  };

  return (
    <div className="decision-wrapper">
      {streamLogs.length === 0 ? (
        <div className="empty-stream">Waiting for market analysis...</div>
      ) : (
        streamLogs.map((log, i) => {
          const cleanMsg = log.message.replace("DECISION | ", "").replace("STATUS | ", "");
          
          return (
            <div key={i} className="stream-item">
              <div className="stream-header">
                <span className="stream-time">{formatFullTime(log.timestamp)}</span>
                <span className="stream-type">LOG</span>
              </div>
              <div className="stream-content">{cleanMsg}</div>
            </div>
          );
        })
      )}

      <style>{`
        .decision-wrapper {
          padding: 0 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .empty-stream {
          padding: 20px;
          text-align: center;
          color: var(--text-secondary);
          font-size: 0.85rem;
        }
        .stream-item {
          background: rgba(255,255,255,0.03);
          border-left: 3px solid var(--accent);
          padding: 8px 10px;
          border-radius: 0 4px 4px 0;
          font-size: 0.8rem;
        }
        .stream-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding-bottom: 2px;
        }
        .stream-time {
          font-size: 0.7rem;
          color: var(--text-secondary);
          font-family: monospace;
          font-weight: bold;
        }
        .stream-type {
          font-size: 0.6rem;
          color: var(--accent);
          text-transform: uppercase;
          opacity: 0.7;
        }
        .stream-content {
          color: var(--text-primary);
          white-space: pre-wrap;
          line-height: 1.3;
        }
      `}</style>
    </div>
  );
};
