import React from "react";
import { DecisionStream, MetricsDisplay, ChartPanel, ControlPanel } from "./SharedComponents";

const AILayout = (props) => (
  <div className="layout-grid ai-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', padding: '20px' }}>
    <div className="col-left">
      <ControlPanel {...props} />
      <div style={{ marginTop: '20px' }}>
        <h3>🧠 Neural State</h3>
        <MetricsDisplay data={props.botStatus} />
      </div>
    </div>
    <div className="col-center">
      <div className="holo-chart" style={{ borderRadius: '50%', overflow: 'hidden', height: '400px', width: '400px', margin: '0 auto', border: '2px solid var(--accent)' }}>
         <ChartPanel {...props} height={400} hideControls />
      </div>
    </div>
    <div className="col-right">
       <h3>🗣️ AI Thought Stream</h3>
       <DecisionStream logs={props.logs} />
    </div>
  </div>
);

export default AILayout;
