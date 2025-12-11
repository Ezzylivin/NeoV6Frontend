// File: src/components/ChartReplay.jsx
// 🚀 UPGRADE: v64.4 - "Replay Table & Date Ranges"
// Fixes: 
// 1. Adds 'Data Range' display to header (matching ChartIndependent).
// 2. Positions Trade Log table directly under controls.
// 3. Implements strict Jet Black & Emerald theme.

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, CrosshairMode, LineStyle, ColorType } from 'lightweight-charts';
import { Calendar, ZoomIn, ZoomOut, Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import './ChartReplay.css';

export const ChartReplay = ({ results, symbol }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(100); 
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dataRange, setDataRange] = useState({ start: "--", end: "--", count: 0 });

  // --- 1. PARSE DATA ---
  const parseTime = (t) => {
      if (!t) return null;
      if (typeof t === 'object' && t.$date) t = t.$date;
      if (typeof t === 'number' && t < 10000000000) return t; 
      const d = new Date(t);
      return isNaN(d.getTime()) ? null : d.getTime() / 1000;
  };

  const candles = useMemo(() => {
    if (!results?.candleData || !Array.isArray(results.candleData)) return [];
    
    const parsed = results.candleData.map(c => ({
      time: parseTime(c.timestamp || c.time || c.datetime || c.date || c.start), 
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close),
    })).filter(c => c.time).sort((a, b) => a.time - b.time);

    // Calculate Data Range
    if (parsed.length > 0) {
        setDataRange({
            start: new Date(parsed[0].time * 1000).toLocaleDateString(),
            end: new Date(parsed[parsed.length - 1].time * 1000).toLocaleDateString(),
            count: parsed.length
        });
    }

    return parsed;
  }, [results]);

  const trades = useMemo(() => {
    if (!results?.tradeBreakdown || !Array.isArray(results.tradeBreakdown)) return [];
    
    return results.tradeBreakdown.map((t, i) => {
      const entryTime = parseTime(t.entryTime || t.entry_time || t.time || t.date);
      const exitTime = parseTime(t.exitTime || t.exit_time || t.close_time || t.date_out);
      const profit = parseFloat(t.profit || t.realized_pnl || t.pnl || 0);
      const exitPrice = parseFloat(t.exitPrice || t.exit_price || t.close_price || 0);

      return entryTime ? {
        id: i,
        time: entryTime, 
        position: (t.position || t.side || 'long').toLowerCase(), 
        price: parseFloat(t.entryPrice || t.entry_price || t.price || 0),
        profit: profit,
        exitTime: exitTime,
        exitPrice: exitPrice,
        isRealized: profit !== 0 || exitPrice > 0 
      } : null;
    }).filter(t => t !== null).sort((a, b) => a.time - b.time);
  }, [results]);

  // --- 2. AUTO-INIT ---
  useEffect(() => {
      if (candles.length > 0 && !isLoaded) {
          setCurrentIndex(0); // Start at beginning for replay
          setIsLoaded(true);
      }
  }, [candles, isLoaded]);

  // --- 3. INITIALIZE CHART ---
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    if (chartRef.current) { chartRef.current.remove(); }

    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 450,
      layout: { 
          background: { type: ColorType.Solid, color: "#000000" }, // Jet Black
          textColor: '#94a3b8',
          fontFamily: "'Inter', sans-serif" 
      }, 
      grid: { 
          vertLines: { color: 'rgba(6, 78, 59, 0.3)' }, // Emerald-900 transparent
          horzLines: { color: 'rgba(6, 78, 59, 0.3)' } 
      },
      crosshair: { 
          mode: CrosshairMode.Normal,
          vertLine: { labelBackgroundColor: '#064e3b' },
          horzLine: { labelBackgroundColor: '#064e3b' }
      },
      timeScale: { borderColor: '#064e3b', timeVisible: true },
      rightPriceScale: { borderColor: '#064e3b' },
    });

    candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#10b981', downColor: '#ef4444',
      borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#ef4444',
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

    const visibleCandles = candles.slice(0, currentIndex + 1);
    candlestickSeriesRef.current.setData(visibleCandles);

    const activeMarkers = [];
    trades.forEach(t => {
        if (t.time <= currentCandle.time) {
            activeMarkers.push({
                time: t.time,
                position: t.position === 'long' ? 'belowBar' : 'aboveBar',
                color: t.position === 'long' ? '#10b981' : '#f59e0b',
                shape: t.position === 'long' ? 'arrowUp' : 'arrowDown',
                text: `E`
            });
        }
        if (t.exitTime && t.exitTime <= currentCandle.time) {
            activeMarkers.push({
                time: t.exitTime,
                position: t.position === 'long' ? 'aboveBar' : 'belowBar',
                color: t.profit > 0 ? '#10b981' : '#ef4444',
                shape: 'circle',
                text: t.profit > 0 ? `+$${t.profit.toFixed(2)}` : `-$${Math.abs(t.profit).toFixed(2)}`
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

  // --- 6. CONTROLS ---
  const handlePlay = () => { if (currentIndex >= candles.length - 1) setCurrentIndex(0); setIsPlaying(true); };
  const handlePause = () => setIsPlaying(false);
  const handleReset = () => { setIsPlaying(false); setCurrentIndex(0); };
  const handleStepBack = () => setCurrentIndex(prev => Math.max(0, prev - 1));
  const handleStepFwd = () => setCurrentIndex(prev => Math.min(candles.length - 1, prev + 1));

  // ZOOM
  const handleZoomIn = () => { 
      if (!chartRef.current) return;
      const ts = chartRef.current.timeScale();
      const range = ts.getVisibleLogicalRange();
      if (!range) return;
      
      const width = range.to - range.from;
      const center = (range.from + range.to) / 2;
      const newWidth = width * 0.7; 
      
      ts.setVisibleLogicalRange({ from: center - newWidth / 2, to: center + newWidth / 2 });
  };

  const handleZoomOut = () => { 
      if (!chartRef.current) return;
      const ts = chartRef.current.timeScale();
      const range = ts.getVisibleLogicalRange();
      if (!range) return;
      
      const width = range.to - range.from;
      const center = (range.from + range.to) / 2;
      const newWidth = width * 1.3; 
      
      ts.setVisibleLogicalRange({ from: center - newWidth / 2, to: center + newWidth / 2 });
  };

  if (!results || !candles.length) return <div className="chart-loading">Loading Chart Data...</div>;

  // --- HUD CALCULATIONS ---
  const currentCandleData = candles[currentIndex] || {};
  const openTradesList = trades.filter(t => {
      const isStarted = t.time <= currentCandleData.time;
      const isNotEnded = !t.exitTime || t.exitTime > currentCandleData.time;
      const isZombie = !t.exitTime && t.isRealized; 
      return isStarted && isNotEnded && !isZombie;
  });
  const openTrade = openTradesList[openTradesList.length - 1]; 
  
  let pnl = 0;
  if (openTrade && currentCandleData && openTrade.price > 0) {
      // Simple calc for display - assumes 1 unit size for visualization
      const diff = currentCandleData.close - openTrade.price;
      pnl = openTrade.position === 'long' ? diff : -diff;
  }

  const visibleTrades = trades.filter(t => t.time <= currentCandleData.time).reverse();

  return (
    <div className="chart-replay-container">
      {/* --- HEADER --- */}
      <div className="chart-header-row">
        <div className="flex items-center gap-4">
            <h3>Replay: {symbol}</h3>
            {/* 🚀 NEW: Date Range Badge */}
            <div className="data-range-badge">
                <Calendar className="w-3 h-3 inline mr-1" />
                {dataRange.start} - {dataRange.end} ({dataRange.count} bars)
            </div>
        </div>
        
        <div className="flex items-center gap-4">
             {/* HUD */}
            <div className="replay-hud">
                <div className="hud-item">
                    <span className="hud-label">Price</span>
                    <span className="hud-value">${currentCandleData.close?.toFixed(2) || '-'}</span>
                </div>
                
                {openTrade ? (
                    <>
                        <div className="hud-item">
                            <span className="hud-label">Entry</span>
                            <span className="hud-value" style={{ color: '#fbbf24' }}>${openTrade.price.toFixed(2)}</span>
                        </div>
                        <div className="hud-item">
                            <span className="hud-label">PnL (Est)</span>
                            <span className="hud-value" style={{ color: pnl >= 0 ? '#10b981' : '#ef4444' }}>
                                {pnl > 0 ? '+' : ''}{pnl.toFixed(2)}
                            </span>
                        </div>
                    </>
                ) : (
                    <div className="hud-item"><span className="hud-label">Status</span><span className="hud-value" style={{color:'#64748b'}}>FLAT</span></div>
                )}
            </div>

            {/* CONTROLS */}
            <div className="playback-controls">
                <button onClick={handleZoomOut} title="Zoom Out"><ZoomOut size={16}/></button>
                <button onClick={handleZoomIn} title="Zoom In"><ZoomIn size={16}/></button>

                <button onClick={handleStepBack}><SkipBack size={16}/></button>
                {!isPlaying ? 
                    <button onClick={handlePlay} className="play-btn"><Play size={16} fill="currentColor" /> Play</button> : 
                    <button onClick={handlePause} className="pause-btn"><Pause size={16} fill="currentColor" /> Pause</button>
                }
                <button onClick={handleStepFwd}><SkipForward size={16}/></button>
                <button onClick={handleReset}><RotateCcw size={16}/></button>
                
                <div className="speed-control">
                    <span>Speed:</span>
                    <input type="range" min="10" max="500" step="10" 
                        value={510 - playbackSpeed} 
                        onChange={(e) => setPlaybackSpeed(510 - Number(e.target.value))} 
                    />
                </div>
            </div>
        </div>
      </div>
      
      {/* --- LOG PANEL (Under Header) --- */}
      <div className="replay-log-panel">
          {visibleTrades.length === 0 ? (
             <div className="empty-log">Waiting for trade execution...</div>
          ) : (
             <table className="trade-log-table">
                 <thead>
                     <tr>
                         <th>Dir</th>
                         <th>Entry</th>
                         <th>Status</th>
                         <th>Exit</th>
                         <th style={{textAlign:'right'}}>Realized PnL</th>
                     </tr>
                 </thead>
                 <tbody>
                     {visibleTrades.map((t, i) => {
                         const isTechnicallyOpen = !t.exitTime || t.exitTime > currentCandleData.time;
                         const isZombie = isTechnicallyOpen && t.isRealized;
                         const isOpen = isTechnicallyOpen && !isZombie;

                         return (
                            <tr key={i}>
                                <td style={{color: t.position === 'short' ? '#ef4444' : '#10b981', fontWeight:'bold'}}>
                                    {t.position.toUpperCase()}
                                </td>
                                <td>${t.price.toFixed(2)}</td>
                                <td>
                                    {isOpen ? 
                                        <span className="status-open">OPEN</span> 
                                        : 
                                        <span className="status-closed">CLOSED</span>
                                    }
                                </td>
                                <td>
                                    {!isOpen ? `$${t.exitPrice?.toFixed(2)}` : '-'}
                                </td>
                                <td style={{textAlign:'right', fontWeight: isOpen ? 'normal' : 'bold', color: !isOpen ? (t.profit > 0 ? '#10b981' : '#ef4444') : '#64748b'}}>
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
      <div className="chart-wrapper">
          <div ref={chartContainerRef} className="chart-canvas" />
      </div>
    </div>
  );
};
