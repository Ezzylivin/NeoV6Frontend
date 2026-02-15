// File: src/components/LiveTradingChart.jsx
// 🚀 UPGRADE: v13.9 - Hardened Sync & Multi-Strategy Visualizer

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';

export const LiveTradingChart = ({ 
    symbol, candleData = [], tradeMarkers = [], strategies = [], isRunning 
}) => {
    const chartContainerRef = useRef();
    const chartRef = useRef(null);
    const seriesRef = useRef({ candle: null, overlays: {} });

    // 1. Initialize Chart Object
    useEffect(() => {
        if (!chartContainerRef.current) return;
        if (chartRef.current) chartRef.current.remove();

        const chart = createChart(chartContainerRef.current, {
            layout: { background: { type: ColorType.Solid, color: '#09090b' }, textColor: '#71717a' },
            grid: { vertLines: { color: '#18181b' }, horzLines: { color: '#18181b' } },
            width: chartContainerRef.current.clientWidth,
            height: 450,
            timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#27272a' },
            rightPriceScale: { borderColor: '#27272a' },
            crosshair: { mode: CrosshairMode.Normal },
        });

        seriesRef.current.candle = chart.addCandlestickSeries({ 
            upColor: '#10b981', downColor: '#ef4444', 
            borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#ef4444' 
        });
        
        chartRef.current = chart;
        const handleResize = () => chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        window.addEventListener('resize', handleResize);
        return () => { window.removeEventListener('resize', handleResize); chart.remove(); };
    }, []);

    // 2. 🟢 RENDER STRATEGY LINES (EMA, BB, SMA, etc.)
    useEffect(() => {
        if (!chartRef.current) return;
        Object.values(seriesRef.current.overlays).forEach(s => chartRef.current.removeSeries(s));
        seriesRef.current.overlays = {};

        strategies.forEach(strat => {
            const config = { lineWidth: 1, crosshairMarkerVisible: false };
            if (strat.code === 'ema_cloud') {
                seriesRef.current.overlays['ema_fast'] = chartRef.current.addLineSeries({ ...config, color: '#34d399', title: 'EMA 9' });
                seriesRef.current.overlays['ema_slow'] = chartRef.current.addLineSeries({ ...config, color: '#f87171', title: 'EMA 21' });
            }
            if (strat.code === 'bb_fade') {
                seriesRef.current.overlays['bb_upper'] = chartRef.current.addLineSeries({ ...config, color: 'rgba(59, 130, 246, 0.4)', title: 'BB High' });
                seriesRef.current.overlays['bb_lower'] = chartRef.current.addLineSeries({ ...config, color: 'rgba(59, 130, 246, 0.4)', title: 'BB Low' });
            }
            if (strat.code === 'sma_crossover') {
                seriesRef.current.overlays['sma_fast'] = chartRef.current.addLineSeries({ ...config, color: '#fbbf24', lineWidth: 2, title: 'SMA 50' });
                seriesRef.current.overlays['sma_slow'] = chartRef.current.addLineSeries({ ...config, color: '#8b5cf6', lineWidth: 2, title: 'SMA 200' });
            }
        });
    }, [strategies]);

    // 3. 🟢 DATA SYNC & DUPLICATE FILTERING
    useEffect(() => {
        if (!seriesRef.current.candle || !candleData.length) return;

        // Prevent Lightweight-Charts crash by filtering duplicate timestamps
        const seen = new Set();
        const unique = candleData.filter(c => {
            const t = Number(c.time);
            if (seen.has(t)) return false;
            seen.add(t);
            return true;
        }).sort((a, b) => a.time - b.time);

        seriesRef.current.candle.setData(unique);

        // Update Overlays
        const overlays = seriesRef.current.overlays;
        Object.keys(overlays).forEach(key => {
            const points = unique.filter(c => c[key]).map(c => ({ time: c.time, value: parseFloat(c[key]) }));
            if (overlays[key] && points.length) overlays[key].setData(points);
        });

        // Update Buy/Sell/Veto Markers
        if (tradeMarkers.length) {
            seriesRef.current.candle.setMarkers(tradeMarkers.map(t => ({
                time: Number(t.time),
                position: t.text?.includes('Short') || t.text?.includes('Veto') ? 'aboveBar' : 'belowBar',
                color: t.text?.includes('Veto') || t.text?.includes('Short') ? '#f43f5e' : '#10b981',
                shape: t.text?.includes('Veto') || t.text?.includes('Short') ? 'arrowDown' : 'arrowUp',
                text: t.text
            })));
        }
    }, [candleData, tradeMarkers]);

    return <div ref={chartContainerRef} className="w-full h-full min-h-[450px]" />;
};
