"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

/*
 * Shared primitives for the hand-rolled SVG charts of the lab.
 * Charts draw in real pixels (never a stretched viewBox) so text and strokes
 * stay crisp at any tile size: wrap the plot in <ChartBox> and draw with the
 * width/height it hands you.
 */

/** Categorical series colours, in fixed order. Colour follows the entity, never its rank. */
export const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)"] as const;

export interface Box {
  /** pixel size of the plot area */
  w: number;
  h: number;
  /** true once the chart has scrolled into view (stays true): gate entry animations on it */
  inView: boolean;
}

/**
 * A plot area that fills its parent. It never pushes the layout: the content is
 * absolutely positioned, so the box is sized only by `minHeight` and by whatever
 * the parent gives it (use `className="flex-1"` inside a flex column to fill a card).
 */
export function ChartBox({
  children,
  minHeight = 240,
  className = "",
}: {
  children: (box: Box) => ReactNode;
  minHeight?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(el);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className={`relative w-full select-none ${className}`} style={{ minHeight }}>
      <div className="absolute inset-0">{size.w > 0 && size.h > 0 ? children({ ...size, inView }) : null}</div>
    </div>
  );
}

/** Linear scale. */
export function linear(d0: number, d1: number, r0: number, r1: number) {
  const span = d1 - d0 || 1;
  return (v: number) => r0 + ((v - d0) / span) * (r1 - r0);
}

/** Log scale for counts (values below 1 are clamped to 1). */
export function logScale(d0: number, d1: number, r0: number, r1: number) {
  const l0 = Math.log(Math.max(1, d0));
  const span = Math.log(Math.max(1, d1)) - l0 || 1;
  return (v: number) => r0 + ((Math.log(Math.max(1, v)) - l0) / span) * (r1 - r0);
}

/** Round a maximum up to a clean axis value (1, 2, 2.5, 5 × 10ⁿ). */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
}

/** Clamp a tooltip's x so it does not overflow the plot (the tip is centred on x). */
export const clampTip = (x: number, w: number, half = 80) => Math.max(half, Math.min(w - half, x));
