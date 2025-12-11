// File: src/components/ChartIndependent.jsx
// 🚀 UPGRADE: v63.5 - "Deep Zoom & Diagnostics + LOGS"
// Fixes: 
// 1. Adds 'Data Range' display.
// 2. Adds 'Reset Zoom' button.
// 3. Improves timestamp parsing.
// 4. [DEBUG] Added detailed console logs for data tracing.

import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CrosshairMode, LineStyle } from "lightweight-charts";
import { Maximize, Calendar } from "lucide-react"; 
import "./ChartIndependent.css"; 

export function ChartIndependent({ results, symbol = "BTC-USD" }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const connectionSeriesRef = useRef(null); 
   
  const [legend, setLegend] = useState({ 
      open: "--", high: "--", low: "--", close: "--", 
      time: "--", color: "#e2e8f0" 
  });
  const [trades, setTrades] = useState([]);
  const [hoveredTrade, setHoveredTrade] = useState(null);
  const [dataRange, setDataRange] = useState({ start: "--", end: "--", count: 0 });

  // Helper: Reset Zoom
  const handleResetZoom = () => {
      if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
      }
  };

  // --- 1. Initialize & Update Chart ---
  useEffect(() => {
    // [DEBUG] 1. Log Raw Input
    console.group("🔥 [ChartIndependent] Data Pipeline");
    console.log("1. Raw Results Prop Received:", results);

    if (!chartContainerRef.current) {
        console.log("❌ Chart container ref is missing.");
        console.groupEnd();
        return;
    }
    
    // Clean up previous chart instance
    if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
    }

    // A. Configure Chart Layout (Emerald Theme)
    const chart = createChart(chartContainerRef.current, {
      layout: { 
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#94a3b8", 
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          fontSize: 11
      },
      grid: { 
          vertLines: { color: "rgba(6, 78, 59, 0.2)", style: 2 }, 
          horzLines: { color: "rgba(6, 78, 59, 0.2)", style: 2 }  
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: { 
          timeVisible: true, 
          secondsVisible: false, 
          borderColor: "rgba(52, 211, 153, 0.1)", 
          rightOffset: 5, 
          barSpacing: 6,
          fixLeftEdge: true,
          fixRightEdge: true
      },
      rightPriceScale: { 
          borderColor: "rgba(52, 211, 153, 0.1)", 
          scaleMargins: { top: 0.1, bottom: 0.1 },
          visible: true
      },
      crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { width: 1, color: '#34d399', style: 3, labelBackgroundColor: '#064e3b' },
          horzLine: { width: 1, color: '#34d399', style: 3, labelBackgroundColor: '#064e3b' },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    chartRef.current = chart;

    // B. Main Candle Series
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10b981",          
      downColor: "#ef4444",        
      borderUpColor: "#10b981", 
      borderDownColor: "#ef4444", 
      wickUpColor: "#10b981", 
      wickDownColor: "#ef4444",
    });
    seriesRef.current = candleSeries;

    // C. Connection Line
    const connectionSeries = chart.addLineSeries({
        color: '#34d399', 
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
    });
    connectionSeriesRef.current = connectionSeries;

    // D. Data Processing
    if (results && results.candleData && results.candleData.length > 0) {
        console.log(`2. Processing ${results.candleData.length} raw candles...`);
        
        const validData = [];
        const timeSet = new Set();
        
        // 1. Process Candles
        results.candleData.forEach((c, index) => {
            // Handle various timestamp formats from API
            let dateObj;
            if (typeof c.time === 'number') dateObj = new Date(c.time * 1000); // Unix timestamp
            else if (c.start) dateObj = new Date(c.start * 1000);              // Alternative key
            else dateObj = new Date(c.time || c.date || c.datetime);           // ISO String

            const timeStamp = Math.floor(dateObj.getTime() / 1000); 
            
            // [DEBUG] Log first failed parse if any
            if (isNaN(timeStamp) && index < 5) {
                console.warn("⚠️ Found invalid timestamp in candle:", c);
            }

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
        
        // [DEBUG] 3. Log Final Chart Data
        console.log(`3. Valid Chart Data ready: ${validData.length} bars.`);
        if(validData.length > 0) {
            console.log("   First Bar:", new Date(validData[0].time * 1000).toLocaleString());
            console.log("   Last Bar:", new Date(validData[validData.length - 1].time * 1000).toLocaleString());
        }

        candleSeries.setData(validData);

        // Update Diagnostic Info
        if (validData.length > 0) {
            const first = validData[0];
            const last = validData[validData.length - 1];
            setDataRange({
                start: new Date(first.time * 1000).toLocaleDateString(),
                end: new Date(last.time * 1000).toLocaleDateString(),
                count: validData.length
            });

            // Set Initial Legend
            setLegend({
                open: last.open.toFixed(2), high: last.high.toFixed(2), low: last.low.toFixed(2), close: last.close.toFixed(2),
                time: new Date(last.time * 1000).toLocaleString(),
                color: last.close >= last.open ? "#10b981" : "#ef4444"
            });
        }

        // 2. Map Trades
        console.log(`4. Mapping Trades... (Total: ${results.tradeBreakdown ? results.tradeBreakdown.length : 0})`);
        
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
            // Allow up to 2 hours diff, else assume missing data
            return minDiff < 7200 ? closest : null; 
        };

        if (results.tradeBreakdown) {
            results.tradeBreakdown.forEach((t, i) => {
                const entryTimeRaw = Math.floor(new Date(t.entryTime).getTime() / 1000);
                const exitTimeRaw = t.exitTime ? Math.floor(new Date(t.exitTime).getTime() / 1000) : null;
                const isWin = t.profit >= 0;

                const entryTime = findNearestTime(entryTimeRaw);
                const exitTime = exitTimeRaw ? findNearestTime(exitTimeRaw) : null;

                // [DEBUG] Log if a trade cannot be mapped to the chart
                if (!entryTime && i < 3) {
                     console.warn(`⚠️ Trade #${i} Entry time ${t.entryTime} not found on chart range.`);
                }

                tradeList.push({
                    id: i, 
                    side: t.position, 
                    entryPrice: t.price || t.entry_price || t.entryPrice, 
                    exitPrice: t.exitPrice || t.exit_price,
                    profit: t.profit,
                    date: new Date(t.entryTime).toLocaleDateString() + " " + new Date(t.entryTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    chartEntryTime: entryTime,
                    chartExitTime: exitTime,
                    chartEntryPrice: t.price || t.entry_price || t.entryPrice,
                    chartExitPrice: t.exitPrice || t.exit_price
                });

                if (entryTime) {
                    markers.push({
                        time: entryTime, 
                        position: t.position === "long" ? "belowBar" : "aboveBar",
                        color: t.position === "long" ? "#34d399" : "#f59e0b",
                        shape: t.position === "long" ? "arrowUp" : "arrowDown",
                        text: "E", size: 1
                    });
                }

                if (exitTime) {
                    markers.push({
                        time: exitTime, 
                        position: t.position === "long" ? "aboveBar" : "belowBar",
                        color: isWin ? "#10b981" : "#ef4444",
                        shape: "circle",
                        text: isWin ? `+$${t.profit.toFixed(2)}` : `-$${Math.abs(t.profit).toFixed(2)}`,
                        size: 1
                    });
                }
            });
        }
        
        console.log(`5. Markers created: ${markers.length}`);
        candleSeries.setMarkers(markers.sort((a,b) => a.time - b.time));
        setTrades(tradeList.reverse());

        // 3. AUTO-ZOOM
        window.requestAnimationFrame(() => {
            chart.timeScale().fitContent();
        });
    } else {
        console.warn("⚠️ No candle data found in results.");
    }

    console.groupEnd(); // End Log Group

    // E. Crosshair
    chart.subscribeCrosshairMove((param) => {
        if (!param.point || !param.time || !param.seriesData) return;
        const data = param.seriesData.get(candleSeries);
        if (data) {
            setLegend({
                open: data.open.toFixed(2), high: data.high.toFixed(2), low: data.low.toFixed(2), close: data.close.toFixed(2),
                time: new Date(param.time * 1000).toLocaleString(),
                color: data.close >= data.open ? "#10b981" : "#ef4444"
            });
        }
    });

    // F. Resize
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

  // --- 2. Hover Connection Logic ---
  useEffect(() => {
      if (!connectionSeriesRef.current) return;
      if (hoveredTrade && hoveredTrade.chartEntryTime && hoveredTrade.chartExitTime) {
          connectionSeriesRef.current.setData([
              { time: hoveredTrade.chartEntryTime, value: hoveredTrade.chartEntryPrice },
              { time: hoveredTrade.chartExitTime, value: hoveredTrade.chartExitPrice }
          ]);
      } else {
          connectionSeriesRef.current.setData([]);
      }
  }, [hoveredTrade]);

  return (
    <div className="independent-container">
        <div className="independent-header">
            <div className="flex items-center gap-4">
                <h2><span style={{ color: "#e2e8f0" }}>{symbol}</span> <span style={{ color: legend.color }}>${legend.close}</span></h2>
                <div className="data-range-badge">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {dataRange.start} - {dataRange.end} ({dataRange.count} bars)
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                <button onClick={handleResetZoom} className="reset-zoom-btn" title="Reset Zoom">
                    <Maximize className="w-4 h-4" />
                </button>
                <div className="stat-badge">{trades.length} Trades</div>
            </div>
        </div>
        
        <div className="independent-body">
            <div className="chart-section" ref={chartContainerRef}>
                <div className={`chart-hud ${legend.color === "#10b981" ? "win" : "loss"}`}>
                    <div className="hud-title">{legend.time}</div>
                    <div className="hud-row"><span>O</span> <span className="hud-val">{legend.open}</span></div>
                    <div className="hud-row"><span>H</span> <span className="hud-val">{legend.high}</span></div>
                    <div className="hud-row"><span>L</span> <span className="hud-val">{legend.low}</span></div>
                    <div className="hud-row"><span>C</span> <span className="hud-val">{legend.close}</span></div>
                </div>
            </div>
            
            <div className="list-section">
                <div className="trade-list-header">
                    <span style={{flex: 0.8}}>Side</span>
                    <span style={{flex: 1, textAlign:'right'}}>Entry</span>
                    <span style={{flex: 1, textAlign:'right'}}>Exit</span>
                    <span style={{flex: 1, textAlign:'right'}}>PnL</span>
                </div>
                <div className="trade-list-scroll">
                    {trades.length > 0 ? trades.map((t) => (
                        <div 
                            key={t.id} 
                            className={`trade-row ${hoveredTrade && hoveredTrade.id === t.id ? 'active' : ''}`}
                            onMouseEnter={() => setHoveredTrade(t)}
                            onMouseLeave={() => setHoveredTrade(null)}
                        >
                            <div style={{flex: 0.8}}>
                                <span className={`badge ${t.side}`}>{t.side}</span>
                                <div className="date-sub">{t.date.split(" ")[0]}</div>
                            </div>
                            <div className="price-cell" style={{flex: 1}}>${t.entryPrice?.toFixed(2)}</div>
                            <div className="price-cell" style={{flex: 1}}>${t.exitPrice?.toFixed(2)}</div>
                            <div className={`pnl-cell ${t.profit >= 0 ? "pnl-pos" : "pnl-neg"}`} style={{flex: 1}}>
                                {t.profit >= 0 ? "+" : "-"}${Math.abs(t.profit).toFixed(2)}
                            </div>
                        </div>
                    )) : <div className="empty-trades">No trades executed.</div>}
                </div>
            </div>
        </div>
    </div>
  );
}
