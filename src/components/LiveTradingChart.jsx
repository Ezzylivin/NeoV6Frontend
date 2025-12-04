// File: src/components/LiveTradingChart.jsx
// 🚀 UPGRADE: Added "Trade Log Overlay" and Active Positions Support.

import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import './LiveTradingChart.css';

const LiveTradingChart = ({ candles = [], trades = [], activePositions = [] }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  // --- 🚀 MERGE TRADES FOR LOG DISPLAY ---
  // Combine Closed Trades (from history) and Open Positions (live) into one sorted log
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
          profit: 0, // Profit is floating, hard to calc here without current price
          time: p.entry_time,
          id: `open-${p.entry_time}-${Math.random()}`
      }));
      
      // Sort newest first
      return [...open, ...closed].sort((a, b) => new Date(b.time) - new Date(a.time));
  }, [trades, activePositions]);

  const parseTime = (t) => {
      if (!t) return null;
      if (typeof t === 'object' && t.$date) t = t.$date;
      const d = new Date(t);
      if (isNaN(d.getTime())) return null;
      return d.getTime() / 1000; // Unix Seconds
  };

  // --- Prepare Chart Data ---
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

  // --- Prepare Markers (Buy/Sell Arrows) ---
  const markers = useMemo(() => {
      const m = [];
      
      // Closed Trades
      trades.forEach(t => {
          const time = parseTime(t.entryTime || t.time);
          const exitTime = parseTime(t.exitTime);
          
          if (time) m.push({ time, position: 'belowBar', color: '#2196F3', shape: 'arrowUp', text: 'BUY' });
          if (exitTime) m.push({ time: exitTime, position: 'aboveBar', color: t.profit > 0 ? '#4CAF50' : '#F44336', shape: 'circle', text: `EXIT` });
      });

      // 🚀 Active Positions (Yellow Arrows)
      activePositions.forEach(p => {
          const time = parseTime(p.entry_time);
          if (time) m.push({ time, position: 'belowBar', color: '#F59E0B', shape: 'arrowUp', text: `OPEN (${p.side})` });
      });

      return m.sort((a, b) => a.time - b.time);
  }, [trades, activePositions]);

  // --- Chart Lifecycle ---
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
              upColor: '#26a69a', downColor: '#ef5350',
              borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350',
          });
      }

      if (chartData.length > 0 && seriesRef.current) {
          seriesRef.current.setData(chartData);
          seriesRef.current.setMarkers(markers);
          chartRef.current.timeScale().fitContent();
      }

      const resizeObserver = new ResizeObserver(entries => {
          if (entries.length === 0 || !entries[0].contentRect) return;
          const { width } = entries[0].contentRect;
          chartRef.current.applyOptions({ width });
      });
      resizeObserver.observe(chartContainerRef.current);

      return () => resizeObserver.disconnect();
  }, [chartData, markers]);

  return (
      <div className="live-chart-wrapper">
          {/* 🚀 TRADE LOG OVERLAY */}
          <div className="chart-trade-overlay">
              <h4>Live Trades</h4>
              <div className="overlay-list">
                  {tradeLog.length === 0 ? <div className="empty">No trades yet</div> : tradeLog.map((t, i) => (
                      <div key={t.id || i} className={`overlay-item ${t.type}`}>
                          <span className="time">{new Date(t.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          <span className={`side ${t.side}`}>{t.side?.toUpperCase()}</span>
                          <span className="price">@ {t.price?.toFixed(2)}</span>
                          {t.type === 'CLOSED' && (
                              <span className={`pnl ${t.profit > 0 ? 'win' : 'loss'}`}>
                                  {t.profit > 0 ? '+' : ''}{t.profit?.toFixed(2)}
                              </span>
                          )}
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
