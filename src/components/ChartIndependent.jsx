import React, { useEffect, useRef, useState, useMemo } from "react";
import { createChart, CrosshairMode, ColorType } from "lightweight-charts";
import { Activity } from "lucide-react"; // Icon for the toggle
import "./ChartIndependent.css";

export function ChartIndependent({ results, symbol = "BTC-USD" }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  
  // 🟢 STATE FOR TOGGLE
  const [showTradeLines, setShowTradeLines] = useState(true);

  const [legend, setLegend] = useState({
    open: "--", high: "--", low: "--", close: "--", color: "#94a3b8"
  });

  // 1. ROBUST DATA PARSING
  const candles = useMemo(() => {
    const rawData = results?.candleData || results?.combinedResult?.candleData || [];
    if (rawData.length === 0) return [];
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
        vertLines: { color: "rgba(6, 78, 59, 0.05)" }, 
        horzLines: { color: "rgba(6, 78, 59, 0.05)" } 
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

    // 🟢 3. CONDITIONAL TRADE CONNECTIONS
    if (showTradeLines) {
      const tradeLines = results?.tradeLines || results?.combinedResult?.tradeLines || [];
      tradeLines.forEach(line => {
        const lineSeries = chart.addLineSeries({
          color: line.color,
          lineWidth: 1,
          lineStyle: 2, // Dashed
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
          autoscaleInfoProvider: () => null, // Prevents axis squashing
        });

        lineSeries.setData([
          { time: Number(line.from.time), value: parseFloat(line.from.price) },
          { time: Number(line.to.time), value: parseFloat(line.to.price) }
        ]);
      });
    }

    // 🟢 4. MARKERS (ALWAYS SHOWN)
    const trades = results?.trades || results?.combinedResult?.trades || [];
    if (trades.length > 0) {
      const markers = trades.filter(t => t.time).map(t => ({
        time: Number(t.time),
        position: t.side === "long" ? "belowBar" : "aboveBar",
        color: t.side === "long" ? "#10b981" : "#f59e0b",
        shape: t.side === "long" ? "arrowUp" : "arrowDown",
        text: t.label || "E"
      }));
      candleSeries.setMarkers(markers.sort((a, b) => a.time - b.time));
    }

    // Legend Logic
    chart.subscribeCrosshairMove((param) => {
      if (param.time) {
        const data = param.seriesData.get(candleSeries);
        if (data) setLegend({
          open: data.open.toFixed(2), high: data.high.toFixed(2), 
          low: data.low.toFixed(2), close: data.close.toFixed(2), 
          color: data.close >= data.open ? "#10b981" : "#ef4444"
        });
      }
    });

    chart.timeScale().fitContent();
    chartRef.current = chart;
    return () => chart.remove();
  }, [candles, results, showTradeLines]); // 🟢 Re-run when toggle changes

  if (candles.length === 0) return null;

  return (
    <div className="independent-container relative w-full h-full">
      {/* 🟢 LEGEND & TOGGLE HUD */}
      <div className="chart-hud absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="bg-black/80 p-3 rounded-xl border border-white/10 font-mono text-[10px] pointer-events-none">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex justify-between gap-2"><span className="text-neutral-500">O</span><span className="text-white">{legend.open}</span></div>
            <div className="flex justify-between gap-2"><span className="text-neutral-500">H</span><span className="text-white">{legend.high}</span></div>
            <div className="flex justify-between gap-2"><span className="text-neutral-500">L</span><span className="text-white">{legend.low}</span></div>
            <div className="flex justify-between gap-2"><span className="text-neutral-500">C</span><span className={`font-bold ${legend.color === "#10b981" ? "text-emerald-400" : "text-rose-400"}`}>{legend.close}</span></div>
          </div>
        </div>

        {/* 🟢 INTERACTIVE TOGGLE BUTTON */}
        <button 
          onClick={() => setShowTradeLines(!showTradeLines)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
            showTradeLines 
              ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
              : "bg-neutral-800 border-white/10 text-neutral-400"
          }`}
        >
          <Activity size={12} />
          {showTradeLines ? "HIDE PATHS" : "SHOW PATHS"}
        </button>
      </div>

      <div ref={chartContainerRef} className="chart-canvas" />
    </div>
  );
}
