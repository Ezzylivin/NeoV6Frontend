// File: src/components/ChartIndependent.jsx
// 🚀 UPGRADE: v51.0 - "The Visual Link" (Trade Connection Lines on Hover)

import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CrosshairMode, LineStyle } from "lightweight-charts";
import "./ChartIndependent.css"; 

export function ChartIndependent({ results, symbol = "BTC-USD" }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const connectionSeriesRef = useRef(null); // 🚀 NEW: Reference for the connection line
  
  const [legend, setLegend] = useState({ 
      open: "--", high: "--", low: "--", close: "--", 
      time: "--", color: "#e2e8f0" 
  });
  const [trades, setTrades] = useState([]);
  const [hoveredTrade, setHoveredTrade] = useState(null); // 🚀 NEW: Track hover state

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
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#cbd5e1",
          fontFamily: "'Inter', sans-serif"
      },
      grid: { 
          vertLines: { color: "rgba(51, 65, 85, 0.4)", style: 2 }, 
          horzLines: { color: "rgba(51, 65, 85, 0.4)", style: 2 } 
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "#475569" },
      rightPriceScale: { borderColor: "#475569", scaleMargins: { top: 0.2, bottom: 0.2 } },
      crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { width: 1, color: '#4ade80', style: 3, labelBackgroundColor: '#4ade80' },
          horzLine: { width: 1, color: '#4ade80', style: 3, labelBackgroundColor: '#4ade80' },
      }
    });

    chartRef.current = chart;

    // 2. Main Candle Series
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e", downColor: "#ef4444", 
      borderUpColor: "#22c55e", borderDownColor: "#ef4444", 
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });
    seriesRef.current = candleSeries;

    // 🚀 3. NEW: Connection Line Series (Hidden by default)
    const connectionSeries = chart.addLineSeries({
        color: '#f59e0b', // Gold color
        lineWidth: 2,
        lineStyle: LineStyle.Dashed, // Dashed line
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
    });
    connectionSeriesRef.current = connectionSeries;

    // 4. Data Processing
    if (results && results.candleData && results.candleData.length > 0) {
        const validData = [];
        const timeSet = new Set();
        
        results.candleData.forEach((c) => {
            const d = new Date(c.time || c.date || c.datetime);
            const timeStamp = d.getTime() / 1000; 
            if (!isNaN(timeStamp) && !timeSet.has(timeStamp)) {
                validData.push({
                    time: timeStamp,
                    open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close),
                });
                timeSet.add(timeStamp);
            }
        });
        validData.sort((a, b) => a.time - b.time);
        candleSeries.setData(validData);

        // Update Legend Initial State
        const last = validData[validData.length - 1];
        setLegend({
            open: last.open.toFixed(2), high: last.high.toFixed(2), low: last.low.toFixed(2), close: last.close.toFixed(2),
            time: new Date(last.time * 1000).toLocaleString(),
            color: last.close >= last.open ? "#22c55e" : "#ef4444"
        });

        // Process Trades & Markers
        const markers = [];
        const tradeList = [];
        const validTimes = Array.from(timeSet).sort((a,b)=>a-b);

        const findNearestTime = (targetTime) => {
            if (timeSet.has(targetTime)) return targetTime;
            let closest = validTimes[0];
            let minDiff = Math.abs(targetTime - closest);
            for (let t of validTimes) {
                const diff = Math.abs(targetTime - t);
                if (diff < minDiff) { minDiff = diff; closest = t; }
            }
            return minDiff < 3600 ? closest : null;
        };

        (results.tradeBreakdown || []).forEach((t, i) => {
            const entryTimeRaw = new Date(t.entryTime).getTime() / 1000;
            const exitTimeRaw = t.exitTime ? new Date(t.exitTime).getTime() / 1000 : null;
            const isWin = t.profit >= 0;

            const entryTime = findNearestTime(entryTimeRaw);
            const exitTime = exitTimeRaw ? findNearestTime(exitTimeRaw) : null;

            // 🚀 STORE COORDINATES FOR HOVER EFFECT
            tradeList.push({
                id: i, side: t.position, entryPrice: t.price || t.entry_price, profit: t.profit,
                date: new Date(t.entryTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                chartEntryTime: entryTime,
                chartExitTime: exitTime,
                chartEntryPrice: t.price || t.entry_price,
                chartExitPrice: t.exitPrice || t.exit_price
            });

            if (entryTime) {
                markers.push({
                    time: entryTime, position: t.position === "long" ? "belowBar" : "aboveBar",
                    color: t.position === "long" ? "#3b82f6" : "#f59e0b",
                    shape: t.position === "long" ? "arrowUp" : "arrowDown",
                    text: "ENTRY", size: 2
                });
            }

            if (exitTime) {
                markers.push({
                    time: exitTime, position: t.position === "long" ? "aboveBar" : "belowBar",
                    color: isWin ? "#22c55e" : "#ef4444",
                    shape: "circle",
                    text: isWin ? `+$${t.profit.toFixed(2)}` : `-$${Math.abs(t.profit).toFixed(2)}`,
                    size: 2
                });
            }
        });
        
        candleSeries.setMarkers(markers.sort((a,b) => a.time - b.time));
        setTrades(tradeList.reverse());
    }

    chart.subscribeCrosshairMove((param) => {
        if (!param.point || !param.time) return;
        const data = param.seriesData.get(candleSeries);
        if (data) {
            setLegend({
                open: data.open.toFixed(2), high: data.high.toFixed(2), low: data.low.toFixed(2), close: data.close.toFixed(2),
                time: new Date(param.time * 1000).toLocaleString(),
                color: data.close >= data.open ? "#22c55e" : "#ef4444"
            });
        }
    });

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0]) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    };
  }, [results]);

  // 🚀 HOVER EFFECT LOGIC
  useEffect(() => {
      if (!connectionSeriesRef.current) return;

      if (hoveredTrade && hoveredTrade.chartEntryTime && hoveredTrade.chartExitTime) {
          // Draw the connection line
          connectionSeriesRef.current.setData([
              { time: hoveredTrade.chartEntryTime, value: hoveredTrade.chartEntryPrice },
              { time: hoveredTrade.chartExitTime, value: hoveredTrade.chartExitPrice }
          ]);
      } else {
          // Clear the line
          connectionSeriesRef.current.setData([]);
      }
  }, [hoveredTrade]);

  return (
    <div className="independent-container">
        <div className="independent-header">
            <h2><span style={{ color: "#e2e8f0" }}>{symbol}</span> <span style={{ color: legend.color }}>${legend.close}</span></h2>
            <div className="stat-badge">{results?.candleData?.length || 0} Candles</div>
        </div>
        <div className="independent-body">
            <div className="chart-section" ref={chartContainerRef}>
                <div className={`chart-hud ${legend.color === "#22c55e" ? "win" : "loss"}`}>
                    <div className="hud-title">{legend.time}</div>
                    <div className="hud-row"><span>O</span> <span className="hud-val">{legend.open}</span></div>
                    <div className="hud-row"><span>H</span> <span className="hud-val">{legend.high}</span></div>
                    <div className="hud-row"><span>L</span> <span className="hud-val">{legend.low}</span></div>
                    <div className="hud-row"><span>C</span> <span className="hud-val">{legend.close}</span></div>
                </div>
            </div>
            <div className="list-section">
                <div className="trade-list-header"><span>Side</span><span style={{textAlign:'right'}}>Price</span><span style={{textAlign:'right'}}>PnL</span></div>
                <div className="trade-list-scroll">
                    {trades.length > 0 ? trades.map((t) => (
                        <div 
                            key={t.id} 
                            className={`trade-row ${hoveredTrade && hoveredTrade.id === t.id ? 'active' : ''}`}
                            onMouseEnter={() => setHoveredTrade(t)} // 🚀 Trigger Hover
                            onMouseLeave={() => setHoveredTrade(null)} // 🚀 Clear Hover
                        >
                            <div><span className={`badge ${t.side}`}>{t.side}</span><div className="date-sub">{t.date}</div></div>
                            <div className="price-cell">${t.entryPrice?.toFixed(2)}</div>
                            <div className={`pnl-cell ${t.profit >= 0 ? "pnl-pos" : "pnl-neg"}`}>{t.profit >= 0 ? "+" : "-"}${Math.abs(t.profit).toFixed(2)}</div>
                        </div>
                    )) : <div className="empty-trades">No trades.</div>}
                </div>
            </div>
        </div>
    </div>
  );
}
