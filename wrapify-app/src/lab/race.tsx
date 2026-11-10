"use client";

import { memo, RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChartBox, SERIES } from "./chart-kit";
import { fmtInt, fmtMonthLong, fmtMonthShort } from "./insights";
import { INK } from "./studio/ui";

/*
 * Playback pieces of the Studio: the bar chart race, the transport dock and a
 * FLIP helper. Everything here is built so that props changing every few
 * hundred milliseconds produce continuous motion: stable keys, CSS transitions
 * on transform/width/opacity, and no mount/unmount while playing.
 */

/* ── Types (structurally identical to @/lab/analytics) ── */

export interface RaceEntity {
  key: string;
  label: string;
  sub?: string;
}
export interface RaceData {
  /** "YYYY-MM" */
  months: string[];
  entities: RaceEntity[];
  /** cum[e][m] = cumulative plays of entity e at the end of months[m] */
  cum: number[][];
}

/* ── Helpers ── */

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduce;
}

/* ───────────────────────────── useFlip ───────────────────────────── */

const FLIP_EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/**
 * FLIP for reordering lists: attach the returned ref to the list container; direct children carrying
 * `data-flip-key` glide to their new position whenever they change place between renders
 * (Web Animations API, ~450ms). New children are left alone. No-op under prefers-reduced-motion.
 */
export function useFlip<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);
  const prev = useRef<Map<string, { x: number; y: number }>>(new Map());
  const running = useRef<WeakMap<Element, Animation>>(new WeakMap());

  // No deps on purpose: measure after every render.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, { x: number; y: number }>();
    const kids = el.querySelectorAll<HTMLElement>(":scope > [data-flip-key]");
    kids.forEach((kid) => {
      const key = kid.dataset.flipKey;
      if (!key) return;
      // offsetTop/Left ignore transforms, so a running animation does not disturb the measurement
      const x = kid.offsetLeft;
      const y = kid.offsetTop;
      next.set(key, { x, y });
      const old = prev.current.get(key);
      if (!old || reduce || typeof kid.animate !== "function") return;
      let dx = old.x - x;
      let dy = old.y - y;
      // if the child is mid-glide, continue from where it visually is instead of from its old slot
      const anim = running.current.get(kid);
      if (anim && anim.playState === "running") {
        const m = new DOMMatrixReadOnly(getComputedStyle(kid).transform);
        // `old` is the previous layout slot; the visual position is that slot plus the live transform
        dx = m.m41 + (old.x - x);
        dy = m.m42 + (old.y - y);
      }
      if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) return;
      anim?.cancel();
      const a = kid.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], {
        duration: 450,
        easing: FLIP_EASE,
      });
      running.current.set(kid, a);
    });
    prev.current = next;
  });

  return ref;
}

/* ───────────────────────────── BarRace ───────────────────────────── */

