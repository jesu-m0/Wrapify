"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { PlotParams } from "react-plotly.js";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

/**
 * Plotly wrapper that fills the tile it lives in. The parent card must be a
 * flex column with a definite height (bento row spans); the chart is sized
 * with a ResizeObserver, so it also reacts to container resizes that don't
 * fire a window resize (split screen, grid reflows).
 */
export default function PlotlyChart({ layout, style, ...props }: PlotParams) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let first = true;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      const apply = () =>
        setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
      if (first) {
        // first measurement renders the chart right away; later ones are
        // debounced so Plotly.react isn't re-entered mid-initialization
        first = false;
        apply();
        return;
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(apply, 150);
    });
    ro.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative min-h-0 min-w-0 flex-1"
      style={{ minHeight: 200, ...style }}
    >
      {size && size.w > 0 && size.h > 0 && (
        <div className="absolute inset-0 overflow-hidden">
          <Plot
            {...props}
            layout={{ ...layout, width: size.w, height: size.h, autosize: false }}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      )}
    </div>
  );
}
