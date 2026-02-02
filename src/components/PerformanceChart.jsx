import React, { useEffect, useRef, useMemo } from "react";
import { createChart, ColorType } from "lightweight-charts";

export function PerformanceChart({ results }) {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);

    const data = useMemo(() => {
        if (!results?.equityCurve || !results?.candleData || results.candleData.length === 0) {
            console.warn("⚠️ PerformanceChart: Missing required data for benchmark calculation.");
            return { strategy: [], buyHold: [] };
        }
        
        console.group("📈 PERFORMANCE CHART: PROCESSING DATA");
        const initialPrice = parseFloat(results.candleData[0].open);
        const initialBalance = results.initialBalance || 1000;
        console.log(`Base Price: ${initialPrice} | Initial Cash: ${initialBalance}`);

        // Map Strategy Equity (Yellow Line)
        const strategy = results.equityCurve.map(pt => ({
            time: Number(pt.time),
            value: parseFloat(pt.value || pt.balance)
        })).sort((a, b) => a.time - b.time);

        // Map Buy & Hold (Gray Dashed Line)
        // Calculation: (Current Price / Initial Price) * Initial Balance
        const buyHold = results.candleData.map(c => ({
            time: Number(c.time),
            value: initialBalance * (parseFloat(c.close) / initialPrice)
        })).sort((a, b) => a.time - b.time);

        console.log("Benchmark Logic: Completed.");
        console.groupEnd();
        return { strategy, buyHold };
    }, [results]);

    useEffect(() => {
        if (!chartContainerRef.current || data.strategy.length === 0) return;
        if (chartRef.current) chartRef.current.remove();

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 500,
            layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#94a3b8" },
            grid: { vertLines: { color: "rgba(255, 255, 255, 0.05)" }, horzLines: { color: "rgba(255, 255, 255, 0.05)" } },
            timeScale: { borderColor: "#374151", timeVisible: true },
        });

        const strategyLine = chart.addLineSeries({ color: "#fbbf24", lineWidth: 3, title: "Strategy Equity" });
        const bhLine = chart.addLineSeries({ color: "#4b5563", lineWidth: 2, lineStyle: 2, title: "Buy & Hold" });

        strategyLine.setData(data.strategy);
        bhLine.setData(data.buyHold);

        chart.timeScale().fitContent();
        chartRef.current = chart;
        return () => chart.remove();
    }, [data]);

    return (
        <div className="w-full h-full relative">
            <div className="absolute top-2 left-2 z-10 flex gap-4 text-[10px] font-mono pointer-events-none">
                <span className="flex items-center gap-1 text-amber-400">● STRATEGY</span>
                <span className="flex items-center gap-1 text-zinc-500">○ BUY & HOLD</span>
            </div>
            <div ref={chartContainerRef} className="w-full h-full" />
        </div>
    );
}
