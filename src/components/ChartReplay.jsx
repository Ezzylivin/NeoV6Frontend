import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { Play, Pause, RotateCcw } from 'lucide-react';
import './ChartReplay.css';

export const ChartReplay = ({ results, symbol = "BTC-USD" }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(100); 
  const [currentIndex, setCurrentIndex] = useState(0);

  const candles = useMemo(() => {
    const rawData = results?.candleData || [];
    console.group(`🎬 [Replay Engine] Data Processing: ${symbol}`);
    console.log("Raw Data Found:", rawData.length, "items");
    
    if (rawData.length === 0) {
        console.warn("❌ Replay Engine received empty candleData array");
        console.groupEnd();
        return [];
    }

    const mapped = rawData.map(c => {
        let t = c.timestamp || c.time || c.datetime;
        if (typeof t === 'object' && t.$date) t = t.$date;
        return { 
            time: Math.floor(new Date(t).getTime() / 1000), 
            open: parseFloat(c.open), high: parseFloat(c.high), low: parseFloat(c.low), close: parseFloat(c.close) 
        };
    }).sort((a, b) => a.time - b.time);
    
    console.log("Final Mapped Candles:", mapped.length);
    console.groupEnd();
    return mapped;
  }, [results, symbol]);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;
    if (chartRef.current) chartRef.current.remove();

    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 450,
      layout: { background: { type: ColorType.Solid, color: "#000000" }, textColor: '#94a3b8' },
      timeScale: { borderColor: '#064e3b', timeVisible: true },
    });

    candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({ upColor: '#10b981', downColor: '#ef4444' });
    candlestickSeriesRef.current.setData(candles.slice(0, 1));

    return () => chartRef.current?.remove();
  }, [candles, symbol]);

  useEffect(() => {
    if (!candlestickSeriesRef.current || candles.length === 0) return;
    const visibleData = candles.slice(0, currentIndex + 1);
    candlestickSeriesRef.current.setData(visibleData);

    const rawTrades = results?.trades || [];
    const currentTime = visibleData[visibleData.length - 1].time;
    const activeMarkers = rawTrades
      .filter(t => Math.floor(new Date(t.entryTime || t.entry_time).getTime() / 1000) <= currentTime)
      .map(t => ({
          time: Math.floor(new Date(t.entryTime || t.entry_time).getTime() / 1000),
          position: "belowBar", color: "#34d399", shape: "arrowUp", text: "E"
      }));
    candlestickSeriesRef.current.setMarkers(activeMarkers);
  }, [currentIndex, candles, results]);

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      console.log(`▶ Playback active - Index: ${currentIndex}/${candles.length - 1}`);
      interval = setInterval(() => {
        setCurrentIndex(prev => (prev < candles.length - 1 ? prev + 1 : (setIsPlaying(false), prev)));
      }, playbackSpeed);
    }
    return () => {
        if (interval) {
            console.log("⏸ Playback paused or interval cleared");
            clearInterval(interval);
        }
    };
  }, [isPlaying, playbackSpeed, candles.length, currentIndex]);

  return (
    <div className="chart-replay-container">
      <div className="playback-controls flex gap-4 p-2 bg-white/5 rounded-t-xl border-b border-white/5">
          <button onClick={() => setCurrentIndex(0)} className="text-neutral-400 hover:text-white"><RotateCcw size={16}/></button>
          <button onClick={() => setIsPlaying(!isPlaying)} className="text-emerald-400 hover:text-white">{isPlaying ? <Pause size={16}/> : <Play size={16}/>}</button>
          <span className="text-[10px] text-neutral-500 uppercase ml-auto">Step {currentIndex + 1} / {candles.length}</span>
      </div>
      <div ref={chartContainerRef} className="chart-canvas" />
    </div>
  );
};
