import React, { useEffect, useRef, useMemo } from "react";
import { createChart, ColorType } from "lightweight-charts";

export function PerformanceChart({ results }) {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);

    const data = useMemo(() => {
        // Guard against empty data
        if (!results?.equityCurve || !results?.candleData || results.candleData.length === 0) {
            return { strategy: [], buyHold: [] };
        }
        
        const initialPrice = parseFloat(results.candleData[0].open);
        const initialBalance = results.initialBalance || 1000;

        // Map Strategy Equity
        const strategy = results.equityCurve.map(pt => ({
            time: Number(pt.time),
            value: parseFloat(pt.value || pt.balance)
        })).sort((a, b) => a.time - b.time);

        // Map Buy & Hold (Benchmarks your strategy against just holding the asset)
        const buyHold = results.candleData.map(c => ({
            time: Number(c.time),
            value: initialBalance * (parseFloat(c.close) / initialPrice)
        })).sort((a, b) => a.time - b.time);

        return { strategy, buyHold };
    }, [results]);

    useEffect(() => {
        if (!chartContainerRef.current || data.strategy.length === 0) return;
        if (chartRef.current) chartRef.current.remove();

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 500,
            layout: { 
                background: { type: ColorType.Solid, color: "transparent" }, 
                textColor: "#94a3b8" 
            },
            grid: { 
                vertLines: { color: "rgba(255, 255, 255, 0.05)" }, 
                horzLines: { color: "rgba(255, 255, 255, 0.05)" } 
            },
            timeScale: { borderColor: "#374151" },
        });

        // Strategy Line (Amber)
        const strategyLine = chart.addLineSeries({ 
            color: "#fbbf24", 
            lineWidth: 3, 
            title: "Strategy" 
        });

        // Benchmark Line (Gray Dashed)
        const bhLine = chart.addLineSeries({ 
            color: "#4b5563", 
            lineWidth: 2, 
            lineStyle: 2, 
            title: "Buy & Hold" 
        });

        strategyLine.setData(data.strategy);
        bhLine.setData(data.buyHold);

        chart.timeScale().fitContent();
        chartRef.current = chart;

        return () => chart.remove();
    }, [data]);

    return <div ref={chartContainerRef} className="w-full h-full" />;
}