/** Counts between values with rAF, writing straight to the DOM (no React render per frame). */
function Counter({ value, visible, dur }: { value: number; visible: boolean; dur: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const cur = useRef(0);
  const was = useRef(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!visible) {
      // parked rows are invisible: touch nothing, so a fading-out row keeps its last number
      was.current = false;
      return;
    }
    if (!was.current) {
      // just entered: count up from 0 together with the bar growing from nothing
      was.current = true;
      cur.current = 0;
    }
    const from = cur.current;
    if (dur <= 0 || from === value) {
      cur.current = value;
      el.textContent = fmtInt(value);
      return;
    }
    el.textContent = fmtInt(from);
    let t0: number | null = null;
    let raf = 0;
    const tick = (t: number) => {
      if (t0 === null) t0 = t;
      const p = Math.min(1, (t - t0) / dur);
      cur.current = from + (value - from) * p; // linear, like the bar width
      el.textContent = fmtInt(cur.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // cur.current holds the in-flight value, so the next retarget starts exactly where we are
    return () => cancelAnimationFrame(raf);
  }, [value, visible, dur]);

  return <span ref={ref} />;
}

interface RowProps {
  ent: RaceEntity;
  /** position of the entity in the data (ordered by final plays): its colour, for life */
  colorIndex: number;
  /** slot; parked rows get `rows` (just below the plot) */
  rank: number;
  visible: boolean;
  /** real value when visible, 0 when parked (keeps parked rows' props constant so memo skips them) */
  value: number;
  barW: number;
  rowH: number;
  barH: number;
  rankW: number;
  nameW: number;
  showSub: boolean;
  /** transition duration in ms, 0 = none */
  d: number;
  clickable: boolean;
  onPick: (e: RaceEntity) => void;
}

const RaceRow = memo(function RaceRow({ ent, colorIndex, rank, visible, value, barW, rowH, barH, rankW, nameW, showSub, d, clickable, onPick }: RowProps) {
  const color = SERIES[colorIndex % SERIES.length];
  const common = {
    transition: d > 0 ? `transform ${d}ms cubic-bezier(0.45, 0, 0.2, 1), opacity ${Math.min(d, 300)}ms ease` : "none",
  };
  return (
    <div
      aria-hidden={!visible}
      role={clickable && visible ? "button" : undefined}
      tabIndex={clickable && visible ? 0 : undefined}
      aria-label={clickable && visible ? `${ent.label}${ent.sub ? `, ${ent.sub}` : ""}` : undefined}
      onClick={clickable && visible ? () => onPick(ent) : undefined}
      onKeyDown={
        clickable && visible
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick(ent);
              }
            }
          : undefined
      }
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        right: 0,
        height: rowH,
        display: "flex",
        alignItems: "center",
        transform: `translateY(${rank * rowH}px)`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        cursor: clickable && visible ? "pointer" : "default",
        ...common,
      }}
    >
      <span
        className="shrink-0 text-right text-[12px] font-semibold tabular-nums"
        style={{ width: rankW, paddingRight: 8, color: "var(--muted)" }}
      >
        {visible ? rank + 1 : ""}
      </span>
      <span
        className="shrink-0 overflow-hidden text-right text-[13px] whitespace-nowrap"
        style={{ width: nameW, paddingRight: 10, textOverflow: "ellipsis", color: "var(--ink)" }}
        title={ent.sub ? `${ent.label} · ${ent.sub}` : ent.label}
      >
        <b className="font-bold">{ent.label}</b>
        {showSub && ent.sub ? <span style={{ color: "var(--muted)" }}> {ent.sub}</span> : null}
      </span>
      <div
        className="relative shrink-0"
        style={{ width: barW, height: barH, transition: d > 0 ? `width ${d}ms linear` : "none" }}
      >
        <div className="absolute inset-0" style={{ background: color, borderRadius: "0 6px 6px 0" }} />
        <span
          className="absolute text-[13px] font-bold whitespace-nowrap tabular-nums"
          style={{ left: "100%", top: 0, height: barH, marginLeft: 8, display: "flex", alignItems: "center", color: "var(--ink)" }}
        >
          <Counter value={value} visible={visible} dur={d} />
        </span>
      </div>
    </div>
  );
});

