// File: src/components/ChartIndependent.jsx
// 🚀 UPGRADE: v37.0 - "The Ultimate Dashboard" (Linked to Modern 2026 CSS)

import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CrosshairMode } from "lightweight-charts";
import "./ChartIndependent.css"; // Uses the CSS you provided

export function ChartIndependent({ results, symbol = "BTC-USD" }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  
  // HUD State
  const [legend, setLegend] = useState({ 
      open: "--", high: "--", low: "--", close: "--", 
      time: "--", color: "#e2e8f0" 
  });
  
  // Trade List State
  const [trades, setTrades] = useState([]);

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
          background: { type: ColorType.Solid, color: "transparent" }, // Transparent to let CSS gradient show
          textColor: "#94a3b8",
          fontFamily: "'Inter', sans-serif"
      },
      grid: { 
          vertLines: { color: "rgba(30, 41, 59, 0.3)", style: 2 }, 
          horzLines: { color: "rgba(30, 41, 59, 0.3)", style: 2 } 
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: { 
          timeVisible: true, 
          secondsVisible: false,
          borderColor: "#334155"
      },
      rightPriceScale: {
          borderColor: "#334155",
          scaleMargins: { top: 0.2, bottom: 0.2 }
      },
      crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { width: 1, color: '#4ade80', style: 3, labelBackgroundColor: '#4ade80' },
          horzLine: { width: 1, color: '#4ade80', style: 3, labelBackgroundColor: '#4ade80' },
      }
    });

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e", downColor: "#ef4444", 
      borderUpColor: "#22c55e", borderDownColor: "#ef4444", 
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
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
            setLegend({
                open: last.open.toFixed(2),
                high: last.high.toFixed(2),
                low: last.low.toFixed(2),
                close: last.close.toFixed(2),
                time: new Date(last.time * 1000).toLocaleString(),
                color: last.close >= last.open ? "#22c55e" : "#ef4444"
            });
        }

        // 3. Markers & Trade List
        const markers = [];
        const tradeList = [];
        
        (results.tradeBreakdown || []).forEach((t, i) => {
            const entryTime = new Date(t.entryTime).getTime() / 1000;
            const exitTime = t.exitTime ? new Date(t.exitTime).getTime() / 1000 : null;
            const isWin = t.profit >= 0;

            // Populate Right Panel List
            tradeList.push({
                id: i,
                side: t.position,
                entryPrice: t.price || t.entry_price,
                profit: t.profit,
                date: new Date(t.entryTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            });

            // Entry Marker
            if (timeSet.has(entryTime)) {
                markers.push({
                    time: entryTime,
                    position: t.position === "long" ? "belowBar" : "aboveBar",
                    color: t.position === "long" ? "#3b82f6" : "#f59e0b",
                    shape: t.position === "long" ? "arrowUp" : "arrowDown",
                    text: "ENTRY", size: 2
                });
            }

            // Exit Marker
            if (exitTime && timeSet.has(exitTime)) {
                markers.push({
                    time: exitTime,
                    position: t.position === "long" ? "aboveBar" : "belowBar",
                    color: isWin ? "#22c55e" : "#ef4444",
                    shape: "circle",
                    text: isWin ? `+$${t.profit.toFixed(2)}` : `-$${Math.abs(t.profit).toFixed(2)}`,
                    size: 2
                });
            }
        });
        
        candleSeries.setMarkers(markers.sort((a,b) => a.time - b.time));
        setTrades(tradeList.reverse()); // Show newest trades first
    }

    // Crosshair Update
    chart.subscribeCrosshairMove((param) => {
        if (!param.point || !param.time) return;
        const data = param.seriesData.get(candleSeries);
        if (data) {
            setLegend({
                open: data.open.toFixed(2),
                high: data.high.toFixed(2),
                low: data.low.toFixed(2),
                close: data.close.toFixed(2),
                time: new Date(param.time * 1000).toLocaleString(),
                color: data.close >= data.open ? "#22c55e" : "#ef4444"
            });
        }
    });

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0]) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
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
    <div className="independent-container">
        {/* TOP BAR */}
        <div className="independent-header">
            <h2>
                <span style={{ color: "#e2e8f0" }}>{symbol}</span>
                <span style={{ color: legend.color, fontSize: "1.4rem" }}>${legend.close}</span>
            </h2>
            <div className="stat-badge">{results?.candleData?.length || 0} Candles Loaded</div>
        </div>

        <div className="independent-body">
            {/* LEFT: CHART */}
            <div className="chart-section" ref={chartContainerRef}>
                {/* HUD OVERLAY */}
                <div className={`chart-hud ${legend.color === "#22c55e" ? "win" : "loss"}`}>
                    <div className="hud-title">{legend.time}</div>
                    <div className="hud-row"><span>OPEN</span> <span className="hud-val">{legend.open}</span></div>
                    <div className="hud-row"><span>HIGH</span> <span className="hud-val">{legend.high}</span></div>
                    <div className="hud-row"><span>LOW</span> <span className="hud-val">{legend.low}</span></div>
                    <div className="hud-row"><span>CLOSE</span> <span className="hud-val">{legend.close}</span></div>
                </div>
            </div>

            {/* RIGHT: TRADE LIST */}
            <div className="list-section">
                <div className="trade-list-header">
                    <span>Side</span>
                    <span style={{textAlign:'right'}}>Entry</span>
                    <span style={{textAlign:'right'}}>PnL</span>
                </div>
                <div className="trade-list-scroll">
                    {trades.length > 0 ? trades.map((t) => (
                        <div key={t.id} className="trade-row">
                            <div>
                                <span className={`badge ${t.side}`}>{t.side}</span>
                                <div className="date-sub">{t.date}</div>
                            </div>
                            <div className="price-cell">${t.entryPrice?.toFixed(2)}</div>
                            <div className={`pnl-cell ${t.profit >= 0 ? "pnl-pos" : "pnl-neg"}`}>
                                {t.profit >= 0 ? "+" : "-"}${Math.abs(t.profit).toFixed(2)}
                            </div>
                        </div>
                    )) : (
                        <div className="empty-trades">No trades executed yet.</div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}
