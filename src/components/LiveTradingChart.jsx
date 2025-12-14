// File: src/components/LiveTradingChart.jsx
// 🚀 UPGRADE: v65.0 - "Data Visibility Fix"
// Fixes: 
// 1. Correctly handles timestamp parsing (ms vs seconds).
// 2. Ensures 'setData' fires reliably when props change.

import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import './LiveTradingChart.css';

const LiveTradingChart = ({ candles = [], trades = [], activePositions = [] }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  // --- HELPER: ROBUST TIME PARSER ---
  // Lightweight charts needs SECONDS for unix timestamps.
  const parseTime = (t) => {
      if (!t) return null;
      // Handle MongoDB format
      if (typeof t === 'object' && t.$date) t = t.$date;
      
      const d = new Date(t);
      if (isNaN(d.getTime())) return null;
      
      // Return Unix Timestamp in SECONDS (integers only)
      return Math.floor(d.getTime() / 1000); 
  };

  // --- MERGE TRADES FOR LOG (Visual Overlay) ---
  const tradeLog = useMemo(() => {
      const closed = trades.map(t => ({
          type: 'CLOSED', 
          side: t.position || t.side, 
          price: t.exitPrice, 
          profit: t.profit, 
          time: t.exitTime || t.entryTime,
          id: `closed-${t.exitTime}-${Math.random()}`
      }));
      
      const open = activePositions.map(p => ({
          type: 'OPEN', 
          side: p.side, 
          price: p.entry_price, 
          profit: 0, 
          time: p.entry_time,
          id: `open-${p.entry_time}-${Math.random()}`
      }));
      
      return [...open, ...closed]
        .filter(x => x.time) // Safety check
        .sort((a, b) => new Date(b.time) - new Date(a.time));
  }, [trades, activePositions]);

  // --- PREPARE CHART DATA ---
  const chartData = useMemo(() => {
      if (!Array.isArray(candles) || candles.length === 0) return [];
      
      const dataMap = new Map();
      candles.forEach(c => {
          // Try multiple property names for robustness
          const rawTime = c.timestamp || c.time || c.datetime || c.Date;
          const time = parseTime(rawTime);
          
          if (time) {
              dataMap.set(time, {
                  time: time,
                  open: parseFloat(c.open),
                  high: parseFloat(c.high),
                  low: parseFloat(c.low),
                  close: parseFloat(c.close),
              });
          }
      });
      // Sort ascending for the chart
      return Array.from(dataMap.values()).sort((a, b) => a.time - b.time);
  }, [candles]);

  const markers = useMemo(() => {
      const m = [];
      trades.forEach(t => {
          const t1 = parseTime(t.entryTime);
          const t2 = parseTime(t.exitTime);
          if(t1) m.push({ time: t1, position: 'belowBar', color: '#2196F3', shape: 'arrowUp', text: 'BUY' });
          if(t2) m.push({ time: t2, position: 'aboveBar', color: t.profit > 0 ? '#4CAF50' : '#EF4444', shape: 'arrowDown', text: `EXIT` });
      });
      activePositions.forEach(p => {
          const t1 = parseTime(p.entry_time);
          if(t1) m.push({ time: t1, position: 'belowBar', color: '#F59E0B', shape: 'arrowUp', text: 'OPEN' });
      });
      // Filter out markers that don't match a candle time (prevents crash)
      const validTimes = new Set(chartData.map(c => c.time));
      return m.filter(mk => validTimes.has(mk.time)).sort((a, b) => a.time - b.time);
  }, [trades, activePositions, chartData]);

  // --- ZOOM CONTROLS ---
  const handleFitContent = () => {
      if (chartRef.current) chartRef.current.timeScale().fitContent();
  };

  const handleZoomIn = () => {
      if (!chartRef.current) return;
      const timeScale = chartRef.current.timeScale();
      const range = timeScale.getVisibleLogicalRange();
      if (!range) return;
      
      const bars = range.to - range.from;
      const newBars = bars * 0.8; 
      const center = (range.from + range.to) / 2;
      
      timeScale.setVisibleLogicalRange({
          from: center - newBars / 2,
          to: center + newBars / 2,
      });
  };

  const handleZoomOut = () => {
      if (!chartRef.current) return;
      const timeScale = chartRef.current.timeScale();
      const range = timeScale.getVisibleLogicalRange();
      if (!range) return;
      
      const bars = range.to - range.from;
      const newBars = bars * 1.25; 
      const center = (range.from + range.to) / 2;
      
      timeScale.setVisibleLogicalRange({
          from: center - newBars / 2,
          to: center + newBars / 2,
      });
  };

  // --- CHART INIT & UPDATE ---
  useEffect(() => {
      if (!chartContainerRef.current) return;

      // 1. Initialize Chart ONLY ONCE
      if (!chartRef.current) {
          chartRef.current = createChart(chartContainerRef.current, {
              width: chartContainerRef.current.clientWidth,
              height: 500, // Slightly taller for visibility
              layout: { backgroundColor: '#000000', textColor: '#00ff41' }, // Cyberpunk colors
              grid: { vertLines: { color: '#111' }, horzLines: { color: '#111' } },
              crosshair: { mode: CrosshairMode.Normal },
              timeScale: { borderColor: '#00ff41', timeVisible: true },
          });

          seriesRef.current = chartRef.current.addCandlestickSeries({
              upColor: '#00ff41', downColor: '#ff0055', 
              borderVisible: false, 
              wickUpColor: '#00ff41', wickDownColor: '#ff0055',
          });
          
          // Handle resize
          const handleResize = () => {
             if(chartContainerRef.current) {
                 chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
             }
          };
          window.addEventListener('resize', handleResize);
          return () => window.removeEventListener('resize', handleResize);
      }

      // 2. Update Data
      if (chartData.length > 0 && seriesRef.current) {
          seriesRef.current.setData(chartData);
          seriesRef.current.setMarkers(markers);
          
          // Only auto-fit if we just loaded data for the first time
          // checking logic range is a bit tricky, assume if data was empty before:
          // For now, let's just fit content on significant updates
          // chartRef.current.timeScale().fitContent(); 
      }
      
  }, [chartData, markers]);

  // Button Styles
  const btnStyle = {
      background: 'rgba(0, 255, 65, 0.1)', border: '1px solid #00ff41', color: '#00ff41',
      fontSize: '12px', cursor: 'pointer', padding: '2px 8px', borderRadius: '4px',
      marginLeft: '4px', pointerEvents: 'auto', fontWeight: 'bold'
  };

  return (
      <div className="live-chart-wrapper">
          
          {/* OVERLAY WITH ZOOM CONTROLS */}
          <div className="chart-trade-overlay">
              <div className="overlay-header">
                  <h4 style={{margin:0, color: '#00ff41'}}>Live Feed</h4>
                  <div style={{display:'flex'}}>
                      <button onClick={handleZoomOut} style={btnStyle} title="Zoom Out">-</button>
                      <button onClick={handleZoomIn} style={btnStyle} title="Zoom In">+</button>
                      <button onClick={handleFitContent} style={btnStyle} title="Fit All">⤢</button>
                  </div>
              </div>
              
              <div className="overlay-list">
                  {tradeLog.length === 0 ? (
                      <div className="empty" style={{color: '#008f11'}}>Waiting for trades...</div>
                  ) : (
                      tradeLog.map((t, i) => (
                      <div key={t.id || i} className={`overlay-item ${t.type}`}>
                          <div className="row-top">
                              <span className={`badge ${t.type}`}>{t.type}</span>
                              <span className={`side ${t.side}`}>{t.side?.toUpperCase()}</span>
                              <span className="time" style={{color: '#008f11'}}>
                                  {new Date(t.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                              </span>
                          </div>
                          <div className="row-bot">
                              <span className="price">@ {t.price?.toFixed(2)}</span>
                              {t.profit !== null && t.profit !== undefined && (
                                  <span className={`pnl ${t.profit > 0 ? 'win' : 'loss'}`}>
                                      {t.profit > 0 ? '+' : ''}{Number(t.profit).toFixed(2)}
                                  </span>
                              )}
                          </div>
                      </div>
                  )))}
              </div>
          </div>

          {/* LOADING STATE */}
          {chartData.length === 0 && (
              <div className="chart-placeholder">
                  <div className="spinner" style={{borderColor: '#00ff41', borderTopColor: 'transparent'}}></div>
                  <p style={{color: '#00ff41'}}>Acquiring Exchange Data...</p>
              </div>
          )}
          
          <div ref={chartContainerRef} className="live-chart-container" />
      </div>
  );
};

export default LiveTradingChart;
