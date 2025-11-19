// File: src/components/ChartReplay.jsx
// 🚀 PROFESSIONAL UPGRADE: Switched to Lightweight Charts for maximum visibility.

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import './ChartReplay.css';

export const ChartReplay = ({ results, symbol }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(100); // ms per candle
  const [currentIndex, setCurrentIndex] = useState(0);
  const requestRef = useRef();

  // 1. Parse Data
  const candles = useMemo(() => {
    if (!results?.candleData) return [];
    return results.candleData.map(c => ({
      time: new Date(c.timestamp).getTime() / 1000, // Lightweight charts wants seconds
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    })).sort((a, b) => a.time - b.time);
  }, [results]);

  const trades = useMemo(() => {
    if (!results?.tradeBreakdown) return [];
    return results.tradeBreakdown.map(t => ({
      time: new Date(t.entryTime).getTime() / 1000,
      position: t.position,
      price: t.entryPrice,
      profit: t.profit,
      exitTime: t.exitTime ? new Date(t.exitTime).getTime() / 1000 : null,
      exitPrice: t.exitPrice
    }));
  }, [results]);

  // 2. Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        backgroundColor: '#1e1e1e',
        textColor: '#ddd',
      },
      grid: {
        vertLines: { color: '#2b2b2b' },
        horzLines: { color: '#2b2b2b' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        borderColor: '#485c7b',
        timeVisible: true,
      },
    });

    candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Load ALL data initially so we can see the full history, 
    // or load up to currentIndex to simulate replay.
    // For replay, we usually set data up to the current index.
    candlestickSeriesRef.current.setData(candles.slice(0, currentIndex + 1));
    
    // Add markers for trades that happened up to this point
    updateMarkers(currentIndex);

    return () => {
      chartRef.current.remove();
    };
  }, [candles]); // Re-create if data changes completely

  // 3. Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 4. Update Chart on Index Change
  useEffect(() => {
    if (!candlestickSeriesRef.current || candles.length === 0) return;
    
    const slice = candles.slice(0, currentIndex + 1);
    candlestickSeriesRef.current.setData(slice);
    updateMarkers(currentIndex);
    
    // Auto-scroll to latest
    chartRef.current.timeScale().scrollToPosition(0, false); 

  }, [currentIndex, candles]);

  const updateMarkers = (index) => {
    const currentTime = candles[index]?.time;
    if (!currentTime) return;

    const markers = [];
    trades.forEach(t => {
      if (t.time <= currentTime) {
        markers.push({
          time: t.time,
          position: 'belowBar',
          color: t.position === 'long' ? '#2196F3' : '#E91E63',
          shape: t.position === 'long' ? 'arrowUp' : 'arrowDown',
          text: `ENTRY ${t.position.toUpperCase()}`
        });
      }
      if (t.exitTime && t.exitTime <= currentTime) {
        markers.push({
          time: t.exitTime,
          position: 'aboveBar',
          color: t.profit > 0 ? '#4CAF50' : '#F44336',
          shape: t.profit > 0 ? 'arrowDown' : 'arrowUp', // visual logic: exit is opposite of entry flow? or just a marker
          text: `EXIT ($${t.profit?.toFixed(2)})`
        });
      }
    });
    candlestickSeriesRef.current.setMarkers(markers);
  };

  // 5. Playback Loop
  const animate = () => {
    setCurrentIndex(prev => {
      if (prev >= candles.length - 1) {
        setIsPlaying(false);
        return prev;
      }
      return prev + 1;
    });
    requestRef.current = setTimeout(() => {
      if (isPlaying) requestAnimationFrame(animate); // Check isPlaying inside timeout isn't enough due to closure
    }, playbackSpeed);
  };

  // Effect to trigger animation loop
  useEffect(() => {
    if (isPlaying) {
      requestRef.current = setTimeout(animate, playbackSpeed);
    } else {
      clearTimeout(requestRef.current);
    }
    return () => clearTimeout(requestRef.current);
  }, [isPlaying, playbackSpeed, candles]); 
  // Note: The recursion in `animate` uses state, so we need to be careful. 
  // Better pattern for React intervals:
  
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= candles.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, candles]);


  // Controls
  const handlePlay = () => {
    if (currentIndex >= candles.length - 1) setCurrentIndex(0);
    setIsPlaying(true);
  };
  const handlePause = () => setIsPlaying(false);
  const handleReset = () => { setIsPlaying(false); setCurrentIndex(0); };
  const handleForward = () => setCurrentIndex(prev => Math.min(prev + 1, candles.length - 1));
  const handleBackward = () => setCurrentIndex(prev => Math.max(prev - 1, 0));

  if (!results || !candles.length) return null;

  return (
    <div className="chart-replay-container">
      <div className="chart-header">
        <h3>Market Replay: {symbol}</h3>
        <div className="controls">
          <button onClick={handleBackward}>Step Back</button>
          {!isPlaying ? (
            <button onClick={handlePlay} className="play-btn">▶ Play</button>
          ) : (
            <button onClick={handlePause} className="pause-btn">⏸ Pause</button>
          )}
          <button onClick={handleForward}>Step Fwd</button>
          <button onClick={handleReset}>Reset</button>
          <label>
            Speed:
            <input 
              type="range" 
              min="10" 
              max="1000" 
              step="10" 
              value={1000 - playbackSpeed} // Invert logic so right is faster
              onChange={(e) => setPlaybackSpeed(1000 - Number(e.target.value))} 
            />
          </label>
          <span>{new Date(candles[currentIndex]?.time * 1000).toLocaleString()}</span>
        </div>
      </div>
      <div ref={chartContainerRef} className="chart-canvas" />
    </div>
  );
};
