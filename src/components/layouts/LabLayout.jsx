import React from "react";
import { MetricsDisplay, ChartPanel } from "./SharedComponents";

const LabLayout = (props) => {
  const { formConfig, botStatus, isRunning } = props;

  return (
    <div className="lab-layout">
      {/* ---------------- TOP: READ-ONLY DECK ---------------- */}
      <header className="lab-deck">
        <div className="deck-grid">
          
          {/* STATUS MODULE */}
          <div className="deck-module">
            <div className="module-label">STATUS</div>
            <div className="module-content">
              <div className={`status-pill ${isRunning ? 'running' : 'idle'}`}>
                {isRunning ? '● LIVE' : '○ IDLE'}
              </div>
              <div className="readout">
                {formConfig.tradingMode === 'paper' ? 'SIMULATION' : 'REAL MONEY'}
              </div>
            </div>
          </div>

          {/* ASSET MODULE */}
          <div className="deck-module">
            <div className="module-label">ASSET</div>
            <div className="module-content">
              <div className="data-value">{formConfig.symbol}</div>
              <div className="data-sub">{formConfig.timeframe}</div>
            </div>
          </div>

          {/* RISK MODULE */}
          <div className="deck-module">
            <div className="module-label">RISK PROFILE</div>
            <div className="module-content grid-2">
              <div className="data-kv">
                <span className="k">MODE</span>
                <span className="v">{formConfig.riskManagementMode.toUpperCase()}</span>
              </div>
              <div className="data-kv">
                <span className="k">SIZE</span>
                <span className="v">{formConfig.riskPercentage}%</span>
              </div>
            </div>
          </div>

          {/* TELEMETRY MODULE (Live Metrics) */}
          <div className="deck-module metrics-module">
            <div className="module-label">LIVE TELEMETRY</div>
            <div className="module-content">
               <MetricsDisplay data={botStatus} variant="lab" />
            </div>
          </div>

        </div>
      </header>

      {/* ---------------- BOTTOM: CHART VIEWPORT ---------------- */}
      <main className="lab-viewport">
        <div className="chart-frame">
          <ChartPanel 
            chartData={props.chartData} 
            formConfig={formConfig} 
            height="100%" 
          />
        </div>
      </main>

      <style>{`
        .lab-layout { display: grid; grid-template-rows: auto 1fr; height: 100vh; background: var(--bg-app); color: var(--text-primary); overflow: hidden; }
        .lab-deck { background: var(--bg-panel); border-bottom: 1px solid var(--border); padding: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); z-index: 10; }
        .deck-grid { display: grid; grid-template-columns: 150px 150px 200px 1fr; gap: 15px; align-items: stretch; }
        
        .deck-module { background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px; display: flex; flex-direction: column; gap: 8px; }
        .module-label { font-size: 0.65rem; font-weight: 700; color: var(--text-secondary); letter-spacing: 1px; text-transform: uppercase; }
        .module-content { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
        
        /* Readouts */
        .status-pill { font-size: 0.8rem; font-weight: bold; padding: 4px 8px; border-radius: 4px; text-align: center; width: fit-content; }
        .status-pill.running { background: var(--accent); color: white; box-shadow: 0 0 10px var(--accent); }
        .status-pill.idle { background: #334155; color: #94a3b8; }
        .readout { font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px; }
        
        .data-value { font-size: 1.2rem; font-weight: 900; font-family: 'JetBrains Mono', monospace; }
        .data-sub { font-size: 0.75rem; color: var(--accent); }
        
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .data-kv { display: flex; flex-direction: column; }
        .data-kv .k { font-size: 0.6rem; color: var(--text-secondary); }
        .data-kv .v { font-size: 0.9rem; font-weight: bold; }

        .lab-viewport { padding: 20px; background-image: radial-gradient(var(--border) 1px, transparent 1px); background-size: 20px 20px; }
        .chart-frame { height: 100%; border: 1px solid var(--border); background: var(--bg-panel); border-radius: var(--radius); overflow: hidden; }

        @media (max-width: 1024px) {
          .deck-grid { grid-template-columns: 1fr 1fr; }
          .metrics-module { grid-column: span 2; }
        }
      `}</style>
    </div>
  );
};

export default LabLayout;
