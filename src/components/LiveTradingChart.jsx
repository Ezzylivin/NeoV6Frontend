// File: src/components/LiveTradingChart.jsx
// 🚀 UPGRADE: Added Deduplication & Auto-Fit Fixes

import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import './LiveTradingChart.css';

const LiveTradingChart = ({ candles = [], trades = [] }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  const parseTime = (t) => {
      if (!t) return null;
      if (typeof t === 'object' && t.$date) t = t.$date;
      const d = new Date(t);
      if (isNaN(d.getTime())) return null;
      return d.getTime() / 1000; // Unix Seconds
  };

  // --- Prepare Data with Deduplication ---
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

      // Convert map to sorted array
      return Array.from(dataMap.values()).sort((a, b) => a.time - b.time);
  }, [candles]);

  const markers = useMemo(() => {
      if (!Array.isArray(trades)) return [];
      const m = [];
      trades.forEach(t => {
          const time = parseTime(t.entryTime || t.time);
          const exitTime = parseTime(t.exitTime);
          
          if (time) m.push({ time, position: 'belowBar', color: '#2196F3', shape: 'arrowUp', text: 'BUY' });
          if (exitTime) m.push({ time: exitTime, position: 'aboveBar', color: t.profit > 0 ? '#4CAF50' : '#F44336', shape: 'circle', text: `EXIT` });
      });
      return m.sort((a, b) => a.time - b.time);
  }, [trades]);

  // --- Chart Lifecycle ---
  useEffect(() => {
      if (!chartContainerRef.current) return;

      // Init Chart
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

      // Update Data
      if (chartData.length > 0 && seriesRef.current) {
          seriesRef.current.setData(chartData);
          seriesRef.current.setMarkers(markers);
          chartRef.current.timeScale().fitContent(); // 🚀 FORCE FIT
      }

      // Resize Observer
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
          {chartData.length === 0 && (
              <div className="chart-placeholder">
                  <div className="spinner"></div>
                  <p>Waiting for live market data...</p>
                  <small style={{fontSize:'10px', color:'#555'}}>
                      (Ensure Backend is running on 1 worker)
                  </small>
              </div>
          )}
          <div ref={chartContainerRef} className="live-chart-container" />
      </div>
  );
};

export default LiveTradingChart;
