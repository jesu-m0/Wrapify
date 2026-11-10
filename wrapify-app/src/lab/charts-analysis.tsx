"use client";

import { CSSProperties, MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChartBox, clampTip, linear, logScale, SERIES } from "./chart-kit";
import { fmtInt } from "./insights";
import { useInView } from "./motion";

/*
 * "Advanced analysis" charts: quadrant scatter, bump chart, matrix heatmap,
 * concentration curve and sankey. Same rules as charts.tsx: hand-rolled SVG/HTML,
 * colours only from the card's CSS variables, text never wears a series colour.
 */

const EMPTY_TEXT = "Sin datos suficientes en este periodo";
const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/* ── shared helpers ── */

/** FNV-1a: stable colour index for an entity key (colour follows the entity, never its rank). */
function stableHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const seriesColor = (key: string) => SERIES[stableHash(key) % SERIES.length];

function Empty({ minHeight, className = "" }: { minHeight?: number; className?: string }) {
  return (
    <div className={`flex items-center justify-center text-center text-[13px] ${className}`} style={{ minHeight, color: "var(--muted)" }}>
      {EMPTY_TEXT}
    </div>
  );
}

/** Left-to-right reveal of a whole svg, once, when it scrolls into view. */
const wipeStyle = (inView: boolean): CSSProperties => ({
  clipPath: inView ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
  transition: `clip-path 1.2s ${EASE}`,
});

const truncate = (s: string, max: number) => (max < 2 ? "" : s.length > max ? `${s.slice(0, Math.max(1, max - 1))}…` : s);

const pctText = (n: number) => (n < 10 ? n.toFixed(1).replace(".", ",") : String(Math.round(n)));

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Glides a record of numbers to its new target with rAF (default ~450 ms), so
 * geometry computed from it moves instead of jumping while the history plays.
 * `target` must be memoised by the caller. Keys not seen before start at 0
 * (fromZero) or directly at their target.
 */
function useTweenRecord(target: Record<string, number>, fromZero: boolean, ms = 450): Record<string, number> {
  const [cur, setCur] = useState(target);
  const curRef = useRef(target);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (prefersReducedMotion()) {
      const jump = requestAnimationFrame(() => {
        curRef.current = target;
        setCur(target);
      });
      return () => cancelAnimationFrame(jump);
    }
    const from = curRef.current;
    const start: Record<string, number> = {};
    for (const k in target) start[k] = k in from ? from[k] : fromZero ? 0 : target[k];
    let raf = 0;
    let t0: number | null = null;
    const tick = (t: number) => {
      if (t0 === null) t0 = t;
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      const next: Record<string, number> = {};
      for (const k in target) next[k] = start[k] + (target[k] - start[k]) * e;
      curRef.current = next;
      setCur(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, fromZero, ms]);
  return cur;
}

/** Tick values: 3–4 "nice" linear ticks inside [lo, hi]. */
function niceTicks(lo: number, hi: number, count = 4): number[] {
  const span = hi - lo;
  if (!(span > 0)) return [lo];
  const raw = span / count;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step, i = 0; t <= hi + step * 1e-9 && i < 12; t += step, i++) out.push(t);
  return out;
}

/** Log ticks: 1, 10, 100… inside [lo, hi]; falls back to the two ends. */
function logTicks(lo: number, hi: number): number[] {
  const out: number[] = [];
  const k0 = Math.ceil(Math.log10(Math.max(1, lo)) - 1e-9);
  const k1 = Math.floor(Math.log10(Math.max(1, hi)) + 1e-9);
  for (let k = k0; k <= k1 && out.length < 8; k++) out.push(Math.pow(10, k));
  return out.length >= 2 ? out : lo < hi ? [lo, hi] : [lo];
}

