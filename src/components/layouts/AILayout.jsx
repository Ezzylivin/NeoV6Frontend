// File: src/components/layouts/AILayout.jsx
// 🚀 UPGRADE: v3.0 - "Neural Network" UI
// 🛠 Fixes: Correct import path.
// 🛠 Features: Cyberpunk/AI aesthetic, Tailwind CSS.

import React from "react";
// Assuming SharedComponents is in src/components/
import { DecisionStream } from "../SharedComponents";

const AILayout = (props) => {
  const { formConfig, logs } = props;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] h-screen bg-neutral-950 text-neutral-200 font-mono overflow-hidden">
      
      {/* LEFT: NEURAL CONFIG */}
      <aside className="flex flex-col gap-6 p-6 border-r border-emerald-500/20 bg-[#050505] relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 p-10 opacity-5 text-emerald-500 pointer-events-none text-9xl">
           🧠
        </div>

        <div className="z-10">
          <h3 className="text-emerald-500 text-sm font-bold tracking-[0.2em] mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            NEURAL_CONFIG_V1
          </h3>

          <div className="space-y-4">
            <div className="p-4 rounded border border-emerald-500/20 bg-emerald-900/5 hover:bg-emerald-900/10 transition-colors">
              <label className="block text-[10px] text-emerald-400/60 font-bold mb-1 uppercase tracking-wider">Model Architecture</label>
              <div className="text-lg text-emerald-100 font-bold truncate">{formConfig.mlModel || "STANDARD_HEURISTIC"}</div>
            </div>

            <div className="p-4 rounded border border-emerald-500/20 bg-emerald-900/5 hover:bg-emerald-900/10 transition-colors">
              <label className="block text-[10px] text-emerald-400/60 font-bold mb-1 uppercase tracking-wider">Decision Mode</label>
              <div className="text-lg text-emerald-100 font-bold">{(formConfig.mlMode || "OFF").toUpperCase()}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded border border-emerald-500/20 bg-emerald-900/5">
                <label className="block text-[10px] text-emerald-400/60 font-bold mb-1 uppercase tracking-wider">Threshold</label>
                <div className="text-2xl text-emerald-400 font-bold drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">
                  {formConfig.mlThreshold}
                </div>
              </div>
              <div className="p-4 rounded border border-emerald-500/20 bg-emerald-900/5">
                <label className="block text-[10px] text-emerald-400/60 font-bold mb-1 uppercase tracking-wider">Logic Gate</label>
                <div className="text-2xl text-emerald-400 font-bold">
                  {formConfig.comboConfig?.combinationRule || "OR"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto z-10 text-[10px] text-emerald-900/40 text-center">
           A.I. DECISION CORE // ONLINE
        </div>
      </aside>

      {/* RIGHT: THOUGHT PROCESS */}
      <main className="flex flex-col h-full bg-[#020202] relative p-6">
        {/* Container */}
        <div className="flex-1 flex flex-col border border-emerald-500/30 rounded-lg overflow-hidden bg-black/50 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-emerald-500/20 bg-emerald-900/5 flex justify-between items-center">
            <div className="text-emerald-500 text-xs font-bold tracking-[0.2em]">/// LIVE DECISION STREAM ///</div>
            <div className="flex gap-1">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div>
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div>
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div>
            </div>
          </div>
          
          {/* Stream Body */}
          <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
            <DecisionStream logs={logs} limit={50} />
          </div>
        </div>
      </main>

    </div>
  );
};

export default AILayout;
