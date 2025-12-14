import React from "react";
import { MetricsDisplay, ChartPanel, LogsPanel, ControlPanel } from "./SharedComponents";

const JournalLayout = (props) => (
  <div className="layout-grid journal-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', padding: '20px' }}>
    <div className="col-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <ControlPanel {...props} />
      <MetricsDisplay data={props.botStatus} />
    </div>
    <div className="col-main" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="journal-entry">
        <h3>📜 Trading Log</h3>
        <LogsPanel {...props} height={600} />
      </div>
      <div className="chart-section">
         <ChartPanel {...props} height={300} />
      </div>
    </div>
  </div>
);

export default JournalLayout;
