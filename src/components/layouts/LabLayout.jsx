import React from "react";
import { ChartPanel, MetricsDisplay, ControlPanel } from "./SharedComponents";

const LabLayout = (props) => (
  <div className="layout-grid lab-grid" style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: '20px', padding: '20px' }}>
    <div className="lab-header" style={{ display: 'flex', gap: '20px' }}>
       <ControlPanel {...props} minimal />
       <div style={{ flex: 1 }}>
         <MetricsDisplay data={props.botStatus} />
       </div>
    </div>
    <div className="lab-chart" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <ChartPanel {...props} height={700} />
    </div>
  </div>
);

export default LabLayout;
