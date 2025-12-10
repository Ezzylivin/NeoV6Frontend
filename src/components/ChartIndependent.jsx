// File: src/components/ChartIndependent.jsx
// 🚀 UPGRADE: v63.1 - "Full Vision"
// Fixes: Chart now auto-zooms to fit the entire backtest duration

import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CrosshairMode, LineStyle } from "lightweight-charts";
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

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // 1. Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: { 
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 11
      },
      grid: { 
        vertLines: { color: "rgba(51, 65, 85, 0.2)", style: 2 }, 
        horzLines: { color: "rgba(51, 65, 85, 0.2)", style: 2 } 
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: { 
        timeVisible: true, secondsVisible: false, borderColor: "#334155",
        rightOffset: 15, barSpacing: 6
      },
      rightPriceScale: { 
        borderColor: "#334155", scaleMargins: { top: 0.1, bottom: 0.1 } 
      },
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

    // 3. Connection Line (Gold Dashed)
    const connectionSeries = chart.addLineSeries({
      color: '#f59e0b', 
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    connectionSeriesRef.current = connectionSeries;

    // 4. Data Processing
    if (results?.candleData?.length > 0) {
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

      // 🔥 Force full visible range
      if (validData.length > 0) {
        const first = validData[0].time;
        const last = validData[validData.length - 1].time;
        chart.timeScale().setVisibleRange({ from: first, to: last });
      }

      // Initial Legend
      const lastCandle = validData[validData.length - 1];
      setLegend({
        open: lastCandle.open.toFixed(2),
        high: lastCandle.high.toFixed(2),
        low: lastCandle.low.toFixed(2),
        close: lastCandle.close.toFixed(2),
        time: new Date(lastCandle.time * 1000).toLocaleString(),
        color: lastCandle.close >= lastCandle.open ? "#22c55e" : "#ef4444"
      });

      // 5. Map Trades to Chart Time
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
        return minDiff < 7200 ? closest : null;
      };

      (results.tradeBreakdown || []).forEach((t, i) => {
        const entryTimeRaw = new Date(t.entryTime).getTime() / 1000;
        const exitTimeRaw = t.exitTime ? new Date(t.exitTime).getTime() / 1000 : null;
        const isWin = t.profit >= 0;

        const entryTime = findNearestTime(entryTimeRaw);
        const exitTime = exitTimeRaw ? findNearestTime(exitTimeRaw) : null;

        tradeList.push({
          id: i, 
          side: t.position, 
          entryPrice: t.price || t.entry_price, 
          exitPrice: t.exitPrice || t.exit_price,
          profit: t.profit,
          date: new Date(t.entryTime).toLocaleDateString() + " " + new Date(t.entryTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          chartEntryTime: entryTime,
          chartExitTime: exitTime,
          chartEntryPrice: t.price || t.entry_price,
          chartExitPrice: t.exitPrice || t.exit_price
        });

        if (entryTime) {
          markers.push({
            time: entryTime,
            position: t.position === "long" ? "belowBar" : "aboveBar",
            color: t.position === "long" ? "#3b82f6" : "#f59e0b",
            shape: t.position === "long" ? "arrowUp" : "arrowDown",
            text: "E", size: 1
          });
        }

        if (exitTime) {
          markers.push({
            time: exitTime,
            position: t.position === "long" ? "aboveBar" : "belowBar",
            color: isWin ? "#22c55e" : "#ef4444",
            shape: "circle",
            text: isWin ? `+$${t.profit.toFixed(2)}` : `-$${Math.abs(t.profit).toFixed(2)}`,
            size: 1
          });
        }
      });

      candleSeries.setMarkers(markers.sort((a,b) => a.time - b.time));
      setTrades(tradeList.reverse());
    }

    // Crosshair hover legend
    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time) return;
      const data = param.seriesData.get(candleSeries);
      if (data) {
        setLegend({
          open: data.open.toFixed(2),
          high: data.hi
