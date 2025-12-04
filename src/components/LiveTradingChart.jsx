// File: src/components/LiveTradingChart.jsx
// 🚀 UPGRADE: "Full History" Log (Splits trades into Entry and Exit events)

import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import './LiveTradingChart.css';

const LiveTradingChart = ({ candles = [], trades = [], activePositions = [] }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  // --- 🚀 LOGIC: SPLIT TRADES INTO EVENTS ---
  const tradeLog = useMemo(() => {
      const events = [];

      // 1. Add Active Positions (Current Entries)
      activePositions.forEach(p => {
          events.push({
              id: `active-${p.entry_time}-${Math.random()}`,
              action: 'OPEN',
              side: p.side,
              price: p.entry_price,
              time: p.entry_time,
              profit: null,
              isLive: true
          });
      });

      // 2. Add Closed Trades (Split into Entry & Exit)
      trades.forEach(t => {
          // The Entry Event (Historical)
          events.push({
              id: `hist-entry-${t.entryTime}-${Math.random()}`,
              action: 'OPEN',
              side: t.position,
              price: t.price, // Original entry price
              time: t.entryTime,
              profit: null,
              isLive: false
          });

          // The Exit Event
          events.push({
              id: `hist-exit-${t.exitTime}-${Math.random()}`,
              action: 'CLOSE',
              side: t.position,
              price: t.exitPrice,
              time: t.exitTime,
              profit: t.profit,
              isLive: false
          });
      });

      // 3. Sort by Time (Newest First)
      return events.sort((a, b) => new Date(b.time) - new Date(a.time));
  }, [trades, activePositions]);

  const parseTime = (t) => {
      if (!t) return null;
      if (typeof t === 'object' && t.$date) t = t.$date;
      const d = new Date(t);
      if (isNaN(d.getTime())) return null;
      return d.getTime() / 1000; 
  };

  // --- DATA PREP ---
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
      // Historical Markers
      trades.forEach(t => {
          const t1 = parseTime(t.entryTime);
          const t2 = parseTime(t.exitTime);
          if(t1) m.push({ time: t1, position: 'belowBar', color: '#2196F3', shape: 'arrowUp', text: 'BUY' });
          if(t2) m.push({ time: t2, position: 'aboveBar', color: t.profit > 0 ? '#4CAF50' : '#EF4444', shape: 'arrowDown', text: `SELL` });
      });
      // Active Markers
      activePositions.forEach(p => {
          const t1 = parseTime(p.entry_time);
          if(t1) m.push({ time: t1, position: 'belowBar', color: '#F59E0B', shape: 'arrowUp', text: 'OPEN' });
      });
      return m.sort((a, b) => a.time - b.time);
  }, [trades, activePositions]);

  // --- FIT BUTTON ---
  const handleFitContent = () => {
      if (chartRef.current) chartRef.current.timeScale().fitContent();
  };

  // --- CHART SETUP ---
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
          // Only auto-fit on first load if needed, removed to prevent jumps on updates
      }

      const resizeObserver = new ResizeObserver(entries => {
          if (entries.length && entries[0].contentRect) {
              chartRef.current.applyOptions({ width: entries[0].contentRect.width });
          }
      });
      resizeObserver.observe(chartContainerRef.current);
      return () => resizeObserver.disconnect();
  }, [chartData, markers]);

  return (
      <div className="live-chart-wrapper">
          
          {/* 🚀 UPGRADED OVERLAY */}
          <div className="chart-trade-overlay">
              <div className="overlay-header">
                  <h4>Live Feed</h4>
                  <button onClick={handleFitContent}>⤢ Fit</button>
              </div>
              
              <div className="overlay-list">
                  {tradeLog.length === 0 ? <div className="empty">Waiting for trades...</div> : tradeLog.map((t, i) => (
                      <div key={i} className={`overlay-item ${t.action}`}>
                          <div className="row-top">
                              <span className={`badge ${t.action}`}>{t.action}</span>
                              <span className={`side ${t.side}`}>{t.side.toUpperCase()}</span>
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
