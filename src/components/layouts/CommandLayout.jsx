import React from "react";
import { MetricsDisplay, ChartPanel, DecisionStream } from "./SharedComponents";

const CommandLayout = (props) => {
  const { formConfig, botStatus, logs, isRunning } = props;

  return (
    <div className="command-layout">
      
      {/* ZONE 1: SITUATION BOARD */}
      <header className={`status-banner ${isRunning ? 'online' : 'offline'}`}>
        <div className="status-text">
          {isRunning ? "/// SYSTEM OPERATIONAL ///" : "/// SYSTEM HALTED ///"}
        </div>
        <div className="status-meta">
          <span>MODE: {formConfig.tradingMode.toUpperCase()}</span>
          <span>RISK: {formConfig.riskPercentage}%</span>
        </div>
      </header>

      {/* ZONE 2: KPI ROW */}
      <section className="kpi-row">
        <MetricsDisplay data={botStatus} variant="command" />
      </section>

      {/* ZONE 3: BATTLEFIELD */}
      <main className="command-grid">
        
        {/* LEFT: VISUAL SURVEILLANCE */}
        <div className="grid-chart">
          <div className="panel-label">MARKET_VISUALIZER_V6 // {formConfig.symbol}</div>
          <div className="chart-frame">
            <ChartPanel 
              chartData={props.chartData} 
              formConfig={formConfig} 
              height="100%" 
            />
          </div>
        </div>

        {/* RIGHT: TACTICAL READOUT */}
        <aside className="grid-sidebar">
          
          {/* A. MISSION PARAMETERS (Read Only) */}
          <div className="control-panel">
            <div className="panel-label">MISSION_PARAMETERS</div>
            <div className="param-grid">
               <div className="param-item">
                 <label>STRATEGY</label>
                 <span>{props.setups.find(s => s._id === props.selectedSetupId)?.name || 'MANUAL_OVERRIDE'}</span>
               </div>
               <div className="param-item">
                 <label>CAPITAL</label>
                 <span>${formConfig.capitalAllocation}</span>
               </div>
               <div className="param-item">
                 <label>RISK_MODE</label>
                 <span>{formConfig.riskManagementMode.toUpperCase()}</span>
               </div>
            </div>
          </div>

          {/* B. LIVE INTEL STREAM (Expanded) */}
          <div className="intel-panel">
            <div className="panel-label">LIVE_INTEL_FEED</div>
            <div className="stream-wrapper">
              <DecisionStream logs={logs} limit={20} />
            </div>
          </div>

        </aside>
      </main>

      <style>{`
        .command-layout { display: grid; grid-template-rows: auto auto 1fr; height: 100vh; background-color: #000; color: var(--text-primary); font-family: 'Courier New', monospace; overflow: hidden; }
        .status-banner { padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; font-weight: 900; letter-spacing: 2px; border-bottom: 2px solid; }
        .status-banner.online { background: rgba(0, 255, 65, 0.1); color: #00ff41; border-color: #00ff41; }
        .status-banner.offline { background: rgba(255, 0, 85, 0.1); color: #ff0055; border-color: #ff0055; }
        .status-meta { font-size: 0.7rem; opacity: 0.8; display: flex; gap: 15px; }
        .kpi-row { padding: 15px 20px; background: #050505; border-bottom: 1px solid #333; }
        
        .command-grid { display: grid; grid-template-columns: 1fr 350px; overflow: hidden; }
        .grid-chart { padding: 20px; display: flex; flex-direction: column; border-right: 1px solid #333; }
        .chart-frame { flex: 1; border: 2px solid #333; position: relative; }
        
        .grid-sidebar { display: grid; grid-template-rows: auto 1fr; background: #080808; }
        .panel-label { background: #111; color: #666; font-size: 0.7rem; padding: 5px 10px; border-bottom: 1px solid #333; font-weight: bold; }
        
        .control-panel { padding: 0; border-bottom: 1px solid #333; }
        .param-grid { padding: 15px; display: grid; gap: 10px; }
        .param-item { display: flex; justify-content: space-between; border-bottom: 1px dashed #333; padding-bottom: 5px; }
        .param-item label { color: #666; font-size: 0.7rem; }
        .param-item span { color: var(--text-primary); font-weight: bold; font-size: 0.8rem; }

        .intel-panel { display: flex; flex-direction: column; overflow: hidden; }
        .stream-wrapper { flex: 1; overflow-y: auto; padding: 10px; font-size: 0.8rem; }
      `}</style>
    </div>
  );
};

export default CommandLayout;
