import React from "react";
import { useUIMode } from "../context/UIModeContext";
import { ModeSwitcher } from "../components/ModeSwitcher";

// Import Layouts
import DeskLayout from "../components/layouts/DeskLayout";
import LabLayout from "../components/layouts/LabLayout";
import CommandLayout from "../components/layouts/CommandLayout";
import AILayout from "../components/layouts/AILayout";
// ❌ REMOVED: JournalLayout Import

const TradingBotShell = (props) => {
  const { mode } = useUIMode();

  const renderLayout = () => {
    switch (mode) {
      case "lab": return <LabLayout {...props} />;
      case "command": return <CommandLayout {...props} />;
      case "ai": return <AILayout {...props} />;
      // ❌ REMOVED: Journal Case
      case "desk":
      default: return <DeskLayout {...props} />;
    }
  };

  return (
    <div className={`shell-container mode-${mode}`}>
      <div className="shell-header">
        <h1 className="app-title">NEO-V6 // {mode.toUpperCase()} MODE</h1>
        <ModeSwitcher />
      </div>
      <div className="shell-content">
        {renderLayout()}
      </div>
    </div>
  );
};

export default TradingBotShell;
