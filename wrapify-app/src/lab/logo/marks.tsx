"use client";

import { ReactNode, useEffect, useState } from "react";

/*
 * Twenty logo marks for Wrapify, all drawn on the same 32×32 grid.
 *
 * Rules every mark follows:
 * - geometry sits on 2-unit steps, so at 16 px every edge lands on a whole pixel;
 * - bars are at least 4 units (2 px at favicon size), gaps at least 2 units;
 * - the rest pose (no animation) is the static logo / favicon, so it has to carry
 *   the identity on its own — the motion is a bonus, never the only idea;
 * - motion is SMIL (`<animate>`), so it morphs real geometry (rounded ends stay round)
 *   and runs the same in every browser. Only "Envuelto" needs a JS clock.
 */

/* ── Palette ── */

export const INK = "#1e1728";
export const CREAM = "#f6f0e4";
/** Ink for details sitting on a coloured shape: never swapped to cream in a dark favicon. */
const INK_FIXED = "#1e1727";

export type Pal = { k: string; w: string; co: string; li: string; mono: boolean };

export function pal(dark = false, mono = false): Pal {
  const k = dark ? CREAM : INK;
  const w = dark ? "#221b2e" : "#fffdf8";
  return mono ? { k, w, co: k, li: k, mono } : { k, w, co: "#ff7d5c", li: "#ab96ff", mono };
}

/* ── SMIL helpers ── */

const EASE = "0.45 0 0.55 1";
const SNAP = "0.2 0.85 0.3 1";
const LIN = "0 0 1 1";
const UP = "0.2 0.75 0.4 1";
const DOWN = "0.6 0 0.8 0.25";

type Val = number | string;
type Track = { v: Val[]; t: number[] };
type Key = [number, Val];

const r4 = (x: number) => +x.toFixed(4);
const fmt = (x: Val) => (typeof x === "number" ? String(+x.toFixed(2)) : x);
const even = (v: Val[]): Track => ({ v, t: v.map((_, i) => i / (v.length - 1)) });
const keys = (k: Key[]): Track => ({ v: k.map((x) => x[1]), t: k.map((x) => x[0]) });

type AnimProps = { tr: Track; dur: number; begin?: number; ease?: string | string[]; discrete?: boolean };

function timing({ tr, dur, begin = 0, ease = EASE, discrete }: AnimProps) {
  const n = tr.v.length;
  const splines = Array.isArray(ease) ? ease : Array.from({ length: n - 1 }, () => ease);
  return {
    values: tr.v.map(fmt).join(";"),
    keyTimes: tr.t.map(r4).join(";"),
    dur: `${dur}s`,
    begin: `${begin}s`,
    repeatCount: "indefinite",
    ...(discrete ? { calcMode: "discrete" } : { calcMode: "spline", keySplines: splines.join(";") }),
  };
}

/** Animates one attribute through a track. */
function A({ at, ...rest }: AnimProps & { at: string }) {
  return <animate attributeName={at} {...timing(rest)} />;
}

/** Animates the transform of its parent (rotate values are "deg cx cy", scale values "sx sy"). */
function AT({ type, ...rest }: AnimProps & { type: "rotate" | "scale" | "translate" }) {
  return <animateTransform attributeName="transform" type={type} {...timing(rest)} />;
}

/** Applies a scale animation around (cx, cy). */
function Around({ cx, cy, anim, children }: { cx: number; cy: number; anim?: ReactNode; children: ReactNode }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <g>
        {anim}
        <g transform={`translate(${-cx} ${-cy})`}>{children}</g>
      </g>
    </g>
  );
}

type BarProps = {
  x: number;
  w: number;
  /** anchor line: bottom edge, top edge or centre, depending on `align` */
  at: number;
  h: number;
  fill: string;
  align?: "bottom" | "center" | "top";
  on?: boolean;
  hs?: Track;
  dur?: number;
  begin?: number;
  ease?: string | string[];
  opacity?: number;
  stroke?: string;
  sw?: number;
  children?: ReactNode;
};

