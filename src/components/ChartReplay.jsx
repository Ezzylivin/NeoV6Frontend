import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, CrosshairMode, LineStyle, ColorType } from 'lightweight-charts';
import { Calendar, ZoomIn, ZoomOut, Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import './ChartReplay.css';

export const ChartReplay = ({ 
    results, 
    symbol,
    startDate = null, 
    endDate = null 
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
    // 🔍 LOG: Check raw input
    console.log("📊 [REPLAY DEBUG] Raw CandleData received:", results?.candleData?.length || 0, "bars");
    
    if (!results?.candleData || !Array.isArray(results.candleData)) {
        return { candles: [], timeSet: new Set(), validTimes: [] };
    }
    
    const startTs = startDate ? new Date(startDate).getTime() / 1000 : null;
    const endTs = endDate ? new Date(endDate).getTime() / 1000 + 86400 : null;

    const uniqueSet = new Set();
    const processed = [];

    results.candleData.forEach((c, idx) => {
      let t = c.timestamp || c.time || c.datetime || c.date || c.start;
      if (typeof t === 'object' && t.$date) t = t.$date;
      
      let dateObj = new Date(t);
      const timeStamp = Math.floor(dateObj.getTime() / 1000);

      if (isNaN(timeStamp)) {
          if (idx === 0) console.warn("⚠️ [REPLAY DEBUG] Invalid timestamp format at index 0:", t);
          return;
      }

      // 1️⃣ Date Filtering Check
      if (startTs && timeStamp < startTs) return;
      if (endTs && timeStamp > endTs) return;

      // 2️⃣ Deduplication & Parsing
      if (!uniqueSet.has(timeStamp)) {
        uniqueSet.add(timeStamp);
        processed.push({
          time: timeStamp,
          open: parseFloat(c.open || 0),
          high: parseFloat(c.high || 0),
          low: parseFloat(c.low || 0),
          close: parseFloat(c.close || 0),
        });
      }
    });

    processed.sort((a, b) => a.time - b.time);
    
    // 🔍 LOG: Final processed count
    console.log("✅ [REPLAY DEBUG] Processed candles after filtering:", processed.length);
    if (processed.length > 0) console.log("📅 [REPLAY DEBUG] Date range in processed data:", new Date(processed[0].time * 1000).toISOString(), "to", new Date(processed[processed.length-1].time * 1000).toISOString());

    return { 
        candles: processed, 
        timeSet: uniqueSet, 
        validTimes: Array.from(uniqueSet).sort((a, b) => a - b) 
    };
  }, [results, startDate, endDate]);

  // --- 2. UPDATE DATA RANGE STATE ---
  useEffect(() => {
    if (candles.length > 0) {
        setDataRange({
            start: new Date(candles[0].time * 1000).toLocaleDateString(),
            end: new Date(candles[candles.length - 1].time * 1000).toLocaleDateString(),
            count: candles.length
        });
        if (!isLoaded || currentIndex >= candles.length) {
            setCurrentIndex(0);
            setIsLoaded(true);
        }
    }
  }, [candles]);

  // --- 3. PARSE & ALIGN TRADES ---
  const trades = useMemo(() => {
    console.log("📈 [REPLAY DEBUG] Trade Breakdown count:", results?.tradeBreakdown?.length || 0);
    if (!results?.tradeBreakdown || !Array.isArray(results.tradeBreakdown) || validTimes.length === 0) return [];
    
    const findNearestTime = (targetTime) => {
        if (timeSet.has(targetTime)) return targetTime;
        let closest = validTimes[0];
        let minDiff = Math.abs(targetTime - closest);
        for (let t of validTimes) {
            const diff = Math.abs(targetTime - t);
            if (diff < minDiff) { minDiff = diff; closest = t; }
        }
        return minDiff < 7200 ? closest : null; 
    };

    const finalTrades = results.tradeBreakdown.map((t, i) => {
      const entryRaw = new Date(t.entryTime || t.entry_time || t.time).getTime() / 1000;
      const entryTime = findNearestTime(entryRaw);
      if (!entryTime) return null;

      return {
        id: i,
        time: entryTime,
        position: (t.position || t.side || 'long').toLowerCase(),
        price: parseFloat(t.entryPrice || 0),
        profit: parseFloat(t.profit || 0),
        exitTime: t.exitTime ? findNearestTime(new Date(t.exitTime).getTime() / 1000) : null,
      };
    }).filter(t => t !== null);

    console.log("✅ [REPLAY DEBUG] Aligned trades count:", finalTrades.length);
    return finalTrades;
  }, [results, validTimes]);

  // --- 4. INITIALIZE CHART ---
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) {
        console.warn("🚫 [REPLAY DEBUG] Chart init blocked: No container or 0 candles.");
        return;
    }

    console.log("🎨 [REPLAY DEBUG] Initializing Lightweight Chart canvas...");
    if (chartRef.current) { chartRef.current.remove(); }

    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 450,
      layout: { background: { type: ColorType.Solid, color: "#000000" }, textColor: '#94a3b8' }, 
      grid: { vertLines: { color: 'rgba(6, 78, 59, 0.1)' }, horzLines: { color: 'rgba(6, 78, 59, 0.1)' } },
      timeScale: { borderColor: '#064e3b', timeVisible: true },
    });

    candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#10b981', downColor: '#ef4444', borderVisible: false,
    });

    return () => { if (chartRef.current) chartRef.current.remove(); };
  }, [candles.length, symbol]);

  // --- 5. THE REPLAY LOOP ---
  useEffect(() => {
    if (!candlestickSeriesRef.current || candles.length === 0) return;
    
    const visibleCandles = candles.slice(0, currentIndex + 1);
    candlestickSeriesRef.current.setData(visibleCandles);

    const activeMarkers = [];
    trades.forEach(t => {
        if (t.time <= candles[currentIndex].time) {
            activeMarkers.push({
                time: t.time,
                position: t.position === 'long' ? 'belowBar' : 'aboveBar',
                color: t.position === 'long' ? '#10b981' : '#f59e0b',
                shape: t.position === 'long' ? 'arrowUp' : 'arrowDown',
                text: 'E'
            });
        }
    });
    candlestickSeriesRef.current.setMarkers(activeMarkers);
  }, [currentIndex, candles, trades]);

  if (!candles.length) return <div className="chart-loading">⚠️ No data found in selected range. Check console logs.</div>;

  return (
    <div className="chart-replay-container">
      <div className="chart-header-row">
        <h3>Replay: {symbol}</h3>
        <div className="playback-controls">
            <button onClick={() => setCurrentIndex(0)}><RotateCcw size={16}/></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="play-btn">
                {isPlaying ? <Pause size={16}/> : <Play size={16}/>}
            </button>
            <div className="speed-control">
                <input type="range" min="10" max="400" value={410 - playbackSpeed} onChange={(e) => setPlaybackSpeed(410 - Number(e.target.value))} />
            </div>
        </div>
      </div>
      <div className="chart-wrapper">
          <div ref={chartContainerRef} className="chart-canvas" style={{ background: '#000' }} />
      </div>
    </div>
  );
};
