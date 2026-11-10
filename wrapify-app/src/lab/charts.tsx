"use client";

import { ReactNode, useId, useMemo, useState } from "react";
import { fmtHour, fmtInt, WEEKDAYS_LONG, WEEKDAYS_SHORT } from "./insights";
import { useInView } from "./motion";
import { useFlip } from "./race";

/*
 * Hand-rolled SVG/CSS charts. They read their colours from CSS variables
 * (--ink, --muted, --accent, --line) so each lab version themes them by
 * setting those on a wrapper. Single hue = magnitude; text always wears ink.
 */

/* ── Area chart with crosshair + tooltip ── */

export interface SeriesPoint {
  label: string;
  value: number;
  tick?: string;
}

export function AreaChart({
  data,
  height = 260,
  unit = "",
  format = fmtInt,
  upTo,
}: {
  data: SeriesPoint[];
  /** pixels, or "fill" to take the whole (positioned) parent */
  height?: number | "fill";
  unit?: string;
  format?: (n: number) => string;
  /** draw only up to this index and keep the axes of the whole series (playback) */
  upTo?: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = data.length;
  const end = upTo === undefined ? n - 1 : Math.max(0, Math.min(n - 1, upTo));
  const partial = upTo !== undefined && end < n - 1;

  const { line, area, max } = useMemo(() => {
    let m = 0;
    for (const d of data) if (d.value > m) m = d.value;
    m = m || 1;
    const pts = data.map((d, i) => {
      const x = n > 1 ? (i / (n - 1)) * 100 : 50;
      const y = 100 - (d.value / m) * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const l = `M${pts.join("L")}`;
    return { line: l, area: `${l}L100,100L0,100Z`, max: m };
  }, [data, n]);

  const xPct = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 50);
  const yPct = (v: number) => 100 - (v / max) * 100;
  const gradId = `lab-area-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const hovered = hover !== null ? data[hover] : null;

  return (
    <div
      ref={ref}
      className="relative select-none"
      style={{ height: height === "fill" ? "100%" : height, paddingLeft: 44, paddingBottom: 24 }}
    >
      {/* plot */}
      <div
        className="relative h-full w-full"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((e.clientX - r.left) / r.width) * (n - 1));
          setHover(Math.max(0, Math.min(end, i)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        {/* y grid + labels */}
        {[1, 0.5, 0].map((f) => (
          <div key={f} className="absolute right-0 left-0 border-t" style={{ top: `${(1 - f) * 100}%`, borderColor: "var(--line)" }}>
            <span
              className="absolute -left-[44px] w-[36px] -translate-y-1/2 text-right text-[11px] tabular-nums"
              style={{ color: "var(--muted)" }}
            >
              {format(max * f)}
            </span>
          </div>
        ))}

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className={`lab-wipe absolute inset-0 h-full w-full overflow-visible ${inView ? "is-in" : ""}`}
          // while playing, the wipe follows the cursor instead of the entry animation
          style={inView && upTo !== undefined ? { clipPath: `inset(-8px ${100 - xPct(end)}% -8px 0)`, transition: "clip-path 0.4s linear" } : undefined}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.42" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradId})`} />
          <path
            d={line}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* the head of the line while it is being drawn */}
        {partial && inView && (
          <div
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${xPct(end)}%`,
              top: `${yPct(data[end].value)}%`,
              background: "var(--ink)",
              boxShadow: "0 0 0 3px var(--g-bg, #000)",
              transition: "left 0.4s linear, top 0.4s linear",
            }}
          />
        )}

        {hovered && hover !== null && (
          <>
            <div
              className="absolute top-0 bottom-0 w-px"
              style={{ left: `${xPct(hover)}%`, background: "var(--muted)", opacity: 0.6 }}
            />
            <div
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${xPct(hover)}%`,
                top: `${yPct(hovered.value)}%`,
                background: "var(--accent)",
                boxShadow: "0 0 0 3px var(--g-bg, #000)",
              }}
            />
            <div
              className="lab-tip"
              style={{
                left: `clamp(60px, ${xPct(hover)}%, calc(100% - 60px))`,
                top: `${yPct(hovered.value)}%`,
              }}
            >
              <b>
                {format(hovered.value)}
                {unit}
              </b>{" "}
              · {hovered.label}
            </div>
          </>
        )}

        {/* x ticks */}
        {data.map((d, i) =>
          d.tick ? (
            <span
              key={i}
              className="absolute top-full mt-1.5 -translate-x-1/2 text-[11px] tabular-nums"
              style={{ left: `${xPct(i)}%`, color: "var(--muted)" }}
            >
              {d.tick}
            </span>
          ) : null
        )}
      </div>
    </div>
  );
}

