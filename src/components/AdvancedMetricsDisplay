import React from "react";

export const AdvancedMetricsDisplay = ({ metrics }) => {
  if (!metrics) return null;

  const items = [
    { label: "Sharpe Ratio", value: metrics.sharpeRatio?.toFixed(2) || "N/A" },
    { label: "Sortino Ratio", value: metrics.sortinoRatio?.toFixed(2) || "N/A" },
    { label: "Expectancy", value: `$${metrics.expectancy?.toFixed(2) || "N/A"}` },
    { label: "Avg Hold Time", value: `${metrics.avgHoldTime?.toFixed(2) || "N/A"} hrs` },
    { label: "Max Losing Streak", value: metrics.maxLosingStreak || "N/A" },
  ];

  return (
    <div>
      <h2>Advanced Metrics</h2>
      <ul>
        {items.map((item, index) => (
          <li key={index}>
            <strong>{item.label}:</strong> {item.value}
          </li>
        ))}
      </ul>
    </div>
  );
};