/** A pill whose height can be animated while it stays anchored. */
function Bar({ x, w, at, h, fill, align = "bottom", on, hs, dur = 1.6, begin = 0, ease, opacity, stroke, sw, children }: BarProps) {
  const y = (hh: number) => (align === "bottom" ? at - hh : align === "top" ? at : at - hh / 2);
  return (
    <rect x={x} y={y(h)} width={w} height={h} rx={w / 2} fill={fill} opacity={opacity} stroke={stroke} strokeWidth={sw}>
      {on && hs && (
        <>
          {align !== "top" && <A at="y" tr={{ v: (hs.v as number[]).map(y), t: hs.t }} dur={dur} begin={begin} ease={ease} />}
          <A at="height" tr={hs} dur={dur} begin={begin} ease={ease} />
        </>
      )}
      {on && children}
    </rect>
  );
}

type MP = { p: Pal; on: boolean };

/* ───────────────────────── Afinados ───────────────────────── */

function Pulso({ p, on }: MP) {
  const B = [
    { x: 2, h: 12, hs: [12, 20, 8, 22, 10, 12], d: 1.9 },
    { x: 10, h: 24, hs: [24, 12, 26, 16, 22, 24], d: 1.6 },
    { x: 18, h: 16, hs: [16, 26, 10, 20, 8, 16], d: 2.1 },
    { x: 26, h: 20, hs: [20, 8, 18, 12, 24, 20], d: 1.75 },
  ];
  return (
    <>
      {B.map((b) => (
        <Bar key={b.x} x={b.x} w={4} at={28} h={b.h} fill={p.k} on={on} hs={even(b.hs)} dur={b.d} ease="0.33 0 0.25 1" />
      ))}
    </>
  );
}

function Onda({ p, on }: MP) {
  const H = [10, 20, 28, 14, 22];
  const D = 3.2;
  return (
    <>
      {H.map((h, i) => {
        const t0 = 0.08 + i * 0.15; // when the playhead reaches this bar
        const peak = Math.min(30, h * 1.22);
        return (
          <Bar
            key={i}
            x={2 + i * 6}
            w={4}
            at={16}
            h={h}
            align="center"
            fill={i < 2 ? p.co : p.k}
            on={on}
            hs={keys([[0, h], [t0, h], [t0 + 0.05, peak], [t0 + 0.15, h], [1, h]])}
            dur={D}
          >
            <A at="fill" tr={keys([[0, p.k], [t0, p.co], [0.9, p.k]])} dur={D} discrete />
          </Bar>
        );
      })}
    </>
  );
}

function Eco({ p, on }: MP) {
  const B = [
    { x: 3, h: 14, hs: [14, 22, 10, 18, 14], d: 1.5 },
    { x: 13, h: 24, hs: [24, 12, 22, 16, 24], d: 1.3 },
    { x: 23, h: 18, hs: [18, 8, 24, 12, 18], d: 1.7 },
  ];
  return (
    <>
      {B.map((b) => (
        <Bar key={`e${b.x}`} x={b.x + 2} w={6} at={29} h={b.h} fill={p.co} opacity={p.mono ? 0.3 : undefined} on={on} hs={even(b.hs)} dur={b.d} begin={0.14} />
      ))}
      {B.map((b) => (
        <Bar key={b.x} x={b.x} w={6} at={27} h={b.h} fill={p.k} on={on} hs={even(b.hs)} dur={b.d} />
      ))}
    </>
  );
}

/* ───────────────────────── Monograma W ───────────────────────── */

function DobleUve({ p, on }: MP) {
  // five faders sitting on the five vertices of a W
  const B = [
    { y: 3, h: 16, ys: [10, 2, 14] },
    { y: 13, h: 16, ys: [4, 15, 8] },
    { y: 6, h: 14, ys: [14, 4, 12] },
    { y: 13, h: 16, ys: [6, 12, 3] },
    { y: 3, h: 16, ys: [12, 7, 15] },
  ];
  return (
    <>
      {B.map((b, i) => (
        <rect key={i} x={2 + i * 6} y={b.y} width={4} height={b.h} rx={2} fill={p.k}>
          {on && (
            <A
              at="y"
              tr={keys([[0, b.y], [0.14, b.ys[0]], [0.28, b.ys[1]], [0.42, b.ys[2]], [0.58, b.y], [1, b.y]])}
              dur={4}
              begin={i * 0.05}
              ease={[EASE, EASE, EASE, SNAP, LIN]}
            />
          )}
        </rect>
      ))}
    </>
  );
}

