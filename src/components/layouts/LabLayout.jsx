import React from "react";
import { ChartPanel } from "./SharedComponents";

const LabLayout = (props) => {
  const { chartData, formConfig } = props;

  return (
    <div className="lab-layout">
      <div className="lab-overlay">
        <div className="overlay-badge">
          <span className="label">ASSET</span>
          <span className="value">{formConfig.symbol}</span>
        </div>
        <div className="overlay-badge">
          <span className="label">TIMEFRAME</span>
          <span className="value">{formConfig.timeframe}</span>
        </div>
      </div>
      
      <div className="full-screen-chart">
        <ChartPanel 
          chartData={chartData} 
          formConfig={formConfig} 
          height="100%" 
        />
      </div>

      <style>{`
        .lab-layout { height: 100vh; width: 100%; position: relative; background: var(--bg-app); overflow: hidden; }
        
        .full-screen-chart { height: 100%; width: 100%; }
        
        .lab-overlay {
          position: absolute; top: 20px; left: 20px; z-index: 10;
          display: flex; gap: 10px;
        }
        
        .overlay-badge {
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          border: 1px solid var(--border);
          padding: 8px 16px;
          border-radius: 4px;
          display: flex; flex-direction: column;
        }
        
        .overlay-badge .label { font-size: 0.6rem; color: var(--text-secondary); letter-spacing: 1px; }
        .overlay-badge .value { font-size: 1.2rem; font-weight: 900; color: var(--text-primary); font-family: monospace; }
      `}</style>
    </div>
  );
};

export default LabLayout;