const median = (vals: number[]) => {
  if (!vals.length) return 0;
  const s = [...vals].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/* ══════════════════════════════════════════════════════════════════════
 * QuadrantScatter
 * ══════════════════════════════════════════════════════════════════════ */

export interface ScatterDatum {
  key: string;
  label: string;
  x: number;
  y: number;
  size?: number;
}

export function QuadrantScatter({
  points,
  xLabel,
  yLabel,
  xLog,
  yLog,
  xFormat = fmtInt,
  yFormat = fmtInt,
  quadrants,
  labelCount = 12,
  onSelect,
  minHeight = 300,
  className = "",
}: {
  points: ScatterDatum[];
  xLabel: string;
  yLabel: string;
  xLog?: boolean;
  yLog?: boolean;
  xFormat?: (n: number) => string;
  yFormat?: (n: number) => string;
  quadrants?: { tl: string; tr: string; bl: string; br: string };
  labelCount?: number;
  onSelect?: (d: ScatterDatum) => void;
  minHeight?: number;
  className?: string;
}) {
  const [hotKey, setHotKey] = useState<string | null>(null);
  const pts = useMemo(() => points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)), [points]);

  // draw order: big dots first so small ones stay on top (sort is stable)
  const drawOrder = useMemo(() => [...pts].sort((a, b) => (b.size ?? 0) - (a.size ?? 0)), [pts]);
  const stats = useMemo(() => {
    let xlo = Infinity, xhi = -Infinity, ylo = Infinity, yhi = -Infinity, smin = Infinity, smax = -Infinity;
    for (const p of pts) {
      if (p.x < xlo) xlo = p.x;
      if (p.x > xhi) xhi = p.x;
      if (p.y < ylo) ylo = p.y;
      if (p.y > yhi) yhi = p.y;
      if (p.size != null) {
        if (p.size < smin) smin = p.size;
        if (p.size > smax) smax = p.size;
      }
    }
    return { xlo, xhi, ylo, yhi, smin, smax, mx: median(pts.map((p) => p.x)), my: median(pts.map((p) => p.y)) };
  }, [pts]);

  if (!pts.length) return <Empty minHeight={minHeight} className={className} />;

  const fix = (lo: number, hi: number, log?: boolean): [number, number] => {
    if (log) {
      lo = Math.max(1, lo);
      hi = Math.max(1, hi);
      return hi > lo ? [lo, hi] : [lo, lo * 10];
    }
    return hi > lo ? [lo, hi] : [lo - 1, hi + 1];
  };
  const [xlo, xhi] = fix(stats.xlo, stats.xhi, xLog);
  const [ylo, yhi] = fix(stats.ylo, stats.yhi, yLog);

  const radius = (d: ScatterDatum) => {
    if (d.size == null) return 5;
    const a = Math.sqrt(Math.max(0, stats.smin));
    const b = Math.sqrt(Math.max(0, stats.smax));
    const t = b > a ? (Math.sqrt(Math.max(0, d.size)) - a) / (b - a) : 0.5;
    return 4 + 9 * Math.max(0, Math.min(1, t));
  };

  return (
    <ChartBox minHeight={minHeight} className={className}>
      {({ w, h, inView }) => {
        const ml = 52, mr = 14, mt = 24, mb = 40, inset = 14;
        const pw = Math.max(1, w - ml - mr);
        const ph = Math.max(1, h - mt - mb);
        const sx = xLog ? logScale(xlo, xhi, inset, Math.max(inset + 1, pw - inset)) : linear(xlo, xhi, inset, Math.max(inset + 1, pw - inset));
        const sy = yLog ? logScale(ylo, yhi, Math.max(inset + 1, ph - inset), inset) : linear(ylo, yhi, Math.max(inset + 1, ph - inset), inset);
        const xt = xLog ? logTicks(xlo, xhi) : niceTicks(xlo, xhi, pw < 420 ? 3 : 4);
        const yt = yLog ? logTicks(ylo, yhi) : niceTicks(ylo, yhi, 3);
        const mxp = sx(stats.mx);
        const myp = sy(stats.my);

        // greedy direct labels: biggest first, skip any that collide or leave the plot
        const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
        const labels = new Map<string, { dx: number; anchor: "start" | "end"; text: string }>();
        const byBig = [...pts].sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
        for (const d of byBig) {
          if (labels.size >= labelCount) break;
          const x = sx(d.x), y = sy(d.y), r = radius(d);
          const text = truncate(d.label, 24);
          const tw = text.length * 6.2;
          const sides: [number, number, "start" | "end"][] = [
            [x + r + 4, x + r + 4 + tw, "start"],
            [x - r - 4 - tw, x - r - 4, "end"],
          ];
          for (const [x0, x1, anchor] of sides) {
            const rect = { x0, x1, y0: y - 7, y1: y + 7 };
            if (rect.x0 < 0 || rect.x1 > pw || rect.y0 < 0 || rect.y1 > ph) continue;
            if (placed.some((p) => rect.x0 < p.x1 && rect.x1 > p.x0 && rect.y0 < p.y1 && rect.y1 > p.y0)) continue;
            placed.push(rect);
            labels.set(d.key, { dx: anchor === "start" ? r + 4 : -r - 4, anchor, text });
            break;
          }
        }

        const hot = hotKey ? pts.find((p) => p.key === hotKey) ?? null : null;

        const onMove = (e: ReactMouseEvent<SVGSVGElement>) => {
          const rc = e.currentTarget.getBoundingClientRect();
          const mx = e.clientX - rc.left - ml;
          const my = e.clientY - rc.top - mt;
          let best: string | null = null;
          let bd = 28 * 28;
          for (const d of pts) {
            const dx = sx(d.x) - mx, dy = sy(d.y) - my;
            const dd = dx * dx + dy * dy;
            if (dd <= bd) {
              bd = dd;
              best = d.key;
            }
          }
          setHotKey((prev) => (prev === best ? prev : best));
        };

        const quad = (text: string | undefined, x: number, y: number, anchor: "start" | "end") =>
          text ? (
            <text x={x} y={y} textAnchor={anchor} fontSize={10} fontWeight={700} letterSpacing="0.06em" fill="var(--muted)" stroke="var(--g-bg)" strokeWidth={5} strokeLinejoin="round" paintOrder="stroke" pointerEvents="none">
              {text.toUpperCase()}
            </text>
          ) : null;

        const mxLabelRight = mxp + 6 + 70 <= pw;
        const glide = `transform 450ms ${EASE}`;

        let tip: { x: number; y: number; r: number } | null = null;
        if (hot) tip = { x: sx(hot.x), y: sy(hot.y), r: radius(hot) };

        return (
          <>
            <svg
              width={w}
              height={h}
              role="img"
              aria-label={`Gráfico de dispersión: ${yLabel} frente a ${xLabel}`}
              className="tabular-nums"
              style={{ cursor: hot && onSelect ? "pointer" : "default", display: "block" }}
              onMouseMove={onMove}
              onMouseLeave={() => setHotKey(null)}
              onClick={() => hot && onSelect?.(hot)}
            >
              <g transform={`translate(${ml},${mt})`}>
                {/* grid + ticks */}
                {yt.map((t) => (
                  <g key={`y${t}`}>
                    <line x1={0} x2={pw} y1={sy(t)} y2={sy(t)} stroke="var(--line)" strokeWidth={1} />
                    <text x={-8} y={sy(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
                      {yFormat(t)}
                    </text>
                  </g>
                ))}
                {xt.map((t) => (
                  <text key={`x${t}`} x={sx(t)} y={ph + 16} textAnchor="middle" fontSize={11} fill="var(--muted)">
                    {xFormat(t)}
                  </text>
                ))}
                <line x1={0} x2={pw} y1={ph} y2={ph} stroke="var(--line)" strokeWidth={1} />


                {/* median cross-hairs */}
                <g style={{ transform: `translate(${mxp}px,0)`, transition: glide }}>
                  <line x1={0} x2={0} y1={0} y2={ph} stroke="var(--muted)" strokeWidth={1} strokeDasharray="4 4" opacity={0.7} />
                  {/* written along the line, so it never fights the corner captions */}
                  <text transform="rotate(-90)" x={-ph / 2} y={mxLabelRight ? 13 : -6} textAnchor="middle" fontSize={11} fill="var(--muted)">
                    mediana {xFormat(stats.mx)}
                  </text>
                </g>
                <g style={{ transform: `translate(0,${myp}px)`, transition: glide }}>
                  <line x1={0} x2={pw} y1={0} y2={0} stroke="var(--muted)" strokeWidth={1} strokeDasharray="4 4" opacity={0.7} />
                  <text x={pw - 4} y={-5} textAnchor="end" fontSize={11} fill="var(--muted)">
                    mediana {yFormat(stats.my)}
                  </text>
                </g>

                {/* dots, keyed by entity, gliding on data change */}
                {drawOrder.map((d, i) => (
                  <g
                    key={d.key}
                    style={{
                      transform: `translate(${sx(d.x)}px,${sy(d.y)}px)`,
                      opacity: inView ? 1 : 0,
                      transition: `${glide}, opacity 600ms ease ${Math.min(i, 40) * 14}ms`,
                    }}
                  >
                    <circle r={radius(d)} fill="var(--accent)" fillOpacity={0.55} stroke="var(--g-bg)" strokeWidth={2} />
                  </g>
                ))}

                {/* corner captions sit above the dots, on a halo of the card colour */}
                {quad(quadrants?.tl, 6, 14, "start")}
                {quad(quadrants?.tr, pw - 6, 14, "end")}
                {quad(quadrants?.bl, 6, ph - 8, "start")}
                {quad(quadrants?.br, pw - 6, ph - 8, "end")}

                {/* direct labels */}
                {drawOrder.map((d) => {
                  const l = labels.get(d.key);
                  if (!l || d.key === hotKey) return null;
                  return (
                    <text
                      key={`l${d.key}`}
                      x={sx(d.x) + l.dx}
                      y={sy(d.y) + 4}
                      textAnchor={l.anchor}
                      fontSize={11}
                      fontWeight={600}
                      fill="var(--ink)"
                      stroke="var(--g-bg)"
                      strokeWidth={3}
                      paintOrder="stroke"
                      pointerEvents="none"
                      style={{ opacity: inView ? 1 : 0, transition: "opacity 600ms ease 500ms" }}
                    >
                      {l.text}
                    </text>
                  );
                })}

                {/* raised hot dot */}
                {hot && tip && <circle cx={tip.x} cy={tip.y} r={tip.r + 1} fill="var(--ink)" stroke="var(--g-bg)" strokeWidth={2} pointerEvents="none" />}
              </g>

              {/* axis titles */}
              <text x={ml + pw} y={h - 6} textAnchor="end" fontSize={11} fontWeight={600} fill="var(--muted)">
                {xLabel} →
              </text>
              <text x={0} y={12} textAnchor="start" fontSize={11} fontWeight={600} fill="var(--muted)">
                ↑ {yLabel}
              </text>
            </svg>

            {hot && tip && (
              <div
                className="lab-tip"
                style={{
                  left: clampTip(ml + tip.x, w, 90),
                  top: mt + tip.y + (tip.y < 70 ? tip.r : -tip.r),
                  transform: tip.y < 70 ? "translate(-50%, 12px)" : undefined,
                }}
              >
                <b>{hot.label}</b>
                <div>
                  {xLabel}: {xFormat(hot.x)}
                </div>
                <div>
                  {yLabel}: {yFormat(hot.y)}
                </div>
              </div>
            )}
          </>
        );
      }}
    </ChartBox>
  );
}

/* ══════════════════════════════════════════════════════════════════════
 * BumpChart
 * ══════════════════════════════════════════════════════════════════════ */

export function BumpChart({
  periods,
  series,
  top = 10,
  formatPeriod = (p) => p,
  onSelect,
  minHeight = 300,
  className = "",
}: {
  periods: string[];
  series: { name: string; ranks: (number | null)[]; plays?: number[] }[];
  top?: number;
  formatPeriod?: (p: string) => string;
  onSelect?: (name: string) => void;
  minHeight?: number;
  className?: string;
}) {
  const [hot, setHot] = useState<{ name: string; i: number } | null>(null);
  const lineRef = useRef<string | null>(null);
  const N = Math.max(1, Math.round(top));
  const P = periods.length;
  const hasData = P > 0 && series.some((s) => s.ranks.some((r) => r != null && r >= 1 && r <= N));
  if (!hasData) return <Empty minHeight={minHeight} className={className} />;

  const drawn = Math.min(P, series.reduce((m, s) => Math.max(m, s.ranks.length), 0));
  const last = drawn - 1;
  const rankAt = (s: { ranks: (number | null)[] }, i: number): number | null => {
    if (i < 0 || i >= P || i >= s.ranks.length) return null;
    const r = s.ranks[i];
    return r != null && r >= 1 && r <= N ? r : null;
  };

  return (
    <ChartBox minHeight={minHeight} className={className}>
      {({ w, h, inView }) => {
        const narrow = w < 520;
        const mr = narrow ? 96 : 150;
        const fs = narrow ? 11 : 12;
        const ml = 26, mt = 26, mb = 8;
        const x0 = ml + 10;
        const x1 = Math.max(x0 + 1, w - mr);
        const colX = (i: number) => (P > 1 ? x0 + (i * (x1 - x0)) / (P - 1) : (x0 + x1) / 2);
        const rowH = Math.max(1, (h - mt - mb) / N);
        const rowY = (r: number) => mt + (r - 0.5) * rowH;
        const dotR = Math.max(3, Math.min(5.5, rowH / 2 - 1));
        const colW = P > 1 ? (x1 - x0) / (P - 1) : 1000;
        const labelEvery = Math.max(1, Math.ceil(46 / Math.max(1, colW)));
        const maxChars = Math.floor((mr - 16) / (fs * 0.56));

        const onMove = (e: ReactMouseEvent<SVGSVGElement>) => {
          const rc = e.currentTarget.getBoundingClientRect();
          const mx = e.clientX - rc.left;
          const my = e.clientY - rc.top;
          let best: { name: string; i: number } | null = null;
          let bd = 20 * 20;
          for (const s of series) {
            const n = Math.min(P, s.ranks.length);
            for (let i = 0; i < n; i++) {
              const r = rankAt(s, i);
              if (r == null) continue;
              const dx = colX(i) - mx, dy = rowY(r) - my;
              const dd = dx * dx + dy * dy;
              if (dd <= bd) {
                bd = dd;
                best = { name: s.name, i };
              }
            }
          }
          if (!best && lineRef.current) {
            const s = series.find((q) => q.name === lineRef.current);
            if (s) {
              let bi = -1, bdx = Infinity;
              const n = Math.min(P, s.ranks.length);
              for (let i = 0; i < n; i++) {
                if (rankAt(s, i) == null) continue;
                const dx = Math.abs(colX(i) - mx);
                if (dx < bdx) {
                  bdx = dx;
                  bi = i;
                }
              }
              if (bi >= 0) best = { name: s.name, i: bi };
            }
          }
          setHot((prev) => (prev?.name === best?.name && prev?.i === best?.i ? prev : best));
        };

        const hotSeries = hot ? series.find((s) => s.name === hot.name) : undefined;
        const hotRank = hotSeries ? rankAt(hotSeries, hot!.i) : null;
        const tipX = hot && hotRank != null ? colX(hot.i) : 0;
        const tipY = hot && hotRank != null ? rowY(hotRank) : 0;

        return (
          <>
            <svg
              width={w}
              height={h}
              role="img"
              aria-label="Evolución del ranking de artistas a lo largo del tiempo"
              className="tabular-nums"
              style={{ display: "block", cursor: hot && onSelect ? "pointer" : "default", ...wipeStyle(inView) }}
              onMouseMove={onMove}
              onMouseLeave={() => {
                lineRef.current = null;
                setHot(null);
              }}
              onClick={() => hot && onSelect?.(hot.name)}
            >
              {/* rank rows */}
              {Array.from({ length: N }, (_, k) => (
                <g key={`r${k}`}>
                  <line x1={x0 - 6} x2={x1} y1={rowY(k + 1)} y2={rowY(k + 1)} stroke="var(--line)" strokeWidth={1} opacity={0.6} />
                  <text x={ml} y={rowY(k + 1) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
                    {k + 1}
                  </text>
                </g>
              ))}
              {/* period labels */}
              {periods.map((p, i) =>
                i % labelEvery === 0 || i === P - 1 ? (
                  i === P - 1 && i % labelEvery !== 0 && P - 1 - (i - (i % labelEvery)) < labelEvery * 0.6 ? null : (
                    <text key={`p${p}`} x={colX(i)} y={mt - 10} textAnchor="middle" fontSize={11} fill="var(--muted)">
                      {formatPeriod(p)}
                    </text>
                  )
                ) : null
              )}

              {series.map((s) => {
                // one path per series: bezier "bumps" between consecutive ranked periods, broken at gaps
                let d = "";
                let prev: [number, number] | null = null;
                let li = -1;
                const dots: { i: number; x: number; y: number }[] = [];
                const n = Math.min(P, s.ranks.length);
                for (let i = 0; i < n; i++) {
                  const r = rankAt(s, i);
                  if (r == null) {
                    prev = null;
                    continue;
                  }
                  const x = colX(i), y = rowY(r);
                  if (prev) {
                    const mx = (prev[0] + x) / 2;
                    d += `C${mx},${prev[1]} ${mx},${y} ${x},${y}`;
                  } else d += `M${x},${y}`;
                  prev = [x, y];
                  dots.push({ i, x, y });
                  li = i;
                }
                if (li < 0) return null;
                const color = seriesColor(s.name);
                const dim = hot != null && hot.name !== s.name;
                const inLast = rankAt(s, last) != null;
                const lr = rankAt(s, inLast ? last : li)!;
                const showLabel = inLast || hot?.name === s.name;
                return (
                  <g key={s.name}>
                    <g style={{ opacity: dim ? 0.15 : 1, transition: "opacity 200ms ease" }}>
                      <path d={d} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
                      {dots.map((p) => (
                        <circle
                          key={p.i}
                          cx={p.x}
                          cy={p.y}
                          r={dotR}
                          fill={color}
                          stroke="var(--g-bg)"
                          strokeWidth={2}
                          style={{ animation: "lab-fade 0.35s ease both" }}
                        />
                      ))}
                    </g>
                    <path
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={14}
                      strokeLinejoin="round"
                      pointerEvents="stroke"
                      onMouseMove={() => (lineRef.current = s.name)}
                      onMouseLeave={() => (lineRef.current = null)}
                    />
                    <g
                      style={{
                        transform: `translate(${colX(inLast ? last : li) + 10}px,${rowY(lr)}px)`,
                        opacity: showLabel ? (dim ? 0.2 : 1) : 0,
                        transition: `transform 450ms ${EASE}, opacity 200ms ease`,
                      }}
                      pointerEvents={showLabel ? "auto" : "none"}
                    >
                      <text
                        y={4}
                        fontSize={fs}
                        fontWeight={inLast ? 700 : 600}
                        fill="var(--ink)"
                        stroke="var(--g-bg)"
                        strokeWidth={3}
                        paintOrder="stroke"
                        onMouseMove={() => (lineRef.current = s.name)}
                        onMouseLeave={() => (lineRef.current = null)}
                      >
                        {truncate(s.name, maxChars)}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>

            {hot && hotSeries && hotRank != null && (
              <div
                className="lab-tip"
                style={{
                  left: clampTip(tipX, w, 90),
                  top: tipY - dotR,
                  transform: tipY < 70 ? "translate(-50%, 14px)" : undefined,
                }}
              >
                <b>{hotSeries.name}</b> · {formatPeriod(periods[hot.i])} · nº {hotRank}
                {hotSeries.plays?.[hot.i] != null && <> · {fmtInt(hotSeries.plays[hot.i])} reproducciones</>}
              </div>
            )}
          </>
        );
      }}
    </ChartBox>
  );
}

/* ══════════════════════════════════════════════════════════════════════
 * MatrixHeat
 * ══════════════════════════════════════════════════════════════════════ */

export function MatrixHeat({
  rows,
  cols,
  max,
  format = fmtInt,
  tip,
  hint,
  className = "",
}: {
  rows: { label: string; sub?: string; values: (number | null)[] }[];
  cols: string[];
  max?: number;
  format?: (v: number) => string;
  tip?: (row: number, col: number, v: number) => string;
  hint?: string;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  const top = useMemo(() => {
    if (max != null) return max;
    let m = 0;
    for (const r of rows) for (const v of r.values) if (v != null && v > m) m = v;
    return m;
  }, [rows, max]);

  const C = cols.length;
  if (!rows.length || !C || top <= 0) return <Empty className={`py-8 ${className}`} />;

  const labelW = 96;
  const cellW = (width - labelW - 3 * C) / C;
  const showText = cellW >= 34;
  const hv = hover ? rows[hover.r]?.values[hover.c] : null;
  const footer =
    hover && hv != null
      ? tip
        ? tip(hover.r, hover.c, hv)
        : `${rows[hover.r].label} · ${cols[hover.c]} — ${format(hv)}`
      : hint ?? "Pasa el ratón por una celda";

  return (
    <div ref={ref} className={`${inView ? "is-in" : ""} ${className}`}>
      <div className="grid items-center gap-[3px]" style={{ gridTemplateColumns: `${labelW}px repeat(${C}, minmax(0, 1fr))` }}>
        <span />
        {cols.map((c, ci) => (
          <span key={`h${ci}`} className="truncate pb-1 text-center text-[11px] tabular-nums" style={{ color: "var(--muted)" }}>
            {c}
          </span>
        ))}
        {rows.map((row, r) => (
          <MatrixRow key={row.label} row={row} r={r} C={C} top={top} format={format} showText={showText} hover={hover} setHover={setHover} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 text-xs" style={{ color: "var(--muted)" }}>
        <span className="tabular-nums" style={{ color: hover && hv != null ? "var(--ink)" : "var(--muted)" }}>
          {footer}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          menos
          {[8, 30, 55, 80, 100].map((p) => (
            <i key={p} className="inline-block h-3 w-3 rounded-[3px]" style={{ background: `color-mix(in oklab, var(--accent) ${p}%, var(--line))` }} />
          ))}
          más
        </span>
      </div>
    </div>
  );
}

function MatrixRow({
  row,
  r,
  C,
  top,
  format,
  showText,
  hover,
  setHover,
}: {
  row: { label: string; sub?: string; values: (number | null)[] };
  r: number;
  C: number;
  top: number;
  format: (v: number) => string;
  showText: boolean;
  hover: { r: number; c: number } | null;
  setHover: (h: { r: number; c: number } | null) => void;
}) {
  return (
    <>
      <span className="min-w-0 pr-2 leading-tight">
        <span className="block truncate text-[13px] font-bold" style={{ color: "var(--ink)" }}>
          {row.label}
        </span>
        {row.sub && (
          <span className="block truncate text-[11px]" style={{ color: "var(--muted)" }}>
            {row.sub}
          </span>
        )}
      </span>
      {Array.from({ length: C }, (_, c) => {
        const v = row.values[c];
        if (v == null || !Number.isFinite(v)) return <span key={c} className="h-[34px]" />;
        const pct = Math.max(0, Math.min(100, Math.round((v / top) * 100)));
        const active = hover?.r === r && hover.c === c;
        return (
          <div
            key={c}
            className="lab-cell flex h-[34px] items-center justify-center overflow-hidden rounded-[6px] text-[12px] font-semibold tabular-nums"
            style={{
              background: `color-mix(in oklab, var(--accent) ${pct}%, var(--line))`,
              color: pct >= 55 ? "var(--g-bg)" : "var(--ink)",
              animationDelay: `${Math.min(r * 40 + c * 25, 700)}ms`,
              outline: active ? "2px solid var(--ink)" : "none",
              outlineOffset: 1,
              transition: "background 300ms ease",
            }}
            onMouseEnter={() => setHover({ r, c })}
            onMouseLeave={() => setHover(null)}
          >
            {showText ? format(v) : null}
          </div>
        );
      })}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════
 * ConcentrationCurve
 * ══════════════════════════════════════════════════════════════════════ */

export function ConcentrationCurve({
  curve,
  marks,
  xLabel,
  yLabel,
  minHeight = 280,
  className = "",
}: {
  curve: { x: number; y: number }[];
  marks?: { x: number; y: number; label: string }[];
  xLabel: string;
  yLabel: string;
  minHeight?: number;
  className?: string;
}) {
  const [hoverI, setHoverI] = useState<number | null>(null);
  const valid = curve.length >= 2;

  const target = useMemo(() => {
    const t: Record<string, number> = {};
    curve.forEach((p, i) => {
      t[`x${i}`] = p.x;
      t[`y${i}`] = p.y;
    });
    (marks ?? []).forEach((m) => {
      t[`mx:${m.label}`] = m.x;
      t[`my:${m.label}`] = m.y;
    });
    return t;
  }, [curve, marks]);
  const cur = useTweenRecord(target, false);

  if (!valid) return <Empty minHeight={minHeight} className={className} />;

  const clamp100 = (v: number) => Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));
  const pts = curve.map((p, i) => ({ x: clamp100(cur[`x${i}`] ?? p.x), y: clamp100(cur[`y${i}`] ?? p.y) }));

  return (
    <ChartBox minHeight={minHeight} className={className}>
      {({ w, h, inView }) => {
        const ml = 46, mr = 18, mt = 24, mb = 36;
        const pw = Math.max(1, w - ml - mr);
        const ph = Math.max(1, h - mt - mb);
        const px = (x: number) => (x / 100) * pw;
        const py = (y: number) => ph - (y / 100) * ph;
        const line = pts.map((p, i) => `${i ? "L" : "M"}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join("");
        const area = `${line}L${px(pts[pts.length - 1].x).toFixed(1)},${ph}L${px(pts[0].x).toFixed(1)},${ph}Z`;
        const ang = (-Math.atan2(ph, pw) * 180) / Math.PI;
        const ticks = [0, 50, 100];

        const onMove = (e: ReactMouseEvent<SVGSVGElement>) => {
          const rc = e.currentTarget.getBoundingClientRect();
          const xv = ((e.clientX - rc.left - ml) / pw) * 100;
          let bi = 0, bd = Infinity;
          for (let i = 0; i < pts.length; i++) {
            const dd = Math.abs(pts[i].x - xv);
            if (dd < bd) {
              bd = dd;
              bi = i;
            }
          }
          setHoverI((prev) => (prev === bi ? prev : bi));
        };
        const hp = hoverI != null && hoverI < pts.length ? pts[hoverI] : null;

        return (
          <>
            <svg
              width={w}
              height={h}
              role="img"
              aria-label={`Curva de concentración: ${yLabel} según ${xLabel}`}
              className="tabular-nums"
              style={{ display: "block", ...wipeStyle(inView) }}
              onMouseMove={onMove}
              onMouseLeave={() => setHoverI(null)}
            >
              <g transform={`translate(${ml},${mt})`}>
                {ticks.map((t) => (
                  <g key={t}>
                    <line x1={0} x2={pw} y1={py(t)} y2={py(t)} stroke="var(--line)" strokeWidth={1} />
                    <text x={-8} y={py(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
                      {t} %
                    </text>
                    <text x={px(t)} y={ph + 16} textAnchor={t === 0 ? "start" : t === 100 ? "end" : "middle"} fontSize={11} fill="var(--muted)">
                      {t} %
                    </text>
                  </g>
                ))}

                <line x1={0} y1={ph} x2={pw} y2={0} stroke="var(--muted)" strokeWidth={1} strokeDasharray="4 4" opacity={0.7} />
                <text transform={`translate(${pw / 2},${ph / 2}) rotate(${ang})`} y={15} textAnchor="middle" fontSize={11} fill="var(--muted)">
                  reparto igualitario
                </text>

                <path d={area} fill="var(--accent)" fillOpacity={0.12} />
                <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

                {(marks ?? []).map((m) => {
                  const mx = px(clamp100(cur[`mx:${m.label}`] ?? m.x));
                  const my = py(clamp100(cur[`my:${m.label}`] ?? m.y));
                  const tw = m.label.length * 6.6;
                  const dir = mx + 18 + tw <= pw ? 1 : -1;
                  const tx = mx + dir * 18;
                  const ty = Math.max(12, Math.min(ph - 6, my + 24));
                  return (
                    <g key={m.label}>
                      <line x1={mx} y1={my} x2={tx - dir * 2} y2={ty - 4} stroke="var(--ink)" strokeWidth={1} opacity={0.6} />
                      <text
                        x={tx}
                        y={ty}
                        textAnchor={dir === 1 ? "start" : "end"}
                        fontSize={12}
                        fontWeight={600}
                        fill="var(--ink)"
                        stroke="var(--g-bg)"
                        strokeWidth={3}
                        paintOrder="stroke"
                      >
                        {m.label}
                      </text>
                      <circle cx={mx} cy={my} r={5} fill="var(--ink)" stroke="var(--g-bg)" strokeWidth={2} />
                    </g>
                  );
                })}

                {hp && (
                  <g pointerEvents="none">
                    <line x1={px(hp.x)} x2={px(hp.x)} y1={0} y2={ph} stroke="var(--muted)" strokeWidth={1} opacity={0.6} />
                    <circle cx={px(hp.x)} cy={py(hp.y)} r={5} fill="var(--accent)" stroke="var(--g-bg)" strokeWidth={2} />
                  </g>
                )}
              </g>
              <text x={ml + pw / 2} y={h - 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--muted)">
                {xLabel}
              </text>
              <text x={0} y={12} textAnchor="start" fontSize={11} fontWeight={600} fill="var(--muted)">
                ↑ {yLabel}
              </text>
            </svg>

            {hp && (
              <div className="lab-tip" style={{ left: clampTip(ml + px(hp.x), w, 120), top: mt + py(hp.y) }}>
                El <b>{pctText(hp.x)} %</b> de tus artistas suma el <b>{pctText(hp.y)} %</b> de lo que escuchas
              </div>
            )}
          </>
        );
      }}
    </ChartBox>
  );
}

/* ══════════════════════════════════════════════════════════════════════
 * Sankey
 * ══════════════════════════════════════════════════════════════════════ */

type SankeyHover = { kind: "link"; key: string } | { kind: "node"; side: "s" | "t"; name: string } | null;

const shareInt = (n: number) => (n > 0 && n < 1 ? "<1 %" : `${Math.round(n)} %`);
const shareOne = (n: number) => `${n.toFixed(1).replace(".", ",")} %`;

export function Sankey({
  sources,
  targets,
  links,
  total,
  minHeight = 280,
  className = "",
}: {
  sources: { name: string; value: number }[];
  targets: { name: string; value: number }[];
  links: { source: string; target: string; value: number }[];
  total: number;
  minHeight?: number;
  className?: string;
}) {
  const [hover, setHover] = useState<SankeyHover>(null);

  const srcs = useMemo(() => sources.filter((s) => s.value > 0), [sources]);
  const tgts = useMemo(() => targets.filter((t) => t.value > 0), [targets]);
  const lks = useMemo(() => {
    const si = new Map(srcs.map((s, i) => [s.name, i]));
    const ti = new Map(tgts.map((t, i) => [t.name, i]));
    return links
      .filter((l) => l.value > 0 && si.has(l.source) && ti.has(l.target))
      .map((l) => ({ ...l, si: si.get(l.source)!, ti: ti.get(l.target)!, key: `${l.source}→${l.target}` }));
  }, [links, srcs, tgts]);

  const target = useMemo(() => {
    const t: Record<string, number> = {};
    for (const s of srcs) t[`s:${s.name}`] = s.value;
    for (const x of tgts) t[`t:${x.name}`] = x.value;
    for (const l of lks) t[`l:${l.key}`] = l.value;
    return t;
  }, [srcs, tgts, lks]);
  const cur = useTweenRecord(target, true);

  if (!srcs.length || !tgts.length || !(total > 0)) return <Empty minHeight={minHeight} className={className} />;

  return (
    <ChartBox minHeight={minHeight} className={className}>
      {({ w, h, inView }) => {
        const narrow = w < 520;
        const mx = narrow ? 96 : 170;
        const fs = narrow ? 12 : 13;
        const nodeW = 12, gap = 10, mt = 8;
        const avail = Math.max(1, h - 2 * mt);
        const val = (k: string, fallback: number) => Math.max(0, cur[k] ?? fallback);

        const sv = srcs.map((s) => val(`s:${s.name}`, s.value));
        const tv = tgts.map((t) => val(`t:${t.name}`, t.value));
        const sumS = sv.reduce((a, b) => a + b, 0);
        const sumT = tv.reduce((a, b) => a + b, 0);
        const kOf = (sum: number, n: number) => (sum > 0 ? Math.max(0, avail - gap * (n - 1)) / sum : 0);
        const k = Math.min(kOf(sumS, srcs.length), kOf(sumT, tgts.length));

        const stack = (vals: number[], sum: number) => {
          const used = sum * k + gap * (vals.length - 1);
          let y = mt + Math.max(0, (avail - used) / 2);
          return vals.map((v) => {
            const node = { y, h: v * k };
            y += v * k + gap;
            return node;
          });
        };
        const sn = stack(sv, sumS);
        const tn = stack(tv, sumT);

        const xl = mx;
        const xr = Math.max(xl + nodeW + 1, w - mx - nodeW);
        const rx0 = xl + nodeW;
        const rx1 = xr;
        const cx = (rx0 + rx1) / 2;

        // ribbon offsets inside each node, in the order of the other column
        const sOff = sn.map((n) => n.y);
        const tOff = tn.map((n) => n.y);
        const sy = new Map<string, number>();
        const ty = new Map<string, number>();
        for (const l of [...lks].sort((a, b) => a.si - b.si || a.ti - b.ti)) {
          sy.set(l.key, sOff[l.si]);
          sOff[l.si] += val(`l:${l.key}`, l.value) * k;
        }
        for (const l of [...lks].sort((a, b) => a.ti - b.ti || a.si - b.si)) {
          ty.set(l.key, tOff[l.ti]);
          tOff[l.ti] += val(`l:${l.key}`, l.value) * k;
        }

        const related = (l: { source: string; target: string; key: string }) =>
          hover == null ? null : hover.kind === "link" ? hover.key === l.key : hover.side === "s" ? hover.name === l.source : hover.name === l.target;

        const maxChars = Math.floor((mx - 12) / (fs * 0.6));
        const label = (name: string, value: number, node: { y: number; h: number }, side: "s" | "t") => {
          const cy = node.y + Math.max(node.h, 2) / 2;
          const anchor = side === "s" ? "end" : "start";
          const x = side === "s" ? xl - 8 : xr + nodeW + 8;
          const share = shareInt((value / total) * 100);
          const two = node.h >= 30;
          return (
            <text key={`${side}${name}`} x={x} textAnchor={anchor} fontSize={fs} pointerEvents="none">
              {two ? (
                <>
                  <tspan x={x} y={cy - 1} fontWeight={700} fill="var(--ink)">
                    {truncate(name, maxChars)}
                  </tspan>
                  <tspan x={x} y={cy + 13} fontSize={fs - 1} fill="var(--muted)">
                    {share}
                  </tspan>
                </>
              ) : (
                <>
                  <tspan x={x} y={cy + 4} fontWeight={700} fill="var(--ink)">
                    {truncate(name, Math.max(2, maxChars - share.length - 1))}
                  </tspan>
                  <tspan fill="var(--muted)" fontSize={fs - 1}>
                    {` ${share}`}
                  </tspan>
                </>
              )}
            </text>
          );
        };

        // tooltip
        let tip: { x: number; y: number; body: React.ReactNode } | null = null;
        if (hover?.kind === "link") {
          const l = lks.find((q) => q.key === hover.key);
          if (l) {
            const hh = val(`l:${l.key}`, l.value) * k;
            tip = {
              x: cx,
              y: (sy.get(l.key)! + ty.get(l.key)!) / 2 + hh / 2,
              body: (
                <>
                  <b>
                    {l.source} → {l.target}
                  </b>{" "}
                  · {fmtInt(l.value)} ({shareOne((l.value / total) * 100)})
                </>
              ),
            };
          }
        } else if (hover?.kind === "node") {
          const list = hover.side === "s" ? srcs : tgts;
          const nodes = hover.side === "s" ? sn : tn;
          const i = list.findIndex((q) => q.name === hover.name);
          if (i >= 0) {
            tip = {
              x: hover.side === "s" ? xl + nodeW / 2 : xr + nodeW / 2,
              y: nodes[i].y,
              body: (
                <>
                  <b>{list[i].name}</b> · {fmtInt(list[i].value)} ({shareOne((list[i].value / total) * 100)})
                </>
              ),
            };
          }
        }

        const node = (side: "s" | "t", name: string, n: { y: number; h: number }, color: string) => {
          const active = hover?.kind === "node" && hover.side === side && hover.name === name;
          return (
            <g key={`${side}${name}`}>
              <rect
                x={side === "s" ? xl : xr}
                y={n.y}
                width={nodeW}
                height={Math.max(2, n.h)}
                rx={3}
                fill={color}
                opacity={hover && !active && hover.kind === "node" ? 0.5 : 1}
              />
              <rect
                x={(side === "s" ? xl : xr) - 6}
                y={n.y - gap / 2}
                width={nodeW + 12}
                height={Math.max(2, n.h) + gap}
                fill="transparent"
                onMouseEnter={() => setHover({ kind: "node", side, name })}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        };

        return (
          <>
            <svg
              width={w}
              height={h}
              role="img"
              aria-label="Cómo empieza y cómo termina cada reproducción"
              className="tabular-nums"
              style={{ display: "block" }}
            >
              <g style={{ opacity: inView ? 1 : 0, transition: "opacity 1s ease 150ms" }}>
                {lks.map((l) => {
                  const hh = val(`l:${l.key}`, l.value) * k;
                  const a = sy.get(l.key)!;
                  const b = ty.get(l.key)!;
                  const d = `M${rx0},${a}C${cx},${a} ${cx},${b} ${rx1},${b}L${rx1},${b + hh}C${cx},${b + hh} ${cx},${a + hh} ${rx0},${a + hh}Z`;
                  const rel = related(l);
                  return (
                    <path
                      key={l.key}
                      d={d}
                      fill={SERIES[l.si % SERIES.length]}
                      opacity={rel == null ? 0.35 : rel ? 0.8 : 0.1}
                      style={{ transition: "opacity 200ms ease" }}
                      onMouseEnter={() => setHover({ kind: "link", key: l.key })}
                      onMouseLeave={() => setHover(null)}
                    />
                  );
                })}
                {srcs.map((s, i) => node("s", s.name, sn[i], SERIES[i % SERIES.length]))}
                {tgts.map((t, i) => node("t", t.name, tn[i], "var(--ink)"))}
                {srcs.map((s, i) => label(s.name, s.value, sn[i], "s"))}
                {tgts.map((t, i) => label(t.name, t.value, tn[i], "t"))}
              </g>
            </svg>
            {tip && (
              <div
                className="lab-tip"
                style={{ left: clampTip(tip.x, w, 120), top: tip.y, transform: tip.y < 50 ? "translate(-50%, 12px)" : undefined }}
              >
                {tip.body}
              </div>
            )}
          </>
        );
      }}
    </ChartBox>
  );
}