function Pliegue({ p, on }: MP) {
  const OPEN = [4, 10, 16, 22, 28];
  const SHUT = [9, 12.5, 16, 19.5, 23];
  const Y = [6, 26, 12, 26, 6];
  const D = 2.8;
  const tr = (i: number) => keys([[0, OPEN[i]], [0.18, OPEN[i]], [0.5, SHUT[i]], [0.62, SHUT[i]], [1, OPEN[i]]]);
  const seg = (i: number, color: string, opacity?: number) => (
    <line key={i} x1={OPEN[i]} y1={Y[i]} x2={OPEN[i + 1]} y2={Y[i + 1]} stroke={color} strokeWidth={6} strokeLinecap="round" opacity={opacity}>
      {on && (
        <>
          <A at="x1" tr={tr(i)} dur={D} />
          <A at="x2" tr={tr(i + 1)} dur={D} />
        </>
      )}
    </line>
  );
  const back = p.mono ? 0.45 : undefined;
  // the back of the ribbon goes first, the front face covers every fold
  return (
    <>
      {seg(1, p.co, back)}
      {seg(3, p.co, back)}
      {seg(0, p.k)}
      {seg(2, p.k)}
    </>
  );
}

const serp = (a: number, m: number, b: number) =>
  `M4 ${a}V23A4 4 0 0 0 12 23V${m + 4}A4 4 0 0 1 20 ${m + 4}V23A4 4 0 0 0 28 23V${b}`;

function Serpentina({ p, on }: MP) {
  const S: [number, number, number][] = [
    [5, 9, 5],
    [11, 5, 9],
    [4, 13, 4],
    [9, 7, 12],
    [5, 9, 5],
  ];
  return (
    <path d={serp(5, 9, 5)} fill="none" stroke={p.k} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
      {on && <A at="d" tr={even(S.map((s) => serp(...s)))} dur={2.6} />}
    </path>
  );
}

/* ───────────────────────── Música ───────────────────────── */

function Play({ p, on }: MP) {
  const B = [
    [26, 12, 22, 8, 18, 26, 26],
    [16, 24, 10, 26, 12, 16, 16],
    [6, 18, 26, 14, 24, 6, 6],
  ];
  const T = [0, 0.1, 0.2, 0.3, 0.4, 0.52, 1];
  return (
    <>
      {B.map((hs, i) => (
        <Bar
          key={i}
          x={5 + i * 8}
          w={6}
          at={16}
          align="center"
          h={hs[0]}
          fill={i === 2 ? p.co : p.k}
          on={on}
          hs={{ v: hs, t: T }}
          dur={3.6}
          begin={i * 0.04}
          ease={[EASE, EASE, EASE, EASE, SNAP, LIN]}
        />
      ))}
    </>
  );
}

function Corchea({ p, on }: MP) {
  const s1 = [7, 3, 9, 5, 7];
  const s2 = [4, 8, 2, 7, 4];
  const D = 1.8;
  return (
    <>
      <ellipse cx={8} cy={25} rx={5} ry={3.8} transform="rotate(-22 8 25)" fill={p.k} />
      <ellipse cx={22} cy={22} rx={5} ry={3.8} transform="rotate(-22 22 22)" fill={p.k} />
      <rect x={9} y={7} width={4} height={18} rx={2} fill={p.k}>
        {on && (
          <>
            <A at="y" tr={even(s1)} dur={D} />
            <A at="height" tr={even(s1.map((s) => 25 - s))} dur={D} />
          </>
        )}
      </rect>
      <rect x={23} y={4} width={4} height={18} rx={2} fill={p.k}>
        {on && (
          <>
            <A at="y" tr={even(s2)} dur={D} />
            <A at="height" tr={even(s2.map((s) => 22 - s))} dur={D} />
          </>
        )}
      </rect>
      <line x1={11.5} y1={9} x2={24.5} y2={6} stroke={p.k} strokeWidth={5} strokeLinecap="round">
        {on && (
          <>
            <A at="y1" tr={even(s1.map((s) => s + 2))} dur={D} />
            <A at="y2" tr={even(s2.map((s) => s + 2))} dur={D} />
          </>
        )}
      </line>
    </>
  );
}

