// File: src/components/ChartReplay.jsx
// 🚀 UPGRADE: Fixed Time Parsing & Added Safety Guards

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
  
  // --- 1. Robust Time Parsing Helper ---
  const parseTime = (t) => {
      if (!t) return null;
      // Handle MongoDB style { $date: ... }
      if (typeof t === 'object' && t.$date) t = t.$date;
      
      const d = new Date(t);
      if (isNaN(d.getTime())) return null;
      
      // Return Unix Timestamp (Seconds) for Lightweight Charts
      return d.getTime() / 1000; 
  };

  // --- 2. Parse Data ---
  const candles = useMemo(() => {
    if (!results?.candleData || !Array.isArray(results.candleData)) return [];
    
    return results.candleData.map(c => {
      const time = parseTime(c.timestamp || c.time);
      if (!time) return null;
      return {
        time: time, 
        open: parseFloat(c.open),
        high: parseFloat(c.high),
        low: parseFloat(c.low),
        close: parseFloat(c.close),
      };
    })
    .filter(c => c !== null) // Remove invalid candles
    .sort((a, b) => a.time - b.time);
  }, [results]);

  const trades = useMemo(() => {
    if (!results?.tradeBreakdown || !Array.isArray(results.tradeBreakdown)) return [];
    
    return results.tradeBreakdown.map(t => {
      const entryTimestamp = parseTime(t.entryTime || t.time);
      let exitTimestamp = parseTime(t.exitTime);
      
      // Fallback logic for exit time
      if (!exitTimestamp && t.time && entryTimestamp) {
          const tTime = parseTime(t.time);
          if (tTime > entryTimestamp) exitTimestamp = tTime;
      }

      if (!entryTimestamp) return null;

      return {
        time: entryTimestamp, 
        position: t.position || 'long', 
        price: parseFloat(t.entryPrice || t.price || 0),
        profit: parseFloat(t.profit_usd || t.profit || 0),
        exitTime: exitTimestamp,
        exitPrice: parseFloat(t.exitPrice || t.price || 0)
      };
    })
    .filter(t => t !== null)
    .sort((a, b) => a.time - b.time);
  }, [results]);

  // --- 3. HUD & Log Logic ---
  const currentCandle = candles[currentIndex];
  
  const tradeLog = useMemo(() => {
    if (!currentCandle) return [];
    return trades
      .filter(t => t.time <= currentCandle.time)
      .sort((a, b) => b.time - a.time);
  }, [trades, currentIndex, currentCandle]);

  const openTrade = trades.find(t => t.time <= currentCandle?.time && (!t.exitTime || t.exitTime > currentCandle?.time));
  
  let pnl = 0;
  if (openTrade && currentCandle && openTrade.price > 0) {
      if (openTrade.position === 'long') {
          pnl = (currentCandle.close - openTrade.price) * (1000 / openTrade.price); 
      } else {
          pnl = (openTrade.price - currentCandle.close) * (1000 / openTrade.price);
      }
  }

  // --- 4. Initialize Chart ---
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    // Cleanup old chart if exists
    if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
    }

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

    const initialData = candles.slice(0, 1); // Start with just 1 candle
    candlestickSeriesRef.current.setData(initialData);
    
    // Auto-scale
    chartRef.current.timeScale().fitContent();

    // Handle Resize
    const handleResize = () => {
        if (chartRef.current && chartContainerRef.current) {
            chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
    };
    window.addEventListener('resize', handleResize);

    return () => { 
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) chartRef.current.remove(); 
    };
  }, [candles]); // Re-init only if data changes completely

  // --- 5. Update Chart Loop (Fast) ---
  useEffect(() => {
    if (!candlestickSeriesRef.current || candles.length === 0) return;
    
    // Efficient update: Set data up to current index
    // Note: setData is heavier than update, but required for "replay" effect 
    // where future candles shouldn't exist yet.
    const slice = candles.slice(0, currentIndex + 1);
    candlestickSeriesRef.current.setData(slice);
    
    updateMarkers(currentIndex);
    
    // Auto-scroll only if playing
    if (currentIndex > 0 && isPlaying) {
       // Optional: chartRef.current.timeScale().scrollToPosition(0, false);
    }
  }, [currentIndex, isPlaying]); // Removed 'candles' dep to avoid re-render loop

  const updateMarkers = (index) => {
    const currentTime = candles[index]?.time;
    if (!currentTime) return;

    const markers = [];
    trades.forEach(t => {
      if (Math.abs(t.time - currentTime) < 60) { // Entry match (approx)
        markers.push({
          time: t.time,
          position: 'belowBar',
          color: t.position === 'long' ? '#2196F3' : '#E91E63',
          shape: t.position === 'long' ? 'arrowUp' : 'arrowDown',
          text: `BUY @ ${t.price.toFixed(2)}`
        });
      }
      if (t.exitTime && Math.abs(t.exitTime - currentTime) < 60) { // Exit match
        markers.push({
          time: t.exitTime,
          position: 'aboveBar',
          color: t.profit > 0 ? '#4CAF50' : '#F44336',
          shape: 'circle',
          text: `EXIT ($${t.profit?.toFixed(2)})`
        });
      }
    });
    
    // Markers must be sorted by time
    markers.sort((a, b) => a.time - b.time);
    candlestickSeriesRef.current.setMarkers(markers);
  };

  // --- 6. Playback Loop ---
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

  const handlePlay = () => { if (currentIndex >= candles.length - 1) setCurrentIndex(0); setIsPlaying(true); };
  const handlePause = () => setIsPlaying(false);
  const handleReset = () => { setIsPlaying(false); setCurrentIndex(0); };
  const handleForward = () => setCurrentIndex(prev => Math.min(prev + 1, candles.length - 1));
  const handleBackward = () => setCurrentIndex(prev => Math.max(prev - 1, 0));

  if (!results || !candles.length) return <div className="chart-loading">Waiting for candle data...</div>;

  const formatTime = (t) => new Date(t * 1000).toLocaleString();
  const getPnlColor = (pnl) => (pnl > 0 ? '#00ff88' : pnl < 0 ? '#ff3b30' : '#9ca3af');
  const positionText = openTrade && openTrade.position ? openTrade.position.toUpperCase() : 'FLAT';

  return (
    <div className="chart-replay-container">
      <div className="chart-header-row">
        <h3>Market Replay: {symbol}</h3>
        
        <div className="replay-hud">
             <div className="hud-item">
                <span className="hud-label">Pos</span>
                <span className="hud-value" style={{color: openTrade ? (openTrade.position === 'long' ? '#22c55e' : '#ef4444') : '#9ca3af'}}>
                    {positionText}
                </span>
             </div>
             <div className="hud-item">
                <span className="hud-label">Open PnL</span>
                <span className="hud-value" style={{ color: getPnlColor(pnl) }}>
                    ${pnl.toFixed(2)}
                </span>
             </div>
             <div className="hud-item">
                <span className="hud-label">Entry</span>
                <span className="hud-value" style={{ color: '#fff' }}>
                    {openTrade ? `$${openTrade.price.toFixed(2)}` : '-'}
                </span>
             </div>
        </div>

        <div className="playback-controls">
          <button onClick={handleBackward}>Step Back</button>
          {!isPlaying ? <button onClick={handlePlay} className="play-btn">▶ Play</button> : <button onClick={handlePause} className="pause-btn">⏸ Pause</button>}
          <button onClick={handleForward}>Step Fwd</button>
          <button onClick={handleReset}>Reset</button>
          <label style={{marginLeft: '15px'}}>
              Speed
              <input type="range" min="10" max="500" step="10" value={510 - playbackSpeed} onChange={(e) => setPlaybackSpeed(510 - Number(e.target.value))} />
          </label>
        </div>
      </div>

      {/* TRADE LOG */}
      <div className="trade-log-container">
        <div className="trade-log-header">
            <h4>Live Trade Log</h4>
            <span className="log-count">{tradeLog.length} Trades</span>
        </div>
        <div className="trade-log-table-wrapper">
            <table className="trade-log-table">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Entry Date</th>
                        <th>Entry Price</th>
                        <th>Exit Date</th>
                        <th>Exit Price</th>
                        <th>PnL</th>
                    </tr>
                </thead>
                <tbody>
                    {tradeLog.length === 0 ? (
                        <tr><td colSpan="6" style={{textAlign:'center', padding:'15px', color:'#666'}}>No trades yet. Press Play!</td></tr>
                    ) : (
                        tradeLog.map((trade, i) => (
                            <tr key={i} className="trade-row">
                                <td style={{ color: trade.position === 'long' ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
                                    {(trade.position || 'UNK').toUpperCase()} 
                                </td>
                                <td>{formatTime(trade.time)}</td>
                                <td style={{ color: '#60a5fa', fontWeight: 'bold' }}>${trade.price.toFixed(2)}</td>
                                <td>{trade.exitTime ? formatTime(trade.exitTime) : <span style={{color:'#eab308', fontWeight:'bold'}}>OPEN</span>}</td>
                                <td>{trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '-'}</td>
                                <td style={{ color: trade.profit > 0 ? '#22c55e' : trade.profit < 0 ? '#ef4444' : '#ddd', fontWeight: 'bold' }}>
                                    {trade.profit !== undefined ? `$${trade.profit.toFixed(2)}` : '-'}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
      
      <div ref={chartContainerRef} className="chart-canvas" />
    </div>
  );
};
