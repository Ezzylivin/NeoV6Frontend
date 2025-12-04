// File: src/components/LiveTradingChart.jsx
// 🚀 UPGRADE: Added Manual Zoom Controls (+ / - / Fit)

import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import './LiveTradingChart.css';

const LiveTradingChart = ({ candles = [], trades = [], activePositions = [] }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  // --- MERGE TRADES FOR LOG ---
  const tradeLog = useMemo(() => {
      const closed = trades.map(t => ({
          type: 'CLOSED', 
          side: t.position, 
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
      
      return [...open, ...closed].sort((a, b) => new Date(b.time) - new Date(a.time));
  }, [trades, activePositions]);

  const parseTime = (t) => {
      if (!t) return null;
      if (typeof t === 'object' && t.$date) t = t.$date;
      const d = new Date(t);
      if (isNaN(d.getTime())) return null;
      return d.getTime() / 1000; 
  };

  // --- PREPARE DATA ---
  const chartData = useMemo(() => {
      if (!Array.isArray(candles) || candles.length === 0) return [];
      const dataMap = new Map();
      candles.forEach(c => {
          const time = parseTime(c.timestamp || c.time || c.datetime || c.Date);
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
      return m.sort((a, b) => a.time - b.time);
  }, [trades, activePositions]);

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
      const newBars = bars * 0.8; // Shrink range by 20%
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
      const newBars = bars * 1.25; // Expand range by 25%
      const center = (range.from + range.to) / 2;
      
      timeScale.setVisibleLogicalRange({
          from: center - newBars / 2,
          to: center + newBars / 2,
      });
  };

  // --- CHART LIFECYCLE ---
  useEffect(() => {
      if (!chartContainerRef.current) return;

      if (!chartRef.current) {
          chartRef.current = createChart(chartContainerRef.current, {
              width: chartContainerRef.current.clientWidth,
              height: 400,
              layout: { backgroundColor: '#0f0f0f', textColor: '#ddd' },
              grid: { vertLines: { color: '#333' }, horzLines: { color: '#333' } },
              crosshair: { mode: CrosshairMode.Normal },
              timeScale: { borderColor: '#485c7b', timeVisible: true },
          });
          seriesRef.current = chartRef.current.addCandlestickSeries({
              upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350',
          });
      }

      if (chartData.length > 0) {
          seriesRef.current.setData(chartData);
          seriesRef.current.setMarkers(markers);
          // Only auto-fit on initial data load if range is empty
          if (chartRef.current.timeScale().getVisibleLogicalRange() === null) {
              chartRef.current.timeScale().fitContent();
          }
      }

      const resizeObserver = new ResizeObserver(entries => {
          if (entries.length && entries[0].contentRect) {
              chartRef.current.applyOptions({ width: entries[0].contentRect.width });
          }
      });
      resizeObserver.observe(chartContainerRef.current);
      return () => resizeObserver.disconnect();
  }, [chartData, markers]);

  // Button Styles
  const btnStyle = {
      background: 'rgba(255,255,255,0.1)', border: '1px solid #555', color: '#ccc',
      fontSize: '12px', cursor: 'pointer', padding: '2px 8px', borderRadius: '4px',
      marginLeft: '4px', pointerEvents: 'auto'
  };

  return (
      <div className="live-chart-wrapper">
          
          {/* 🚀 OVERLAY WITH ZOOM CONTROLS */}
          <div className="chart-trade-overlay">
              <div className="overlay-header">
                  <h4 style={{margin:0}}>Live Feed</h4>
                  <div style={{display:'flex'}}>
                      <button onClick={handleZoomOut} style={btnStyle} title="Zoom Out">-</button>
                      <button onClick={handleZoomIn} style={btnStyle} title="Zoom In">+</button>
                      <button onClick={handleFitContent} style={btnStyle} title="Fit All">⤢</button>
                  </div>
              </div>
              
              <div className="overlay-list">
                  {tradeLog.length === 0 ? <div className="empty">Waiting for trades...</div> : tradeLog.map((t, i) => (
                      <div key={t.id || i} className={`overlay-item ${t.type}`}>
                          <div className="row-top">
                              <span className={`badge ${t.type}`}>{t.type}</span>
                              <span className={`side ${t.side}`}>{t.side?.toUpperCase()}</span>
                              <span className="time">{new Date(t.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                          </div>
                          <div className="row-bot">
                              <span className="price">@ {t.price?.toFixed(2)}</span>
                              {t.profit !== null && (
                                  <span className={`pnl ${t.profit > 0 ? 'win' : 'loss'}`}>
                                      {t.profit > 0 ? '+' : ''}{t.profit?.toFixed(2)}
                                  </span>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {chartData.length === 0 && (
              <div className="chart-placeholder">
                  <div className="spinner"></div>
                  <p>Waiting for live market data...</p>
              </div>
          )}
          <div ref={chartContainerRef} className="live-chart-container" />
      </div>
  );
};

export default LiveTradingChart;
