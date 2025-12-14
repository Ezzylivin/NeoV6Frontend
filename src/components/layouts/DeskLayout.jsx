import React from "react";
import { MetricsDisplay, ChartPanel, ControlPanel, LogsPanel } from "./SharedComponents"; 

// Classic 3-Column Dashboard
const DeskLayout = (props) => (
  <div className="layout-grid desk-grid">
    <div className="col-left">
      <ControlPanel {...props} />
    </div>
    <div className="col-center">
      <MetricsDisplay data={props.botStatus} />
      <ChartPanel {...props} height={600} />
    </div>
    <div className="col-right">
      <LogsPanel {...props} />
    </div>
  </div>
);
export default DeskLayout;
