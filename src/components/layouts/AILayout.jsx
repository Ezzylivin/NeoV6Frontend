import React from "react";
import { MetricsDisplay, ChartPanel, DecisionStream } from "./SharedComponents";

const AILayout = (props) => {
  const { formConfig, botStatus, logs, isRunning } = props;

  return (
    <div className="ai-layout">
      
      {/* --- LEFT CORTEX: SYSTEM STATE --- */}
      <aside className="ai-panel left-cortex">
        <div className="panel-glass">
          <h3 className="ai-header">/// ACTIVE_CONFIGURATION ///</h3>
          
          <div className="node-list">
            <div className="ai-node">
              <span className="node-label">TARGET_ASSET</span>
              <span className="node-val">{formConfig.symbol}</span>
            </div>
            <div className="ai-node">
              <span className="node-label">TEMPORAL_RESOLUTION</span>
              <span className="node-val">{formConfig.timeframe}</span>
            </div>
            <div className="divider-glow"></div>
            <div className="ai-node">
              <span className="node-label">ALLOCATED_CAPITAL</span>
              <span className="node-val">${formConfig.capitalAllocation}</span>
            </div>
            <div className="ai-node">
              <span className="node-label">RISK_PROTOCOL</span>
              <span className="node-val highlight">{formConfig.riskManagementMode.toUpperCase()}</span>
            </div>
            <div className="ai-node">
              <span className="node-label">EXPOSURE_LIMIT</span>
              <span className="node-val highlight">{formConfig.riskPercentage}%</span>
            </div>
          </div>

          <div className="system-health">
             <div className="health-label">SYSTEM_INTEGRITY</div>
             <div className={`health-bar ${isRunning ? 'active' : ''}`}>
               <div className="bar-fill"></div>
             </div>
             <div className="health-status">
               {isRunning ? "ONLINE" : "STANDBY"}
             </div>
          </div>
        </div>
      </aside>

      {/* --- CENTER CORTEX: VISUALIZATION --- */}
      <main className="ai-center">
        <div className="holo-frame">
          <div className="holo-header">
            <span>VISUAL_CORTEX // MONITORING</span>
            <span className={`pulse-dot ${isRunning ? 'active' : ''}`}></span>
          </div>
          <div className="chart-container">
            <ChartPanel 
              chartData={props.chartData} 
              formConfig={formConfig} 
              height="100%" 
            />
          </div>
          <div className="holo-footer">
            <MetricsDisplay data={botStatus} variant="ai" />
          </div>
        </div>
      </main>

      {/* --- RIGHT CORTEX: THOUGHT STREAM --- */}
      <aside className="ai-panel right-cortex">
        <div className="panel-glass full-height">
          <h3 className="ai-header">/// NEURAL_STREAM ///</h3>
          <div className="thought-stream">
            <DecisionStream logs={logs} limit={20} />
          </div>
        </div>
      </aside>

      <style>{`
        .ai-layout { display: grid; grid-template-columns: 320px 1fr 320px; height: 100vh; background: var(--bg-app); color: var(--text-primary); padding: 20px; gap: 20px; overflow: hidden; }
        .ai-panel { display: flex; flex-direction: column; }
        .panel-glass { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 20px; padding: 20px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); height: 100%; display: flex; flex-direction: column; }
        .full-height { height: 100%; overflow: hidden; }
        .ai-header { font-family: 'Courier New', monospace; font-size: 0.8rem; color: var(--accent); margin-bottom: 20px; letter-spacing: 2px; text-shadow: 0 0 10px var(--accent); }
        
        .node-list { display: flex; flex-direction: column; gap: 15px; flex: 1; }
        .ai-node { display: flex; justify-content: space-between; align-items: center; }
        .node-label { font-size: 0.6rem; color: var(--text-secondary); letter-spacing: 1px; }
        .node-val { font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; }
        .node-val.highlight { color: var(--accent); text-shadow: 0 0 8px var(--accent); }
        
        .divider-glow { height: 1px; background: linear-gradient(90deg, transparent, var(--accent), transparent); margin: 10px 0; }

        .system-health { margin-top: auto; border: 1px solid var(--border); padding: 15px; border-radius: 12px; background: rgba(0,0,0,0.2); }
        .health-label { font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 8px; }
        .health-bar { height: 4px; background: #333; border-radius: 2px; overflow: hidden; margin-bottom: 8px; }
        .bar-fill { height: 100%; width: 100%; background: var(--accent); transform: translateX(-100%); transition: transform 0.5s; }
        .health-bar.active .bar-fill { transform: translateX(0); box-shadow: 0 0 10px var(--accent); }
        .health-status { font-weight: 900; letter-spacing: 2px; text-align: center; }

        .ai-center { display: flex; flex-direction: column; height: 100%; }
        .holo-frame { flex: 1; border: 1px solid var(--accent); border-radius: 20px; background: rgba(0,0,0,0.4); position: relative; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 0 30px rgba(139, 92, 246, 0.1); }
        .holo-header { padding: 10px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--text-secondary); letter-spacing: 2px; }
        .pulse-dot { width: 8px; height: 8px; background: #333; border-radius: 50%; }
        .pulse-dot.active { background: var(--accent); box-shadow: 0 0 10px var(--accent); animation: pulse 1s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
        .chart-container { flex: 1; position: relative; }
        .holo-footer { padding: 15px; border-top: 1px solid var(--border); background: rgba(0,0,0,0.2); }
        
        .thought-stream { flex: 1; overflow-y: auto; padding-right: 5px; }
      `}</style>
    </div>
  );
};

export default AILayout;
