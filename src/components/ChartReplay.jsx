// File: src/components/ChartReplay.jsx
// 🚀 UPGRADE: v64.5 - "Replay Integrity & Alignment"
// 1. FIXED: Removed state mutation inside useMemo (anti-pattern fix).
// 2. FIXED: Added strict date filtering & deduplication logic.
// 3. FIXED: Implemented 'Nearest Candle' alignment for trades.
// 4. IMPROVED: Switched to ResizeObserver for robust layout handling.

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, CrosshairMode, LineStyle, ColorType } from 'lightweight-charts';
import { Calendar, ZoomIn, ZoomOut, Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import './ChartReplay.css';

export const ChartReplay = ({ 
    results, 
    symbol,
    startDate = null, // e.g. "2024-12-01"
    endDate = null    // e.g. "2024-12-31"
}) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(100); 
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dataRange, setDataRange] = useState({ start: "--", end: "--", count: 0 });

  // --- 1. PARSE & FILTER CANDLES (Pure Logic) ---
  const { candles, timeSet, validTimes } = useMemo(() => {
    if (!results?.candleData || !Array.isArray(results.candleData)) {
        return { candles: [], timeSet: new Set(), validTimes: [] };
    }
    
    // Parse Date Filters
    const startTs = startDate ? new Date(startDate).getTime() / 1000 : null;
    const endTs = endDate ? new Date(endDate).getTime() / 1000 + 86400 : null; // +24h buffer

    const uniqueSet = new Set();
    const processed = [];

    results.candleData.forEach(c => {
      // Robust Timestamp Parsing
      let t = c.timestamp || c.time || c.datetime || c.date || c.start;
      if (typeof t === 'object' && t.$date) t = t.$date;
      
      let dateObj;
      if (typeof t === 'number' && t > 10000000000) dateObj = new Date(t); // ms timestamp
      else if (typeof t === 'number') dateObj = new Date(t * 1000); // sec timestamp
      else dateObj = new Date(t);
      
      const timeStamp = Math.floor(dateObj.getTime() / 1000);

      // 1️⃣ Strict Date Filtering
      if (startTs && timeStamp < startTs) return;
      if (endTs && timeStamp > endTs) return;

      // 2️⃣ Deduplication
      if (timeStamp && !uniqueSet.has(timeStamp)) {
        uniqueSet.add(timeStamp);
        processed.push({
          time: timeStamp,
          open: parseFloat(c.open),
          high: parseFloat(c.high),
          low: parseFloat(c.low),
          close: parseFloat(c.close),
        });
      }
    });

    processed.sort((a, b) => a.time - b.time);
    return { 
        candles: processed, 
        timeSet: uniqueSet, 
        validTimes: Array.from(uniqueSet).sort((a, b) => a - b) 
    };
  }, [results, startDate, endDate]);

  // --- 2. UPDATE DATA RANGE STATE (Side Effect) ---
  useEffect(() => {
    if (candles.length > 0) {
        setDataRange({
            start: new Date(candles[0].time * 1000).toLocaleDateString(),
            end: new Date(candles[candles.length - 1].time * 1000).toLocaleDateString(),
            count: candles.length
        });
        // Auto-reset if data changes completely
        if (!isLoaded || currentIndex >= candles.length) {
            setCurrentIndex(0);
            setIsLoaded(true);
        }
    }
  }, [candles]);

  // --- 3. PARSE & ALIGN TRADES ---
  const trades = useMemo(() => {
    if (!results?.tradeBreakdown || !Array.isArray(results.tradeBreakdown) || validTimes.length === 0) return [];
    
    // Helper to find nearest candle time for marker alignment
    const findNearestTime = (targetTime) => {
        if (timeSet.has(targetTime)) return targetTime;
        let closest = validTimes[0];
        let minDiff = Math.abs(targetTime - closest);
        for (let t of validTimes) {
            const diff = Math.abs(targetTime - t);
            if (diff < minDiff) { minDiff = diff; closest = t; }
        }
        // Only snap if within 2 hours (avoid snapping daily trades to hourly charts aggressively)
        return minDiff < 7200 ? closest : null; 
    };

    const startTs = startDate ? new Date(startDate).getTime() / 1000 : null;
    const endTs = endDate ? new Date(endDate).getTime() / 1000 + 86400 : null;

    return results.tradeBreakdown.map((t, i) => {
      const entryRaw = new Date(t.entryTime || t.entry_time || t.time).getTime() / 1000;
      const exitRaw = t.exitTime ? new Date(t.exitTime).getTime() / 1000 : null;

      // Filter Logic
      if (startTs && entryRaw < startTs) return null;
      if (endTs && entryRaw > endTs) return null;

      // 3️⃣ Alignment Logic
      const entryTime = findNearestTime(entryRaw);
      const exitTime = exitRaw ? findNearestTime(exitRaw) : null;
      
      if (!entryTime) return null; // Skip if no valid candle found to attach marker to

      const profit = parseFloat(t.profit || 0);
      const exitPrice = parseFloat(t.exitPrice || 0);

      return {
        id: i,
        time: entryTime, // The visual time on chart
        realEntryTime: entryRaw, // The actual execution time
        position: (t.position || t.side || 'long').toLowerCase(),
        price: parseFloat(t.entryPrice || 0),
        profit: profit,
        exitTime: exitTime,
        realExitTime: exitRaw,
        exitPrice: exitPrice,
        isRealized: profit !== 0 || exitPrice > 0
      };
    }).filter(t => t !== null).sort((a, b) => a.time - b.time);
  }, [results, candles, validTimes, timeSet, startDate, endDate]);

  // --- 4. INITIALIZE CHART ---
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    if (chartRef.current) { chartRef.current.remove(); }

    // Create Chart
    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 450,
      layout: { 
          background: { type: ColorType.Solid, color: "transparent" }, // Jet Black via CSS
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
      timeScale: { borderColor: '#064e3b', timeVisible: true, barSpacing: 6 },
      rightPriceScale: { borderColor: '#064e3b' },
    });

    candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#10b981', downColor: '#ef4444',
      borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#ef4444',
    });

    // 5️⃣ Robust Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
        if (!entries || entries.length === 0) return;
        const { width } = entries[0].contentRect;
        if (chartRef.current) {
            chartRef.current.applyOptions({ width });
        }
    });
    resizeObserver.observe(chartContainerRef.current);

    // Initial Data Set
    candlestickSeriesRef.current.setData(candles);
    chartRef.current.timeScale().fitContent();

    return () => { 
        resizeObserver.disconnect();
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }
    };
  }, [candles.length]); // Re-init only if data drastically changes (length check is proxy)

  // --- 5. THE LOOP (Update Logic) ---
  useEffect(() => {
    if (!candlestickSeriesRef.current || candles.length === 0) return;
    
    const currentCandle = candles[currentIndex];
    if (!currentCandle) return;

    // Slice data up to current frame
    const visibleCandles = candles.slice(0, currentIndex + 1);
    candlestickSeriesRef.current.setData(visibleCandles);

    // Calculate Markers for visible range
    const activeMarkers = [];
    trades.forEach(t => {
        // Entry Marker
        if (t.time <= currentCandle.time) {
            activeMarkers.push({
                time: t.time,
                position: t.position === 'long' ? 'belowBar' : 'aboveBar',
                color: t.position === 'long' ? '#10b981' : '#f59e0b',
                shape: t.position === 'long' ? 'arrowUp' : 'arrowDown',
                text: `E`
            });
        }
        // Exit Marker
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

  // --- 6. Playback Interval ---
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

  // --- CONTROLS HANDLERS ---
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
      const width = range.to - range.from;
      const center = (range.from + range.to) / 2;
      ts.setVisibleLogicalRange({ from: center - (width * 0.7) / 2, to: center + (width * 0.7) / 2 });
  };

  const handleZoomOut = () => { 
      if (!chartRef.current) return;
      const ts = chartRef.current.timeScale();
      const range = ts.getVisibleLogicalRange();
      if (!range) return;
      const width = range.to - range.from;
      const center = (range.from + range.to) / 2;
      ts.setVisibleLogicalRange({ from: center - (width * 1.3) / 2, to: center + (width * 1.3) / 2 });
  };

  if (!results || !candles.length) return <div className="chart-loading">Loading Chart Data...</div>;

  // --- HUD CALCULATIONS ---
  const currentCandleData = candles[currentIndex] || {};
  
  // Find currently open trade relative to replay time
  const openTrade = trades.find(t => 
      t.time <= currentCandleData.time && 
      (!t.exitTime || t.exitTime > currentCandleData.time)
  );
  
  let pnl = 0;
  if (openTrade && currentCandleData && openTrade.price > 0) {
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
                     {visibleTrades.map((t) => {
                         const isTechnicallyOpen = !t.exitTime || t.exitTime > currentCandleData.time;
                         const isOpen = isTechnicallyOpen && !t.isRealized;

                         return (
                            <tr key={t.id}>
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
