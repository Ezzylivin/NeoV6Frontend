// File: src/components/LiveTradingChart.jsx
// 🚀 UPGRADE: Matches your CSS. Fixes data parsing to remove the spinner.

import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import './LiveTradingChart.css';

const LiveTradingChart = ({ candles = [], trades = [] }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  // --- 1. Robust Time Parser (Crucial for Live Data) ---
  const parseTime = (t) => {
      if (!t) return null;
      // Handle MongoDB style { $date: ... }
      if (typeof t === 'object' && t.$date) t = t.$date;
      
      const d = new Date(t);
      if (isNaN(d.getTime())) return null;
      
      // Lightweight Charts needs Unix Timestamp (Seconds)
      return d.getTime() / 1000; 
  };

  // --- 2. Prepare Data ---
  const chartData = useMemo(() => {
      if (!Array.isArray(candles)) return [];
      
      return candles.map(c => {
          // 🚀 FIX: Check ALL possible key names for time
          const time = parseTime(c.timestamp || c.time || c.date || c.datetime);
          
          if (!time) return null;
          
          return {
              time: time,
              open: parseFloat(c.open),
              high: parseFloat(c.high),
              low: parseFloat(c.low),
              close: parseFloat(c.close),
          };
      })
      .filter(c => c !== null) // Remove invalid
      .sort((a, b) => a.time - b.time);
  }, [candles]);

  const markers = useMemo(() => {
      if (!Array.isArray(trades)) return [];
      const m = [];
      trades.forEach(t => {
          const time = parseTime(t.entryTime || t.time);
          const exitTime = parseTime(t.exitTime);
          
          // Buy Marker
          if (time) {
              m.push({
                  time: time,
                  position: 'belowBar',
                  color: '#2196F3',
                  shape: 'arrowUp',
                  text: 'BUY'
              });
          }
          // Sell Marker
          if (exitTime) {
              m.push({
                  time: exitTime,
                  position: 'aboveBar',
                  color: t.profit > 0 ? '#4CAF50' : '#F44336',
                  shape: 'circle',
                  text: `EXIT ${t.profit !== undefined ? t.profit.toFixed(2) : ''}`
              });
          }
      });
      return m.sort((a, b) => a.time - b.time);
  }, [trades]);

  // --- 3. Initialize & Update Chart ---
  useEffect(() => {
      if (!chartContainerRef.current) return;

      // Create Chart only once
      if (!chartRef.current) {
          chartRef.current = createChart(chartContainerRef.current, {
              width: chartContainerRef.current.clientWidth,
              height: 400, // Matches CSS height
              layout: { backgroundColor: '#0f0f0f', textColor: '#ddd' }, // Matches CSS background
              grid: { vertLines: { color: '#333' }, horzLines: { color: '#333' } },
              crosshair: { mode: CrosshairMode.Normal },
              timeScale: { 
                  borderColor: '#485c7b', 
                  timeVisible: true,
                  secondsVisible: false 
              },
          });

          seriesRef.current = chartRef.current.addCandlestickSeries({
              upColor: '#26a69a', downColor: '#ef5350',
              borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350',
          });
      }

      // Update Data if available
      if (chartData.length > 0) {
          seriesRef.current.setData(chartData);
          seriesRef.current.setMarkers(markers);
          // Optional: Fit content to see the whole history
          chartRef.current.timeScale().fitContent(); 
      }

      // Handle Resize
      const handleResize = () => {
          if (chartRef.current && chartContainerRef.current) {
              chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
          }
      };
      window.addEventListener('resize', handleResize);

      return () => {
          window.removeEventListener('resize', handleResize);
      };
  }, [chartData, markers]);

  // Cleanup on unmount
  useEffect(() => {
      return () => {
          if (chartRef.current) {
              chartRef.current.remove();
              chartRef.current = null;
          }
      };
  }, []);

  return (
      <div className="live-chart-wrapper">
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
