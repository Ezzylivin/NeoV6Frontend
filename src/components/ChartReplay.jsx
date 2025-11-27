// File: src/components/ChartReplay.jsx
// 🚀 UPGRADE: Real-time "Decision" Rendering. 
// Markers appear exactly when the candle closes.

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import './ChartReplay.css';

export const ChartReplay = ({ results, symbol }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(100); 
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // --- 1. PARSE DATA ---
  const parseTime = (t) => {
      if (!t) return null;
      if (typeof t === 'object' && t.$date) t = t.$date;
      const d = new Date(t);
      return isNaN(d.getTime()) ? null : d.getTime() / 1000;
  };

  const candles = useMemo(() => {
    if (!results?.candleData || !Array.isArray(results.candleData)) return [];
    return results.candleData.map(c => ({
      time: parseTime(c.timestamp || c.time || c.datetime), 
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close),
    })).filter(c => c.time).sort((a, b) => a.time - b.time);
  }, [results]);

  const trades = useMemo(() => {
    if (!results?.tradeBreakdown || !Array.isArray(results.tradeBreakdown)) return [];
    return results.tradeBreakdown.map(t => {
      const entryTime = parseTime(t.entryTime || t.time);
      const exitTime = parseTime(t.exitTime);
      return entryTime ? {
        time: entryTime, 
        position: t.position || 'long', 
        price: parseFloat(t.entryPrice || t.price || 0),
        profit: parseFloat(t.profit || 0),
        exitTime: exitTime,
        exitPrice: parseFloat(t.exitPrice || 0)
      } : null;
    }).filter(t => t !== null).sort((a, b) => a.time - b.time);
  }, [results]);

  // --- 2. AUTO-INIT (Runs Once) ---
  useEffect(() => {
      if (candles.length > 0 && !isLoaded) {
          setCurrentIndex(candles.length - 1); // Start at end
          setIsLoaded(true);
      }
  }, [candles, isLoaded]);

  // --- 3. INITIALIZE CHART ---
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    // Cleanup
    if (chartRef.current) { chartRef.current.remove(); }

    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: { backgroundColor: '#1e1e1e', textColor: '#ddd' },
      grid: { vertLines: { color: '#2b2b2b' }, horzLines: { color: '#2b2b2b' } },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { borderColor: '#485c7b', timeVisible: true },
    });

    candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#26a69a', downColor: '#ef5350',
      borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    });

    // Initial Render: Full Data
    candlestickSeriesRef.current.setData(candles);
    chartRef.current.timeScale().fitContent();

    const handleResize = () => {
        if (chartRef.current) chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => { 
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) chartRef.current.remove(); 
    };
  }, [candles]); 

  // --- 4. THE LOOP: Update Chart & Markers on Index Change ---
  useEffect(() => {
    if (!candlestickSeriesRef.current || candles.length === 0) return;
    
    const currentCandle = candles[currentIndex];
    if (!currentCandle) return;

    // A. Update Price (The Worm)
    // Use setData for replay effect (hides future), or update() for live append.
    // For replay, we slice the array.
    const visibleCandles = candles.slice(0, currentIndex + 1);
    candlestickSeriesRef.current.setData(visibleCandles);

    // B. Update Markers (The Decisions)
    const activeMarkers = [];
    trades.forEach(t => {
        // 1. ENTRY MARKER (If entry time is in the past/now)
        if (t.time <= currentCandle.time) {
            activeMarkers.push({
                time: t.time,
                position: 'belowBar',
                color: t.position === 'long' ? '#2196F3' : '#E91E63',
                shape: t.position === 'long' ? 'arrowUp' : 'arrowDown',
                text: `BUY @ ${t.price.toFixed(2)}`
            });
        }
        // 2. EXIT MARKER (Only if exit time is reached)
        if (t.exitTime && t.exitTime <= currentCandle.time) {
            activeMarkers.push({
                time: t.exitTime,
                position: 'aboveBar',
                color: t.profit > 0 ? '#4CAF50' : '#F44336',
                shape: 'circle',
                text: `EXIT ${t.profit > 0 ? '+' : ''}${t.profit.toFixed(2)}`
            });
        }
    });

    // Lightweight Charts requires markers sorted by time
    activeMarkers.sort((a, b) => a.time - b.time);
    candlestickSeriesRef.current.setMarkers(activeMarkers);

    // Auto-Scroll if playing
    if (isPlaying && currentIndex > 0 && currentIndex < candles.length - 1) {
        // Keeping the latest candle visible
        // chartRef.current.timeScale().scrollToPosition(0, false); 
    }

  }, [currentIndex, candles, trades, isPlaying]);

  // --- 5. Playback Interval ---
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
  }, [isPlaying, playbackSpeed, candles.length]);

  // Controls
  const handlePlay = () => { if (currentIndex >= candles.length - 1) setCurrentIndex(0); setIsPlaying(true); };
  const handlePause = () => setIsPlaying(false);
  const handleReset = () => { setIsPlaying(false); setCurrentIndex(0); };
  const handleStepBack = () => setCurrentIndex(prev => Math.max(0, prev - 1));
  const handleStepFwd = () => setCurrentIndex(prev => Math.min(candles.length - 1, prev + 1));

  if (!results || !candles.length) return <div className="chart-loading">Loading Chart Data...</div>;

  // HUD Data
  const currentCandleData = candles[currentIndex] || {};
  const openTrade = trades.find(t => t.time <= currentCandleData.time && (!t.exitTime || t.exitTime > currentCandleData.time));
  
  let pnl = 0;
  if (openTrade && currentCandleData && openTrade.price > 0) {
      pnl = (currentCandleData.close - openTrade.price) * (1000 / openTrade.price); // Example $1000 pos size logic
  }

  return (
    <div className="chart-replay-container">
      <div className="chart-header-row">
        <h3>Replay: {symbol}</h3>
        
        <div className="replay-hud">
             <div className="hud-item">
                <span className="hud-label">Date</span>
                <span className="hud-value" style={{fontSize:'0.9rem'}}>
                    {currentCandleData.time ? new Date(currentCandleData.time * 1000).toLocaleDateString() : '-'}
                </span>
             </div>
             <div className="hud-item">
                <span className="hud-label">Price</span>
                <span className="hud-value">${currentCandleData.close?.toFixed(2) || '-'}</span>
             </div>
             <div className="hud-item">
                <span className="hud-label">Active PnL</span>
                <span className="hud-value" style={{ color: pnl >= 0 ? '#4ade80' : '#ef4444' }}>
                    {openTrade ? `$${pnl.toFixed(2)}` : '-'}
                </span>
             </div>
        </div>

        <div className="playback-controls">
          <button onClick={handleStepBack}>Prev</button>
          {!isPlaying ? 
            <button onClick={handlePlay} className="play-btn">▶ Play</button> : 
            <button onClick={handlePause} className="pause-btn">⏸ Pause</button>
          }
          <button onClick={handleStepFwd}>Next</button>
          <button onClick={handleReset}>Reset</button>
          
          <div style={{display:'flex', alignItems:'center', gap:'5px', marginLeft:'10px'}}>
              <span style={{fontSize:'0.8rem', color:'#888'}}>Speed:</span>
              <input type="range" min="10" max="500" step="10" 
                 value={510 - playbackSpeed} 
                 onChange={(e) => setPlaybackSpeed(510 - Number(e.target.value))} 
              />
          </div>
        </div>
      </div>
      
      <div ref={chartContainerRef} className="chart-canvas" />
    </div>
  );
};
