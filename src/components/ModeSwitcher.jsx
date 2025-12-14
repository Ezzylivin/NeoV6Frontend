import React from "react";
import { useUIMode } from "../context/UIModeContext";
import "./ModeSwitcher.css"; // We'll add styles later

const modes = [
  { id: "desk", label: "🏦 DESK", icon: "📊" },
  { id: "lab", label: "🧪 LAB", icon: "🔬" },
  { id: "command", label: "🚨 CMD", icon: "⚠️" },
  { id: "journal", label: "📖 LOG", icon: "📜" },
  { id: "ai", label: "🤖 AI", icon: "🧠" },
];

export const ModeSwitcher = () => {
  const { mode, setMode } = useUIMode();

  return (
    <div className="mode-switcher">
      {modes.map((m) => (
        <button
          key={m.id}
          className={`mode-btn ${mode === m.id ? "active" : ""}`}
          onClick={() => setMode(m.id)}
          title={`Switch to ${m.label} Mode`}
        >
          <span className="mode-icon">{m.icon}</span>
          <span className="mode-label">{m.label}</span>
        </button>
      ))}
    </div>
  );
};
