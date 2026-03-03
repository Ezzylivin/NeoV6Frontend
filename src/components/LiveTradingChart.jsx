// File: src/components/LiveTradingChart.jsx
import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

const STRAT_COLORS = {
    rsi_threshold: "#3b82f6", 
    sma_crossover: "#ef4444", 
    supertrend: "#10b981",    
    macd_crossover: "#f59e0b", 
    atr_breakout: "#8b5cf6",  
    bb_fade: "#ec4899",       
    stoch: "#06b6d4",         
    pa_breakout: "#14b8a6",   
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
    const entryLinesRef = useRef([]); 
    
    const seriesRef = useRef({ 
        candle: null, 
        strategies: {} 
    });

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

    useEffect(() => {
        if (!chartRef.current) return;

        strategies.forEach(strat => {
            const code = strat.code;
            if (!seriesRef.current.strategies[code]) {
                seriesRef.current.strategies[`${code}_high`] = chartRef.current.addLineSeries({
                    color: STRAT_COLORS[code] || '#71717a',
                    lineWidth: 1,
                    lineStyle: 3, 
                    title: `${code.toUpperCase()} HI`
                });
                seriesRef.current.strategies[`${code}_low`] = chartRef.current.addLineSeries({
                    color: STRAT_COLORS[code] || '#71717a',
                    lineWidth: 1,
                    lineStyle: 3,
                    title: `${code.toUpperCase()} LO`
                });
            }
        });
    }, [strategies]);

    useEffect(() => {
    if (!seriesRef.current.candle || !candleData.length) return;

    // A. Update Candles
    seriesRef.current.candle.setData(candleData.map(c => ({
        time: c.time, open: c.open, high: c.high, low: c.low, close: c.close
    })));

    // B. Clear previous horizontal lines (Entry, TP, TSL)
    entryLinesRef.current.forEach(line => seriesRef.current.candle.removePriceLine(line));
    entryLinesRef.current = [];

    // C. Create interactive Markers for each Leg's Entry Point
    const legMarkers = activePositions.map((pos, idx) => ({
        time: Math.floor(new Date(pos.time).getTime() / 1000), // Match candle time format
        position: pos.type === 'long' ? 'belowBar' : 'aboveBar',
        color: pos.type === 'long' ? '#10b981' : '#f59e0b',
        shape: 'circle',
        text: `L${idx + 1} ENTRY: $${pos.entry}`, // This creates the tooltip effect
        size: 2
    }));

    // Combine with historical trade markers if any
    seriesRef.current.candle.setMarkers([...legMarkers, ...tradeMarkers]);

    // D. Draw Dynamic Horizontal Lines
    activePositions.forEach((pos, idx) => {
        // 1. DASHED ENTRY LINE
        const entryLine = seriesRef.current.candle.createPriceLine({
            price: pos.entry,
            color: 'rgba(113, 113, 122, 0.4)', // Faded zinc for entry (markers handle the focus)
            lineWidth: 1,
            lineStyle: 2, 
            axisLabelVisible: true,
            title: `L${idx + 1} IN`,
        });
        
        // 2. FIXED TP POINT (Dotted Violet)
        const tpLine = seriesRef.current.candle.createPriceLine({
            price: pos.tp,
            color: '#a78bfa',
            lineWidth: 1,
            lineStyle: 3, 
            axisLabelVisible: true,
            title: `L${idx + 1} TP`,
        });

        // 3. MOVING TSL LINE (Solid Crimson)
        const tslLine = seriesRef.current.candle.createPriceLine({
            price: pos.tsl,
            color: '#ef4444', 
            lineWidth: 2, // Thicker for visibility
            lineStyle: 0, // Solid line for "Final Floor"
            axisLabelVisible: true,
            title: `L${idx + 1} TSL`,
        });

        entryLinesRef.current.push(entryLine, tpLine, tslLine);
    });

}, [candleData, activePositions, tradeMarkers]);

    return <div ref={chartContainerRef} className="w-full h-full border border-zinc-800 rounded-3xl overflow-hidden" />;
};
