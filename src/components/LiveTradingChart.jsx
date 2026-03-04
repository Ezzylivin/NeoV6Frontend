// File: src/components/LiveTradingChart.jsx
import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';

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

    // 🟢 Update Strategies Series
    useEffect(() => {
        if (!chartRef.current) return;
        strategies.forEach(strat => {
            const code = strat.code;
            if (!seriesRef.current.strategies[`${code}_high`]) {
                seriesRef.current.strategies[`${code}_high`] = chartRef.current.addLineSeries({
                    color: STRAT_COLORS[code] || '#71717a',
                    lineWidth: 1,
                    lineStyle: LineStyle.Dotted, 
                    title: `${code.toUpperCase()} HI`
                });
                seriesRef.current.strategies[`${code}_low`] = chartRef.current.addLineSeries({
                    color: STRAT_COLORS[code] || '#71717a',
                    lineWidth: 1,
                    lineStyle: LineStyle.Dotted,
                    title: `${code.toUpperCase()} LO`
                });
            }
        });
    }, [strategies]);

    // 🔵 Update Data & Markers & Price Lines
    useEffect(() => {
        if (!seriesRef.current.candle || !candleData.length) return;

        // 1. Update Candles
        seriesRef.current.candle.setData(candleData.map(c => ({
            time: c.time, open: c.open, high: c.high, low: c.low, close: c.close
        })));

        // 2. Clean up old lines
        entryLinesRef.current.forEach(line => seriesRef.current.candle.removePriceLine(line));
        entryLinesRef.current = [];

        // 3. Process Markers with Logic Protection
        const legMarkers = activePositions.map((pos, idx) => {
            if (!pos.time || isNaN(parseFloat(pos.entry))) return null;

            const entryTime = new Date(pos.time).getTime() / 1000;
            
            // 🟢 IMPROVED SNAP LOGIC: Markers MUST match an existing candle time to be visible
            const availableTimes = candleData.map(c => c.time);
            const snappedTime = availableTimes.reduce((prev, curr) => 
                Math.abs(curr - entryTime) < Math.abs(prev - entryTime) ? curr : prev
            );

            return {
                time: snappedTime, 
                position: pos.type === 'long' ? 'belowBar' : 'aboveBar',
                color: pos.type === 'long' ? '#10b981' : '#f59e0b',
                shape: pos.type === 'long' ? 'arrowUp' : 'arrowDown', // arrow is more visible than triangle
                text: `L${idx + 1} ENTRY`, 
                size: 1 // 🟢 Increased for visibility
            };
        }).filter(m => m !== null);

        seriesRef.current.candle.setMarkers([...legMarkers, ...tradeMarkers]);

        // 4. Draw Horizontal Price Lines
        activePositions.forEach((pos, idx) => {
            const entryPrice = parseFloat(pos.entry);
            const tpPrice = parseFloat(pos.tp);
            const tslPrice = parseFloat(pos.tsl);

            if (!isNaN(entryPrice)) {
                entryLinesRef.current.push(seriesRef.current.candle.createPriceLine({
                    price: entryPrice,
                    color: 'rgba(113, 113, 122, 0.6)',
                    lineWidth: 1,
                    lineStyle: LineStyle.Dashed,
                    title: `L${idx + 1} IN`,
                }));
            }

            if (!isNaN(tpPrice)) {
                entryLinesRef.current.push(seriesRef.current.candle.createPriceLine({
                    price: tpPrice,
                    color: '#a78bfa',
                    lineWidth: 1,
                    lineStyle: LineStyle.Dotted,
                    title: `L${idx + 1} TP`,
                }));
            }

            if (!isNaN(tslPrice)) {
                // 🟢 TSL Fix: Solid Crimson Line
                entryLinesRef.current.push(seriesRef.current.candle.createPriceLine({
                    price: tslPrice,
                    color: '#ef4444', 
                    lineWidth: 2, 
                    lineStyle: LineStyle.Solid,
                    axisLabelVisible: true,
                    title: `L${idx + 1} TSL`,
                }));
            }
        });

    }, [candleData, activePositions, tradeMarkers]);

    return <div ref={chartContainerRef} className="w-full h-full border border-zinc-800 rounded-3xl overflow-hidden" />;
};
