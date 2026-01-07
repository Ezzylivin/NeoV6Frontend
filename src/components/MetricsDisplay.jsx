import React from "react";

export const MetricsDisplay = ({ metrics }) => {
  if (!metrics) return null;

  const items = [
    { label: "Total Return", value: `${metrics.totalReturn}%` },
    { label: "Profit Factor", value: metrics.profitFactor },
    { label: "Max Drawdown", value: `${metrics.maxDrawdown}%` },
    { label: "Win Rate", value: `${metrics.winRate}%` },
    { label: "Total Trades", value: metrics.totalTrades },
    { label: "Avg. Win", value: `$${metrics.averageWin}` },
    { label: "Avg. Loss", value: `$${metrics.averageLoss}` },
    { label: "Final Balance", value: `$${metrics.finalBalance}` },
  ];

  return (
    <div>
      <h2>Metrics</h2>
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
