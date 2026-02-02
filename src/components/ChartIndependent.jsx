import React, { useEffect, useRef, useState, useMemo } from "react";
import { createChart, CrosshairMode, ColorType } from "lightweight-charts";
import { Activity } from "lucide-react";

export function ChartIndependent({ results, symbol = "SOL-USD" }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [showTradeLines, setShowTradeLines] = useState(true);
  const [legend, setLegend] = useState({
    open: "--", high: "--", low: "--", close: "--", color: "#94a3b8"
  });

  // 1. ROBUST DATA PARSING
  const candles = useMemo(() => {
    const rawData = results?.candleData || results?.combinedResult?.candleData || [];
    if (!Array.isArray(rawData) || rawData.length === 0) return [];
    
    return rawData.map((c) => ({
      time: Number(c.time), 
      open: parseFloat(c.open || 0),
      high: parseFloat(c.high || 0),
      low: parseFloat(c.low || 0),
      close: parseFloat(c.close || 0),
    })).sort((a, b) => a.time - b.time);
  }, [results]);

  // 2. CHART INITIALIZATION
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;
    if (chartRef.current) chartRef.current.remove();

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 450,
      layout: { 
        background: { type: ColorType.Solid, color: "#000000" }, 
        textColor: "#94a3b8" 
      },
      grid: { 
        vertLines: { color: "rgba(255, 255, 255, 0.05)" }, 
        horzLines: { color: "rgba(255, 255, 255, 0.05)" } 
      },
      timeScale: { 
        timeVisible: true, 
        borderColor: "rgba(52, 211, 153, 0.2)" 
      },
      crosshair: { mode: CrosshairMode.Normal },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10b981", downColor: "#ef4444", borderVisible: false,
      wickUpColor: "#10b981", wickDownColor: "#ef4444",
    });

    candleSeries.setData(candles);

    // 3. TRADE CONNECTIONS (PATHS)
    if (showTradeLines) {
      const tradeLines = results?.tradeLines || results?.combinedResult?.tradeLines || [];
      tradeLines.forEach(line => {
        const lineSeries = chart.addLineSeries({
          color: line.color || "#f59e0b",
          lineWidth: 1,
          lineStyle: 2, // Dashed
          lastValueVisible: false,
          priceLineVisible: false,
        });

        lineSeries.setData([
          { time: Number(line.from.time), value: parseFloat(line.from.price) },
          { time: Number(line.to.time), value: parseFloat(line.to.price) }
        ].sort((a, b) => a.time - b.time));
      });
    }

    // 4. MARKERS (E/X Arrows)
    const trades = results?.trades || results?.combinedResult?.trades || [];
    if (trades.length > 0) {
      const markers = trades.map(t => ({
        time: Number(t.time),
        position: t.side === "long" ? "belowBar" : "aboveBar",
        color: t.side === "long" ? "#10b981" : "#f59e0b",
        shape: t.side === "long" ? "arrowUp" : "arrowDown",
        text: t.label || (t.side === "long" ? "L" : "S")
      })).sort((a, b) => a.time - b.time);
      candleSeries.setMarkers(markers);
    }

    // Legend Logic
    chart.subscribeCrosshairMove((param) => {
      if (param.time) {
        const data = param.seriesData.get(candleSeries);
        if (data) setLegend({
          open: data.open?.toFixed(2), high: data.high?.toFixed(2), 
          low: data.low?.toFixed(2), close: data.close?.toFixed(2), 
          color: data.close >= data.open ? "#10b981" : "#ef4444"
        });
      }
    });

    chart.timeScale().fitContent();
    chartRef.current = chart;
    return () => chart.remove();
  }, [candles, results, showTradeLines]);

  if (candles.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[450px] bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800">
      <Activity className="w-8 h-8 text-zinc-700 animate-pulse mb-2" />
      <p className="text-[10px] text-zinc-600 uppercase tracking-widest">No Candle Data Found</p>
    </div>
  );

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="bg-black/80 backdrop-blur-md p-3 rounded-xl border border-white/10 font-mono text-[10px]">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex justify-between gap-2"><span className="text-zinc-500">O</span><span className="text-white">{legend.open}</span></div>
            <div className="flex justify-between gap-2"><span className="text-zinc-500">H</span><span className="text-white">{legend.high}</span></div>
            <div className="flex justify-between gap-2"><span className="text-zinc-500">L</span><span className="text-white">{legend.low}</span></div>
            <div className="flex justify-between gap-2"><span className="text-zinc-500">C</span><span className={`font-bold ${legend.color === "#10b981" ? "text-emerald-400" : "text-rose-400"}`}>{legend.close}</span></div>
          </div>
        </div>
        <button onClick={() => setShowTradeLines(!showTradeLines)} 
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${showTradeLines ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : "bg-neutral-800 border-white/10 text-neutral-400"}`}>
          <Activity size={12} /> {showTradeLines ? "HIDE PATHS" : "SHOW PATHS"}
        </button>
      </div>
      <div ref={chartContainerRef} className="w-full h-[450px]" />
    </div>
  );
}