function RaceStage({
  data,
  index,
  mode,
  stepMs,
  rows,
  onSelect,
  w,
  h,
  inView,
}: {
  data: RaceData;
  index: number;
  mode: "total" | "rolling";
  stepMs: number;
  rows: number;
  onSelect?: (e: RaceEntity) => void;
  w: number;
  h: number;
  inView: boolean;
}) {
  const reduce = usePrefersReducedMotion();
  const pick = useRef(onSelect);
  useLayoutEffect(() => {
    pick.current = onSelect;
  });
  const onPick = useCallback((e: RaceEntity) => pick.current?.(e), []);

  const nMonths = data.months.length;
  const m = Number.isFinite(index) ? Math.max(0, Math.min(nMonths - 1, Math.round(index))) : 0;

  // value of every entity at month m, the slot of each one (-1 = hidden) and the largest visible value
  const { vals, rank, max } = useMemo(() => {
    const n = data.entities.length;
    const vals = new Array<number>(n);
    for (let e = 0; e < n; e++) {
      const row = data.cum[e] ?? [];
      const now = row[m] ?? 0;
      // rolling: plays in the trailing 12 months; before month 12 that is everything so far
      const base = mode === "rolling" && m >= 12 ? (row[m - 12] ?? 0) : 0;
      vals[e] = Math.max(0, now - base);
    }
    const order = Array.from({ length: n }, (_, i) => i);
    order.sort((a, b) => vals[b] - vals[a] || (data.entities[a].key < data.entities[b].key ? -1 : 1));
    const rank = new Int16Array(n).fill(-1);
    for (let r = 0; r < Math.min(rows, n); r++) {
      if (vals[order[r]] > 0) rank[order[r]] = r;
    }
    const max = n > 0 && vals[order[0]] > 0 ? vals[order[0]] : 1;
    return { vals, rank, max };
  }, [data, m, mode, rows]);

  const d = reduce || stepMs <= 0 ? 0 : Math.max(250, stepMs);

  const rowH = h / rows;
  const barH = Math.max(8, Math.min(36, rowH - 6));
  const narrow = w < 480;
  const rankW = narrow ? 24 : 32;
  const nameW = Math.round(Math.max(88, Math.min(230, w * 0.28)));
  const valueW = 72;
  const barMax = Math.max(24, w - rankW - nameW - valueW);

  const ym = data.months[m] ?? "";
  const monthName = fmtMonthLong(ym).split(" de ")[0];
  const yearSize = Math.max(40, Math.min(128, h * 0.3, w * 0.22));

  return (
    <div
      role="group"
      aria-label={`Carrera de barras, ${fmtMonthLong(ym)}`}
      style={{
        position: "relative",
        width: w,
        height: h,
        overflow: "hidden",
        opacity: inView ? 1 : 0,
        transition: "opacity 600ms ease",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute right-2 bottom-0 text-right font-extrabold tabular-nums select-none"
        style={{ color: "var(--line)", lineHeight: 0.88, letterSpacing: "-0.03em" }}
      >
        <div style={{ fontSize: Math.max(14, yearSize * 0.3) }}>{monthName}</div>
        <div style={{ fontSize: yearSize }}>{ym.slice(0, 4)}</div>
      </div>
      {data.entities.map((ent, i) => {
        const r = rank[i];
        const visible = r >= 0;
        return (
          <RaceRow
            key={ent.key}
            ent={ent}
            colorIndex={i}
            rank={visible ? r : rows}
            visible={visible}
            value={visible ? vals[i] : 0}
            barW={visible ? Math.max(4, (vals[i] / max) * barMax) : 4}
            rowH={rowH}
            barH={barH}
            rankW={rankW}
            nameW={nameW}
            showSub={!narrow}
            d={d}
            clickable={!!onSelect}
            onPick={onPick}
          />
        );
      })}
    </div>
  );
}

export function BarRace({
  data,
  index,
  mode,
  stepMs,
  rows = 10,
  onSelect,
  minHeight,
  className,
}: {
  data: RaceData;
  index: number;
  mode: "total" | "rolling";
  /** time until the next index while playing (used as transition duration). 0 = jump (scrubbing) */
  stepMs: number;
  rows?: number;
  onSelect?: (e: RaceEntity) => void;
  minHeight?: number;
  className?: string;
}) {
  const nRows = Math.max(1, Math.floor(rows));
  const last = data.months.length - 1;
  const empty = last < 0 || !data.entities.some((_, e) => (data.cum[e]?.[last] ?? 0) > 0);
  if (empty) {
    return (
      <div
        className={`flex w-full items-center justify-center text-[13px] ${className ?? ""}`}
        style={{ minHeight: minHeight ?? 240, color: "var(--muted)" }}
      >
        Sin datos suficientes en este periodo
      </div>
    );
  }
  return (
    <ChartBox minHeight={minHeight ?? 360} className={className}>
      {({ w, h, inView }) => (
        <RaceStage data={data} index={index} mode={mode} stepMs={stepMs} rows={nRows} onSelect={onSelect} w={w} h={h} inView={inView} />
      )}
    </ChartBox>
  );
}

/* ─────────────────────────── TransportDock ─────────────────────────── */

const DOCK_MUTED = "color-mix(in srgb, var(--c-ink) 62%, transparent)";
const DOCK_TRACK = "color-mix(in srgb, var(--c-ink) 20%, transparent)";
const DOCK_CHIP = "color-mix(in srgb, var(--c-ink) 14%, transparent)";
const DOCK_W = "min(760px, calc(100vw - 2rem))";
const DOCK_W_COLLAPSED = "min(330px, calc(100vw - 2rem))";
const THUMB = 16;

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden>
      <path d="M8.5 5.8v12.4a.8.8 0 0 0 1.2.7l9.6-6.2a.8.8 0 0 0 0-1.4L9.7 5.1a.8.8 0 0 0-1.2.7z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4.2" height="14" rx="1.4" />
      <rect x="13.8" y="5" width="4.2" height="14" rx="1.4" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />
    </svg>
  );
}

