// File: src/components/ChartIndependent.jsx
// 🚀 UPGRADE: v34.0 - "Professional Visualizer" (Tooltip + Live Header)

import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CrosshairMode } from "lightweight-charts";

export function ChartIndependent({ results, symbol = "BTC-USD" }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  
  // 🚀 HUD STATE
  const [legend, setLegend] = useState({ 
      open: "--", high: "--", low: "--", close: "--", 
      time: "--", color: "#e2e8f0" 
  });
  const [currentPrice, setCurrentPrice] = useState("--");

  useEffect(() => {
    // 1. Safety Check
    if (!chartContainerRef.current) return;
    
    // Destroy old chart to prevent duplicates
    if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
    }

    // 2. Initialize Chart with Premium Styling
    const chart = createChart(chartContainerRef.current, {
      layout: { 
          background: { type: ColorType.Solid, color: "#0b0f19" }, 
          textColor: "#64748b",
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
          scaleMargins: { top: 0.1, bottom: 0.1 }
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

    // 3. Robust Data Parsing
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
            
            // Set Initial Legend to Latest Candle
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

        // 4. Markers
        const markers = [];
        (results.tradeBreakdown || []).forEach((t) => {
            const entryTime = new Date(t.entryTime).getTime() / 1000;
            const exitTime = t.exitTime ? new Date(t.exitTime).getTime() / 1000 : null;

            if (timeSet.has(entryTime)) {
                markers.push({
                    time: entryTime,
                    position: t.position === "long" ? "belowBar" : "aboveBar",
                    color: t.position === "long" ? "#22c55e" : "#ef4444",
                    shape: t.position === "long" ? "arrowUp" : "arrowDown",
                    text: "ENTRY",
                    size: 2
                });
            }

            if (exitTime && timeSet.has(exitTime)) {
                markers.push({
                    time: exitTime,
                    position: t.position === "long" ? "aboveBar" : "belowBar",
                    color: t.profit >= 0 ? "#3b82f6" : "#f59e0b",
                    shape: "circle",
                    text: t.profit >= 0 ? "WIN" : "LOSS",
                    size: 2
                });
            }
        });
        candleSeries.setMarkers(markers.sort((a,b) => a.time - b.time));
    }

    // 🚀 INTERACTIVE TOOLTIP (CROSSHAIR MOVE)
    chart.subscribeCrosshairMove((param) => {
        if (
            param.point === undefined ||
            !param.time ||
            param.point.x < 0 ||
            param.point.x > chartContainerRef.current.clientWidth ||
            param.point.y < 0 ||
            param.point.y > chartContainerRef.current.clientHeight
        ) {
            // Mouse leaves chart -> Reset to last candle (optional, or keep last hover)
            return; 
        }

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

    // Fit Content
    chart.timeScale().fitContent();

    // Resize Observer
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
        {/* 🚀 CHART HEADER (Symbol + Price) */}
        <div style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            zIndex: 20,
            background: "rgba(15, 23, 42, 0.8)",
            padding: "8px 12px",
            borderRadius: "6px",
            backdropFilter: "blur(4px)",
            border: "1px solid #334155",
            pointerEvents: "none" // Let mouse pass through to chart
        }}>
            <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#e2e8f0" }}>{symbol}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: legend.color }}>
                {legend.close}
            </div>
        </div>

        {/* 🚀 HOVER LEGEND (OHLC) */}
        <div style={{
            position: "absolute",
            top: "10px",
            right: "60px", // Avoid price scale
            zIndex: 20,
            background: "rgba(15, 23, 42, 0.8)",
            padding: "6px 12px",
            borderRadius: "6px",
            backdropFilter: "blur(4px)",
            border: "1px solid #334155",
            fontSize: "0.85rem",
            color: "#94a3b8",
            display: "flex",
            gap: "15px",
            fontFamily: "monospace",
            pointerEvents: "none"
        }}>
            <div><span style={{color:"#64748b"}}>O:</span> <span style={{color:"#cbd5e1"}}>{legend.open}</span></div>
            <div><span style={{color:"#64748b"}}>H:</span> <span style={{color:"#cbd5e1"}}>{legend.high}</span></div>
            <div><span style={{color:"#64748b"}}>L:</span> <span style={{color:"#cbd5e1"}}>{legend.low}</span></div>
            <div><span style={{color:"#64748b"}}>C:</span> <span style={{color: legend.color}}>{legend.close}</span></div>
            <div style={{borderLeft:"1px solid #475569", paddingLeft:"15px", color:"#e2e8f0"}}>{legend.time}</div>
        </div>

        {/* CHART CONTAINER */}
        <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
