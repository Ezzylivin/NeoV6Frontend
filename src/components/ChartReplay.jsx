import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, CrosshairMode, ColorType } from 'lightweight-charts';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import './ChartReplay.css';

export const ChartReplay = ({ results, symbol = "BTC-USD" }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(100); 
  const [currentIndex, setCurrentIndex] = useState(0);

  // 1. Strict Unix Timestamp Parsing & Data Alignment
  const candles = useMemo(() => {
    const rawData = results?.candleData || results?.combinedResult?.candleData || [];
    if (rawData.length === 0) return [];

    return rawData.map(c => {
        let t = c.timestamp || c.time || c.datetime;
        if (typeof t === 'object' && t.$date) t = t.$date;
        const unixSec = Math.floor(new Date(t).getTime() / 1000);
        
        return { 
            time: unixSec, 
            open: parseFloat(c.open), 
            high: parseFloat(c.high), 
            low: parseFloat(c.low), 
            close: parseFloat(c.close) 
        };
    }).sort((a, b) => a.time - b.time);
  }, [results]);

  // 2. Chart Initialization
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;
    
    // Cleanup previous chart instance
    if (chartRef.current) chartRef.current.remove();
    setCurrentIndex(0); 

    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 450,
      layout: { 
        background: { type: ColorType.Solid, color: "#000000" }, 
        textColor: '#94a3b8',
        fontFamily: "'Inter', sans-serif"
      },
      grid: { 
        vertLines: { color: "rgba(16, 185, 129, 0.05)" }, 
        horzLines: { color: "rgba(16, 185, 129, 0.05)" } 
      },
      timeScale: { borderColor: '#064e3b', timeVisible: true },
    });

    candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({ 
        upColor: '#10b981', 
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444'
    });

    // Start with the first candle
    candlestickSeriesRef.current.setData(candles.slice(0, 1));

    const handleResize = () => {
        if (chartRef.current && chartContainerRef.current) {
            chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
    };
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        chartRef.current?.remove();
    };
  }, [candles, symbol]);

  // 3. Playback Logic & Marker Sync
  useEffect(() => {
    if (!candlestickSeriesRef.current || candles.length === 0) return;

    // Update visible candles
    const visibleData = candles.slice(0, currentIndex + 1);
    candlestickSeriesRef.current.setData(visibleData);

    // Sync Markers that occurred up to this point in time
    const rawTrades = results?.trades || results?.combinedResult?.trades || [];
    const currentTime = visibleData[visibleData.length - 1].time;

    const activeMarkers = [];
    rawTrades.forEach(t => {
        const entryTs = Math.floor(new Date(t.entryTime || t.entry_time).getTime() / 1000);
        const exitTs = t.exitTime || t.exit_time ? Math.floor(new Date(t.exitTime || t.exit_time).getTime() / 1000) : null;

        if (entryTs <= currentTime) {
            activeMarkers.push({ 
                time: entryTs, 
                position: "belowBar", 
                color: "#34d399", 
                shape: "arrowUp", 
                text: "BUY" 
            });
        }
        if (exitTs && exitTs <= currentTime) {
            activeMarkers.push({ 
                time: exitTs, 
                position: "aboveBar", 
                color: t.profit >= 0 ? "#10b981" : "#ef4444", 
                shape: "circle", 
                text: t.profit >= 0 ? "WIN" : "LOSS" 
            });
        }
    });

    candlestickSeriesRef.current.setMarkers(activeMarkers.sort((a,b) => a.time - b.time));
  }, [currentIndex, candles, results]);

  // 4. Interval Controller
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentIndex(prev => {
            if (prev < candles.length - 1) return prev + 1;
            setIsPlaying(false);
            return prev;
        });
      }, playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, candles.length]);

  if (!candles.length) return (
    <div className="bot-card p-20 flex flex-col items-center justify-center border-dashed border-2 border-white/5">
        <div className="text-emerald-500/50 mb-4 animate-pulse">🧪</div>
        <div className="text-neutral-400 text-sm">Waiting for simulation data to begin replay...</div>
    </div>
  );

  return (
    <div className="chart-replay-container bot-card overflow-hidden">
      <div className="replay-header flex justify-between items-center p-4 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-3">
            <h3 className="text-white font-bold text-sm">{symbol} History Replay</h3>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                Step {currentIndex + 1} of {candles.length}
            </span>
        </div>
        
        <div className="playback-controls flex items-center gap-2">
            <select 
                value={playbackSpeed} 
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="bg-black border border-white/10 rounded text-[10px] text-white px-2 py-1 mr-2"
            >
                <option value={500}>0.5x</option>
                <option value={100}>1.0x</option>
                <option value={50}>2.0x</option>
                <option value={10}>5.0x</option>
            </select>
            
            <button 
                onClick={() => setCurrentIndex(0)} 
                className="p-2 hover:bg-white/10 rounded-lg text-neutral-400 transition-colors"
                title="Reset Replay"
            >
                <RotateCcw size={14}/>
            </button>
            
            <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2 rounded-lg transition-all ${isPlaying ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500 text-black'}`}
            >
                {isPlaying ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
            </button>

            <button 
                onClick={() => setCurrentIndex(candles.length - 1)}
                className="p-2 hover:bg-white/10 rounded-lg text-neutral-400"
                title="Jump to End"
            >
                <FastForward size={14}/>
            </button>
        </div>
      </div>

      <div className="relative">
        <div ref={chartContainerRef} className="chart-canvas" style={{ minHeight: '450px' }} />
        {currentIndex === candles.length - 1 && !isPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                <div className="bg-[#0a0a0a] border border-emerald-500/30 p-4 rounded-xl shadow-2xl text-center">
                    <div className="text-emerald-400 font-bold text-sm mb-1">Replay Complete</div>
                    <button onClick={() => setCurrentIndex(0)} className="text-[10px] text-neutral-400 hover:text-white underline">Watch Again</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
