import React from "react";
import { ChartPanel } from "./SharedComponents";

const JournalLayout = (props) => {
  const { 
    botStatus, 
    logs, 
    formConfig, 
    isRunning, 
    setups, 
    selectedSetupId 
  } = props;

  // Helper to find strategy name
  const strategyName = setups.find(s => s._id === selectedSetupId)?.name || "MANUAL_CONFIG";

  return (
    <div className="journal-layout">
      
      {/* ---------------- LEFT SIDEBAR: SESSION METADATA ---------------- */}
      <aside className="journal-sidebar">
        
        {/* HEADER */}
        <div className="journal-header">
          <h2>TRADING JOURNAL</h2>
          <span className="date-tag">{new Date().toLocaleDateString()}</span>
        </div>

        {/* STATUS CARD */}
        <div className={`status-card ${isRunning ? 'active' : 'inactive'}`}>
          <div className="status-icon">{isRunning ? '●' : '○'}</div>
          <div className="status-details">
            <span className="label">SESSION STATUS</span>
            <span className="val">{isRunning ? 'RECORDING ACTIVE' : 'SESSION CLOSED'}</span>
          </div>
        </div>

        {/* CONFIG SUMMARY (Read Only) */}
        <div className="meta-section">
          <h3>SESSION PARAMETERS</h3>
          <div className="meta-grid">
            <div className="meta-item">
              <label>ASSET</label>
              <span>{formConfig.symbol}</span>
            </div>
            <div className="meta-item">
              <label>INTERVAL</label>
              <span>{formConfig.timeframe}</span>
            </div>
            <div className="meta-item full">
              <label>STRATEGY</label>
              <span>{strategyName}</span>
            </div>
            <div className="meta-item">
              <label>MODE</label>
              <span>{formConfig.tradingMode.toUpperCase()}</span>
            </div>
            <div className="meta-item">
              <label>RISK</label>
              <span>{formConfig.riskPercentage}% ({formConfig.riskManagementMode})</span>
            </div>
          </div>
        </div>

        {/* SESSION METRICS */}
        <div className="meta-section">
          <h3>PERFORMANCE SNAPSHOT</h3>
          <div className="journal-metrics">
            <div className="j-metric">
              <span className="lbl">NET PNL</span>
              <span className={`val ${botStatus?.performanceMetrics?.totalProfit >= 0 ? 'pos' : 'neg'}`}>
                ${botStatus?.performanceMetrics?.totalProfit?.toFixed(2) || "0.00"}
              </span>
            </div>
            <div className="j-metric">
              <span className="lbl">WIN RATE</span>
              <span className="val">{botStatus?.performanceMetrics?.winRate?.toFixed(1) || "0.0"}%</span>
            </div>
            <div className="j-metric">
              <span className="lbl">TRADES</span>
              <span className="val">{botStatus?.performanceMetrics?.totalTrades || 0}</span>
            </div>
          </div>
        </div>

      </aside>

      {/* ---------------- RIGHT MAIN: LOG FEED ---------------- */}
      <main className="journal-content">
        
        {/* LOGBOOK AREA */}
        <div className="logbook-container">
          <div className="paper-header">
            <span>CHRONOLOGICAL EVENTS</span>
            <span>ID: {botStatus?.sessionId || "NO_SESSION"}</span>
          </div>
          
          <div className="paper-feed">
            {logs.length > 0 ? logs.map((log, i) => (
              <div key={i} className={`journal-entry ${log.type}`}>
                <div className="entry-time">
                  {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                </div>
                <div className="entry-body">
                  <span className="entry-marker"></span>
                  <p className="entry-msg">{log.message}</p>
                </div>
              </div>
            )) : (
              <div className="empty-page">
                Waiting for entries...
              </div>
            )}
          </div>
        </div>

        {/* REFERENCE CHART (Bottom Anchor) */}
        <div className="reference-chart">
          <div className="chart-label">VISUAL CONTEXT REFERENCE</div>
          <ChartPanel 
            chartData={props.chartData} 
            formConfig={formConfig} 
            height="300px" 
          />
        </div>

      </main>

      <style>{`
        .journal-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          height: 100vh;
          background: var(--bg-app);
          color: var(--text-primary);
          overflow: hidden;
        }

        /* --- SIDEBAR --- */
        .journal-sidebar {
          background: var(--bg-panel);
          border-right: 1px solid var(--border);
          padding: 30px;
          display: flex;
          flex-direction: column;
          gap: 30px;
          overflow-y: auto;
        }

        .journal-header h2 { margin: 0; font-family: 'Georgia', serif; font-size: 1.4rem; letter-spacing: 1px; }
        .date-tag { font-family: monospace; color: var(--text-secondary); font-size: 0.8rem; }

        .status-card {
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 15px;
          background: rgba(0,0,0,0.05);
        }
        .status-card.active { border-color: var(--accent); background: rgba(var(--accent-rgb), 0.05); }
        .status-icon { font-size: 1.5rem; color: var(--text-secondary); }
        .status-card.active .status-icon { color: var(--accent); animation: pulse 2s infinite; }
        .status-details { display: flex; flex-direction: column; }
        .status-details .label { font-size: 0.6rem; font-weight: bold; color: var(--text-secondary); }
        .status-details .val { font-size: 0.9rem; font-weight: bold; }

        .meta-section h3 { font-size: 0.7rem; text-transform: uppercase; color: var(--text-secondary); border-bottom: 2px solid var(--border); padding-bottom: 5px; margin-bottom: 15px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .meta-item { display: flex; flex-direction: column; }
        .meta-item.full { grid-column: span 2; }
        .meta-item label { font-size: 0.65rem; color: var(--text-secondary); margin-bottom: 2px; }
        .meta-item span { font-size: 0.9rem; font-weight: 500; font-family: monospace; }

        .journal-metrics { display: flex; flex-direction: column; gap: 10px; }
        .j-metric { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border); padding-bottom: 5px; }
        .j-metric .lbl { font-size: 0.8rem; color: var(--text-secondary); }
        .j-metric .val { font-size: 1.1rem; font-weight: bold; font-family: monospace; }
        .j-metric .pos { color: #10b981; }
        .j-metric .neg { color: #ef4444; }

        /* --- CONTENT --- */
        .journal-content {
          padding: 30px;
          display: grid;
          grid-template-rows: 1fr auto;
          gap: 20px;
          overflow: hidden;
          background: var(--bg-app); /* Slightly distinct if needed */
        }

        .logbook-container {
          background: var(--bg-panel);
          border: 1px solid var(--border);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .paper-header {
          background: rgba(0,0,0,0.05);
          border-bottom: 1px solid var(--border);
          padding: 10px 20px;
          display: flex;
          justify-content: space-between;
          font-family: monospace;
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        .paper-feed {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          font-family: 'Courier New', monospace;
        }

        .journal-entry {
          display: flex;
          gap: 20px;
          margin-bottom: 15px;
          line-height: 1.5;
        }
        .entry-time {
          min-width: 100px;
          color: var(--text-secondary);
          font-size: 0.8rem;
          text-align: right;
          padding-top: 2px;
        }
        .entry-body {
          flex: 1;
          display: flex;
          gap: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .entry-marker {
          width: 2px;
          background: var(--border);
          position: relative;
        }
        .journal-entry:hover .entry-marker { background: var(--accent); }
        .entry-msg { margin: 0; font-size: 0.9rem; white-space: pre-wrap; word-break: break-word; }

        .empty-page {
          height: 100%; display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary); font-style: italic;
        }

        /* --- CHART SECTION --- */
        .reference-chart {
          border: 1px solid var(--border);
          background: var(--bg-panel);
          border-radius: 4px;
          padding: 10px;
        }
        .chart-label {
          font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 10px; letter-spacing: 1px;
        }

        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

        @media (max-width: 1024px) {
          .journal-layout { grid-template-columns: 1fr; grid-template-rows: auto 1fr; overflow-y: auto; }
          .journal-sidebar { border-right: none; border-bottom: 1px solid var(--border); }
        }
      `}</style>
    </div>
  );
};

export default JournalLayout;
