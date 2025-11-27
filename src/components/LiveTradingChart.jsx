// File: src/components/LiveTradingChart.jsx
// 🚀 NEW: Dedicated Real-Time Chart for the Trading Bot.

import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import './LiveTradingChart.css';

const LiveTradingChart = ({ candles = [], trades = [] }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  // --- 1. Robust Time Parser (Same as Replay) ---
  const parseTime = (t) => {
      if (!t) return null;
      if (typeof t === 'object' && t.$date) t = t.$date; // MongoDB format
      const d = new Date(t);
      if (isNaN(d.getTime())) return null;
      return d.getTime() / 1000; // Unix Seconds
  };

  // --- 2. Prepare Data ---
  const chartData = useMemo(() => {
      if (!Array.isArray(candles)) return [];
      return candles.map(c => ({
          time: parseTime(c.timestamp || c.time || c.datetime),
          open: parseFloat(c.open),
          high: parseFloat(c.high),
          low: parseFloat(c.low),
          close: parseFloat(c.close),
      }))
      .filter(c => c.time) // Remove invalid
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
                  text: `BUY`
              });
          }
          // Sell Marker
          if (exitTime) {
              m.push({
                  time: exitTime,
                  position: 'aboveBar',
                  color: t.profit > 0 ? '#4CAF50' : '#F44336',
                  shape: 'circle',
                  text: `EXIT ${t.profit?.toFixed(2)}`
              });
          }
      });
      return m.sort((a, b) => a.time - b.time);
  }, [trades]);

  // --- 3. Initialize & Update Chart ---
  useEffect(() => {
      if (!chartContainerRef.current) return;

      // Initialize Chart if not exists
      if (!chartRef.current) {
          chartRef.current = createChart(chartContainerRef.current, {
              width: chartContainerRef.current.clientWidth,
              height: 400,
              layout: { backgroundColor: '#111', textColor: '#ddd' },
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

      // Update Data
      if (chartData.length > 0) {
          seriesRef.current.setData(chartData);
          seriesRef.current.setMarkers(markers);
          // Keep the right edge visible
          // chartRef.current.timeScale().scrollToRealTime(); 
      }

      // Resize Handler
      const handleResize = () => {
          if (chartRef.current && chartContainerRef.current) {
              chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
          }
      };
      window.addEventListener('resize', handleResize);

      return () => {
          window.removeEventListener('resize', handleResize);
          // Note: We don't destroy the chart on every dependency change to prevent flickering,
          // but we should cleanup on unmount.
      };
  }, [chartData, markers]);

  // Cleanup on Unmount only
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
