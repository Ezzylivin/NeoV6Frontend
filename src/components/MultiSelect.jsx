// File: src/components/MultiSelect.jsx
// A small dependency-free multi-select dropdown (checkbox list). Used for picking
// coins on the Fleet and Strategy Lab pages. Controlled: pass `selected` (array)
// and `onChange(nextArray)`. Options are strings or {value,label}.
import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export default function MultiSelect({
  options = [],
  selected = [],
  onChange,
  placeholder = "Select…",
  dataTour,
  labelFn = (v) => String(v).replace("-USD", ""),
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const norm = options.map((o) => (typeof o === "string" ? { value: o, label: labelFn(o) } : o));
  const sel = selected || [];
  const toggle = (v) => onChange(sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v]);

  return (
    <div ref={ref} data-tour={dataTour} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-left text-sm text-zinc-100 transition focus:border-emerald-500 focus:outline-none">
        <span className="truncate">
          {sel.length ? norm.filter((o) => sel.includes(o.value)).map((o) => o.label).join(", ") : <span className="text-zinc-600">{placeholder}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {sel.length > 0 && <span className="rounded-full bg-emerald-500/20 px-1.5 text-[10px] font-black text-emerald-400">{sel.length}</span>}
          <ChevronDown size={14} className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-zinc-700 bg-zinc-900 p-1 shadow-2xl">
          <div className="flex items-center justify-between px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
            <span>{sel.length} selected</span>
            <span className="flex gap-2">
              <button type="button" onClick={() => onChange(norm.map((o) => o.value))} className="hover:text-emerald-400">All</button>
              <button type="button" onClick={() => onChange([])} className="hover:text-rose-400">None</button>
            </span>
          </div>
          {norm.map((o) => {
            const on = sel.includes(o.value);
            return (
              <button type="button" key={o.value} onClick={() => toggle(o.value)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] transition ${on ? "bg-emerald-500/15 text-emerald-300" : "text-zinc-300 hover:bg-white/5"}`}>
                <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${on ? "border-emerald-400 bg-emerald-500/30" : "border-zinc-600"}`}>
                  {on && <Check size={10} className="text-emerald-300" />}
                </span>
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
