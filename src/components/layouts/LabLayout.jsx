// File: src/components/layouts/LabLayout.jsx
import React, { useState } from "react";
import { ChartPanel } from "./SharedComponents";
import { FaChartLine, FaCamera, FaCog, FaArrowLeft, FaLayerGroup } from "react-icons/fa"; // Run: npm install react-icons

const LabLayout = (props) => {
  const { chartData, formConfig, onBack } = props; // Assuming you pass an onBack handler

  // 🧪 Lab State
  const [showOverlays, setShowOverlays] = useState(true);
  const [activeIndicators, setActiveIndicators] = useState(['EMA', 'Vol']);

  const toggleIndicator = (ind) => {
    setActiveIndicators(prev => 
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    );
    // You would pass this state down to ChartPanel to actually render them
  };

  return (
    <div className="lab-layout">
      
      {/* 1. 🔙 TOP BAR (Navigation & Actions) */}
      <div className="lab-top-bar">
        <button onClick={onBack} className="icon-btn" title="Exit Lab">
           <FaArrowLeft /> Exit Lab
        </button>
        <div className="center-info">
           <span className="market-status live">● MARKET LIVE</span>
        </div>
        <button className="icon-btn" title="Take Screenshot">
           <FaCamera />
        </button>
      </div>

      {/* 2. 📊 HUD OVERLAY (Asset Data) */}
      <div className="lab-overlay">
        <div className="overlay-badge">
          <span className="label">ASSET</span>
          <span className="value neon-text">{formConfig.symbol}</span>
        </div>
        <div className="overlay-badge">
          <span className="label">TIMEFRAME</span>
          <span className="value">{formConfig.timeframe}</span>
        </div>
        <div className="overlay-badge">
          <span className="label">STRATEGY</span>
          <span className="value tiny">{formConfig.isCombo ? 'Combo' : 'Single'}</span>
        </div>
      </div>
      
      {/* 3. 📉 MAIN CHART AREA */}
      <div className="full-screen-chart">
        <ChartPanel 
          chartData={chartData} 
          formConfig={formConfig} 
          height="100%" 
          // Pass down the visibility toggles to your chart component
          showTradeMarkers={showOverlays}
          activeIndicators={activeIndicators}
        />
      </div>

      {/* 4. 🎛️ FLOATING CONTROL DOCK (The "Lab" Tools) */}
      <div className="control-dock">
         <div className="dock-header">
            <FaLayerGroup /> Analysis Tools
         </div>
         <div className="dock-grid">
            <button 
               className={`dock-item ${showOverlays ? 'active' : ''}`} 
               onClick={() => setShowOverlays(!showOverlays)}
            >
               Target/Stop Lines
            </button>
            <button 
               className={`dock-item ${activeIndicators.includes('EMA') ? 'active' : ''}`}
               onClick={() => toggleIndicator('EMA')}
            >
               EMA Ribbon
            </button>
            <button 
               className={`dock-item ${activeIndicators.includes('RSI') ? 'active' : ''}`}
               onClick={() => toggleIndicator('RSI')}
            >
               RSI Panel
            </button>
            <button 
               className={`dock-item ${activeIndicators.includes('ML') ? 'active' : ''}`}
               onClick={() => toggleIndicator('ML')}
            >
               ML Predictions
            </button>
         </div>
      </div>

      {/* 5. 🦶 METRICS FOOTER */}
      <div className="metrics-footer">
         <div className="metric">
            <span className="m-label">VOLATILITY (24H)</span>
            <span className="m-value text-yellow-400">4.2%</span>
         </div>
         <div className="metric">
            <span className="m-label">SIGNAL STRENGTH</span>
            <span className="m-value text-emerald-400">STRONG BUY</span>
         </div>
         <div className="metric">
            <span className="m-label">EST. RISK</span>
            <span className="m-value text-red-400">$120</span>
         </div>
      </div>

      <style>{`
        .lab-layout { 
            height: 100vh; width: 100%; position: relative; 
            background: #0d0d0d; overflow: hidden; 
            display: flex; flex-direction: column;
        }
        
        /* CHART */
        .full-screen-chart { flex: 1; position: relative; z-index: 1; }
        
        /* TOP BAR */
        .lab-top-bar {
            position: absolute; top: 0; left: 0; right: 0; height: 60px;
            display: flex; justify-content: space-between; items-center;
            padding: 0 20px; z-index: 20;
            background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
            pointer-events: none; /* Let clicks pass through to chart where empty */
        }
        .lab-top-bar > * { pointer-events: auto; } /* Re-enable clicks on buttons */
        
        .icon-btn {
            background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
            color: #fff; padding: 8px 16px; border-radius: 8px; cursor: pointer;
            display: flex; align-items: center; gap: 8px; font-weight: bold; font-size: 0.8rem;
            transition: all 0.2s;
        }
        .icon-btn:hover { background: rgba(255,255,255,0.15); transform: translateY(1px); }

        .market-status.live { color: #10b981; font-weight: 900; font-size: 0.7rem; letter-spacing: 2px; }

        /* HUD OVERLAY */
        .lab-overlay {
          position: absolute; top: 80px; left: 20px; z-index: 10;
          display: flex; flex-direction: column; gap: 10px;
        }
        
        .overlay-badge {
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          border-left: 3px solid #6366f1; /* Indigo accent */
          padding: 8px 12px;
          border-radius: 0 4px 4px 0;
          display: flex; flex-direction: column;
          width: 120px;
        }
        
        .overlay-badge .label { font-size: 0.55rem; color: #9ca3af; letter-spacing: 1px; margin-bottom: 2px; }
        .overlay-badge .value { font-size: 1.1rem; font-weight: 800; color: #f3f4f6; font-family: 'JetBrains Mono', monospace; }
        .overlay-badge .value.neon-text { text-shadow: 0 0 10px rgba(99, 102, 241, 0.5); }
        .overlay-badge .value.tiny { font-size: 0.9rem; color: #d1d5db; }

        /* CONTROL DOCK */
        .control-dock {
            position: absolute; top: 80px; right: 20px; z-index: 20;
            background: rgba(15, 15, 15, 0.9);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            padding: 15px;
            width: 200px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .dock-header { 
            color: #818cf8; font-size: 0.75rem; font-weight: 900; text-transform: uppercase; 
            margin-bottom: 12px; display: flex; align-items: center; gap: 6px;
        }
        .dock-grid { display: flex; flex-direction: column; gap: 6px; }
        .dock-item {
            background: transparent; border: 1px solid rgba(255,255,255,0.05);
            color: #6b7280; padding: 8px; border-radius: 6px; font-size: 0.8rem;
            cursor: pointer; text-align: left; transition: all 0.2s;
        }
        .dock-item:hover { background: rgba(255,255,255,0.03); color: #fff; }
        .dock-item.active { 
            background: rgba(99, 102, 241, 0.15); 
            border-color: rgba(99, 102, 241, 0.4); 
            color: #a5b4fc; 
            font-weight: bold;
        }

        /* METRICS FOOTER */
        .metrics-footer {
            position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
            z-index: 20;
            display: flex; gap: 1px; /* Gap for dividers */
            background: rgba(255,255,255,0.1); /* Divider color */
            border-radius: 8px; overflow: hidden;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .metric {
            background: rgba(10,10,10,0.95);
            padding: 10px 20px;
            display: flex; flex-direction: column; align-items: center;
            min-width: 100px;
        }
        .metric .m-label { font-size: 0.55rem; color: #6b7280; font-weight: 700; margin-bottom: 2px; }
        .metric .m-value { font-size: 0.9rem; font-weight: 800; font-family: monospace; }
      `}</style>
    </div>
  );
};

export default LabLayout;
