import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, CrosshairMode, ColorType } from 'lightweight-charts';
import { Play, Pause, RotateCcw } from 'lucide-react';
import './ChartReplay.css';

export const ChartReplay = ({ results, symbol }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(100); 
  const [currentIndex, setCurrentIndex] = useState(0);

  // 1. Strict Unix Timestamp Parsing
  const candles = useMemo(() => {
    if (!results?.candleData) return [];
    return results.candleData.map(c => {
        let t = c.timestamp || c.time || c.datetime;
        if (typeof t === 'object' && t.$date) t = t.$date;
        const unixSec = Math.floor(new Date(t).getTime() / 1000);
        return { time: unixSec, open: parseFloat(c.open), high: parseFloat(c.high), low: parseFloat(c.low), close: parseFloat(c.close) };
    }).sort((a, b) => a.time - b.time);
  }, [results]);

  // 2. Chart Lifecycle
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;
    setCurrentIndex(0); // 🟢 Auto-Reset index on new data

    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 450,
      layout: { background: { type: ColorType.Solid, color: "#000000" }, textColor: '#94a3b8' },
      timeScale: { borderColor: '#064e3b', timeVisible: true },
    });

    candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({ upColor: '#10b981', downColor: '#ef4444' });
    candlestickSeriesRef.current.setData(candles.slice(0, 1));

    return () => chartRef.current?.remove();
  }, [candles, symbol]);

  // 3. Playback Logic
  useEffect(() => {
    if (!candlestickSeriesRef.current || candles.length === 0) return;
    candlestickSeriesRef.current.setData(candles.slice(0, currentIndex + 1));
  }, [currentIndex, candles]);

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentIndex(prev => (prev < candles.length - 1 ? prev + 1 : (setIsPlaying(false), prev)));
      }, playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, candles.length]);

  if (!candles.length) return <div className="chart-loading">Waiting for backtest data...</div>;

  return (
    <div className="chart-replay-container">
      <div className="chart-header-row flex justify-between p-2">
        <h3>{symbol} Replay</h3>
        <div className="playback-controls flex gap-4">
            <button onClick={() => setCurrentIndex(0)}><RotateCcw size={16}/></button>
            <button onClick={() => setIsPlaying(!isPlaying)}>{isPlaying ? <Pause size={16}/> : <Play size={16}/>}</button>
        </div>
      </div>
      <div ref={chartContainerRef} className="chart-canvas" />
    </div>
  );
};
