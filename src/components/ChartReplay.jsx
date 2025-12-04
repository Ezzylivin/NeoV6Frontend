// File: src/components/ChartReplay.jsx
// 🚀 UPGRADE: Logs moved to dedicated panel (No overlapping)

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
      height: 450, // Slightly reduced to make room for logs
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

  // Filter for Log Panel
  const visibleTrades = trades.filter(t => t.time <= currentCandleData.time).reverse();

  return (
    <div className="chart-replay-container">
      {/* --- HEADER: Info & Controls --- */}
      <div className="chart-header-row" style={{borderBottom:'none', paddingBottom:'5px'}}>
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
      
      {/* --- DEDICATED LOG PANEL (Below Header, Above Chart) --- */}
      <div className="replay-log-panel" style={{
          height: '120px', 
          backgroundColor: '#161621', 
          borderTop: '1px solid #334155',
          borderBottom: '1px solid #334155',
          marginBottom: '0', 
          overflowY: 'auto',
          padding: '8px 15px',
          display: 'flex',
          flexDirection: 'column'
      }}>
          {visibleTrades.length === 0 ? (
             <div style={{color:'#666', fontSize:'0.9rem', fontStyle:'italic'}}>No trades executed yet...</div>
          ) : (
             <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.85rem'}}>
                 <thead>
                     <tr style={{color:'#94a3b8', borderBottom:'1px solid #333', textAlign:'left'}}>
                         <th style={{paddingBottom:'4px'}}>Direction</th>
                         <th style={{paddingBottom:'4px'}}>Entry Price</th>
                         <th style={{paddingBottom:'4px'}}>Status</th>
                         <th style={{paddingBottom:'4px'}}>Exit Price</th>
                         <th style={{paddingBottom:'4px', textAlign:'right'}}>Realized PnL</th>
                     </tr>
                 </thead>
                 <tbody>
                     {visibleTrades.map((t, i) => {
                         const isOpen = !t.exitTime || t.exitTime > currentCandleData.time;
                         return (
                            <tr key={i} style={{borderBottom:'1px solid #222'}}>
                                <td style={{padding:'4px 0', color: t.position === 'short' ? '#f87171' : '#4ade80', fontWeight:'bold'}}>
                                    {t.position.toUpperCase()}
                                </td>
                                <td style={{padding:'4px 0', color:'#ccc'}}>${t.price.toFixed(2)}</td>
                                <td style={{padding:'4px 0'}}>
                                    {isOpen ? <span style={{color:'#fbbf24', background:'rgba(251, 191, 36, 0.1)', padding:'2px 6px', borderRadius:'4px'}}>OPEN</span> : <span style={{color:'#94a3b8'}}>CLOSED</span>}
                                </td>
                                <td style={{padding:'4px 0', color:'#ccc'}}>
                                    {!isOpen ? `$${t.exitPrice?.toFixed(2)}` : '-'}
                                </td>
                                <td style={{padding:'4px 0', textAlign:'right', fontWeight: isOpen ? 'normal' : 'bold', color: !isOpen ? (t.profit > 0 ? '#4ade80' : '#f87171') : '#666'}}>
                                    {!isOpen ? (t.profit > 0 ? `+$${t.profit.toFixed(2)}` : `$${t.profit.toFixed(2)}`) : '-'}
                                </td>
                            </tr>
                         );
                     })}
                 </tbody>
             </table>
          )}
      </div>

      {/* --- CHART CANVAS --- */}
      <div style={{ position: 'relative', width: '100%', height: '450px' }}>
          <div ref={chartContainerRef} className="chart-canvas" style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};
