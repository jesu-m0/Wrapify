"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MONTH_SHORT = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

interface DateRangeSliderProps {
  /** All unique year-month strings "YYYY-MM" sorted */
  months: string[];
  /** Currently applied range [startIdx, endIdx] */
  appliedRange: [number, number];
  /** Called when user confirms the new range */
  onApply: (range: [number, number]) => void;
  /** Whether the dashboard is recalculating */
  loading?: boolean;
}

function formatLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTH_SHORT[Number(m) - 1]} ${y}`;
}

export default function DateRangeSlider({
  months,
  appliedRange,
  onApply,
  loading,
}: DateRangeSliderProps) {
  const [range, setRange] = useState<[number, number]>(appliedRange);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"min" | "max" | null>(null);

  const max = months.length - 1;
  const changed = range[0] !== appliedRange[0] || range[1] !== appliedRange[1];

  // Sync if appliedRange changes externally
  useEffect(() => {
    setRange(appliedRange);
  }, [appliedRange]);

  const pct = useCallback(
    (idx: number) => (max === 0 ? 0 : (idx / max) * 100),
    [max]
  );

  const idxFromEvent = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(ratio * max);
    },
    [max]
  );

  const onPointerDown = useCallback(
    (thumb: "min" | "max") => (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = thumb;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const idx = idxFromEvent(e.clientX);
      setRange((prev) => {
        if (dragging.current === "min") {
          return [Math.min(idx, prev[1]), prev[1]];
        }
        return [prev[0], Math.max(idx, prev[0])];
      });
    },
    [idxFromEvent]
  );

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  // Year tick marks for the legend
  const yearTicks = useMemo(() => {
    const ticks: { label: string; pct: number }[] = [];
    let lastYear = "";
    for (let i = 0; i <= max; i++) {
      const y = months[i].split("-")[0];
      if (y !== lastYear) {
        ticks.push({ label: y, pct: pct(i) });
        lastYear = y;
      }
    }
    return ticks;
  }, [months, max, pct]);

  if (months.length === 0) return null;

  return (
    <div className="rounded-3xl bg-[#111] p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-zinc-100">Período de análisis</h3>
          <span className="rounded-full bg-emerald-950/60 border border-emerald-800/30 px-3 py-0.5 text-xs font-medium text-emerald-400/80">
            {formatLabel(months[range[0]])} — {formatLabel(months[range[1]])}
          </span>
        </div>
        {changed && (
          <button
            onClick={() => onApply(range)}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
                Calculando…
              </>
            ) : (
              "Actualizar stats"
            )}
          </button>
        )}
      </div>

      {/* Slider track */}
      <div
        ref={trackRef}
        className="relative mx-2 h-2 select-none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Background track */}
        <div className="absolute inset-0 rounded-full bg-zinc-800" />

        {/* Active range */}
        <div
          className="absolute top-0 bottom-0 rounded-full bg-emerald-600/60"
          style={{
            left: `${pct(range[0])}%`,
            right: `${100 - pct(range[1])}%`,
          }}
        />

        {/* Min thumb */}
        <div
          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none active:cursor-grabbing"
          style={{ left: `${pct(range[0])}%` }}
          onPointerDown={onPointerDown("min")}
        >
          <div className="h-5 w-5 rounded-full border-2 border-emerald-400 bg-zinc-950 shadow-lg shadow-emerald-900/40 transition-transform hover:scale-110" />
        </div>

        {/* Max thumb */}
        <div
          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none active:cursor-grabbing"
          style={{ left: `${pct(range[1])}%` }}
          onPointerDown={onPointerDown("max")}
        >
          <div className="h-5 w-5 rounded-full border-2 border-emerald-400 bg-zinc-950 shadow-lg shadow-emerald-900/40 transition-transform hover:scale-110" />
        </div>
      </div>

      {/* Year ticks legend */}
      <div className="relative mx-2 mt-3 h-5">
        {yearTicks.map((tick) => (
          <span
            key={tick.label}
            className="absolute -translate-x-1/2 text-[10px] font-medium text-zinc-500"
            style={{ left: `${tick.pct}%` }}
          >
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}
