// File: src/components/LiveTradingChart.jsx
// 🚀 UPGRADE: v13.1 - Full Margin Support (Long/Short/Cover Markers)

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

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
    
    // 🟢 Series References
    const seriesRef = useRef({ 
        candle: null, 
        bbLower: null, 
        bbUpper: null, 
        emaFast: null, 
        emaSlow: null,
        entryLine: null // Placeholder for active position line
    });

    // 1. Initialize Chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        if (chartRef.current) {
            chartRef.current.remove();
        }

        const chart = createChart(chartContainerRef.current, {
            layout: { background: { type: ColorType.Solid, color: '#09090b' }, textColor: '#d4d4d8' },
            grid: { vertLines: { color: '#27272a' }, horzLines: { color: '#27272a' } },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#3f3f46' },
            crosshair: { mode: CrosshairMode.Normal },
        });

        const candleSeries = chart.addCandlestickSeries({ 
            upColor: '#10b981', downColor: '#ef4444', 
            borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#ef4444' 
        });
        
        seriesRef.current.candle = candleSeries;
        chartRef.current = chart;

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    // 2. Dynamic Strategy Overlays (BB, EMA)
    useEffect(() => {
        if (!chartRef.current) return;

        // Bollinger Bands
        const hasBB = strategies.some(s => s.code === 'bb_fade');
        if (hasBB) {
            if (!seriesRef.current.bbLower) {
                seriesRef.current.bbLower = chartRef.current.addLineSeries({ color: 'rgba(59, 130, 246, 0.5)', lineWidth: 1, title: 'BB Floor' });
                seriesRef.current.bbUpper = chartRef.current.addLineSeries({ color: 'rgba(59, 130, 246, 0.5)', lineWidth: 1, title: 'BB Ceiling' });
            }
        } else {
            if (seriesRef.current.bbLower) {
                chartRef.current.removeSeries(seriesRef.current.bbLower);
                chartRef.current.removeSeries(seriesRef.current.bbUpper);
                seriesRef.current.bbLower = null;
                seriesRef.current.bbUpper = null;
            }
        }

        // EMA Cloud
        const hasEMA = strategies.some(s => s.code === 'ema_cloud');
        if (hasEMA) {
            if (!seriesRef.current.emaFast) {
                seriesRef.current.emaFast = chartRef.current.addLineSeries({ color: '#10b981', lineWidth: 1, title: 'EMA Fast' });
                seriesRef.current.emaSlow = chartRef.current.addLineSeries({ color: '#f43f5e', lineWidth: 1, title: 'EMA Slow' });
            }
        } else {
            if (seriesRef.current.emaFast) {
                chartRef.current.removeSeries(seriesRef.current.emaFast);
                chartRef.current.removeSeries(seriesRef.current.emaSlow);
                seriesRef.current.emaFast = null;
                seriesRef.current.emaSlow = null;
            }
        }
    }, [strategies]);

    // 3. 🟢 Neural Data Sync Loop
    useEffect(() => {
        if (!seriesRef.current.candle || !candleData.length) return;

        // A. Update Candles
        const formattedCandles = candleData.map(c => ({
            time: c.time, open: c.open, high: c.high, low: c.low, close: c.close
        }));
        seriesRef.current.candle.setData(formattedCandles);

        // B. Update Strategy Lines
        if (seriesRef.current.bbLower) {
            const lower = candleData.map(c => c.bb_lower ? { time: c.time, value: c.bb_lower } : null).filter(Boolean);
            const upper = candleData.map(c => c.bb_upper ? { time: c.time, value: c.bb_upper } : null).filter(Boolean);
            seriesRef.current.bbLower.setData(lower);
            seriesRef.current.bbUpper.setData(upper);
        }

        if (seriesRef.current.emaFast) {
            const fast = candleData.map(c => c.ema_fast ? { time: c.time, value: c.ema_fast } : null).filter(Boolean);
            const slow = candleData.map(c => c.ema_slow ? { time: c.time, value: c.ema_slow } : null).filter(Boolean);
            seriesRef.current.emaFast.setData(fast);
            seriesRef.current.emaSlow.setData(slow);
        }

        // C. 🟢 UPDATE TRADE MARKERS (Margin Aware)
        if (tradeMarkers && tradeMarkers.length > 0) {
            const markers = tradeMarkers.map(t => {
                let color = '#ef4444'; // Default Red
                let shape = 'arrowDown';
                let position = 'aboveBar';
                let text = 'EXIT';

                // 1. Long Entry
                if (t.type === 'buy' || t.type === 'long') {
                    color = '#10b981'; // Green
                    shape = 'arrowUp';
                    position = 'belowBar';
                    text = 'LONG';
                } 
                // 2. Short Entry (New)
                else if (t.type === 'short') {
                    color = '#f59e0b'; // Amber/Orange for Caution
                    shape = 'arrowDown';
                    position = 'aboveBar';
                    text = 'SHORT';
                } 
                // 3. Short Cover (New)
                else if (t.type === 'cover') {
                    color = '#3b82f6'; // Blue for Closing Short
                    shape = 'arrowUp';
                    position = 'belowBar';
                    text = 'COVER';
                }
                // 4. Long Exit (Sell)
                else if (t.type === 'sell') {
                    color = '#ef4444'; // Red
                    text = 'SELL';
                }

                return {
                    time: t.time,
                    position,
                    color,
                    shape,
                    text,
                };
            });
            seriesRef.current.candle.setMarkers(markers);
        }

        // D. 🟢 OPTIONAL: Active Position Price Line
        // If we have an active position, draw a horizontal line at entry price
        if (activePositions && activePositions.length > 0) {
            const pos = activePositions[0];
            const priceLine = {
                price: pos.entry,
                color: pos.type === 'short' ? '#f59e0b' : '#10b981',
                lineWidth: 2,
                lineStyle: 2, // Dashed
                axisLabelVisible: true,
                title: `${pos.type.toUpperCase()} ENTRY`,
            };
            // Lightweight charts allows createPriceLine on the series
            // We clear old ones first (simplified here by removing logic, but ideal for a real app)
             // seriesRef.current.candle.createPriceLine(priceLine); 
        }

    }, [candleData, tradeMarkers, activePositions]);

    return <div ref={chartContainerRef} className="w-full h-full" />;
};
