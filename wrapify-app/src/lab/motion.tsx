"use client";

import { useEffect, useRef, useState } from "react";
import { fmtInt } from "./insights";

/** True once the element has scrolled into view (stays true). */
export function useInView<T extends Element>(rootMargin = "0px 0px -8% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return [ref, inView] as const;
}

/** Number that counts up when it enters the viewport, and glides to new values afterwards. */
export function CountUp({
  value,
  duration = 1600,
  delay = 0,
  format = fmtInt,
  className,
}: {
  value: number;
  duration?: number;
  delay?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLSpanElement>("0px");
  const [shown, setShown] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (!inView) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = current.current;
    let raf = 0;
    let t0: number | null = null;
    const tick = (t: number) => {
      if (t0 === null) t0 = t + delay;
      const p = reduce ? 1 : Math.min(1, Math.max(0, (t - t0) / duration));
      const eased = 1 - Math.pow(1 - p, 4);
      current.current = from + (value - from) * eased;
      setShown(current.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, delay]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {format(shown)}
    </span>
  );
}

/** Five dancing bars — the lab's logo / loading mark. */
export function Equalizer({ className = "", bars = 5 }: { className?: string; bars?: number }) {
  return (
    <span className={`lab-eq ${className}`} aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} style={{ animationDelay: `${-i * 0.23}s` }} />
      ))}
    </span>
  );
}