/* ── Sparkline (no axes, no hover: a shape, not a chart to read values from) ── */

export function Sparkline({ values, height = 56 }: { values: number[]; height?: number }) {
  const max = Math.max(1, ...values);
  const n = values.length;
  const pts = values.map((v, i) => `${((i / Math.max(1, n - 1)) * 100).toFixed(2)},${(100 - (v / max) * 96).toFixed(2)}`);
  const line = `M${pts.join("L")}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height, width: "100%" }} aria-hidden>
      <path d={`${line}L100,100L0,100Z`} fill="var(--accent)" opacity={0.18} />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ── 24h radial clock ── */

export function RadialClock({
  values,
  size = 340,
  interactive = true,
}: {
  values: number[];
  size?: number;
  interactive?: boolean;
}) {
  const [ref, inView] = useInView<HTMLDivElement>("0px");
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...values);
  const peak = values.indexOf(Math.max(...values));
  const shown = hover ?? peak;
  const total = values.reduce((a, b) => a + b, 0) || 1;

  const C = 120; // centre
  const R0 = 46;
  const R1 = 98;

  const polar = (hour: number, r: number) => {
    const a = (hour / 24) * Math.PI * 2 - Math.PI / 2;
    return [C + Math.cos(a) * r, C + Math.sin(a) * r] as const;
  };

  return (
    <div ref={ref} className={`relative ${inView ? "is-in" : ""}`} style={{ width: size, maxWidth: "100%", aspectRatio: "1" }}>
      <svg viewBox="0 0 240 240" className="h-full w-full">
        {values.map((v, h) => {
          const [x0, y0] = polar(h, R0);
          const [xt, yt] = polar(h, R1);
          const [x1, y1] = polar(h, R0 + Math.max(0.02, v / max) * (R1 - R0));
          const active = h === shown;
          return (
            <g key={h}>
              <line x1={x0} y1={y0} x2={xt} y2={yt} stroke="var(--ink)" strokeOpacity={0.08} strokeWidth={7} strokeLinecap="round" />
              <line
                className="lab-clock-bar"
                pathLength={1}
                x1={x0}
                y1={y0}
                x2={x1}
                y2={y1}
                stroke={active ? "var(--ink)" : "var(--accent)"}
                strokeWidth={7}
                strokeLinecap="round"
                style={{ transitionDelay: `${h * 28}ms, 0ms` }}
              />
              {interactive && (
                <line
                  x1={C}
                  y1={C}
                  x2={polar(h, R1 + 8)[0]}
                  y2={polar(h, R1 + 8)[1]}
                  stroke="transparent"
                  strokeWidth={16}
                  onMouseEnter={() => setHover(h)}
                  onMouseLeave={() => setHover(null)}
                />
              )}
            </g>
          );
        })}
        {[0, 6, 12, 18].map((h) => {
          const [x, y] = polar(h, R1 + 13);
          return (
            <text key={h} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={9} fill="var(--muted)" fontWeight={600}>
              {String(h).padStart(2, "0")}
            </text>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[1.6em] font-bold leading-none tabular-nums" style={{ color: "var(--ink)", fontSize: size * 0.085 }}>
          {fmtHour(shown)}
        </span>
        <span className="mt-1 tabular-nums" style={{ color: "var(--muted)", fontSize: Math.max(10, size * 0.034) }}>
          {((values[shown] / total) * 100).toFixed(1)}% del total
        </span>
      </div>
    </div>
  );
}

/* ── Weekday × hour heatmap ── */

export function Heatmap({ grid }: { grid: number[][] }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const max = useMemo(() => Math.max(1, ...grid.map((row) => Math.max(...row))), [grid]);

  return (
    <div ref={ref} className={inView ? "is-in" : ""}>
      <div className="grid items-center gap-[3px]" style={{ gridTemplateColumns: "auto repeat(24, minmax(0, 1fr))" }}>
        {grid.map((row, d) => (
          <Row key={d}>
            <span className="pr-2 text-[11px] font-medium" style={{ color: "var(--muted)" }}>
              {WEEKDAYS_SHORT[d]}
            </span>
            {row.map((v, h) => {
              // sqrt scale so quiet hours still register
              const pct = Math.round(Math.sqrt(v / max) * 100);
              const active = hover?.d === d && hover.h === h;
              return (
                <div
                  key={h}
                  className="lab-cell h-7 rounded-[5px]"
                  style={{
                    background: `color-mix(in oklab, var(--accent) ${pct}%, var(--line))`,
                    animationDelay: `${h * 22 + d * 30}ms`,
                    outline: active ? "2px solid var(--ink)" : "none",
                    outlineOffset: 1,
                  }}
                  onMouseEnter={() => setHover({ d, h })}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </Row>
        ))}
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="pt-1 text-center text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
            {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 text-xs" style={{ color: "var(--muted)" }}>
        <span className="tabular-nums" style={{ color: hover ? "var(--ink)" : "var(--muted)" }}>
          {hover
            ? `${WEEKDAYS_LONG[hover.d]}, ${fmtHour(hover.h)} — ${fmtInt(grid[hover.d][hover.h])} reproducciones`
            : "Pasa el ratón por una celda"}
        </span>
        <span className="flex items-center gap-1.5">
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

function Row({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/* ── Ranked horizontal bars ── */

export interface BarItem {
  key: string;
  label: string;
  sub?: string;
  value: number;
}

export function BarList({
  items,
  onSelect,
  unit = "",
  startRank = 1,
  size = "md",
}: {
  items: BarItem[];
  onSelect?: (item: BarItem) => void;
  unit?: string;
  startRank?: number;
  size?: "md" | "lg";
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  // rows glide to their new place when the ranking changes (year switch, playback)
  const flip = useFlip<HTMLOListElement>();
  const max = Math.max(1, ...items.map((i) => i.value));
  const lg = size === "lg";
  return (
    <div ref={ref} className={inView ? "is-in" : ""}>
    <ol ref={flip} className={`flex flex-col ${lg ? "gap-3" : "gap-1"}`}>
      {items.map((item, i) => {
        const body = (
          <>
            <span className={`w-7 shrink-0 text-right font-bold tabular-nums ${lg ? "text-lg" : "text-sm"}`} style={{ color: "var(--muted)" }}>
              {startRank + i}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">
                  <span className={`font-semibold ${lg ? "text-lg" : "text-[15px]"}`} style={{ color: "var(--ink)" }}>
                    {item.label}
                  </span>
                  {item.sub && (
                    <span className="ml-2 text-[13px]" style={{ color: "var(--muted)" }}>
                      {item.sub}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[13px] font-medium tabular-nums" style={{ color: "var(--muted)" }}>
                  {fmtInt(item.value)}
                  {unit}
                </span>
              </span>
              <span className={`mt-1.5 block overflow-hidden rounded-full ${lg ? "h-2" : "h-1.5"}`} style={{ background: "var(--line)" }}>
                <span
                  className="lab-bar-fill block h-full rounded-full"
                  style={{
                    width: `${Math.max(1.5, (item.value / max) * 100)}%`,
                    background: "var(--accent)",
                    transitionDelay: `${Math.min(i, 14) * 45}ms, 0ms`,
                  }}
                />
              </span>
            </span>
          </>
        );
        return (
          <li key={item.key} data-flip-key={item.key}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-2xl px-2 py-2 text-left transition-[background,transform] duration-200 hover:translate-x-1 hover:bg-[color-mix(in_srgb,var(--ink)_9%,transparent)]"
              >
                {body}
              </button>
            ) : (
              <div className="flex items-center gap-3 px-2 py-2">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
    </div>
  );
}

/* ── Vertical columns (few categories: weekdays, years) ── */

export function Columns({
  items,
  height = 180,
  unit = "",
  highlight,
}: {
  items: { label: string; value: number; sub?: string }[];
  height?: number;
  unit?: string;
  /** index drawn in ink instead of accent (e.g. the max) */
  highlight?: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div ref={ref} className={`flex items-end gap-2 ${inView ? "is-in" : ""}`}>
      {items.map((item, i) => (
        <div
          key={item.label}
          className="relative flex min-w-0 flex-1 flex-col items-center"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        >
          <div className="relative flex w-full items-end justify-center" style={{ height }}>
            {hover === i && (
              <div className="lab-tip" style={{ left: "50%", top: `${100 - (item.value / max) * 100}%` }}>
                <b>
                  {fmtInt(item.value)}
                  {unit}
                </b>
                {item.sub ? ` · ${item.sub}` : ""}
              </div>
            )}
            <div
              className="lab-col-fill w-full max-w-[56px] rounded-t-[6px]"
              style={{
                height: `${Math.max(2, (item.value / max) * 100)}%`,
                background: i === highlight ? "var(--ink)" : "var(--accent)",
                opacity: hover === null || hover === i ? 1 : 0.55,
                transitionDelay: `${i * 60}ms, 0ms`,
              }}
            />
          </div>
          <span className="mt-2 text-xs font-medium tabular-nums" style={{ color: i === highlight ? "var(--ink)" : "var(--muted)" }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