function Cascos({ p, on }: MP) {
  return (
    <>
      <path d="M5.5 17A10.5 10.5 0 0 1 26.5 17" fill="none" stroke={p.k} strokeWidth={4} strokeLinecap="round" />
      <rect x={2} y={14} width={7} height={14} rx={3.5} fill={p.k} />
      <rect x={23} y={14} width={7} height={14} rx={3.5} fill={p.k} />
      <Bar x={11} w={4} at={21} align="center" h={10} fill={p.co} on={on} hs={even([10, 14, 6, 12, 10])} dur={1.2} />
      <Bar x={17} w={4} at={21} align="center" h={14} fill={p.co} on={on} hs={even([14, 6, 13, 8, 14])} dur={1.45} />
    </>
  );
}

function Karaoke({ p, on }: MP) {
  const X = [8, 16, 24];
  const TOP = [17, 11, 19];
  const H = TOP.map((t) => 29 - t);
  const R = 3;
  const DIP = 2;
  const D = 2.4;
  const route = [0, 1, 2, 1, 0]; // bar the ball lands on at t = k/4

  const cx = keys(route.map((b, k) => [k / 4, X[b]] as Key));
  const cyK: Key[] = [];
  const ease: string[] = [];
  route.forEach((b, k) => {
    cyK.push([k / 4, TOP[b] - R + DIP]);
    if (k < 4) {
      cyK.push([k / 4 + 0.125, 4]);
      ease.push(UP, DOWN);
    }
  });
  const contacts = route.map((_, k) => k / 4);
  const squash = (rest: number, hit: number): Track => {
    const k: Key[] = [];
    contacts.forEach((c) => {
      if (c > 0) k.push([c - 0.04, rest]);
      k.push([c, hit]);
      if (c < 1) k.push([c + 0.05, rest]);
    });
    return keys(k);
  };
  const dip = (h: number, cs: number[]): Track => {
    const k: Key[] = [];
    if (!cs.includes(0)) k.push([0, h]);
    cs.forEach((c) => {
      if (c > 0) k.push([c - 0.04, h]);
      k.push([c, h - DIP]);
      if (c < 1) k.push([c + 0.06, h]);
    });
    if (!cs.includes(1)) k.push([1, h]);
    return keys(k.sort((a, b) => a[0] - b[0]));
  };
  const hits = [[0, 1], [0.25, 0.75], [0.5]];

  return (
    <>
      {X.map((x, i) => (
        <Bar key={i} x={x - 3} w={6} at={29} h={H[i]} fill={p.k} on={on} hs={dip(H[i], hits[i])} dur={D} />
      ))}
      <ellipse cx={16} cy={TOP[1] - R} rx={R} ry={R} fill={p.co}>
        {on && (
          <>
            <A at="cx" tr={cx} dur={D} ease={LIN} />
            <A at="cy" tr={keys(cyK)} dur={D} ease={ease} />
            <A at="rx" tr={squash(R, 3.7)} dur={D} />
            <A at="ry" tr={squash(R, 2.4)} dur={D} />
          </>
        )}
      </ellipse>
    </>
  );
}

/* ───────────────────────── Envuelto ───────────────────────── */

function Regalo({ p, on }: MP) {
  const T = [0, 0.12, 0.22, 0.32, 0.42, 0.52, 0.6, 1];
  const D = 4.4;
  const B = [
    { x: 5, hs: [16, 16, 24, 10, 20, 12, 16, 16], c: p.co },
    { x: 13, hs: [16, 16, 10, 24, 14, 22, 16, 16], c: p.k },
    { x: 21, hs: [16, 16, 18, 12, 24, 8, 16, 16], c: p.co },
  ];
  return (
    <>
      {B.map((b) => (
        <Bar key={b.x} x={b.x} w={6} at={29} h={16} fill={b.c} on={on} hs={{ v: b.hs, t: T }} dur={D} />
      ))}
      <Around
        cx={16}
        cy={11}
        anim={on && <AT type="scale" tr={keys([[0, "1"], [0.1, "0"], [0.62, "0"], [0.7, "1.2"], [0.76, "1"], [1, "1"]])} dur={D} />}
      >
        <ellipse cx={12} cy={8.5} rx={4.2} ry={2.6} transform="rotate(-28 12 8.5)" fill={p.k} />
        <ellipse cx={20} cy={8.5} rx={4.2} ry={2.6} transform="rotate(28 20 8.5)" fill={p.k} />
        <circle cx={16} cy={10.5} r={2.4} fill={p.k} />
      </Around>
    </>
  );
}

