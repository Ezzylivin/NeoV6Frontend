import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';
import { Play, Pause, RotateCcw } from 'lucide-react';

export const ChartReplay = ({ results, symbol = "SOL-USD" }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const tradeLineSeriesRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(100); 
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // 🟢 State for Legend + Trade Info
  const [legend, setLegend] = useState({ open: '--', high: '--', low: '--', close: '--', tradeInfo: null });

  const formatTime = (t) => {
      const date = new Date(t);
      return Math.floor(date.getTime() / 1000);
  };

  const candles = useMemo(() => {
    const rawData = results?.candleData || [];
    if (rawData.length === 0) return [];

    const uniqueCandles = new Map();
    rawData.forEach(c => {
        const time = formatTime(c.time || c.timestamp);
        if (!isNaN(time)) {
            uniqueCandles.set(time, { 
                time: time, 
                open: parseFloat(c.open), 
                high: parseFloat(c.high), 
                low: parseFloat(c.low), 
                close: parseFloat(c.close) 
            });
        }
    });
    return Array.from(uniqueCandles.values()).sort((a, b) => a.time - b.time);
  }, [results]);

  const { allMarkers, tradeLookup } = useMemo(() => {
      const trades = results?.trades || [];
      if (trades.length === 0) return { allMarkers: [], tradeLookup: {} };

      const formattedTrades = trades.map(t => ({
          ...t,
          time: formatTime(t.entry_time || t.time),
          price: parseFloat(t.price),
          size: t.size || t.amount || 0,
          pnl: t.pnl || t.profit || 0
      })).sort((a,b) => a.time - b.time);

      const lookup = {}; 
      let lastEntry = null;

      formattedTrades.forEach(t => {
          lookup[t.time] = t;
          if (t.type === 'buy' || t.type === 'sell' || t.type === 'long' || t.type === 'short') {
              lastEntry = t;
          } else if ((t.type.includes('close') || t.type.includes('flip')) && lastEntry) {
              lastEntry.exitMatch = t;
              t.entryMatch = lastEntry;
              lookup[lastEntry.time] = lastEntry;
              lookup[t.time] = t;
              lastEntry = null;
          }
      });

      const markersList = formattedTrades.map(t => {
          if (t.type === "buy" || t.type === "long") return { time: t.time, position: "belowBar", color: "#10b981", shape: "arrowUp", text: "L" };
          if (t.type === "sell" || t.type === "short") return { time: t.time, position: "aboveBar", color: "#ef4444", shape: "arrowDown", text: "S" };
          if (t.type.includes("close")) return { time: t.time, position: "aboveBar", color: "#fbbf24", shape: "circle", text: "X" };
          return null;
      }).filter(Boolean);

      return { allMarkers: markersList, tradeLookup: lookup };
  }, [results]);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;
    if (chartRef.current) chartRef.current.remove();

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 450,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: '#94a3b8' },
      grid: { vertLines: { color: "rgba(255, 255, 255, 0.05)" }, horzLines: { color: "rgba(255, 255, 255, 0.05)" } },
      timeScale: { borderColor: '#1f2937', timeVisible: true },
      crosshair: { mode: CrosshairMode.Normal },
    });

    const series = chart.addCandlestickSeries({ upColor: '#10b981', downColor: '#ef4444', borderVisible: false, wickVisible: true });
    
    const firstCandle = candles[0];
    series.setData([firstCandle]); 
    setLegend({ ...firstCandle, tradeInfo: null });

    const tradeLineSeries = chart.addLineSeries({
        color: 'rgba(255, 255, 255, 0.5)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
    });
    tradeLineSeriesRef.current = tradeLineSeries;

    chart.subscribeCrosshairMove((param) => {
        if (param.time) {
            const data = param.seriesData.get(series);
            const trade = tradeLookup[param.time];
            
            if (data) setLegend({ ...data, tradeInfo: trade || null });

            if (trade) {
                let points = [];
                if (trade.exitMatch) points = [{ time: trade.time, value: trade.price }, { time: trade.exitMatch.time, value: trade.exitMatch.price }];
                else if (trade.entryMatch) points = [{ time: trade.entryMatch.time, value: trade.entryMatch.price }, { time: trade.time, value: trade.price }];

                if (points.length === 2) {
                    points.sort((a,b) => a.time - b.time);
                    tradeLineSeries.setData(points);
                } else {
                    tradeLineSeries.setData([]);
                }
            } else {
                tradeLineSeries.setData([]);
            }
        }
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = series;
    return () => chart.remove();
  }, [candles, tradeLookup]);

  useEffect(() => {
    let interval = null;
    if (isPlaying && currentIndex < candles.length - 1) {
      interval = setInterval(() => {
        const nextIndex = currentIndex + 1;
        const nextCandle = candles[nextIndex];
        
        candlestickSeriesRef.current.update(nextCandle);
        setLegend({ ...nextCandle, tradeInfo: null }); // Reset trade info on new bar unless hovered
        
        const currentMarkers = allMarkers.filter(m => m.time <= nextCandle.time);
        candlestickSeriesRef.current.setMarkers(currentMarkers);

        setCurrentIndex(nextIndex);
      }, playbackSpeed);
    } else {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, candles, playbackSpeed, allMarkers]);

  if (candles.length === 0) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden relative group">
      
      {/* 🟢 FLOATING LEGEND / TOOLTIP */}
      <div className="absolute top-16 left-4 z-20 font-mono text-[10px] pointer-events-none select-none bg-zinc-950/80 backdrop-blur-sm p-2 rounded border border-zinc-800/50 shadow-xl">
          <div className="flex gap-4 items-center mb-1">
            <span className="font-black text-amber-500 text-xs">{symbol}</span>
            <span className="text-zinc-500">REPLAY MODE</span>
          </div>
          <div className="flex gap-3 text-zinc-300">
             <div>O: <span className={legend.open > legend.close ? 'text-rose-400' : 'text-emerald-400'}>{Number(legend.open).toFixed(2)}</span></div>
             <div>H: <span className="text-zinc-400">{Number(legend.high).toFixed(2)}</span></div>
             <div>L: <span className="text-zinc-400">{Number(legend.low).toFixed(2)}</span></div>
             <div>C: <span className={legend.open > legend.close ? 'text-rose-400' : 'text-emerald-400'}>{Number(legend.close).toFixed(2)}</span></div>
          </div>
          {/* 🟢 DYNAMIC TRADE INFO FOR REPLAY */}
          {legend.tradeInfo && (
                <div className="mt-2 pt-2 border-t border-zinc-800 flex gap-4 text-[10px] font-mono">
                    <div className="text-zinc-400">TYPE: <span className={legend.tradeInfo.type.includes('buy') || legend.tradeInfo.type.includes('long') ? "text-emerald-400" : "text-rose-400"}>{legend.tradeInfo.type.toUpperCase()}</span></div>
                    <div className="text-zinc-400">SIZE: <span className="text-white">{legend.tradeInfo.size || "N/A"}</span></div>
                    <div className="text-zinc-400">PNL: <span className={legend.tradeInfo.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}>${(legend.tradeInfo.pnl || 0).toFixed(2)}</span></div>
                </div>
            )}
      </div>

      <div className="flex items-center gap-4 px-6 py-3 bg-zinc-900/50 border-b border-zinc-800">
          <button onClick={() => { 
              setCurrentIndex(0); 
              candlestickSeriesRef.current.setData([candles[0]]); 
              candlestickSeriesRef.current.setMarkers([]); 
              setLegend(candles[0]); 
          }} className="text-zinc-500 hover:text-white transition-colors"><RotateCcw size={16}/></button>
          
          <button onClick={() => setIsPlaying(!isPlaying)} className="w-8 h-8 flex items-center justify-center bg-amber-500 text-black rounded-full hover:bg-amber-400 transition-all">
            {isPlaying ? <Pause size={16} fill="currentColor"/> : <Play size={16} className="ml-0.5" fill="currentColor"/>}
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-bold uppercase">Speed</span>
            <select value={playbackSpeed} onChange={(e) => setPlaybackSpeed(Number(e.target.value))} className="bg-zinc-800 text-[10px] rounded px-1 py-0.5 outline-none border border-zinc-700">
                <option value={500}>0.5x</option>
                <option value={100}>1x</option>
                <option value={20}>5x</option>
                <option value={5}>Max</option>
            </select>
          </div>
          
          <span className="text-[10px] text-zinc-500 font-mono ml-auto">
            CANDLE: {currentIndex + 1} / {candles.length}
          </span>
      </div>
      <div ref={chartContainerRef} className="w-full h-[450px]" />
    </div>
  );
};
