import React from "react";
import { MetricsDisplay, ChartPanel, DecisionStream } from "./SharedComponents";

// High Contrast, Big Numbers, Alert Focus
const CommandLayout = (props) => (
  <div className="layout-grid command-grid">
    {/* Giant Status Banner */}
    <div className={`status-banner ${props.isRunning ? 'online' : 'offline'}`}>
        {props.isRunning ? "SYSTEM OPERATIONAL" : "SYSTEM HALTED"}
    </div>
    
    {/* Big Metrics Row */}
    <div className="command-metrics">
       <MetricsDisplay data={props.botStatus} variant="huge" />
    </div>

    {/* Chart & Alerts */}
    <div className="command-main">
       <ChartPanel {...props} height={500} hideControls />
       <div className="alert-stream">
          <h3>🚨 LIVE ALERTS</h3>
          <DecisionStream logs={props.logs} limit={10} />
       </div>
    </div>
  </div>
);
export default CommandLayout;