const discStyle = { background: "var(--c-accent)", color: INK } as const;

export function TransportDock({
  months,
  cursor,
  playing,
  speed,
  onToggle,
  onSeek,
  onSpeed,
  onExit,
}: {
  months: string[];
  cursor: number | null;
  playing: boolean;
  speed: number;
  onToggle: () => void;
  onSeek: (i: number) => void;
  onSpeed: (s: number) => void;
  onExit: () => void;
}) {
  const n = months.length;
  const expanded = cursor !== null;
  const scrubRef = useRef<HTMLDivElement>(null);
  const [scrubW, setScrubW] = useState(0);
  const [kbFocus, setKbFocus] = useState(false);

  useEffect(() => {
    const el = scrubRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScrubW(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [n > 0]);

  // January of every year, thinned so that labels never touch
  const ticks = useMemo(() => {
    const all: { i: number; year: string }[] = [];
    months.forEach((ym, i) => {
      if (ym.endsWith("-01")) all.push({ i, year: ym.slice(0, 4) });
    });
    const per = n > 1 ? Math.max(0, scrubW - THUMB) / (n - 1) : 0;
    let lastX = -Infinity;
    return all.map((t) => {
      const x = THUMB / 2 + t.i * per;
      const label = scrubW > 0 && x - lastX >= 48;
      if (label) lastX = x;
      return { ...t, label };
    });
  }, [months, n, scrubW]);

  if (n === 0) return null;

  const cur = cursor === null ? 0 : Math.max(0, Math.min(n - 1, cursor));
  const frac = n > 1 ? cur / (n - 1) : 0;
  const at = `calc(${THUMB / 2}px + ${frac} * (100% - ${THUMB}px))`;
  const posOf = (i: number) => `calc(${THUMB / 2}px + ${n > 1 ? i / (n - 1) : 0} * (100% - ${THUMB}px))`;
  const range = `${fmtMonthShort(months[0])} → ${fmtMonthShort(months[n - 1])}`;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 flex justify-center"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div
        className="pointer-events-auto relative overflow-hidden"
        style={{
          width: expanded ? DOCK_W : DOCK_W_COLLAPSED,
          height: expanded ? 68 : 56,
          borderRadius: 999,
          background: "var(--c-bg)",
          color: "var(--c-ink)",
          boxShadow: "0 14px 36px -12px rgba(30, 23, 40, 0.5)",
          transition: "width 450ms cubic-bezier(0.2, 0.8, 0.2, 1), height 450ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {/* Collapsed: the whole pill is one play button */}
        <button
          type="button"
          onClick={onToggle}
          aria-label="Reproducir mi historia"
          inert={expanded}
          aria-hidden={expanded}
          className="absolute top-0 left-1/2 flex h-full cursor-pointer items-center gap-3 text-left"
          style={{
            width: DOCK_W_COLLAPSED,
            paddingLeft: 8,
            paddingRight: 20,
            transform: "translateX(-50%)",
            opacity: expanded ? 0 : 1,
            pointerEvents: expanded ? "none" : "auto",
            transition: "opacity 220ms ease",
          }}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full" style={discStyle}>
            <PlayIcon />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[14px] font-bold whitespace-nowrap">Reproducir mi historia</span>
            <span className="block text-[11px] whitespace-nowrap tabular-nums" style={{ color: DOCK_MUTED }}>
              {range}
            </span>
          </span>
        </button>

        {/* Expanded: player */}
        <div
          inert={!expanded}
          aria-hidden={!expanded}
          onKeyDown={(e) => {
            // buttons already toggle on Space; the (hidden) range input does not
            if (e.key === " " && (e.target as HTMLElement).tagName === "INPUT") {
              e.preventDefault();
              onToggle();
            }
          }}
          className="absolute top-0 left-1/2 flex h-full items-center gap-3"
          style={{
            width: DOCK_W,
            paddingLeft: 12,
            paddingRight: 14,
            transform: "translateX(-50%)",
            opacity: expanded ? 1 : 0,
            pointerEvents: expanded ? "auto" : "none",
            transition: `opacity 260ms ease ${expanded ? 140 : 0}ms`,
          }}
        >
          <button
            type="button"
            onClick={onToggle}
            aria-label={playing ? "Pausar" : "Reproducir"}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform duration-200 hover:scale-105 active:scale-95"
            style={discStyle}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>

          <span className="w-[76px] shrink-0 text-[15px] font-bold whitespace-nowrap tabular-nums" aria-live="off">
            {fmtMonthShort(months[cur])}
          </span>

          {/* Scrubber: custom visuals under an invisible but real range input */}
          <div ref={scrubRef} className="relative h-11 min-w-0 flex-1">
            <div className="absolute inset-x-0 rounded-full" style={{ top: 17, height: 6, background: DOCK_TRACK }} />
            <div
              className="absolute left-0 rounded-full"
              style={{ top: 17, height: 6, width: at, background: "var(--c-accent)", transition: "width 180ms linear" }}
            />
            <div
              className="absolute rounded-full"
              style={{
                top: 20 - THUMB / 2,
                width: THUMB,
                height: THUMB,
                left: at,
                marginLeft: -THUMB / 2,
                background: "var(--c-ink)",
                outline: kbFocus ? "2px solid var(--c-accent)" : "none",
                outlineOffset: 2,
                transition: "left 180ms linear",
              }}
            />
            {ticks.map((t) => (
              <span key={t.i} className="absolute" style={{ left: posOf(t.i), top: 28, height: 4, width: 1, background: DOCK_TRACK }} />
            ))}
            {ticks.map(
              (t) =>
                t.label && (
                  <span
                    key={`l${t.i}`}
                    className="absolute text-[11px] leading-none tabular-nums"
                    style={{ left: posOf(t.i), top: 34, transform: "translateX(-50%)", color: DOCK_MUTED }}
                  >
                    {t.year}
                  </span>
                )
            )}
            <input
              type="range"
              min={0}
              max={Math.max(0, n - 1)}
              step={1}
              value={cur}
              onChange={(e) => onSeek(Number(e.target.value))}
              onFocus={(e) => setKbFocus(e.currentTarget.matches(":focus-visible"))}
              onBlur={() => setKbFocus(false)}
              aria-label="Línea de tiempo"
              aria-valuetext={fmtMonthLong(months[cur])}
              className="absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>

          <button
            type="button"
            onClick={() => onSpeed(speed)}
            aria-label={`Velocidad ${speed}×, cambiar`}
            className="h-9 min-w-12 shrink-0 cursor-pointer rounded-full px-3 text-[13px] font-bold tabular-nums transition-transform duration-200 hover:scale-105 active:scale-95"
            style={{ background: DOCK_CHIP }}
          >
            {speed}×
          </button>
          <button
            type="button"
            onClick={onExit}
            aria-label="Salir de la máquina del tiempo"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform duration-200 hover:scale-105 active:scale-95"
            style={{ background: DOCK_CHIP }}
          >
            <CloseIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
