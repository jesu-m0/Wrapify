"use client";

import { MouseEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { ChartBox, SERIES, clampTip, niceMax } from "./chart-kit";
import { WEEKDAYS_LONG, fmtDateLong, fmtInt, fmtMonthShort } from "./insights";
import { useInView } from "./motion";

/*
 * Habit and head-to-head charts: calendar, ridgeline, radar, stacked share,
 * mirrored duel bars and a multi-line comparison. Same rules as charts.tsx:
 * colours only from CSS variables, text is ink/muted, identity comes from marks.
 */

const EMPTY_TEXT = "Sin datos suficientes en este periodo";

/* ───────────────────────── shared helpers ───────────────────────── */

function EmptyState({ minHeight = 160, className = "" }: { minHeight?: number; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center text-center text-[13px] ${className}`}
      style={{ minHeight, color: "var(--muted)" }}
    >
      {EMPTY_TEXT}
    </div>
  );
}

const fmtPct1 = (n: number) => `${n.toFixed(1).replace(".", ",")} %`;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const finite = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Catmull-Rom spline through `pts` as a cubic-bezier path ("M…C…"). Control y is clamped to [yMin, yMax]. */
function smoothPath(pts: [number, number][], yMin = -Infinity, yMax = Infinity): string {
  if (pts.length === 0) return "";
  const f = (n: number) => n.toFixed(2);
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1y = clamp(p1[1] + (p2[1] - p0[1]) / 6, yMin, yMax);
    const c2y = clamp(p2[1] - (p3[1] - p1[1]) / 6, yMin, yMax);
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(c1y)},${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(c2y)},${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}

/** Centred moving window over the values that exist (`mean` = average, otherwise sum). */
function movingWindow(values: number[], win: number, mean: boolean): number[] {
  const half = Math.floor(Math.max(1, Math.round(win)) / 2);
  if (half === 0) return values.map(finite);
  const n = values.length;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    let c = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) {
      s += finite(values[j]);
      c++;
    }
    out[i] = mean ? s / c : s;
  }
  return out;
}

/** Year at each January (or month names for <= 18 periods), thinned so labels never collide. */
function timeTicks(periods: string[], x: (i: number) => number, minGap = 44) {
  const short = periods.length <= 18;
  const out: { x: number; label: string }[] = [];
  let lastX = -Infinity;
  periods.forEach((p, i) => {
    if (!/^\d{4}-\d{2}/.test(p)) return;
    if (!short && p.slice(5, 7) !== "01") return;
    const xx = x(i);
    if (xx - lastX < minGap) return;
    out.push({ x: xx, label: short ? fmtMonthShort(p).slice(0, 3) : p.slice(0, 4) });
    lastX = xx;
  });
  return out;
}

const periodLabel = (p: string) => (/^\d{4}-\d{2}/.test(p) ? fmtMonthShort(p) : p);

function Swatch({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <i
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]"
      style={dashed ? { border: `1.5px dashed ${color}` } : { background: color }}
    />
  );
}

interface TweenRow {
  key: string;
  values: number[];
}

/**
 * Glides rows of numbers towards their target with a rAF tween (keyed by row key).
 * New rows / new indices appear at their target value, except with `fromZero`
 * where the first frame is all zeros (used for entry animations).
 */
function useTweenRows(target: TweenRow[], ms = 450, fromZero = false): TweenRow[] {
  const sig = target.map((r) => `${r.key}:${r.values.join(",")}`).join("|");
  const targetRef = useRef(target);
  targetRef.current = target;
  const initial = () =>
    new Map<string, number[]>(target.map((r) => [r.key, fromZero ? r.values.map(() => 0) : r.values]));
  const [shown, setShown] = useState<Map<string, number[]>>(initial);
  const shownRef = useRef(shown);

  useEffect(() => {
    const tg = targetRef.current;
    const from = shownRef.current;
    const commit = (m: Map<string, number[]>) => {
      shownRef.current = m;
      setShown(m);
    };
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || ms <= 0) {
      commit(new Map(tg.map((r) => [r.key, r.values])));
      return;
    }
    let raf = 0;
    let t0 = -1;
    const tick = (t: number) => {
      if (t0 < 0) t0 = t;
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      const next = new Map<string, number[]>();
      for (const r of tg) {
        const f = from.get(r.key);
        next.set(
          r.key,
          r.values.map((v, i) => {
            const a = f && f[i] !== undefined ? f[i] : fromZero && !f ? 0 : v;
            return a + (v - a) * e;
          })
        );
      }
      commit(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, ms]);

  return target.map((r) => {
    const s = shown.get(r.key);
    return { key: r.key, values: s && s.length === r.values.length ? s : r.values };
  });
}

function Legend({ items }: { items: { name: string; color: string; note?: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-2 text-[12px]">
      {items.map((it) => (
        <span key={it.name} className="inline-flex items-center gap-1.5" style={{ color: "var(--ink)" }}>
          <Swatch color={it.color} dashed={it.dashed} />
          <span className="font-medium">{it.name}</span>
          {it.note && (
            <span className="tabular-nums" style={{ color: "var(--muted)" }}>
              {it.note}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

const axisText = { fill: "var(--muted)", fontSize: 11, fontVariantNumeric: "tabular-nums" } as const;

/* ───────────────────────── CalendarHeat ───────────────────────── */

const CAL_CELL = 12;
const CAL_GAP = 3;
const CAL_STEP = CAL_CELL + CAL_GAP;
const CAL_LEFT = 20;
const CAL_TOP = 16;

export function CalendarHeat({
  days,
  year,
  max,
  className = "",
}: {
  days: Map<string, number>;
  year: number;
  max?: number;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);

  // Geometry only depends on the year: one entry per day, keyed by date.
  const grid = useMemo(() => {
    const first = Date.UTC(year, 0, 1);
    const offset = (new Date(first).getUTCDay() + 6) % 7; // Monday = 0
    const total = Date.UTC(year + 1, 0, 1) - first;
    const nDays = Math.round(total / 86400000);
    const cells: { date: string; col: number; row: number }[] = [];
    const months: { col: number; label: string }[] = [];
    for (let d = 0; d < nDays; d++) {
      const date = new Date(first + d * 86400000).toISOString().slice(0, 10);
      const idx = offset + d;
      const col = Math.floor(idx / 7);
      cells.push({ date, col, row: idx % 7 });
      if (date.endsWith("-01")) months.push({ col, label: fmtMonthShort(date.slice(0, 7)).slice(0, 3) });
    }
    return { cells, months, cols: Math.floor((offset + nDays - 1) / 7) + 1 };
  }, [year]);

  const { cap, any } = useMemo(() => {
    const nz: number[] = [];
    for (const c of grid.cells) {
      const v = days.get(c.date);
      if (v && v > 0) nz.push(v);
    }
    nz.sort((a, b) => a - b);
    const p95 = nz.length ? nz[Math.floor(0.95 * (nz.length - 1))] : 1;
    return { cap: Math.max(1, max ?? p95), any: nz.length > 0 };
  }, [days, grid, max]);

  if (!any) return <EmptyState className={className} />;

  const W = CAL_LEFT + grid.cols * CAL_STEP - CAL_GAP;
  const H = CAL_TOP + 7 * CAL_STEP - CAL_GAP;
  const pos = (c: { col: number; row: number }) => [CAL_LEFT + c.col * CAL_STEP, CAL_TOP + c.row * CAL_STEP] as const;
  const hovered = hover ? grid.cells.find((c) => c.date === hover) : undefined;
  const hv = hovered ? days.get(hovered.date) ?? 0 : 0;

  return (
    <div ref={ref} className={`${inView ? "is-in" : ""} ${className}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label={`Calendario de reproducciones diarias de ${year}`}
      >
        {grid.months.map((m) => (
          <text key={m.label} x={CAL_LEFT + m.col * CAL_STEP} y={10} fill="var(--muted)" fontSize={10}>
            {m.label}
          </text>
        ))}
        {[
          [0, "L"],
          [2, "X"],
          [4, "V"],
        ].map(([r, t]) => (
          <text key={t} x={CAL_LEFT - 6} y={CAL_TOP + (r as number) * CAL_STEP + 10} textAnchor="end" fill="var(--muted)" fontSize={10}>
            {t}
          </text>
        ))}
        {grid.cells.map((c) => {
          const v = days.get(c.date) ?? 0;
          const [x, y] = pos(c);
          const pct = v > 0 ? Math.max(14, Math.round(Math.sqrt(Math.min(1, v / cap)) * 100)) : 0;
          return (
            <rect
              key={c.date}
              className="lab-cell"
              x={x}
              y={y}
              width={CAL_CELL}
              height={CAL_CELL}
              rx={3}
              stroke="transparent"
              strokeWidth={CAL_GAP}
              pointerEvents="all"
              style={{
                fill: v > 0 ? `color-mix(in oklab, var(--accent) ${pct}%, var(--line))` : "var(--line)",
                transition: "fill 0.3s",
                animationDelay: `${Math.min(c.col, 53) * 14}ms`,
                transformBox: "fill-box",
                transformOrigin: "center",
              }}
              onMouseEnter={() => setHover(c.date)}
              onMouseLeave={() => setHover((h) => (h === c.date ? null : h))}
            />
          );
        })}
        {hovered && (
          <rect
            x={pos(hovered)[0] - 1}
            y={pos(hovered)[1] - 1}
            width={CAL_CELL + 2}
            height={CAL_CELL + 2}
            rx={4}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={2}
            pointerEvents="none"
          />
        )}
      </svg>
      <div className="mt-3 flex items-center justify-between gap-4 text-xs" style={{ color: "var(--muted)" }}>
        <span className="tabular-nums" style={{ color: hovered ? "var(--ink)" : "var(--muted)" }}>
          {hovered
            ? `${WEEKDAYS_LONG[hovered.row]}, ${fmtDateLong(hovered.date)} — ${fmtInt(hv)} ${hv === 1 ? "reproducción" : "reproducciones"}`
            : "Pasa el ratón por un día"}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          menos
          {[0, 25, 50, 75, 100].map((p) => (
            <i
              key={p}
              className="inline-block h-3 w-3 rounded-[3px]"
              style={{ background: p === 0 ? "var(--line)" : `color-mix(in oklab, var(--accent) ${p}%, var(--line))` }}
            />
          ))}
          más
        </span>
      </div>
    </div>
  );
}

/* ───────────────────────── Ridgeline ───────────────────────── */

export function Ridgeline({
  rows,
  xTicks,
  overlap = 0.7,
  tip,
  minHeight = 260,
  className = "",
}: {
  rows: { label: string; values: number[] }[];
  xTicks?: { at: number; label: string }[];
  overlap?: number;
  tip?: (row: number, i: number, share: number) => string;
  minHeight?: number;
  className?: string;
}) {
  const L = rows.reduce((m, r) => Math.max(m, r.values.length), 0);
  const hasData = rows.length > 0 && L >= 2 && rows.some((r) => r.values.some((v) => v > 0));
  if (!hasData) return <EmptyState minHeight={minHeight} className={className} />;
  return (
    <ChartBox minHeight={minHeight} className={className}>
      {({ w, h, inView }) => (
        <RidgePlot rows={rows} L={L} xTicks={xTicks} overlap={overlap} tip={tip} w={w} h={h} inView={inView} />
      )}
    </ChartBox>
  );
}

function RidgePlot({
  rows,
  L,
  xTicks,
  overlap,
  tip,
  w,
  h,
  inView,
}: {
  rows: { label: string; values: number[] }[];
  L: number;
  xTicks?: { at: number; label: string }[];
  overlap: number;
  tip?: (row: number, i: number, share: number) => string;
  w: number;
  h: number;
  inView: boolean;
}) {
  const [hover, setHover] = useState<{ r: number; i: number } | null>(null);
  const n = rows.length;

  // Each row normalised to its own sum; tweened per row label so playback glides.
  const target = useMemo<TweenRow[]>(
    () =>
      rows.map((r) => {
        const vals = Array.from({ length: L }, (_, i) => Math.max(0, finite(r.values[i])));
        const sum = vals.reduce((a, b) => a + b, 0);
        return { key: r.label, values: vals.map((v) => (sum > 0 ? v / sum : 0)) };
      }),
    [rows, L]
  );
  const shown = useTweenRows(target);

  const ticks = xTicks ?? (L === 24 ? [0, 6, 12, 18, 24].map((at) => ({ at, label: String(at).padStart(2, "0") })) : []);

  const maxLabel = rows.reduce((m, r) => Math.max(m, r.label.length), 0);
  const left = clamp(maxLabel * 7.5 + 10, 36, Math.max(36, w * 0.3));
  const right = 16;
  const x0 = left;
  const W = Math.max(1, w - left - right);
  const px = (i: number) => x0 + ((i + 0.5) / L) * W;

  const bottom = 20;
  const topPad = 6;
  const k = 0.3 + Math.max(0, overlap); // tallest ridge, in row steps
  const plotH = Math.max(1, h - bottom - topPad);
  const step = plotH / (Math.max(0, n - 1) + k);
  const ridgeMax = k * step;
  const base = (r: number) => topPad + ridgeMax + r * step;

  // each ridge is scaled to its own peak: the point is *when* you listen, and a quiet year should not flatten out
  const rowMax = shown.map((r) => Math.max(1e-9, ...r.values));
  const hgt = (v: number, r: number) => (v / rowMax[r]) * ridgeMax * 0.82;

  const geo = shown.map((row, r) => {
    const b = base(r);
    const pts: [number, number][] = row.values.map((v, i) => [px(i), b - hgt(v, r)]);
    const full: [number, number][] = [[x0, pts[0][1]], ...pts, [x0 + W, pts[pts.length - 1][1]]];
    const line = smoothPath(full, b - ridgeMax, b);
    const area = `${line}L${(x0 + W).toFixed(2)},${b.toFixed(2)}L${x0.toFixed(2)},${b.toFixed(2)}Z`;
    let peak = 0;
    for (let i = 1; i < row.values.length; i++) if (row.values[i] > row.values[peak]) peak = i;
    return { b, line, area, peak, pts, hasPeak: row.values[peak] > 0 };
  });

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < x0 - 4 || x > x0 + W + 4) return setHover(null);
    const i = clamp(Math.floor(((x - x0) / W) * L), 0, L - 1);
    const r = clamp(Math.ceil((y - base(0)) / step), 0, n - 1);
    setHover((p) => (p && p.r === r && p.i === i ? p : { r, i }));
  };

  const share = hover ? shown[hover.r].values[hover.i] : 0;
  const hh = hover ? String(Math.floor((hover.i / L) * 24)).padStart(2, "0") : "";
  const tipText = hover
    ? tip
      ? tip(hover.r, hover.i, share)
      : `${rows[hover.r].label} · ${hh}:00 · ${fmtPct1(share * 100)} de las reproducciones`
    : "";

  return (
    <div className="relative h-full w-full">
      <svg
        width={w}
        height={h}
        role="img"
        aria-label="Distribución por hora de las reproducciones, una cresta por fila"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        style={{ display: "block", overflow: "visible" }}
      >
        {geo.map((g, r) => (
          <g key={rows[r].label}>
            <line x1={x0} x2={x0 + W} y1={g.b} y2={g.b} stroke="var(--line)" strokeWidth={1} />
            <text x={0} y={g.b - 3} fill="var(--ink)" fontSize={12} fontWeight={700} style={{ fontVariantNumeric: "tabular-nums" }}>
              {rows[r].label}
            </text>
            <g
              style={{
                transform: inView ? "scaleY(1)" : "scaleY(0)",
                transformOrigin: `0px ${g.b}px`,
                transition: `transform 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) ${r * 90}ms`,
              }}
            >
              <path d={g.area} fill="var(--g-bg)" />
              <path d={g.area} fill="var(--accent)" fillOpacity={0.22} />
              <path
                d={g.line}
                fill="none"
                stroke={hover?.r === r ? "var(--ink)" : "var(--accent)"}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          </g>
        ))}

        {/* peaks drawn last so lower ridges never cover them */}
        {geo.map((g, r) => {
          if (!g.hasPeak) return null;
          const [cx, cy] = g.pts[g.peak];
          const nearRight = cx > x0 + W - 36;
          return (
            <g key={rows[r].label} style={{ opacity: inView ? 1 : 0, transition: `opacity 0.4s ${600 + r * 90}ms` }} pointerEvents="none">
              <circle cx={cx} cy={cy} r={3.5} fill="var(--ink)" stroke="var(--g-bg)" strokeWidth={2} />
              <text x={nearRight ? cx - 7 : cx + 7} y={cy - 5} textAnchor={nearRight ? "end" : "start"} style={axisText}>
                {`${Math.floor((g.peak / L) * 24)} h`}
              </text>
            </g>
          );
        })}

        {ticks.map((t) => (
          <text key={t.at} x={x0 + (t.at / L) * W} y={h - 5} textAnchor="middle" style={axisText}>
            {t.label}
          </text>
        ))}

        {hover && (
          <line
            x1={px(hover.i)}
            x2={px(hover.i)}
            y1={topPad}
            y2={base(n - 1)}
            stroke="var(--muted)"
            strokeOpacity={0.6}
            strokeWidth={1}
            pointerEvents="none"
          />
        )}
      </svg>
      {hover && (
        <div
          className="lab-tip"
          style={{
            left: clampTip(px(hover.i), w, 110),
            top: Math.max(40, geo[hover.r].b - hgt(share, hover.r)),
          }}
        >
          {tipText}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── RadarChart ───────────────────────── */

export function RadarChart({
  axes,
  series,
  format = (v) => String(Math.round(v)),
  minHeight = 300,
  className = "",
}: {
  axes: { key: string; label: string; hint?: string }[];
  series: { name: string; values: number[]; tone: "main" | "ghost" }[];
  format?: (v: number) => string;
  minHeight?: number;
  className?: string;
}) {
  const hasData = axes.length >= 3 && series.some((s) => s.values.some((v) => finite(v) > 0));
  if (!hasData) return <EmptyState minHeight={minHeight} className={className} />;
  const hasGhost = series.some((s) => s.tone === "ghost");
  return (
    <div className={`flex flex-col ${className}`}>
      <ChartBox minHeight={minHeight} className="flex-1">
        {({ w, h, inView }) => <RadarPlot axes={axes} series={series} format={format} w={w} h={h} inView={inView} />}
      </ChartBox>
      {hasGhost && (
        <div className="pt-2">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px]" style={{ color: "var(--muted)" }}>
            {series.map((s) => (
              <span key={`${s.tone}:${s.name}`} className="inline-flex items-center gap-1.5">
                <i
                  className="inline-block w-4"
                  style={{
                    height: 0,
                    borderTop: s.tone === "main" ? "3px solid var(--accent)" : "2px dashed var(--muted)",
                  }}
                />
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RadarPlot({
  axes,
  series,
  format,
  w,
  h,
  inView,
}: {
  axes: { key: string; label: string; hint?: string }[];
  series: { name: string; values: number[]; tone: "main" | "ghost" }[];
  format: (v: number) => string;
  w: number;
  h: number;
  inView: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const n = axes.length;

  const target = useMemo<TweenRow[]>(
    () =>
      series.map((s) => ({
        key: `${s.tone}:${s.name}`,
        values: axes.map((_, i) => (inView ? clamp(finite(s.values[i]), 0, 100) : 0)),
      })),
    [series, axes, inView]
  );
  const shown = useTweenRows(target, 450, true);

  const longest = axes.reduce((m, a) => Math.max(m, a.label.length), 0);
  const padX = clamp(longest * 7 + 14, 56, Math.max(56, w * 0.34));
  const padY = 44;
  const R = Math.max(20, Math.min(w / 2 - padX, h / 2 - padY));
  const cx = w / 2;
  const cy = h / 2;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const at = (i: number, r: number): [number, number] => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
  const poly = (vals: number[]) => vals.map((v, i) => at(i, (R * v) / 100).map((c) => c.toFixed(2)).join(",")).join(" ");

  const mainIdx = Math.max(0, series.findIndex((s) => s.tone === "main"));
  const order = series.map((_, i) => i).sort((a, b) => (series[a].tone === "ghost" ? 0 : 1) - (series[b].tone === "ghost" ? 0 : 1));

  const half = Math.PI / n;
  const big = R + 60;

  return (
    <div className="relative h-full w-full">
      <svg
        width={w}
        height={h}
        role="img"
        aria-label={`Gráfico de radar con ${n} ejes: ${axes.map((a) => a.label).join(", ")}`}
        style={{ display: "block", overflow: "visible" }}
        onMouseLeave={() => setHover(null)}
      >
        {[25, 50, 75, 100].map((p) => (
          <polygon
            key={p}
            points={axes.map((_, i) => at(i, (R * p) / 100).map((c) => c.toFixed(2)).join(",")).join(" ")}
            fill="none"
            stroke="var(--line)"
            strokeWidth={1}
          />
        ))}
        {axes.map((a, i) => {
          const [x, y] = at(i, R);
          return <line key={a.key} x1={cx} y1={cy} x2={x} y2={y} stroke={hover === i ? "var(--muted)" : "var(--line)"} strokeWidth={1} />;
        })}

        {order.map((si) => {
          const s = series[si];
          const pts = poly(shown[si].values);
          return s.tone === "main" ? (
            <g key={`${s.tone}:${s.name}`}>
              <polygon points={pts} fill="var(--accent)" fillOpacity={0.2} stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
              {shown[si].values.map((v, i) => {
                const [x, y] = at(i, (R * v) / 100);
                return <circle key={axes[i].key} cx={x} cy={y} r={4} fill="var(--accent)" stroke="var(--g-bg)" strokeWidth={2} />;
              })}
            </g>
          ) : (
            <polygon
              key={`${s.tone}:${s.name}`}
              points={pts}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              strokeLinejoin="round"
            />
          );
        })}

        {axes.map((a, i) => {
          const c = Math.cos(ang(i));
          const s = Math.sin(ang(i));
          const [lx, ly] = at(i, R + 12);
          const anchor = c > 0.3 ? "start" : c < -0.3 ? "end" : "middle";
          const [ty, vy] = s < -0.3 ? [ly - 16, ly - 3] : s > 0.3 ? [ly + 12, ly + 26] : [ly - 2, ly + 11];
          const mainVal = series[mainIdx]?.values[i];
          return (
            <g key={a.key} pointerEvents="none">
              <text x={lx} y={ty} textAnchor={anchor} fill="var(--ink)" fontSize={12} fontWeight={700}>
                {a.label}
              </text>
              <text x={lx} y={vy} textAnchor={anchor} style={axisText}>
                {format(finite(mainVal))}
              </text>
            </g>
          );
        })}

        {/* hit wedges: one per axis, reaching the labels */}
        {axes.map((a, i) => {
          const [x1, y1] = [cx + Math.cos(ang(i) - half) * big, cy + Math.sin(ang(i) - half) * big];
          const [x2, y2] = [cx + Math.cos(ang(i) + half) * big, cy + Math.sin(ang(i) + half) * big];
          return (
            <path
              key={a.key}
              d={`M${cx},${cy}L${x1.toFixed(1)},${y1.toFixed(1)}L${x2.toFixed(1)},${y2.toFixed(1)}Z`}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              style={{ cursor: "default" }}
            />
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="lab-tip"
          style={{
            left: clampTip(at(hover, R * 0.5)[0], w, 90),
            top: Math.max(56 + series.length * 18, at(hover, R * 0.5)[1]),
          }}
        >
          <b>{axes[hover].label}</b>
          {axes[hover].hint && <div style={{ opacity: 0.8 }}>{axes[hover].hint}</div>}
          {series.map((s) => (
            <div key={`${s.tone}:${s.name}`} className="flex items-center gap-1.5 tabular-nums">
              <Swatch color={s.tone === "main" ? "var(--accent)" : "var(--muted)"} dashed={s.tone === "ghost"} />
              <span>{s.name}</span>
              <b className="ml-auto pl-3">{format(finite(s.values[hover]))}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── StackedShare ───────────────────────── */

const TS_LEFT = 38;
const TS_RIGHT = 14;
const TS_TOP = 6;
const TS_BOTTOM = 22;

export function StackedShare({
  periods,
  series,
  window: win = 3,
  minHeight = 240,
  className = "",
}: {
  periods: string[];
  series: { name: string; values: number[] }[];
  window?: number;
  minHeight?: number;
  className?: string;
}) {
  const P = periods.length;

  const calc = useMemo(() => {
    const n = Math.min(P, series.reduce((m, s) => Math.max(m, s.values.length), 0));
    if (P < 2 || n < 1 || series.length === 0) return null;
    const sm = series.map((s) => movingWindow(Array.from({ length: n }, (_, i) => Math.max(0, finite(s.values[i]))), win, false));
    const shares: number[][] = series.map(() => new Array<number>(n).fill(0));
    let prev: number[] | null = null;
    const valid: boolean[] = new Array(n).fill(false);
    for (let i = 0; i < n; i++) {
      let t = 0;
      for (const s of sm) t += s[i];
      if (t > 0) {
        valid[i] = true;
        sm.forEach((s, k) => (shares[k][i] = s[i] / t));
        prev = shares.map((s) => s[i]);
      } else if (prev) {
        const p = prev;
        shares.forEach((s, k) => (s[i] = p[k]));
        valid[i] = true;
      }
    }
    const firstValid = valid.indexOf(true);
    if (firstValid < 0) return null;
    for (let i = 0; i < firstValid; i++) shares.forEach((s) => (s[i] = s[firstValid]));
    const raw = series.map((s) => s.values.slice(0, n).reduce((a, b) => a + Math.max(0, finite(b)), 0));
    const grand = raw.reduce((a, b) => a + b, 0) || 1;
    return { n, shares, overall: raw.map((r) => r / grand) };
  }, [periods, series, win, P]);

  if (!calc) return <EmptyState minHeight={minHeight} className={className} />;
  return (
    <div className={`flex flex-col ${className}`}>
      <Legend
        items={series.map((s, i) => ({
          name: s.name,
          color: SERIES[i % SERIES.length],
          note: fmtPct1(calc.overall[i] * 100),
        }))}
      />
      <ChartBox minHeight={minHeight} className="flex-1">
        {({ w, h, inView }) => (
          <StackPlot periods={periods} names={series.map((s) => s.name)} shares={calc.shares} n={calc.n} w={w} h={h} inView={inView} />
        )}
      </ChartBox>
    </div>
  );
}

function StackPlot({
  periods,
  names,
  shares,
  n,
  w,
  h,
  inView,
}: {
  periods: string[];
  names: string[];
  shares: number[][];
  n: number;
  w: number;
  h: number;
  inView: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const P = periods.length;
  const W = Math.max(1, w - TS_LEFT - TS_RIGHT);
  const H = Math.max(1, h - TS_TOP - TS_BOTTOM);
  const x = (i: number) => TS_LEFT + (i / (P - 1)) * W;
  const y = (f: number) => TS_TOP + (1 - f) * H;

  const shown = useTweenRows(names.map((nm, k) => ({ key: nm, values: shares[k] })));

  const bands = useMemo(() => {
    // cum[s][i] = top edge of band s at period i (bottom edge = cum[s-1] or 0)
    const cum: number[][] = shown.map(() => new Array<number>(n).fill(0));
    for (let i = 0; i < n; i++) {
      let t = 0;
      for (const r of shown) t += r.values[i] ?? 0;
      t = t || 1;
      let acc = 0;
      shown.forEach((r, s) => {
        acc += (r.values[i] ?? 0) / t;
        cum[s][i] = acc;
      });
    }
    return cum;
  }, [shown, n]);

  const ticks = timeTicks(periods, x);

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = clamp(Math.round(((e.clientX - r.left - TS_LEFT) / W) * (P - 1)), 0, n - 1);
    setHover((p) => (p === i ? p : i));
  };

  const hovered =
    hover !== null && hover < n
      ? names.map((nm, k) => ({ name: nm, color: SERIES[k % SERIES.length], v: shares[k][hover] })).sort((a, b) => b.v - a.v)
      : null;

  return (
    <div className="relative h-full w-full">
      <svg
        width={w}
        height={h}
        role="img"
        aria-label="Reparto porcentual a lo largo del tiempo"
        className={`lab-wipe ${inView ? "is-in" : ""}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        style={{ display: "block" }}
      >
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={TS_LEFT} x2={TS_LEFT + W} y1={y(f)} y2={y(f)} stroke="var(--line)" strokeWidth={1} />
            <text x={TS_LEFT - 6} y={y(f) + 4} textAnchor="end" style={axisText}>
              {`${f * 100} %`}
            </text>
          </g>
        ))}
        {n >= 2 &&
          bands.map((top, s) => {
            const bottom = s === 0 ? null : bands[s - 1];
            let d = "";
            for (let i = 0; i < n; i++) d += `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(top[i]).toFixed(2)}`;
            for (let i = n - 1; i >= 0; i--) d += `L${x(i).toFixed(2)},${y(bottom ? bottom[i] : 0).toFixed(2)}`;
            return (
              <path
                key={names[s]}
                d={`${d}Z`}
                fill={SERIES[s % SERIES.length]}
                stroke="var(--g-bg)"
                strokeWidth={2}
                strokeLinejoin="round"
              />
            );
          })}
        {ticks.map((t) => (
          <text key={t.label + t.x} x={t.x} y={h - 6} textAnchor="middle" style={axisText}>
            {t.label}
          </text>
        ))}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={TS_TOP} y2={TS_TOP + H} stroke="var(--ink)" strokeOpacity={0.7} strokeWidth={1} pointerEvents="none" />
        )}
      </svg>
      {hover !== null && hovered && (
        <div className="lab-tip" style={{ left: clampTip(x(hover), w, 90), top: TS_TOP + 22 + 18 * (hovered.length + 1) }}>
          <b>{periodLabel(periods[hover])}</b>
          {hovered.map((r) => (
            <div key={r.name} className="flex items-center gap-1.5 tabular-nums">
              <Swatch color={r.color} />
              <span>{r.name}</span>
              <b className="ml-auto pl-3">{fmtPct1(r.v * 100)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── DuelBars ───────────────────────── */

export function DuelBars({
  rows,
  colors = [SERIES[0], SERIES[1]],
  className = "",
}: {
  rows: {
    label: string;
    a: number;
    b: number;
    format?: (n: number) => string;
    lowerWins?: boolean;
    aText?: string;
    bText?: string;
  }[];
  colors?: [string, string];
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  if (rows.length === 0) return <EmptyState className={className} />;

  return (
    <div ref={ref} className={`flex flex-col gap-5 ${className}`}>
      {rows.map((r) => {
        const a = Math.max(0, finite(r.a));
        const b = Math.max(0, finite(r.b));
        const total = a + b;
        const pa = total > 0 ? (a / total) * 100 : 50;
        const fmt = r.format ?? fmtInt;
        const tie = a === b;
        const aWins = !tie && (r.lowerWins ? a < b : a > b);
        const bWins = !tie && !aWins;
        const val = (win: boolean) => ({
          color: tie || win ? "var(--ink)" : "var(--muted)",
          fontWeight: tie || win ? 800 : 500,
        });
        return (
          <div key={r.label} title={total > 0 ? `${r.label}: ${fmtPct1(pa)} · ${fmtPct1(100 - pa)}` : undefined}>
            <div className="grid items-baseline gap-2" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
              <span className="truncate text-left text-[20px] leading-none tabular-nums" style={val(aWins)}>
                {r.aText ?? fmt(a)}
              </span>
              <span className="text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                {r.label}
              </span>
              <span className="truncate text-right text-[20px] leading-none tabular-nums" style={val(bWins)}>
                {r.bText ?? fmt(b)}
              </span>
            </div>
            <div className="relative mt-2 h-2 w-full">
              <span
                className="absolute top-0 left-0 h-full rounded-full"
                style={{
                  width: inView ? `calc(${pa}% - 1px)` : "0%",
                  background: colors[0],
                  transition: "width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)",
                }}
              />
              <span
                className="absolute top-0 right-0 h-full rounded-full"
                style={{
                  width: inView ? `calc(${100 - pa}% - 1px)` : "0%",
                  background: colors[1],
                  transition: "width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── MultiLine ───────────────────────── */

export function MultiLine({
  periods,
  series,
  format = fmtInt,
  unit = "",
  smooth = 1,
  minHeight = 240,
  className = "",
}: {
  periods: string[];
  series: { name: string; values: number[]; color?: string }[];
  format?: (n: number) => string;
  unit?: string;
  smooth?: number;
  minHeight?: number;
  className?: string;
}) {
  const P = periods.length;
  const sm = useMemo(
    () => series.map((s) => movingWindow(s.values.slice(0, P).map((v) => Math.max(0, finite(v))), smooth, true)),
    [series, smooth, P]
  );
  const hasData = P >= 2 && sm.some((v) => v.some((x) => x > 0));
  if (!hasData) return <EmptyState minHeight={minHeight} className={className} />;
  const colorOf = (i: number) => series[i].color ?? SERIES[i % SERIES.length];
  return (
    <div className={`flex flex-col ${className}`}>
      <Legend items={series.map((s, i) => ({ name: s.name, color: colorOf(i) }))} />
      <ChartBox minHeight={minHeight} className="flex-1">
        {({ w, h, inView }) => (
          <LinePlot
            periods={periods}
            names={series.map((s) => s.name)}
            colors={series.map((_, i) => colorOf(i))}
            sm={sm}
            format={format}
            unit={unit}
            w={w}
            h={h}
            inView={inView}
          />
        )}
      </ChartBox>
    </div>
  );
}

function LinePlot({
  periods,
  names,
  colors,
  sm,
  format,
  unit,
  w,
  h,
  inView,
}: {
  periods: string[];
  names: string[];
  colors: string[];
  sm: number[][];
  format: (n: number) => string;
  unit: string;
  w: number;
  h: number;
  inView: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const P = periods.length;
  const longest = sm.reduce((m, s) => Math.max(m, s.length), 0);

  let rawMax = 0;
  for (const s of sm) for (const v of s) if (v > rawMax) rawMax = v;
  const yMaxTarget = niceMax(rawMax);

  // y max is tweened with the lines so gridlines and data glide together.
  const shown = useTweenRows([
    ...names.map((nm, k) => ({ key: nm, values: sm[k] })),
    { key: "\u0000max", values: [yMaxTarget] },
  ]);
  const yMax = Math.max(1e-9, shown[shown.length - 1].values[0]);

  const left = clamp(format(yMaxTarget).length * 7 + 14, 34, 64);
  const right = 14;
  const top = 6;
  const bottom = 22;
  const W = Math.max(1, w - left - right);
  const H = Math.max(1, h - top - bottom);
  const x = (i: number) => left + (i / (P - 1)) * W;
  const y = (v: number) => top + (1 - clamp(v / yMax, 0, 1.05)) * H;
  const ticks = timeTicks(periods, x);

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = clamp(Math.round(((e.clientX - r.left - left) / W) * (P - 1)), 0, Math.max(0, longest - 1));
    setHover((p) => (p === i ? p : i));
  };

  const tipTop = hover !== null ? top + 22 + 18 * (names.length + 1) : 0;

  return (
    <div className="relative h-full w-full">
      <svg
        width={w}
        height={h}
        role="img"
        aria-label="Comparación a lo largo del tiempo"
        className={`lab-wipe ${inView ? "is-in" : ""}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        style={{ display: "block" }}
      >
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={left} x2={left + W} y1={top + (1 - f) * H} y2={top + (1 - f) * H} stroke="var(--line)" strokeWidth={1} />
            <text x={left - 6} y={top + (1 - f) * H + 4} textAnchor="end" style={axisText}>
              {format(yMaxTarget * f)}
            </text>
          </g>
        ))}
        {names.map((nm, k) => {
          const vals = shown[k].values;
          if (vals.length === 0) return null;
          if (vals.length === 1) return <circle key={nm} cx={x(0)} cy={y(vals[0])} r={2} fill={colors[k]} />;
          let d = "";
          vals.forEach((v, i) => (d += `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(v).toFixed(2)}`));
          return (
            <path key={nm} d={d} fill="none" stroke={colors[k]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          );
        })}
        {ticks.map((t) => (
          <text key={t.label + t.x} x={t.x} y={h - 6} textAnchor="middle" style={axisText}>
            {t.label}
          </text>
        ))}
        {hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={top} y2={top + H} stroke="var(--muted)" strokeOpacity={0.6} strokeWidth={1} />
            {names.map((nm, k) =>
              hover < shown[k].values.length ? (
                <circle key={nm} cx={x(hover)} cy={y(shown[k].values[hover])} r={4} fill={colors[k]} stroke="var(--g-bg)" strokeWidth={2} />
              ) : null
            )}
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="lab-tip" style={{ left: clampTip(x(hover), w, 90), top: tipTop }}>
          <b>{periodLabel(periods[hover])}</b>
          {names.map((nm, k) => (
            <div key={nm} className="flex items-center gap-1.5 tabular-nums">
              <Swatch color={colors[k]} />
              <span>{nm}</span>
              <b className="ml-auto pl-3">
                {hover < sm[k].length ? `${format(sm[k][hover])}${unit}` : "–"}
              </b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Keeps ReactNode import used for future wrappers without lint noise.
export type _HabitsNode = ReactNode;
