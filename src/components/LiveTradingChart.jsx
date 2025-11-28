// File: src/components/LiveTradingChart.jsx
// 🚀 Fully Upgraded: Robust Time Parser + Stable Live Chart Component

import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import './LiveTradingChart.css';

const LiveTradingChart = ({ candles = [], trades = [] }) => {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);

    // -------------------------------------------------------------
    // 1. 🚀 ROBUST TIME PARSER (Merged + Upgraded)
    // -------------------------------------------------------------
    const parseTime = (t) => {
        if (!t) return null;

        // MongoDB: { $date: "2025-01-01T00:00:00Z" }
        if (typeof t === 'object' && t.$date) t = t.$date;

        const d = new Date(t);
        if (isNaN(d.getTime())) return null;

        return d.getTime() / 1000; // Lightweight Charts = Unix seconds
    };

    // -------------------------------------------------------------
    // 2. PREPARED CANDLE DATA (Merged Version)
    // -------------------------------------------------------------
    const chartData = useMemo(() => {
        if (!Array.isArray(candles)) return [];

        return candles
            .map(c => ({
                time: parseTime(c.timestamp || c.time || c.date || c.datetime),
                open: parseFloat(c.open),
                high: parseFloat(c.high),
                low: parseFloat(c.low),
                close: parseFloat(c.close),
            }))
            .filter(c => c.time) // Only valid timestamps
            .sort((a, b) => a.time - b.time);
    }, [candles]);

    // -------------------------------------------------------------
    // 3. TRADE MARKERS
    // -------------------------------------------------------------
    const markers = useMemo(() => {
        if (!Array.isArray(trades)) return [];

        const m = [];
        trades.forEach(t => {
            const entry = parseTime(t.entryTime || t.time);
            const exit = parseTime(t.exitTime);
            
            // BUY
            if (entry) {
                m.push({
                    time: entry,
                    position: 'belowBar',
                    color: '#2196F3',
                    shape: 'arrowUp',
                    text: `BUY`,
                });
            }

            // EXIT
            if (exit) {
                m.push({
                    time: exit,
                    position: 'aboveBar',
                    color: t.profit > 0 ? '#4CAF50' : '#F44336',
                    shape: 'circle',
                    text: `EXIT ${t.profit?.toFixed(2)}`,
                });
            }
        });

        return m.sort((a, b) => a.time - b.time);
    }, [trades]);

    // -------------------------------------------------------------
    // 4. CHART INIT + UPDATE
    // -------------------------------------------------------------
    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Create chart ONCE
        if (!chartRef.current) {
            chartRef.current = createChart(chartContainerRef.current, {
                width: chartContainerRef.current.clientWidth,
                height: 400,
                layout: { backgroundColor: '#111', textColor: '#ddd' },
                grid: {
                    vertLines: { color: '#333' },
                    horzLines: { color: '#333' },
                },
                crosshair: { mode: CrosshairMode.Normal },
                timeScale: { 
                    borderColor: '#485c7b',
                    timeVisible: true,
                    secondsVisible: false,
                },
            });

            seriesRef.current = chartRef.current.addCandlestickSeries({
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
            });
        }

        // Update data
        if (chartData.length > 0) {
            seriesRef.current.setData(chartData);
            seriesRef.current.setMarkers(markers);
        }

        // Responsive resizing
        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, [chartData, markers]);

    // -------------------------------------------------------------
    // 5. CLEANUP ON UNMOUNT ONLY
    // -------------------------------------------------------------
    useEffect(() => {
        return () => {
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, []);

    // -------------------------------------------------------------
    // 6. RENDER
    // -------------------------------------------------------------
    return (
        <div className="live-chart-wrapper">
            {chartData.length === 0 && (
                <div className="chart-placeholder">
                    <div className="spinner"></div>
                    <p>Waiting for live market data...</p>
                </div>
            )}
            <div ref={chartContainerRef} className="live-chart-container" />
        </div>
    );
};

export default LiveTradingChart;
