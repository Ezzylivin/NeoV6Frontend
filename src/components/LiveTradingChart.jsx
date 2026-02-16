// File: src/components/LiveTradingChart.jsx
// 🚀 UPGRADE: v13.8 - Dynamic Multi-Strategy Visualizer

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
        overlays: {} // Stores dynamic strategy lines
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
    // Creates lines based on User Selection
    useEffect(() => {
        if (!chartRef.current) return;

        // Clear old overlays
        Object.values(seriesRef.current.overlays).forEach(s => chartRef.current.removeSeries(s));
        seriesRef.current.overlays = {};

        strategies.forEach(strat => {
            // Bollinger Bands
            if (strat.code === 'bb_fade') {
                seriesRef.current.overlays['bb_upper'] = chartRef.current.addLineSeries({ color: 'rgba(59, 130, 246, 0.5)', lineWidth: 1, title: 'BB High' });
                seriesRef.current.overlays['bb_lower'] = chartRef.current.addLineSeries({ color: 'rgba(59, 130, 246, 0.5)', lineWidth: 1, title: 'BB Low' });
            }
            // EMA Cloud
            if (strat.code === 'ema_cloud') {
                seriesRef.current.overlays['ema_fast'] = chartRef.current.addLineSeries({ color: '#34d399', lineWidth: 1, title: 'EMA 9' });
                seriesRef.current.overlays['ema_slow'] = chartRef.current.addLineSeries({ color: '#f87171', lineWidth: 1, title: 'EMA 21' });
            }
            // SMA Crossover
            if (strat.code === 'sma_crossover') {
                seriesRef.current.overlays['sma_fast'] = chartRef.current.addLineSeries({ color: '#fbbf24', lineWidth: 2, title: 'SMA 50' });
                seriesRef.current.overlays['sma_slow'] = chartRef.current.addLineSeries({ color: '#8b5cf6', lineWidth: 2, title: 'SMA 200' });
            }
            // SuperTrend
            if (strat.code === 'supertrend') {
                seriesRef.current.overlays['supertrend'] = chartRef.current.addLineSeries({ color: '#d946ef', lineWidth: 2, lineStyle: LineStyle.Step, title: 'SuperTrend' });
            }
            // Price Action Breakout (Donchian)
            if (strat.code === 'pa_breakout') {
                seriesRef.current.overlays['pa_high'] = chartRef.current.addLineSeries({ color: '#facc15', lineWidth: 1, lineStyle: LineStyle.Dashed, title: '20d High' });
                seriesRef.current.overlays['pa_low'] = chartRef.current.addLineSeries({ color: '#facc15', lineWidth: 1, lineStyle: LineStyle.Dashed, title: '20d Low' });
            }
            // ATR Breakout Bands
            if (strat.code === 'atr_breakout') {
                seriesRef.current.overlays['atr_upper'] = chartRef.current.addLineSeries({ color: '#22d3ee', lineWidth: 1, lineStyle: LineStyle.Dotted, title: 'ATR Top' });
                seriesRef.current.overlays['atr_lower'] = chartRef.current.addLineSeries({ color: '#22d3ee', lineWidth: 1, lineStyle: LineStyle.Dotted, title: 'ATR Bot' });
            }
        });
    }, [strategies]);

    // 3. 🟢 DATA SYNC LOOP
    useEffect(() => {
        if (!seriesRef.current.candle || !candleData.length) return;

        // Update Candles
        seriesRef.current.candle.setData(candleData.map(c => ({
            time: c.time, open: c.open, high: c.high, low: c.low, close: c.close
        })));

        // Update Dynamic Lines
        const overlays = seriesRef.current.overlays;
        const validKeys = Object.keys(overlays);
        
        validKeys.forEach(key => {
            const dataPoints = candleData
                .map(c => c[key] ? { time: c.time, value: c[key] } : null)
                .filter(Boolean); // Remove nulls to prevent chart errors
            
            if (overlays[key]) overlays[key].setData(dataPoints);
        });

        // Update Markers (Arrows)
        if (tradeMarkers.length > 0) {
            const markers = tradeMarkers.map(t => ({
                time: t.time,
                position: t.text?.includes('Buy') || t.text?.includes('Long') || t.text?.includes('Low') ? 'belowBar' : 'aboveBar',
                color: t.text?.includes('Buy') || t.text?.includes('Long') || t.text?.includes('Low') ? '#10b981' : '#ef4444',
                shape: t.text?.includes('Buy') || t.text?.includes('Long') || t.text?.includes('Low') ? 'arrowUp' : 'arrowDown',
                text: t.text,
                size: 1.5
            }));
            seriesRef.current.candle.setMarkers(markers);
        }

    }, [candleData, tradeMarkers]);

    return <div ref={chartContainerRef} className="w-full h-full" />;
};
