// File: src/components/LiveTradingChart.jsx
import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

const LiveTradingChart = ({ candles = [], trades = [] }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#1E1E1E' }, textColor: '#DDD' },
      grid: { vertLines: { color: '#2B2B2B' }, horzLines: { color: '#2B2B2B' } },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    const series = chart.addCandlestickSeries({
        upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current && candles.length > 0) {
      // 1. Update Candles
      // Ensure time is sorted and unique
      const sortedCandles = [...candles].sort((a, b) => a.time - b.time);
      seriesRef.current.setData(sortedCandles.map(c => ({
          time: c.time / 1000, // Python sends ms, Chart wants seconds
          open: c.open, high: c.high, low: c.low, close: c.close
      })));

      // 2. Update Markers
      const markers = [];
      trades.forEach(t => {
          // Entry Marker
          if (t.entryTime) {
            markers.push({
                time: new Date(t.entryTime).getTime() / 1000,
                position: 'belowBar', color: '#2196F3', shape: 'arrowUp', text: 'BUY'
            });
          }
          // Exit Marker
          if (t.exitTime) {
            markers.push({
                time: new Date(t.exitTime).getTime() / 1000,
                position: 'aboveBar', color: t.pnl > 0 ? '#4CAF50' : '#F44336', shape: 'arrowDown', text: `PnL $${t.pnl?.toFixed(2)}`
            });
          }
      });
      // Sort markers by time
      markers.sort((a, b) => a.time - b.time);
      seriesRef.current.setMarkers(markers);
    }
  }, [candles, trades]);

  return <div ref={chartContainerRef} style={{ position: 'relative' }} />;
};

export default LiveTradingChart;
