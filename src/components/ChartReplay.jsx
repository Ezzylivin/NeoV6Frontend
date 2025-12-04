// File: src/components/ChartReplay.jsx
// 🚀 UPGRADE: Detailed Logs (Entry vs Exit) + Zoom + Enhanced HUD

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

  // --- 4. THE LOOP ---
  useEffect(() => {
    if (!candlestickSeriesRef.current || candles.length === 0) return;
    
    const currentCandle = candles[currentIndex];
    if (!currentCandle) return;

    // Update Price
    const visibleCandles = candles.slice(0, currentIndex + 1);
    candlestickSeriesRef.current.setData(visibleCandles);

    // Update Markers
    const activeMarkers = [];
    trades.forEach(t => {
        if (t.time <= currentCandle.time) {
            activeMarkers.push({
                time: t.time,
                position: 'belowBar',
                color: t.position === 'long' ? '#2196F3' : '#E91E63',
                shape: t.position === 'long' ? 'arrowUp' : 'arrowDown',
                text: `BUY @ ${t.price.toFixed(2)}`
            });
        }
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

    activeMarkers.sort((a, b) => a.time - b.time);
    candlestickSeriesRef.current.setMarkers(activeMarkers);

  }, [currentIndex, candles, trades]);

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

  // --- 6. Controls ---
  const handlePlay = () => { if (currentIndex >= candles.length - 1) setCurrentIndex(0); setIsPlaying(true); };
  const handlePause = () => setIsPlaying(false);
  const handleReset = () => { setIsPlaying(false); setCurrentIndex(0); };
  const handleStepBack = () => setCurrentIndex(prev => Math.max(0, prev - 1));
  const handleStepFwd = () => setCurrentIndex(prev => Math.min(candles.length - 1, prev + 1));

  const handleZoomIn = () => {
      if (!chartRef.current) return;
      const ts = chartRef.current.timeScale();
      const range = ts.getVisibleLogicalRange();
      if (!range) return;
      const rangeWidth = range.to - range.from;
      ts.setVisibleLogicalRange({ from: range.from + rangeWidth * 0.1, to: range.to - rangeWidth * 0.1 });
  };

  const handleZoomOut = () => {
      if (!chartRef.current) return;
      const ts = chartRef.current.timeScale();
      const range = ts.getVisibleLogicalRange();
      if (!range) return;
      const rangeWidth = range.to - range.from;
      ts.setVisibleLogicalRange({ from: range.from - rangeWidth * 0.1, to: range.to + rangeWidth * 0.1 });
  };

  if (!results || !candles.length) return <div className="chart-loading">Loading Chart Data...</div>;

  // --- HUD CALCULATIONS ---
  const currentCandleData = candles[currentIndex] || {};
  const openTrade = trades.find(t => t.time <= currentCandleData.time && (!t.exitTime || t.exitTime > currentCandleData.time));
  
  let pnl = 0;
  if (openTrade && currentCandleData && openTrade.price > 0) {
      pnl = (currentCandleData.close - openTrade.price) * (1000 / openTrade.price); 
      if (openTrade.position === 'short') pnl = -pnl;
  }

  // Filter for Overlay
  const visibleTrades = trades.filter(t => t.time <= currentCandleData.time).reverse().slice(0, 10); 

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
             
             {/* 🚀 NEW: Show ENTRY Price if a trade is Open */}
             {openTrade && (
                 <div className="hud-item">
                    <span className="hud-label">Entry</span>
                    <span className="hud-value" style={{ color: '#fbbf24' }}>${openTrade.price.toFixed(2)}</span>
                 </div>
             )}

             <div className="hud-item">
                <span className="hud-label">Active PnL</span>
                <span className="hud-value" style={{ color: pnl >= 0 ? '#4ade80' : '#ef4444' }}>
                    {openTrade ? `$${pnl.toFixed(2)}` : '-'}
                </span>
             </div>
        </div>

        <div className="playback-controls">
          <button onClick={handleZoomOut} title="Zoom Out" style={{marginRight:'5px', fontSize:'1.2em', padding:'5px 10px'}}> - </button>
          <button onClick={handleZoomIn} title="Zoom In" style={{marginRight:'15px', fontSize:'1.2em', padding:'5px 10px'}}> + </button>

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
      
      <div style={{ position: 'relative', width: '100%', height: '500px' }}>
          <div ref={chartContainerRef} className="chart-canvas" style={{ width: '100%', height: '100%' }} />

          {/* 🚀 OVERLAY: Shows Entry AND Exit */}
          <div className="replay-logs-overlay" style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              width: '320px', // Widened to fit columns
              maxHeight: '350px',
              overflowY: 'auto',
              backgroundColor: 'rgba(20, 20, 30, 0.9)',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '12px',
              zIndex: 20,
              backdropFilter: 'blur(4px)',
              pointerEvents: 'none'
          }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#94a3b8', borderBottom: '1px solid #444', paddingBottom: '5px', display:'flex', justifyContent:'space-between' }}>
                  <span>Type</span>
                  <span>Entry</span>
                  <span>Exit</span>
                  <span>PnL</span>
              </h4>
              {visibleTrades.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>Waiting for signals...</div>
              ) : (
                  visibleTrades.map((t, i) => (
                      <div key={i} style={{ marginBottom: '8px', fontSize: '0.8rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '5px', alignItems: 'center' }}>
                          <span style={{ color: t.position === 'short' ? '#f87171' : '#4ade80', fontWeight: 'bold' }}>
                              {t.position.toUpperCase()}
                          </span>
                          
                          <span style={{ color: '#ccc' }}>${t.price.toFixed(0)}</span>
                          
                          {t.exitTime && t.exitTime <= currentCandleData.time ? (
                             <>
                                <span style={{ color: '#ccc' }}>${t.exitPrice?.toFixed(0) || '-'}</span>
                                <span style={{ color: t.profit > 0 ? '#4ade80' : '#f87171', textAlign:'right' }}>
                                    {t.profit > 0 ? '+' : ''}{t.profit.toFixed(0)}
                                </span>
                             </>
                          ) : (
                             <>
                                <span style={{ color: '#fbbf24' }}>---</span>
                                <span style={{ color: '#fbbf24', textAlign:'right' }}>OPEN</span>
                             </>
                          )}
                      </div>
                  ))
              )}
          </div>
      </div>
    </div>
  );
};