function Lazo({ p, on }: MP) {
  const D = 1.3;
  return (
    <>
      <path d="M4 8L14 16L4 24Z" fill={p.co} stroke={p.co} strokeWidth={4} strokeLinejoin="round">
        {on && <AT type="rotate" tr={even([0, -8, 4, -5, 0].map((a) => `${a} 14 16`))} dur={D} />}
      </path>
      <path d="M28 8L18 16L28 24Z" fill={p.co} stroke={p.co} strokeWidth={4} strokeLinejoin="round">
        {on && <AT type="rotate" tr={even([0, 8, -4, 5, 0].map((a) => `${a} 18 16`))} dur={D} />}
      </path>
      <Bar
        x={12}
        w={8}
        at={16}
        align="center"
        h={12}
        fill={p.mono ? p.w : p.k}
        stroke={p.mono ? p.k : undefined}
        sw={p.mono ? 2.5 : undefined}
        on={on}
        hs={even([12, 18, 9, 15, 12])}
        dur={D}
      />
    </>
  );
}

function Caramelo({ p, on }: MP) {
  const D = 2.8;
  const twist = (from: number) =>
    on && <AT type="scale" tr={keys([[0, "1 1"], [from, "1 1"], [from + 0.08, "0.85 0.5"], [from + 0.18, "1 1"], [1, "1 1"]])} dur={D} />;
  const inner = [
    { x: 11, hs: [6, 9, 4, 8, 6], d: 1.2 },
    { x: 15, hs: [10, 5, 10, 7, 10], d: 1.05 },
    { x: 19, hs: [7, 10, 5, 9, 7], d: 1.35 },
  ];
  return (
    <g>
      {on && (
        <AT
          type="rotate"
          tr={keys([[0, "0 16 16"], [0.08, "-12 16 16"], [0.18, "9 16 16"], [0.28, "-5 16 16"], [0.38, "2 16 16"], [0.46, "0 16 16"], [1, "0 16 16"]])}
          dur={D}
        />
      )}
      <Around cx={10} cy={16} anim={twist(0.5)}>
        <path d="M10 16L3 10L3 22Z" fill={p.co} stroke={p.co} strokeWidth={3} strokeLinejoin="round" />
      </Around>
      <Around cx={22} cy={16} anim={twist(0.62)}>
        <path d="M22 16L29 10L29 22Z" fill={p.co} stroke={p.co} strokeWidth={3} strokeLinejoin="round" />
      </Around>
      <circle cx={16} cy={16} r={8.5} fill={p.co} />
      {inner.map((b) => (
        <Bar key={b.x} x={b.x} w={2} at={16} align="center" h={b.hs[0]} fill={p.w} on={on} hs={even(b.hs)} dur={b.d} />
      ))}
    </g>
  );
}

