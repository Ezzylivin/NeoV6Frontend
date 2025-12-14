import React from "react";
import { ChartIndependent } from "../ChartIndependent"; 
import { ChartReplay } from "../ChartReplay";

// Re-use your existing components, or simplified versions for the layouts

export const MetricsDisplay = ({ data, variant }) => {
  // Simple wrapper for your existing metrics logic
  if (!data) return null;
  const metrics = data.performanceMetrics || {};
  return (
    <div className={`metrics-wrapper ${variant || ''}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
       <div className="metric-card">💰 PnL: ${metrics.totalProfit?.toFixed(2) || '0.00'}</div>
       <div className="metric-card">📈 Win Rate: {metrics.winRate?.toFixed(1) || '0.0'}%</div>
       <div className="metric-card">🔻 Drawdown: {metrics.maxDrawdown?.toFixed(1) || '0.0'}%</div>
       <div className="metric-card">🔢 Trades: {metrics.totalTrades || 0}</div>
    </div>
  );
};

export const ChartPanel = ({ chartData, formConfig, height = 500 }) => {
  return (
    <div style={{ height: height, width: '100%', position: 'relative' }}>
      {chartData && chartData.candleData && chartData.candleData.length > 0 ? (
        <ChartIndependent results={chartData} symbol={formConfig?.symbol || 'BTC-USD'} />
      ) : (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
           Waiting for Market Data...
        </div>
      )}
    </div>
  );
};

export const LogsPanel = ({ logs }) => {
  return (
    <div className="logs-panel-shared" style={{ maxHeight: '100%', overflowY: 'auto' }}>
       {logs.map((log, i) => (
         <div key={i} style={{ padding: '8px', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
           <span style={{ color: 'var(--accent)', marginRight: '10px' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
           {log.message}
         </div>
       ))}
    </div>
  );
};

export const ControlPanel = (props) => {
    // This renders the form controls passed down from the container
    // For now, just a placeholder or you can move the form inside here
    return (
        <div className="control-panel-shared" style={{ padding: '15px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
           <h4>Control System</h4>
           <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
             {!props.isRunning ? (
                <button onClick={props.handleStart} style={{ flex: 1, padding: '10px', background: 'var(--accent)', border: 'none', color: 'var(--bg-app)', fontWeight: 'bold' }}>START</button>
             ) : (
                <button onClick={props.handleStop} style={{ flex: 1, padding: '10px', background: '#ef4444', border: 'none', color: 'white', fontWeight: 'bold' }}>STOP</button>
             )}
           </div>
        </div>
    );
};

export const DecisionStream = ({ logs, limit = 5 }) => {
    // Simplified version of your DecisionStream
    const recent = logs.slice(-limit).reverse();
    return (
        <div className="stream-shared">
            {recent.map((l, i) => (
                <div key={i} style={{ padding: '10px', borderLeft: '3px solid var(--accent)', margin: '5px 0', background: 'var(--bg-panel)' }}>
                    {l.message}
                </div>
            ))}
        </div>
    );
};
