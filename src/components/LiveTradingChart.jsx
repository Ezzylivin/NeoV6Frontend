// File: src/components/LiveTradingChart.jsx
import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

// Matches the colors used in your Legend and Neural Logic chart
const STRAT_COLORS = {
    rsi_threshold: "#3b82f6", // Blue
    sma_crossover: "#ef4444", // Red
    supertrend: "#10b981",    // Emerald
    macd_crossover: "#f59e0b", // Amber
    atr_breakout: "#8b5cf6",  // Violet
    bb_fade: "#ec4899",       // Pink
    stoch: "#06b6d4",         // Cyan
    pa_breakout: "#14b8a6",   // Teal
};

export const LiveTradingChart = ({ 
    symbol, 
    timeframe, 
    activePositions = [], 
    tradeMarkers = [], 
    candleData = [], 
    strategies = [] 
}) => {
    const chartContainerRef = useRef();
    const chartRef = useRef(null);
    const entryLinesRef = useRef([]); // Tracks horizontal lines to prevent duplicates
    
    // 🟢 Expanded Series References for all 10 Strategies
    const seriesRef = useRef({ 
        candle: null, 
        strategies: {} // Will hold lineSeries for each strat
    });

    // 1. Initialize Chart
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

        seriesRef.current.candle = chart.addCandlestickSeries({ 
            upColor: '#10b981', downColor: '#ef4444', 
            borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#ef4444' 
        });

        chartRef.current = chart;
        const handleResize = () => chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    // 2. Dynamic Strategy Layer Sync (Highs/Lows)
    useEffect(() => {
        if (!chartRef.current) return;

        strategies.forEach(strat => {
            const code = strat.code;
            if (!seriesRef.current.strategies[code]) {
                // High Line (Entry Target)
                seriesRef.current.strategies[`${code}_high`] = chartRef.current.addLineSeries({
                    color: STRAT_COLORS[code] || '#71717a',
                    lineWidth: 1,
                    lineStyle: 3, // Dotted
                    title: `${code.toUpperCase()} HI`
                });
                // Low Line (Exit Floor)
                seriesRef.current.strategies[`${code}_low`] = chartRef.current.addLineSeries({
                    color: STRAT_COLORS[code] || '#71717a',
                    lineWidth: 1,
                    lineStyle: 3,
                    title: `${code.toUpperCase()} LO`
                });
            }
        });
    }, [strategies]);

    // 3. Main Data & Marker Sync
    useEffect(() => {
        if (!seriesRef.current.candle || !candleData.length) return;

        // A. Update Candles
        seriesRef.current.candle.setData(candleData.map(c => ({
            time: c.time, open: c.open, high: c.high, low: c.low, close: c.close
        })));

        // B. Update Strategy High/Low Lines
        strategies.forEach(strat => {
            const code = strat.code;
            const highSeries = seriesRef.current.strategies[`${code}_high`];
            const lowSeries = seriesRef.current.strategies[`${code}_low`];

            if (highSeries && lowSeries) {
                const highData = candleData.map(c => ({ 
                    time: c.time, 
                    value: c[`${code}_high`] || c.pa_high || c.bb_upper || c.atr_upper 
                })).filter(d => d.value);
                
                const lowData = candleData.map(c => ({ 
                    time: c.time, 
                    value: c[`${code}_low`] || c.pa_low || c.bb_lower || c.atr_lower 
                })).filter(d => d.value);

                highSeries.setData(highData);
                lowSeries.setData(lowData);
            }
        });

        // C. Draw Pyramid Entry/Exit Horizontal Lines
        // Clear previous lines
        entryLinesRef.current.forEach(line => seriesRef.current.candle.removePriceLine(line));
        entryLinesRef.current = [];

        activePositions.forEach((pos, idx) => {
            const entryLine = seriesRef.current.candle.createPriceLine({
                price: pos.entry,
                color: pos.type === 'long' ? '#10b981' : '#f59e0b',
                lineWidth: 2,
                lineStyle: 2, // Dashed
                axisLabelVisible: true,
                title: `L${idx + 1} ENTRY`,
            });
            
            const tpLine = seriesRef.current.candle.createPriceLine({
                price: pos.tp,
                color: '#a78bfa',
                lineWidth: 1,
                lineStyle: 3, // Dotted
                axisLabelVisible: true,
                title: `L${idx + 1} TP`,
            });

            entryLinesRef.current.push(entryLine, tpLine);
        });

        // D. Sync Historical Trade Markers (Arrows)
        if (tradeMarkers.length > 0) {
            const markers = tradeMarkers.map(t => ({
                time: t.time,
                position: t.type.includes('buy') || t.type.includes('long') ? 'belowBar' : 'aboveBar',
                color: t.type.includes('buy') || t.type.includes('long') ? '#10b981' : '#ef4444',
                shape: t.type.includes('buy') || t.type.includes('long') ? 'arrowUp' : 'arrowDown',
                text: t.type.toUpperCase(),
            }));
            seriesRef.current.candle.setMarkers(markers);
        }

    }, [candleData, tradeMarkers, activePositions, strategies]);

    return <div ref={chartContainerRef} className="w-full h-full border border-zinc-800 rounded-3xl overflow-hidden" />;
};