function useClock(on: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      setT((now - t0) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  return on ? t : 0;
}

function Envuelto({ p, on }: MP) {
  const t = useClock(on);
  const N = 8;
  const R = 12;
  const W0 = 5;
  const H = [24, 16, 20, 12, 22, 14, 18, 26];
  const base = Math.PI / 8 + (t / 7) * Math.PI * 2;
  const bars = H.map((h0, i) => {
    const a = base + (i * Math.PI * 2) / N;
    const c = Math.cos(a);
    const h = on ? h0 * (0.84 + 0.16 * Math.sin(t * 3.3 + i * 1.9)) : h0;
    return { i, x: 16 + R * Math.sin(a), w: Math.max(0.4, W0 * Math.abs(c)), h, c };
  })
    .filter((b) => on || b.c > 0.05)
    .sort((a, b) => a.c - b.c);
  return (
    <>
      {bars.map((b) => (
        <rect
          key={b.i}
          x={b.x - b.w / 2}
          y={16 - b.h / 2}
          width={b.w}
          height={b.h}
          rx={b.w / 2}
          fill={b.i === 0 ? p.co : p.k}
          opacity={b.c > 0 ? undefined : 0.18}
        />
      ))}
    </>
  );
}

/* ───────────────────────── Datos ───────────────────────── */

function Palotes({ p, on }: MP) {
  const D = 3.4;
  return (
    <g>
      {on && <A at="opacity" tr={keys([[0, 1], [0.82, 1], [0.9, 0], [1, 0]])} dur={D} />}
      {[0, 1, 2, 3].map((i) => {
        const s = 0.04 + i * 0.09;
        return (
          <Bar
            key={i}
            x={2 + i * 8}
            w={4}
            at={28}
            h={22}
            fill={p.k}
            on={on}
            hs={keys([[0, 0], [s, 0], [s + 0.07, 22], [0.92, 22], [0.93, 0], [1, 0]])}
            dur={D}
            ease={[LIN, SNAP, LIN, LIN, LIN]}
          />
        );
      })}
      <line x1={2.5} y1={23.5} x2={29.5} y2={9.5} stroke={p.co} strokeWidth={4} strokeLinecap="round">
        {on && (
          <>
            <A at="x2" tr={keys([[0, 2.5], [0.42, 2.5], [0.53, 29.5], [1, 29.5]])} dur={D} ease={[LIN, SNAP, LIN]} />
            <A at="y2" tr={keys([[0, 23.5], [0.42, 23.5], [0.53, 9.5], [1, 9.5]])} dur={D} ease={[LIN, SNAP, LIN]} />
            <A at="opacity" tr={keys([[0, 0], [0.42, 1]])} dur={D} discrete />
          </>
        )}
      </line>
    </g>
  );
}

function Ranking({ p, on }: MP) {
  const T = [0, 0.24, 0.32, 0.56, 0.64, 0.88, 0.96, 1];
  const Y = [5, 13, 21];
  const B = [
    { c: p.k, r: [0, 0, 1, 1, 2, 2, 0, 0], l: [24, 24, 20, 20, 15, 15, 24, 24] },
    { c: p.co, r: [1, 1, 0, 0, 1, 1, 1, 1], l: [17, 17, 25, 25, 21, 21, 17, 17] },
    { c: p.li, r: [2, 2, 2, 2, 0, 0, 2, 2], l: [10, 10, 12, 12, 24, 24, 10, 10] },
  ];
  return (
    <>
      {B.map((b, i) => (
        <rect key={i} x={4} y={Y[b.r[0]]} width={b.l[0]} height={6} rx={3} fill={b.c}>
          {on && (
            <>
              <A at="y" tr={{ v: b.r.map((r) => Y[r]), t: T }} dur={6} />
              <A at="width" tr={{ v: b.l, t: T }} dur={6} />
            </>
          )}
        </rect>
      ))}
    </>
  );
}

function Reloj({ p, on }: MP) {
  const Y = [2, 8, 14, 20, 26];
  const E = [24, 16, 4, 16, 24];
  const D = 5;
  const sand: Key[][] = [
    [[0, 24], [0.05, 24], [0.32, 0], [1, 0]],
    [[0, 16], [0.3, 16], [0.6, 0], [1, 0]],
    [[0, 4], [0.6, 4], [0.64, 0], [1, 0]],
    [[0, 0], [0.38, 0], [0.64, 16], [1, 16]],
    [[0, 0], [0.06, 0], [0.38, 24], [1, 24]],
  ];
  return (
    <g>
      {on && <AT type="rotate" tr={keys([[0, "0 16 16"], [0.7, "0 16 16"], [0.86, "180 16 16"], [1, "180 16 16"]])} dur={D} />}
      {E.map((e, i) => (
        <rect key={`e${i}`} x={16 - e / 2} y={Y[i]} width={e} height={4} rx={2} fill={p.k} opacity={p.mono ? 0.3 : undefined} />
      ))}
      {sand.map((s, i) => {
        const rest = s[0][1] as number;
        return (
          <rect key={i} x={16 - rest / 2} y={Y[i]} width={rest} height={4} rx={2} fill={p.co}>
            {on && (
              <>
                <A at="width" tr={keys(s)} dur={D} />
                <A at="x" tr={keys(s.map(([t, v]) => [t, 16 - (v as number) / 2]))} dur={D} />
              </>
            )}
          </rect>
        );
      })}
    </g>
  );
}

/* ───────────────────────── Con carácter ───────────────────────── */

function Latido({ p, on }: MP) {
  // [top, height] of five strips that trace a heart
  const S = [
    [5, 12],
    [4, 19],
    [11, 18],
    [4, 19],
    [5, 12],
  ];
  const D = 1.3;
  return (
    <Around
      cx={16}
      cy={17}
      anim={on && <AT type="scale" tr={keys([[0, "1"], [0.12, "1.09"], [0.24, "1"], [0.34, "1.05"], [0.48, "1"], [1, "1"]])} dur={D} />}
    >
      {S.map(([y, h], i) => {
        const lag = Math.abs(i - 2) * 0.035;
        return (
          <Bar
            key={i}
            x={2 + i * 6}
            w={4}
            at={y + h / 2}
            align="center"
            h={h}
            fill={p.co}
            on={on}
            hs={keys([[0, h], [0.08 + lag, h * 1.12], [0.2 + lag, h], [0.3 + lag, h * 1.06], [0.44 + lag, h], [1, h]])}
            dur={D}
          />
        );
      })}
    </Around>
  );
}

function Cantante({ p, on }: MP) {
  const mouth = [
    [6, 9, 4, 8, 6],
    [11, 13, 6, 12, 11],
    [11, 12, 7, 13, 11],
    [6, 8, 4, 9, 6],
  ];
  return (
    <>
      {[8, 20].map((x) => (
        <Bar key={x} x={x} w={4} at={7.5} align="center" h={7} fill={p.k} on={on} hs={keys([[0, 7], [0.9, 7], [0.93, 1], [0.96, 7], [1, 7]])} dur={3.4} />
      ))}
      {mouth.map((hs, i) => (
        <Bar key={i} x={5 + i * 6} w={4} at={15} align="top" h={hs[0]} fill={p.co} on={on} hs={even(hs)} dur={1.5} begin={i * 0.06} />
      ))}
    </>
  );
}

/* ───────────────────────── Icono de app ───────────────────────── */

function Pastilla({ p, on }: MP) {
  const bar = p.mono ? p.w : INK_FIXED;
  const B = [
    { x: 8, hs: [10, 16, 7, 13, 10], d: 1.3 },
    { x: 14, hs: [16, 8, 18, 11, 16], d: 1.1 },
    { x: 20, hs: [12, 18, 9, 15, 12], d: 1.5 },
  ];
  return (
    <>
      <rect x={1} y={1} width={30} height={30} rx={9} fill={p.mono ? p.k : p.co} />
      {B.map((b) => (
        <Bar key={b.x} x={b.x} w={4} at={16} align="center" h={b.hs[0]} fill={bar} on={on} hs={even(b.hs)} dur={b.d} />
      ))}
    </>
  );
}

/* ── Catalogue ── */

export type LogoDef = {
  id: string;
  n: string;
  name: string;
  family: string;
  concept: string;
  Mark: (props: MP) => ReactNode;
};

const RAW: Omit<LogoDef, "n" | "id">[] = [
  {
    name: "Pulso",
    family: "Afinados",
    concept:
      "El de ahora, afinado: cuatro barras en vez de cinco, una silueta quieta que se reconoce (baja, alta, media, media-alta) y cada barra con su propio ritmo, para que suene a música y no a «cargando…».",
    Mark: Pulso,
  },
  {
    name: "Onda",
    family: "Afinados",
    concept:
      "Una nota de voz: la forma de onda no se mueve, lo que avanza es la reproducción, que va tiñendo las barras de coral. En estático se queda a medio escuchar.",
    Mark: Onda,
  },
  {
    name: "Eco",
    family: "Afinados",
    concept:
      "Tres barras con una copia coral que llega un instante tarde, como un eco o una risografía mal registrada. Al moverse dejan estela de color.",
    Mark: Eco,
  },
  {
    name: "Doble uve",
    family: "Monograma W",
    concept: "Cinco faders de mesa de mezclas que se mueven sueltos y, de golpe, se colocan en los cinco vértices de una W.",
    Mark: DobleUve,
  },
  {
    name: "Pliegue",
    family: "Monograma W",
    concept: "Una cinta plegada en W: cara delantera en tinta, trasera en coral. Se cierra y se abre como un acordeón.",
    Mark: Pliegue,
  },
  {
    name: "Serpentina",
    family: "Monograma W",
    concept: "Una sola línea que sube y baja como un ecualizador y que, de lejos, es una w minúscula. Tu historial como un hilo continuo.",
    Mark: Serpentina,
  },
  {
    name: "Play",
    family: "Música",
    concept:
      "Tres barras que bailan y se ordenan en un botón de play, con el punto coral como punta. Engancha con el «dale al play» de la máquina del tiempo.",
    Mark: Play,
  },
  {
    name: "Corchea",
    family: "Música",
    concept: "Dos barras del ecualizador unidas por la viga: una corchea doble. Cuando botan, la viga se inclina con ellas.",
    Mark: Corchea,
  },
  {
    name: "Cascos",
    family: "Música",
    concept: "Los auriculares son las barras de los extremos y la diadema las une; dentro, el ecualizador suena en coral.",
    Mark: Cascos,
  },
  {
    name: "Karaoke",
    family: "Música",
    concept: "La pelotita del karaoke salta de barra en barra y las hunde al caer.",
    Mark: Karaoke,
  },
  {
    name: "Regalo",
    family: "Envuelto",
    concept:
      "Las barras bailan, se igualan en una caja y aparece el lazo: tu música, envuelta. Es el nombre de la app contado en cuatro segundos.",
    Mark: Regalo,
  },
  {
    name: "Lazo",
    family: "Envuelto",
    concept: "Una pajarita: dos lazos coral y un nudo que es una barra del ecualizador latiendo. Los lazos son también dos play enfrentados.",
    Mark: Lazo,
  },
  {
    name: "Caramelo",
    family: "Envuelto",
    concept: "Un caramelo envuelto con el ecualizador dentro. Se menea y retuerce las puntas. El más dulce y el más raro de los veinte.",
    Mark: Caramelo,
  },
  {
    name: "Envuelto",
    family: "Envuelto",
    concept: "Las barras giran alrededor de un cilindro, como la etiqueta de una lata. La barra coral es la que deja ver la vuelta.",
    Mark: Envuelto,
  },
  {
    name: "Palotes",
    family: "Datos",
    concept: "Cuatro palotes y el tachón: contar de cinco en cinco, como se cuentan las reproducciones. Se dibuja, se borra y vuelve a contar.",
    Mark: Palotes,
  },
  {
    name: "Ranking",
    family: "Datos",
    concept: "Tres barras horizontales que se adelantan unas a otras: la carrera del ranking metida en 32 píxeles.",
    Mark: Ranking,
  },
  {
    name: "Reloj de arena",
    family: "Datos",
    concept: "Un reloj de arena hecho de barras: la arena coral cae y el reloj se da la vuelta. Tu historia contada en el tiempo.",
    Mark: Reloj,
  },
  {
    name: "Latido",
    family: "Con carácter",
    concept: "Un corazón cortado en cinco barras que late de dentro hacia fuera: tus canciones de siempre.",
    Mark: Latido,
  },
  {
    name: "Cantante",
    family: "Con carácter",
    concept: "Una carita: los ojos son barras y la boca es un ecualizador que canta. De vez en cuando parpadea.",
    Mark: Cantante,
  },
  {
    name: "Pastilla",
    family: "Icono de app",
    concept: "El icono de app clásico: baldosa coral con tres barras. Es el que mejor aguanta a 16 px y sobre cualquier fondo.",
    Mark: Pastilla,
  },
];

export const LOGOS: LogoDef[] = RAW.map((l, i) => ({
  ...l,
  n: String(i + 1).padStart(2, "0"),
  id: l.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-"),
}));

export function Logo({ def, size, p, on, className }: { def: LogoDef; size: number; p: Pal; on: boolean; className?: string }) {
  const M = def.Mark;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden>
      <M p={p} on={on} />
    </svg>
  );
}

/** Serialises a rendered static mark into an SVG favicon that swaps ink for cream in dark browsers. */
export function faviconHref(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute("class");
  clone.removeAttribute("aria-hidden");
  clone.setAttribute("width", "32");
  clone.setAttribute("height", "32");
  const style = `<style>@media (prefers-color-scheme:dark){[fill="${INK}"]{fill:${CREAM}}[stroke="${INK}"]{stroke:${CREAM}}}</style>`;
  const markup = clone.outerHTML.replace(/^<svg([^>]*)>/, `<svg$1>${style}`);
  return `data:image/svg+xml,${encodeURIComponent(markup)}`;
}
