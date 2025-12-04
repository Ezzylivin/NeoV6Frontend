// File: src/components/ChartReplay.jsx
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

  // --- 1. PARSE DATA (ROBUST VERSION) ---
  const parseTime = (t) => {
      if (!t) return null;
      if (typeof t === 'object' && t.$date) t = t.$date;
      
      // Handle Python/Unix seconds vs JS milliseconds
      // If it's a number and small (e.g. < 2 billion), it's likely seconds.
      if (typeof t === 'number' && t < 10000000000) return t; 
      
      const d = new Date(t);
      return isNaN(d.getTime()) ? null : d.getTime() / 1000;
  };

  const candles = useMemo(() => {
    if (!results?.candleData || !Array.isArray(results.candleData)) return [];
    return results.candleData.map(c => ({
      time: parseTime(c.timestamp || c.time || c.datetime || c.date), 
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close),
    })).filter(c => c.time).sort((a, b) => a.time - b.time);
  }, [results]);

  const trades = useMemo(() => {
    if (!results?.tradeBreakdown || !Array.isArray(results.tradeBreakdown)) return [];
    
    return results.tradeBreakdown.map(t => {
      // Try multiple keys for entry/exit times to be safe
      const entryTime = parseTime(t.entryTime || t.entry_time || t.time || t.date);
      const exitTime = parseTime(t.exitTime || t.exit_time || t.close_time || t.date_out);
      
      const profit = parseFloat(t.profit || t.realized_pnl || t.pnl || 0);
      const exitPrice = parseFloat(t.exitPrice || t.exit_price || t.close_price || 0);

      return entryTime ? {
        time: entryTime, 
        position: (t.position || t.side || 'long').toLowerCase(), 
        price: parseFloat(t.entryPrice || t.entry_price || t.price || 0),
        profit: profit,
        exitTime: exitTime,
        exitPrice: exitPrice,
        // Helper to detect if it SHOULD be closed but lacks time
        isRealized: profit !== 0 || exitPrice > 0 
      } : null;
    }).filter(t => t !== null).sort((a, b) => a.time - b.time);
  }, [results]);

  // --- 2. AUTO-INIT ---
  useEffect(() => {
      if (candles.length > 0 && !isLoaded) {
          setCurrentIndex(candles.length - 1); 
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

  // --- 4. THE LOOP (Update Visuals) ---
  useEffect(() => {
    if (!candlestickSeriesRef.current || candles.length === 0) return;
    
    const currentCandle = candles[currentIndex];
    if (!currentCandle) return;

    // Update Price Series
    const visibleCandles = candles.slice(0, currentIndex + 1);
    candlestickSeriesRef.current.setData(visibleCandles);

    // Update Markers
    const activeMarkers = [];
    trades.forEach(t => {
        // Entry Marker
        if (t.time <= currentCandle.time) {
            activeMarkers.push({
                time: t.time,
                position: 'belowBar',
                color: t.position === 'long' ? '#2196F3' : '#E91E63',
                shape: t.position === 'long' ? 'arrowUp' : 'arrowDown',
                text: `BUY @ ${t.price.toFixed(2)}`
            });
        }
        // Exit Marker (Only if we have a valid exit time)
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
  const handleZoomIn = () => { if (chartRef.current) chartRef.current.timeScale().applyOptions({ shiftVisibleRangeOnNewBar: false }); chartRef.current.timeScale().scaleIn(); };
  const handleZoomOut = () => { if (chartRef.current) chartRef.current.timeScale().scaleOut(); };

  if (!results || !candles.length) return <div className="chart-loading">Loading Chart Data...</div>;

  // --- HUD CALCULATIONS ---
  const currentCandleData = candles[currentIndex] || {};
  
  // HUD FIX: Find the *latest* trade that is effectively open
  // A trade is open if we are past entry, AND (we are before exit OR exit is unknown)
  // We filter out trades that are "Realized" (have profit) but missing timestamps to avoid zombies in HUD
  const openTradesList = trades.filter(t => {
      const isStarted = t.time <= currentCandleData.time;
      const isNotEnded = !t.exitTime || t.exitTime > currentCandleData.time;
      // Safety: If it has realized profit, don't count it as open in HUD even if time is missing
      const isZombie = !t.exitTime && t.isRealized; 
      return isStarted && isNotEnded && !isZombie;
  });
  
  const openTrade = openTradesList[openTradesList.length - 1]; // Get the most recent one
  
  let pnl = 0;
  if (openTrade && currentCandleData && openTrade.price > 0) {
      pnl = (currentCandleData.close - openTrade.price) * (1000 / openTrade.price); 
      if (openTrade.position === 'short') pnl = -pnl;
  }

  // Filter for Log Panel
  const visibleTrades = trades.filter(t => t.time <= currentCandleData.time).reverse();

  return (
    <div className="chart-replay-container">
      {/* --- HEADER --- */}
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
             
             {openTrade ? (
                 <>
                    <div className="hud-item">
                        <span className="hud-label">Entry ({openTrade.position.toUpperCase()})</span>
                        <span className="hud-value" style={{ color: '#fbbf24' }}>${openTrade.price.toFixed(2)}</span>
                    </div>
                    <div className="hud-item">
                        <span className="hud-label">Active PnL</span>
                        <span className="hud-value" style={{ color: pnl >= 0 ? '#4ade80' : '#ef4444' }}>
                            {`$${pnl.toFixed(2)}`}
                        </span>
                    </div>
                 </>
             ) : (
                <div className="hud-item"><span className="hud-label">Status</span><span className="hud-value">FLAT</span></div>
             )}
        </div>

        <div className="playback-controls">
          <button onClick={handleZoomOut} title="Zoom Out" style={{marginRight:'5px', fontSize:'1.2em', padding:'0 8px'}}>-</button>
          <button onClick={handleZoomIn} title="Zoom In" style={{marginRight:'15px', fontSize:'1.2em', padding:'0 8px'}}>+</button>

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
      
      {/* --- LOG PANEL --- */}
      <div className="replay-log-panel" style={{
          height: '140px', 
          backgroundColor: '#161621', 
          borderTop: '1px solid #334155',
          borderBottom: '1px solid #334155',
          marginBottom: '0', 
          overflowY: 'auto',
          padding: '0',
          display: 'flex',
          flexDirection: 'column'
      }}>
          {visibleTrades.length === 0 ? (
             <div style={{padding:'10px', color:'#666', fontStyle:'italic'}}>No trades executed yet...</div>
          ) : (
             <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.85rem'}}>
                 <thead style={{position:'sticky', top:0, background:'#1e1e2e', zIndex:5}}>
                     <tr style={{color:'#94a3b8', borderBottom:'1px solid #444', textAlign:'left'}}>
                         <th style={{padding:'6px 15px'}}>Dir</th>
                         <th style={{padding:'6px 15px'}}>Entry</th>
                         <th style={{padding:'6px 15px'}}>Status</th>
                         <th style={{padding:'6px 15px'}}>Exit</th>
                         <th style={{padding:'6px 15px', textAlign:'right'}}>Realized PnL</th>
                     </tr>
                 </thead>
                 <tbody>
                     {visibleTrades.map((t, i) => {
                         // LOGIC FIX: Check strict time, OR check if profit implies it's done
                         const isTechnicallyOpen = !t.exitTime || t.exitTime > currentCandleData.time;
                         
                         // If it's technically open, BUT we have realized profit/exit price, it's a "Zombie" (Closed but missing time)
                         // We display it as CLOSED to clean up the UI.
                         const isZombie = isTechnicallyOpen && t.isRealized;
                         const isOpen = isTechnicallyOpen && !isZombie;

                         return (
                            <tr key={i} style={{borderBottom:'1px solid #222', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'}}>
                                <td style={{padding:'4px 15px', color: t.position === 'short' ? '#f87171' : '#4ade80', fontWeight:'bold'}}>
                                    {t.position.toUpperCase()}
                                </td>
                                <td style={{padding:'4px 15px', color:'#ccc'}}>${t.price.toFixed(2)}</td>
                                <td style={{padding:'4px 15px'}}>
                                    {isOpen ? 
                                        <span style={{color:'#fbbf24', background:'rgba(251, 191, 36, 0.1)', padding:'2px 6px', borderRadius:'4px', fontSize:'0.75rem'}}>OPEN</span> 
                                        : 
                                        <span style={{color:'#94a3b8', fontSize:'0.75rem'}}>CLOSED</span>
                                    }
                                </td>
                                <td style={{padding:'4px 15px', color:'#ccc'}}>
                                    {!isOpen ? `$${t.exitPrice?.toFixed(2)}` : '-'}
                                </td>
                                <td style={{padding:'4px 15px', textAlign:'right', fontWeight: isOpen ? 'normal' : 'bold', color: !isOpen ? (t.profit > 0 ? '#4ade80' : '#f87171') : '#666'}}>
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
