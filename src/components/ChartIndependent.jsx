// File: src/components/ChartIndependent.jsx
// 🚀 UPGRADE: v35.0 - "Investor Clarity" (Big Bold Win/Loss Tags)

import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CrosshairMode } from "lightweight-charts";

export function ChartIndependent({ results, symbol = "BTC-USD" }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  
  // HUD STATE
  const [legend, setLegend] = useState({ 
      open: "--", high: "--", low: "--", close: "--", 
      time: "--", color: "#e2e8f0" 
  });
  const [currentPrice, setCurrentPrice] = useState("--");

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    // Cleanup
    if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
    }

    // 1. Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: { 
          background: { type: ColorType.Solid, color: "#0b0f19" }, 
          textColor: "#94a3b8",
          fontFamily: "'Inter', sans-serif"
      },
      grid: { 
          vertLines: { color: "#1e293b", style: 2 }, 
          horzLines: { color: "#1e293b", style: 2 } 
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: { 
          timeVisible: true, 
          secondsVisible: false,
          borderColor: "#334155"
      },
      rightPriceScale: {
          borderColor: "#334155",
          scaleMargins: { top: 0.2, bottom: 0.2 } // More breathing room for tags
      },
      crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { width: 1, color: '#4ade80', style: 3, labelBackgroundColor: '#4ade80' },
          horzLine: { width: 1, color: '#4ade80', style: 3, labelBackgroundColor: '#4ade80' },
      }
    });

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e", 
      downColor: "#ef4444", 
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444", 
      wickUpColor: "#22c55e", 
      wickDownColor: "#ef4444",
    });
    seriesRef.current = candleSeries;

    // 2. Data Processing
    if (results && results.candleData && results.candleData.length > 0) {
        const validData = [];
        const timeSet = new Set();

        results.candleData.forEach((c) => {
            const d = new Date(c.time || c.date || c.datetime);
            const timeStamp = d.getTime() / 1000; 

            if (!isNaN(timeStamp) && !timeSet.has(timeStamp)) {
                validData.push({
                    time: timeStamp,
                    open: Number(c.open),
                    high: Number(c.high),
                    low: Number(c.low),
                    close: Number(c.close),
                });
                timeSet.add(timeStamp);
            }
        });

        validData.sort((a, b) => a.time - b.time);
        
        if (validData.length > 0) {
            candleSeries.setData(validData);
            
            const last = validData[validData.length - 1];
            setCurrentPrice(last.close.toFixed(2));
            setLegend({
                open: last.open.toFixed(2),
                high: last.high.toFixed(2),
                low: last.low.toFixed(2),
                close: last.close.toFixed(2),
                time: new Date(last.time * 1000).toLocaleString(),
                color: last.close >= last.open ? "#22c55e" : "#ef4444"
            });
        }

        // 3. 🚀 INVESTOR-GRADE MARKERS
        const markers = [];
        (results.tradeBreakdown || []).forEach((t) => {
            const entryTime = new Date(t.entryTime).getTime() / 1000;
            const exitTime = t.exitTime ? new Date(t.exitTime).getTime() / 1000 : null;

            // ENTRY MARKER (Arrow)
            if (timeSet.has(entryTime)) {
                markers.push({
                    time: entryTime,
                    position: t.position === "long" ? "belowBar" : "aboveBar",
                    color: t.position === "long" ? "#3b82f6" : "#f59e0b", // Blue for Long, Orange for Short
                    shape: t.position === "long" ? "arrowUp" : "arrowDown",
                    text: t.position === "long" ? "L ENTRY" : "S ENTRY",
                    size: 2 // Bigger
                });
            }

            // EXIT MARKER (Profit Tag)
            if (exitTime && timeSet.has(exitTime)) {
                const isWin = t.profit >= 0;
                // Format profit: "+$520.50" or "-$120.00"
                const profitText = `${isWin ? '💰 +' : '🔻 '}$${Math.abs(t.profit).toFixed(2)}`;
                
                markers.push({
                    time: exitTime,
                    position: t.position === "long" ? "aboveBar" : "belowBar",
                    color: isWin ? "#22c55e" : "#ef4444", // Bright Green or Red
                    shape: "custom", // Uses text as main indicator
                    text: profitText,
                    size: 3 // Huge visibility
                });
            }
        });
        candleSeries.setMarkers(markers.sort((a,b) => a.time - b.time));
    }

    // Crosshair Logic
    chart.subscribeCrosshairMove((param) => {
        if (
            param.point === undefined || !param.time ||
            param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth ||
            param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight
        ) return;

        const data = param.seriesData.get(candleSeries);
        if (data) {
            const dateStr = new Date(param.time * 1000).toLocaleString();
            const isGreen = data.close >= data.open;
            setLegend({
                open: data.open.toFixed(2),
                high: data.high.toFixed(2),
                low: data.low.toFixed(2),
                close: data.close.toFixed(2),
                time: dateStr,
                color: isGreen ? "#22c55e" : "#ef4444"
            });
        }
    });

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0]) return;
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [results]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {/* HEADER OVERLAY */}
        <div style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            zIndex: 20,
            background: "rgba(15, 23, 42, 0.9)",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #334155",
            pointerEvents: "none"
        }}>
            <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#e2e8f0" }}>{symbol}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: legend.color }}>
                {legend.close}
            </div>
        </div>

        {/* OHLC LEGEND */}
        <div style={{
            position: "absolute", top: "10px", right: "60px", zIndex: 20,
            background: "rgba(15, 23, 42, 0.9)", padding: "6px 12px", borderRadius: "6px",
            border: "1px solid #334155", fontSize: "0.85rem", color: "#94a3b8",
            display: "flex", gap: "15px", fontFamily: "monospace", pointerEvents: "none"
        }}>
            <div><span style={{color:"#64748b"}}>O:</span> <span style={{color:"#cbd5e1"}}>{legend.open}</span></div>
            <div><span style={{color:"#64748b"}}>H:</span> <span style={{color:"#cbd5e1"}}>{legend.high}</span></div>
            <div><span style={{color:"#64748b"}}>L:</span> <span style={{color:"#cbd5e1"}}>{legend.low}</span></div>
            <div><span style={{color:"#64748b"}}>C:</span> <span style={{color: legend.color}}>{legend.close}</span></div>
            <div style={{borderLeft:"1px solid #475569", paddingLeft:"15px", color:"#e2e8f0"}}>{legend.time}</div>
        </div>

        <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
