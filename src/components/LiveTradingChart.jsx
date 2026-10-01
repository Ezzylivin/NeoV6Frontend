// File: src/components/LiveTradingChart.jsx

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';

// FE#11: the backend may send candle time as a number (unix seconds or ms) or as
// an ISO string. lightweight-charts requires ascending numeric SECONDS, and the
// marker snapping does arithmetic on these values — a string yields NaN. Coerce
// everything to unix seconds, returning null for anything unparseable.
const toUnixSeconds = (t) => {
    if (t == null) return null;
    if (typeof t === 'number') return Number.isFinite(t) ? Math.floor(t > 1e11 ? t / 1000 : t) : null;
    const ms = new Date(t).getTime();
    return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
};

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

    // On a TAB SWITCH (symbol/timeframe change): reset the count so the next
    // candleData takes the full setData() path (a similar-length coin would
    // otherwise take the streaming update() path and keep showing the PREVIOUS
    // coin), and immediately clear the previous coin's OVERLAYS — markers and
    // entry/TP/TSL price lines — so they don't float on the chart during the swap.
    // We deliberately do NOT wipe candles to empty here: that blanked the chart and
    // caused a flash + camera jump on every click. Leaving the old frame up means
    // the new coin swaps in atomically over it (see the candleData effect below).
    useEffect(() => {
        lastCandleCountRef.current = 0;
        if (seriesRef.current) {
            try { seriesRef.current.setMarkers([]); } catch (e) {}
            entryLinesRef.current.forEach(line => {
                try { seriesRef.current.removePriceLine(line); } catch (e) {}
            });
            entryLinesRef.current = [];
        }
    }, [symbol, timeframe]);

    // ============================================================
    // 🔧 FIX T4-13: Use update() for streaming, setData() for init
    // ============================================================
    // OLD: setData() on every update — full redraw every 10 seconds
    // NEW: setData() only on initial load or major changes,
    //      update() for the latest candle (streaming)
    useEffect(() => {
        if (!seriesRef.current) return;

        // FE#11: coerce to numeric seconds, drop unparseable rows, sort ascending
        // and de-dupe so update()/setData() never throw on string/out-of-order time.
        const formatted = candleData
            .map(c => ({ time: toUnixSeconds(c.time), open: c.open, high: c.high, low: c.low, close: c.close }))
            .filter(c => c.time != null && Number.isFinite(c.open))
            .sort((a, b) => a.time - b.time)
            .filter((c, i, arr) => i === 0 || c.time !== arr[i - 1].time);

        if (!formatted.length) {
            // Candles genuinely went empty (a failed/empty fetch for this coin) —
            // clear so a stale coin never lingers under the new tab. On a normal
            // switch candleData is briefly the old coin's non-empty data and this
            // effect simply doesn't re-run until the new data arrives, so the old
            // frame stays up (no blank) and then swaps in one setData() below.
            try { seriesRef.current.setData([]); } catch (e) {}
            lastCandleCountRef.current = 0;
            return;
        }

        if (lastCandleCountRef.current === 0 || Math.abs(formatted.length - lastCandleCountRef.current) > 5) {
            // Initial load, coin/timeframe switch, or major data change — full setData
            // and refit the view (new coin's price/time range differs).
            seriesRef.current.setData(formatted);
            lastCandleCountRef.current = formatted.length;
            try { chartRef.current?.timeScale().fitContent(); } catch (e) {}
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

        // Build markers from active positions (FE#11: normalized numeric times).
        const availableTimes = candleData.map(c => toUnixSeconds(c.time)).filter(t => t != null);
        const legMarkers = activePositions.map((pos, idx) => {
            const entryTime = toUnixSeconds(pos.time);
            if (entryTime == null || isNaN(parseFloat(pos.entry)) || !availableTimes.length) return null;
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
