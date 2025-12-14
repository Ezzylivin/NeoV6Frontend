import React from "react";
import { DecisionStream } from "./SharedComponents";

const AILayout = (props) => {
  const { formConfig, logs } = props;

  return (
    <div className="ai-layout">
      
      {/* LEFT: NEURAL CONFIG */}
      <aside className="ai-sidebar">
        <h3>NEURAL_CONFIG</h3>
        <div className="node-group">
          <div className="node">
            <label>MODEL_ARCH</label>
            <div className="val">{formConfig.mlModel || "STANDARD_HEURISTIC"}</div>
          </div>
          <div className="node">
            <label>DECISION_MODE</label>
            <div className="val">{formConfig.mlMode.toUpperCase()}</div>
          </div>
          <div className="node">
            <label>CONFIDENCE_THRESHOLD</label>
            <div className="val highlight">{formConfig.mlThreshold}</div>
          </div>
          <div className="node">
            <label>LOGIC_GATE</label>
            <div className="val">{formConfig.comboConfig?.combinationRule || "OR"}</div>
          </div>
        </div>
      </aside>

      {/* RIGHT: THOUGHT PROCESS */}
      <main className="ai-main">
        <div className="stream-container">
          <div className="stream-header">/// LIVE DECISION STREAM ///</div>
          <div className="stream-body">
            <DecisionStream logs={logs} limit={50} />
          </div>
        </div>
      </main>

      <style>{`
        .ai-layout { height: 100vh; display: grid; grid-template-columns: 300px 1fr; background: var(--bg-app); color: var(--text-primary); font-family: 'Courier New', monospace; }
        
        .ai-sidebar { background: rgba(0,0,0,0.2); border-right: 1px solid var(--border); padding: 30px; display: flex; flex-direction: column; gap: 20px; }
        .ai-sidebar h3 { color: var(--accent); letter-spacing: 2px; font-size: 1rem; margin: 0 0 20px 0; }
        
        .node { background: var(--bg-panel); border: 1px solid var(--border); padding: 15px; border-radius: 8px; margin-bottom: 15px; }
        .node label { display: block; font-size: 0.6rem; color: var(--text-secondary); margin-bottom: 5px; }
        .node .val { font-size: 1rem; font-weight: bold; }
        .node .val.highlight { color: var(--accent); text-shadow: 0 0 10px var(--accent); }
        
        .ai-main { padding: 30px; display: flex; flex-direction: column; }
        
        .stream-container { flex: 1; border: 1px solid var(--accent); border-radius: 12px; background: rgba(0,0,0,0.3); display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 0 30px rgba(var(--accent-rgb), 0.1); }
        
        .stream-header { background: rgba(255,255,255,0.05); padding: 15px; border-bottom: 1px solid var(--border); font-weight: bold; letter-spacing: 2px; color: var(--text-secondary); }
        
        .stream-body { flex: 1; overflow-y: auto; padding: 20px; }
      `}</style>
    </div>
  );
};

export default AILayout;
