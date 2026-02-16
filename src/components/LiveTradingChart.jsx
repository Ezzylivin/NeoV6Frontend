// File: src/components/LiveTradingChart.jsx
// 🚀 UPGRADE: v13.9 - Hardened Data Sync & Marker Integration

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';

export const LiveTradingChart = ({ 
    symbol, 
    timeframe, 
    isRunning, 
    activePositions, 
    tradeMarkers = [], 
    candleData = [], 
    strategies = [] 
}) => {
    const chartContainerRef = useRef();
    const chartRef = useRef(null);
    const seriesRef = useRef({ 
        candle: null,
        overlays: {} 
    });

    // 1. Initialize Chart
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

        const handleResize = () => {
            if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        };
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    // 2. 🟢 DYNAMIC STRATEGY RENDERER
    useEffect(() => {
        if (!chartRef.current) return;

        Object.values(seriesRef.current.overlays).forEach(s => chartRef.current.removeSeries(s));
        seriesRef.current.overlays = {};

        strategies.forEach(strat => {
            if (strat.code === 'bb_fade') {
                seriesRef.current.overlays['bb_upper'] = chartRef.current.addLineSeries({ color: 'rgba(59, 130, 246, 0.5)', lineWidth: 1, title: 'BB High' });
                seriesRef.current.overlays['bb_lower'] = chartRef.current.addLineSeries({ color: 'rgba(59, 130, 246, 0.5)', lineWidth: 1, title: 'BB Low' });
            }
            if (strat.code === 'ema_cloud') {
                seriesRef.current.overlays['ema_fast'] = chartRef.current.addLineSeries({ color: '#34d399', lineWidth: 1, title: 'EMA 9' });
                seriesRef.current.overlays['ema_slow'] = chartRef.current.addLineSeries({ color: '#f87171', lineWidth: 1, title: 'EMA 21' });
            }
            if (strat.code === 'sma_crossover') {
                seriesRef.current.overlays['sma_fast'] = chartRef.current.addLineSeries({ color: '#fbbf24', lineWidth: 2, title: 'SMA 50' });
                seriesRef.current.overlays['sma_slow'] = chartRef.current.addLineSeries({ color: '#8b5cf6', lineWidth: 2, title: 'SMA 200' });
            }
            if (strat.code === 'supertrend') {
                seriesRef.current.overlays['supertrend'] = chartRef.current.addLineSeries({ color: '#d946ef', lineWidth: 2, lineStyle: LineStyle.Step, title: 'SuperTrend' });
            }
        });
    }, [strategies]);

    // 3. 🟢 DATA SYNC LOOP (Consolidated & Stabilized)
    useEffect(() => {
        if (!seriesRef.current.candle || !candleData.length) return;

        // A. Filter out duplicates and sort by time to prevent Lightweight-Charts crash
        const seenTimes = new Set();
        const uniqueData = candleData.filter(c => {
            const t = Number(c.time);
            if (!t || seenTimes.has(t)) return false;
            seenTimes.add(t);
            return true;
        }).sort((a, b) => a.time - b.time);

        // B. Update Main Candles
        seriesRef.current.candle.setData(uniqueData.map(c => ({
            time: c.time, open: c.open, high: c.high, low: c.low, close: c.close
        })));

        // C. Update Dynamic Lines (Overlays)
        const overlays = seriesRef.current.overlays;
        Object.keys(overlays).forEach(key => {
            const linePoints = uniqueData
                .filter(c => c[key] !== undefined && c[key] !== null)
                .map(c => ({ time: c.time, value: parseFloat(c[key]) }));
            
            if (overlays[key] && linePoints.length > 0) {
                overlays[key].setData(linePoints);
            }
        });

        // D. Update Trade Markers (Arrows)
        if (tradeMarkers.length > 0) {
            const markers = tradeMarkers
                .filter(t => seenTimes.has(Number(t.time))) // Only show markers that have a corresponding candle
                .map(t => ({
                    time: Number(t.time),
                    position: t.text?.includes('Short') || t.text?.includes('High') || t.text?.includes('Veto') ? 'aboveBar' : 'belowBar',
                    color: t.text?.includes('Short') || t.text?.includes('High') || t.text?.includes('Veto') ? '#f43f5e' : '#10b981',
                    shape: t.text?.includes('Short') || t.text?.includes('High') || t.text?.includes('Veto') ? 'arrowDown' : 'arrowUp',
                    text: t.text,
                    size: 1
                }));
            seriesRef.current.candle.setMarkers(markers);
        }

    }, [candleData, tradeMarkers]); // Runs whenever new data or markers arrive

    return <div ref={chartContainerRef} className="w-full h-full" />;
};
