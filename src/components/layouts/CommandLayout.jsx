import React from "react";

const CommandLayout = (props) => {
  const { botStatus, isRunning } = props;
  const metrics = botStatus?.performanceMetrics || {};

  const formatCurrency = (val) => val ? `$${val.toFixed(2)}` : "$0.00";
  const formatPct = (val) => val ? `${val.toFixed(2)}%` : "0.00%";

  return (
    <div className="command-layout">
      {/* HEADER: SYSTEM HEALTH */}
      <header className={`cmd-banner ${isRunning ? 'online' : 'offline'}`}>
        <h1>{isRunning ? "SYSTEM OPERATIONAL" : "SYSTEM OFFLINE"}</h1>
        <div className="ping">LATENCY: 12ms</div>
      </header>

      {/* MAIN GRID: GIANT NUMBERS */}
      <main className="stat-grid">
        
        <div className="stat-card primary">
          <span className="stat-label">NET PROFIT / LOSS</span>
          <span className={`stat-val huge ${metrics.totalProfit >= 0 ? 'green' : 'red'}`}>
            {formatCurrency(metrics.totalProfit)}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">TOTAL TRADES</span>
          <span className="stat-val">{metrics.totalTrades || 0}</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">WIN RATE</span>
          <span className="stat-val">{formatPct(metrics.winRate)}</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">MAX DRAWDOWN</span>
          <span className="stat-val red">{formatPct(metrics.maxDrawdown)}</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">PROFIT FACTOR</span>
          <span className="stat-val">{metrics.profitFactor?.toFixed(2) || "0.00"}</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">CURRENT BALANCE</span>
          <span className="stat-val">{formatCurrency(metrics.currentBalance)}</span>
        </div>

      </main>

      <style>{`
        .command-layout { height: 100vh; display: flex; flex-direction: column; background: #000; font-family: 'Courier New', monospace; }
        
        .cmd-banner { padding: 20px; border-bottom: 4px solid; display: flex; justify-content: space-between; align-items: center; }
        .cmd-banner.online { background: rgba(0,255,0,0.1); color: #00ff41; border-color: #00ff41; }
        .cmd-banner.offline { background: rgba(255,0,0,0.1); color: #ff0055; border-color: #ff0055; }
        .cmd-banner h1 { margin: 0; letter-spacing: 4px; font-size: 1.5rem; }
        
        .stat-grid { flex: 1; padding: 40px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-content: center; }
        
        .stat-card { background: #0a0a0a; border: 1px solid #333; padding: 30px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
        .stat-card.primary { grid-column: span 3; background: #111; border-color: #555; }
        
        .stat-label { font-size: 0.8rem; color: #666; letter-spacing: 2px; margin-bottom: 10px; text-transform: uppercase; }
        .stat-val { font-size: 3rem; font-weight: 900; color: #fff; }
        .stat-val.huge { font-size: 5rem; }
        
        .stat-val.green { color: #00ff41; text-shadow: 0 0 20px rgba(0,255,65,0.3); }
        .stat-val.red { color: #ff0055; text-shadow: 0 0 20px rgba(255,0,85,0.3); }
      `}</style>
    </div>
  );
};

export default CommandLayout;
