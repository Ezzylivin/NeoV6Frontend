import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, CrosshairMode, ColorType } from 'lightweight-charts';
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
  const [dataRange, setDataRange] = useState({ start: "--", end: "--", count: 0 });

  // --- 1. PARSE & FILTER CANDLES (Strict Unix Seconds) ---
  const { candles, validTimes } = useMemo(() => {
    if (!results?.candleData || !Array.isArray(results.candleData)) {
        return { candles: [], validTimes: [] };
    }
    
    const startTs = startDate ? new Date(startDate).getTime() / 1000 : null;
    const endTs = endDate ? new Date(endDate).getTime() / 1000 + 86400 : null;

    const uniqueSet = new Set();
    const processed = [];

    results.candleData.forEach(c => {
      let t = c.timestamp || c.time || c.datetime;
      if (!t) return;

      // Handle MongoDB/JSON objects
      if (typeof t === 'object' && t.$date) t = t.$date;
      
      let dateObj = new Date(t);
      let unixSec = Math.floor(dateObj.getTime() / 1000);

      // Filtering logic
      if (startTs && unixSec < startTs) return;
      if (endTs && unixSec > endTs) return;

      if (!isNaN(unixSec) && !uniqueSet.has(unixSec)) {
        uniqueSet.add(unixSec);
        processed.push({
          time: unixSec,
          open: parseFloat(c.open || 0),
          high: parseFloat(c.high || 0),
          low: parseFloat(c.low || 0),
          close: parseFloat(c.close || 0),
        });
      }
    });

    const sortedCandles = processed.sort((a, b) => a.time - b.time);
    return { 
        candles: sortedCandles, 
        validTimes: sortedCandles.map(c => c.time) 
    };
  }, [results, startDate, endDate]);

  // --- 2. INITIALIZE CHART ---
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    // Reset Replay Index when data changes
    setCurrentIndex(0);
    setIsPlaying(false);

    if (chartRef.current) { chartRef.current.remove(); }

    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 450,
      layout: { 
          background: { type: ColorType.Solid, color: "#000000" },
          textColor: '#94a3b8',
      }, 
      grid: { 
          vertLines: { color: 'rgba(16, 185, 129, 0.1)' }, 
          horzLines: { color: 'rgba(16, 185, 129, 0.1)' } 
      },
      timeScale: { borderColor: '#064e3b', timeVisible: true, barSpacing: 10 },
    });

    candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#10b981', downColor: '#ef4444',
      borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#ef4444',
    });

    candlestickSeriesRef.current.setData(candles.slice(0, 1));
    chartRef.current.timeScale().fitContent();

    const resizeHandler = () => {
        if (chartRef.current && chartContainerRef.current) {
            chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
    };
    window.addEventListener('resize', resizeHandler);

    return () => {
        window.removeEventListener('resize', resizeHandler);
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }
    };
  }, [candles, symbol]);

  // --- 3. REPLAY LOOP ---
  useEffect(() => {
    if (!candlestickSeriesRef.current || candles.length === 0) return;
    
    const visibleData = candles.slice(0, currentIndex + 1);
    candlestickSeriesRef.current.setData(visibleData);

    // Update HUD Range Info
    setDataRange({
        start: new Date(candles[0].time * 1000).toLocaleDateString(),
        end: new Date(candles[candles.length - 1].time * 1000).toLocaleDateString(),
        count: candles.length
    });
  }, [currentIndex, candles]);

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentIndex(prev => (prev < candles.length - 1 ? prev + 1 : (setIsPlaying(false), prev)));
      }, playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, candles.length]);

  if (!candles.length) return <div className="chart-loading">Waiting for valid data range...</div>;

  return (
    <div className="chart-replay-container">
      <div className="chart-header-row">
        <div className="flex items-center gap-4">
            <h3>{symbol} Replay</h3>
            <span className="text-xs text-emerald-500 font-mono">Index: {currentIndex} / {candles.length - 1}</span>
        </div>
        
        <div className="playback-controls">
            <button onClick={() => setCurrentIndex(0)}><RotateCcw size={16}/></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className={isPlaying ? "pause-btn" : "play-btn"}>
                {isPlaying ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
            </button>
            <div className="speed-control">
                <input type="range" min="10" max="400" step="10" 
                    value={410 - playbackSpeed} 
                    onChange={(e) => setPlaybackSpeed(410 - Number(e.target.value))} 
                />
            </div>
        </div>
      </div>

      <div className="chart-wrapper">
          <div ref={chartContainerRef} className="chart-canvas" />
      </div>
    </div>
  );
};
