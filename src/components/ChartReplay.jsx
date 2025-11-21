// File: src/components/ChartReplay.jsx
// 🚀 UPGRADE: Added Safety Guards to prevent crashes on missing data.
// 🚀 UPGRADE: Layout optimized (Log on Top).

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
  
  // --- 1. Parse Data ---
  const candles = useMemo(() => {
    if (!results?.candleData) return [];
    return results.candleData.map(c => ({
      time: new Date(c.timestamp).getTime() / 1000, 
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    })).sort((a, b) => a.time - b.time);
  }, [results]);

  const trades = useMemo(() => {
    if (!results?.tradeBreakdown) return [];
    return results.tradeBreakdown.map(t => {
      // Prioritize entryTime, fallback to time
      const entryTimestamp = t.entryTime ? new Date(t.entryTime).getTime() : (t.time ? new Date(t.time).getTime() : null);
      
      // Determine Exit Time
      let exitTimestamp = t.exitTime ? new Date(t.exitTime).getTime() : null;
      if (!exitTimestamp && t.time && new Date(t.time).getTime() > entryTimestamp) {
          exitTimestamp = new Date(t.time).getTime();
      }

      return {
        time: entryTimestamp / 1000, 
        // 🛡️ SAFETY FIX: Default to 'long' if missing to prevent crash
        position: t.position || 'long', 
        price: t.entryPrice || 0,
        profit: t.profit_usd || t.profit,
        exitTime: exitTimestamp ? exitTimestamp / 1000 : null,
        exitPrice: t.exitPrice || t.price
      };
    }).filter(t => t.time); // Filter out invalid
  }, [results]);

  // --- 2. HUD & Log Logic ---
  const currentCandle = candles[currentIndex];
  
  const tradeLog = useMemo(() => {
    if (!currentCandle) return [];
    return trades
      .filter(t => t.time <= currentCandle.time)
      .sort((a, b) => b.time - a.time);
  }, [trades, currentIndex, currentCandle]);

  const openTrade = trades.find(t => t.time <= currentCandle?.time && (!t.exitTime || t.exitTime > currentCandle?.time));
  
  let pnl = 0;
  let pnlPct = 0;
  
  if (openTrade && currentCandle && openTrade.price > 0) {
      if (openTrade.position === 'long') {
          pnl = (currentCandle.close - openTrade.price) * (1000 / openTrade.price); 
          pnlPct = ((currentCandle.close - openTrade.price) / openTrade.price) * 100;
      } else {
          pnl = (openTrade.price - currentCandle.close) * (1000 / openTrade.price);
          pnlPct = ((openTrade.price - currentCandle.close) / openTrade.price) * 100;
      }
  }

  // --- 3. Initialize Chart ---
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

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

    candlestickSeriesRef.current.setData(candles.slice(0, currentIndex + 1));
    updateMarkers(currentIndex);

    return () => { chartRef.current.remove(); };
  }, [candles]); 

  // --- 4. Update Chart Loop ---
  useEffect(() => {
    if (!candlestickSeriesRef.current || candles.length === 0) return;
    const slice = candles.slice(0, currentIndex + 1);
    candlestickSeriesRef.current.setData(slice);
    updateMarkers(currentIndex);
    
    if (currentIndex > 0 && isPlaying) {
       chartRef.current.timeScale().scrollToPosition(0, false);
    }
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
          text: `BUY @ ${t.price.toFixed(2)}`
        });
      }
      if (t.exitTime && t.exitTime <= currentTime) {
        markers.push({
          time: t.exitTime,
          position: 'aboveBar',
          color: t.profit > 0 ? '#4CAF50' : '#F44336',
          shape: 'circle',
          text: `EXIT ($${t.profit?.toFixed(2)})`
        });
      }
    });
    
    markers.sort((a, b) => a.time - b.time);
    candlestickSeriesRef.current.setMarkers(markers);
  };

  // --- 5. Playback Loop ---
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

  const handlePlay = () => { if (currentIndex >= candles.length - 1) setCurrentIndex(0); setIsPlaying(true); };
  const handlePause = () => setIsPlaying(false);
  const handleReset = () => { setIsPlaying(false); setCurrentIndex(0); };
  const handleForward = () => setCurrentIndex(prev => Math.min(prev + 1, candles.length - 1));
  const handleBackward = () => setCurrentIndex(prev => Math.max(prev - 1, 0));

  if (!results || !candles.length) return null;

  const formatTime = (t) => new Date(t * 1000).toLocaleString();
  const getPnlColor = (pnl) => (pnl > 0 ? '#00ff88' : pnl < 0 ? '#ff3b30' : '#9ca3af');

  // 🛡️ SAFETY FIX: Handle undefined position in HUD
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
