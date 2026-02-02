import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';

export const ChartReplay = ({ results, symbol = "SOL-USD" }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(100); 
  const [currentIndex, setCurrentIndex] = useState(0);

  const candles = useMemo(() => {
    const rawData = results?.candleData || [];
    if (rawData.length === 0) return [];

    return rawData.map(c => ({ 
      time: Math.floor(new Date(c.time || c.timestamp).getTime() / 1000), 
      open: parseFloat(c.open), high: parseFloat(c.high), low: parseFloat(c.low), close: parseFloat(c.close) 
    })).sort((a, b) => a.time - b.time);
  }, [results]);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;
    if (chartRef.current) chartRef.current.remove();

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 450,
      layout: { background: { type: ColorType.Solid, color: "#000000" }, textColor: '#94a3b8' },
      timeScale: { borderColor: '#1f2937', timeVisible: true },
    });

    const series = chart.addCandlestickSeries({ upColor: '#10b981', downColor: '#ef4444' });
    series.setData([candles[0]]); // Start with first candle

    chartRef.current = chart;
    candlestickSeriesRef.current = series;
    return () => chart.remove();
  }, [candles]);

  // Replay Logic
  useEffect(() => {
    let interval = null;
    if (isPlaying && currentIndex < candles.length - 1) {
      interval = setInterval(() => {
        const nextIndex = currentIndex + 1;
        candlestickSeriesRef.current.update(candles[nextIndex]);
        setCurrentIndex(nextIndex);
      }, playbackSpeed);
    } else {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, candles, playbackSpeed]);

  if (candles.length === 0) return null;

  return (
    <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800 overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-3 bg-zinc-900/50 border-b border-zinc-800">
          <button onClick={() => { setCurrentIndex(0); candlestickSeriesRef.current.setData([candles[0]]); }} className="text-zinc-500 hover:text-white transition-colors"><RotateCcw size={16}/></button>
          <button onClick={() => setIsPlaying(!isPlaying)} className="w-8 h-8 flex items-center justify-center bg-amber-500 text-black rounded-full hover:bg-amber-400 transition-all">
            {isPlaying ? <Pause size={16} fill="currentColor"/> : <Play size={16} className="ml-0.5" fill="currentColor"/>}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-bold uppercase">Speed</span>
            <select value={playbackSpeed} onChange={(e) => setPlaybackSpeed(Number(e.target.value))} className="bg-zinc-800 text-[10px] rounded px-1 py-0.5 outline-none">
                <option value={500}>0.5x</option>
                <option value={100}>1x</option>
                <option value={20}>5x</option>
            </select>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono ml-auto">{currentIndex + 1} / {candles.length}</span>
      </div>
      <div ref={chartContainerRef} className="w-full h-[450px]" />
    </div>
  );
};
