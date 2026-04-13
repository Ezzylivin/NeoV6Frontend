// File: src/components/LiveTradingChart.jsx

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';

export const LiveTradingChart = ({
    symbol,
    timeframe,
    activePositions = [],
    tradeMarkers = [],
    candleData = [],
}) => {
    const chartContainerRef = useRef();
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const entryLinesRef = useRef([]);
    const lastCandleCountRef = useRef(0);

    // ============================================================
    // 1. CREATE CHART ONCE
    // ============================================================
    useEffect(() => {
        if (!chartContainerRef.current) return;
        if (chartRef.current) chartRef.current.remove();

        const chart = createChart(chartContainerRef.current, {
            layout: { background: { type: ColorType.Solid, color: '#09090b' }, textColor: '#d4d4d8' },
            grid: { vertLines: { color: '#1e1e22' }, horzLines: { color: '#1e1e22' } },
            width: chartContainerRef.current.clientWidth,
            height: 450,
            timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#3f3f46' },
            crosshair: { mode: CrosshairMode.Normal },
        });

        seriesRef.current = chart.addCandlestickSeries({
            upColor: '#10b981', downColor: '#ef4444',
            borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#ef4444'
        });

        chartRef.current = chart;

        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, []);

    // ============================================================
    // 🔧 FIX T4-13: Use update() for streaming, setData() for init
    // ============================================================
    // OLD: setData() on every update — full redraw every 10 seconds
    // NEW: setData() only on initial load or major changes,
    //      update() for the latest candle (streaming)
    useEffect(() => {
        if (!seriesRef.current || !candleData.length) return;

        const formatted = candleData.map(c => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close
        }));

        if (lastCandleCountRef.current === 0 || Math.abs(formatted.length - lastCandleCountRef.current) > 5) {
            // Initial load or major data change — full setData
            seriesRef.current.setData(formatted);
            lastCandleCountRef.current = formatted.length;
        } else {
            // Streaming update — only update the last candle
            const lastCandle = formatted[formatted.length - 1];
            if (lastCandle) seriesRef.current.update(lastCandle);
        }
    }, [candleData]);

    // ============================================================
    // 3. UPDATE MARKERS & PRICE LINES
    // ============================================================
    useEffect(() => {
        if (!seriesRef.current || !candleData.length) return;

        // Clean up old price lines
        entryLinesRef.current.forEach(line => {
            try { seriesRef.current.removePriceLine(line); } catch (e) {}
        });
        entryLinesRef.current = [];

        // Build markers from active positions
        const availableTimes = candleData.map(c => c.time);
        const legMarkers = activePositions.map((pos, idx) => {
            if (!pos.time || isNaN(parseFloat(pos.entry))) return null;
            const entryTime = new Date(pos.time).getTime() / 1000;
            const snappedTime = availableTimes.reduce((prev, curr) =>
                Math.abs(curr - entryTime) < Math.abs(prev - entryTime) ? curr : prev
            );
            return {
                time: snappedTime,
                position: pos.type === 'long' ? 'belowBar' : 'aboveBar',
                color: pos.type === 'long' ? '#10b981' : '#f59e0b',
                shape: pos.type === 'long' ? 'arrowUp' : 'arrowDown',
                text: `L${idx + 1} ENTRY`,
                size: 1
            };
        }).filter(Boolean);

        seriesRef.current.setMarkers([...legMarkers, ...tradeMarkers]);

        // Draw horizontal price lines for each position
        activePositions.forEach((pos, idx) => {
            const entryPrice = parseFloat(pos.entry);
            const tpPrice = parseFloat(pos.tp);
            const tslPrice = parseFloat(pos.tsl);

            if (!isNaN(entryPrice)) {
                entryLinesRef.current.push(seriesRef.current.createPriceLine({
                    price: entryPrice, color: 'rgba(113, 113, 122, 0.6)',
                    lineWidth: 1, lineStyle: LineStyle.Dashed, title: `L${idx + 1} IN`,
                }));
            }
            if (!isNaN(tpPrice)) {
                entryLinesRef.current.push(seriesRef.current.createPriceLine({
                    price: tpPrice, color: '#a78bfa',
                    lineWidth: 1, lineStyle: LineStyle.Dotted, title: `L${idx + 1} TP`,
                }));
            }
            if (!isNaN(tslPrice)) {
                entryLinesRef.current.push(seriesRef.current.createPriceLine({
                    price: tslPrice, color: '#ef4444',
                    lineWidth: 2, lineStyle: LineStyle.Solid,
                    axisLabelVisible: true, title: `L${idx + 1} TSL`,
                }));
            }
        });

    }, [activePositions, tradeMarkers, candleData]);

    // ============================================================
    // 🔧 FIX T4-14: Removed ghost strategy overlay series
    // ============================================================
    // OLD: Created _high/_low line series per strategy but never
    //      called setData() on them — empty invisible series.
    // REMOVED: The strategies useEffect and seriesRef.strategies.
    // If you want indicator overlays, the data needs to come from
    // the backend in the candle packet (which it partially does
    // via keys like bb_upper, ema_fast etc). That would be a
    // separate feature to build properly.

    return <div ref={chartContainerRef} className="w-full h-full border border-zinc-800 rounded-3xl overflow-hidden" />;
};
