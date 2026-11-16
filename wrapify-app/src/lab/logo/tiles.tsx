"use client";

import { ReactNode, useId } from "react";
import {
  A,
  AT,
  Around,
  Bar,
  CREAM,
  DOWN,
  EASE,
  INK_FIXED,
  Key,
  LIN,
  LogoDef,
  SNAP,
  TileHue,
  TileShape,
  Track,
  UP,
  even,
  keys,
  slug,
  useClock,
} from "./marks";

/*
 * Round 2: twenty marks on a tile, grown from the round-1 picks
 * (04 Doble uve, 06 Serpentina, 07 Play, 10 Karaoke, 14 Envuelto and the tile of 20 Pastilla).
 *
 * - the tile fills the whole 32-unit canvas, so at 16 px its edge sits on the pixel grid;
 * - content keeps a ~4-unit margin: dark ink on the six soft hues of the studio, cream on the ink tile;
 * - the tile brings its own background, so nothing has to swap in a dark browser tab;
 * - the page can recolour and reshape every tile at once, so hue and shape travel in `TP`.
 */

/* ── Tile palette ── */

export const TILE_HUES: Record<TileHue, string> = {
  coral: "#ff7d5c",
  sun: "#ffc94d",
  pink: "#ffa9d2",
  lilac: "#ab96ff",
  mint: "#63d6a6",
  sky: "#80c9ff",
  ink: INK_FIXED,
};
export const HUE_ORDER: TileHue[] = ["coral", "sun", "pink", "lilac", "mint", "sky", "ink"];
export const HUE_NAMES: Record<TileHue, string> = {
  coral: "coral",
  sun: "sol",
  pink: "rosa",
  lilac: "lila",
  mint: "menta",
  sky: "cielo",
  ink: "tinta",
};
export const SHAPES: { id: TileShape; name: string }[] = [
  { id: "soft", name: "Suave" },
  { id: "round", name: "Redondeada" },
  { id: "square", name: "Cuadrada" },
  { id: "leaf", name: "Hoja" },
];

const PAPER = "#fffdf8";
const CORAL = "#ff7d5c";

/**
 * t: tile · k: main ink · a: soft accent (paper; decorative, may vanish at 16 px)
 * pop: an accent that still reads on that tile (paper on coral/lilac, coral on ink, ink on the light hues).
 */
export type TP = { hue: TileHue; shape: TileShape; mono: boolean; d: string; t: string; k: string; a: string; pop: string; edge?: boolean };

export function tp(hue: TileHue, shape: TileShape, mono = false, dark = false): TP {
  const d = tilePath(shape);
  if (mono) return { hue: "ink", shape, mono, d, t: INK_FIXED, k: PAPER, a: PAPER, pop: PAPER };
  // on a dark page the ink tile would melt into the background: it gets a faint light edge
  if (hue === "ink") return { hue, shape, mono, d, t: INK_FIXED, k: CREAM, a: CORAL, pop: CORAL, edge: dark };
  const strong = hue === "coral" || hue === "lilac";
  return { hue, shape, mono, d, t: TILE_HUES[hue], k: INK_FIXED, a: PAPER, pop: strong ? PAPER : INK_FIXED };
}

/* ── Tile shapes ── */

const f2 = (v: number) => String(+v.toFixed(2));

function corners(x: number, y: number, w: number, h: number, [tl, tr, br, bl]: number[]) {
  const n = f2;
  return (
    `M${n(x + tl)} ${n(y)}H${n(x + w - tr)}A${n(tr)} ${n(tr)} 0 0 1 ${n(x + w)} ${n(y + tr)}` +
    `V${n(y + h - br)}A${n(br)} ${n(br)} 0 0 1 ${n(x + w - br)} ${n(y + h)}` +
    `H${n(x + bl)}A${n(bl)} ${n(bl)} 0 0 1 ${n(x)} ${n(y + h - bl)}` +
    `V${n(y + tl)}A${n(tl)} ${n(tl)} 0 0 1 ${n(x + tl)} ${n(y)}Z`
  );
}

/** Superellipse with n = 4: a continuous-curvature corner close to the r = 9 that tile 20 had. */
function squircle(x: number, y: number, w: number, h: number) {
  const pts: string[] = [];
  const N = 96;
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2;
    const c = Math.cos(th);
    const s = Math.sin(th);
    pts.push(`${f2(x + w / 2 + (w / 2) * Math.sign(c) * Math.sqrt(Math.abs(c)))} ${f2(y + h / 2 + (h / 2) * Math.sign(s) * Math.sqrt(Math.abs(s)))}`);
  }
  return `M${pts.join("L")}Z`;
}

const pathCache = new Map<string, string>();
export function tilePath(shape: TileShape, x = 0, y = 0, w = 32, h = 32) {
  const key = `${shape}:${x}:${y}:${w}:${h}`;
  let d = pathCache.get(key);
  if (!d) {
    const s = Math.min(w, h) / 32;
    d =
      shape === "round"
        ? corners(x, y, w, h, [9 * s, 9 * s, 9 * s, 9 * s])
        : shape === "square"
          ? corners(x, y, w, h, [5 * s, 5 * s, 5 * s, 5 * s])
          : shape === "leaf"
            ? corners(x, y, w, h, [14 * s, 4 * s, 14 * s, 4 * s])
            : squircle(x, y, w, h);
    pathCache.set(key, d);
  }
  return d;
}

/* ── Shared pieces ── */

type TM = { p: TP; on: boolean };

function useUid(prefix: string) {
  return prefix + useId().replace(/[^a-zA-Z0-9]/g, "");
}

function Tile({ p, fill }: { p: TP; fill?: string }) {
  return (
    <>
      <path d={p.d} fill={fill ?? p.t} />
      {p.edge && <path d={p.d} fill="none" stroke={CREAM} strokeOpacity={0.22} strokeWidth={1.5} />}
    </>
  );
}

/** The five faders of 04, resized for the tile: they wander, then snap into a W. */
const FX = [4, 9, 14, 19, 24];
const FW = [
  { y: 6, h: 12 },
  { y: 14, h: 12 },
  { y: 9, h: 10 },
  { y: 14, h: 12 },
  { y: 6, h: 12 },
];
const FWANDER = [
  [11, 5, 14],
  [7, 15, 9],
  [14, 6, 13],
  [8, 13, 5],
  [13, 9, 15],
];

function Faders({ fill, on }: { fill: string; on: boolean }) {
  return (
    <>
      {FW.map((b, i) => (
        <rect key={i} x={FX[i]} y={b.y} width={4} height={b.h} rx={2} fill={fill}>
          {on && (
            <A
              at="y"
              tr={keys([[0, b.y], [0.14, FWANDER[i][0]], [0.28, FWANDER[i][1]], [0.42, FWANDER[i][2]], [0.58, b.y], [1, b.y]])}
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

/** The w of 06 on a tile: four uprights 6 apart joined by round U-turns. */
const serpT = (a: number, m: number, b: number) =>
  `M7 ${f2(a)}V21A3 3 0 0 0 13 21V${f2(m + 3)}A3 3 0 0 1 19 ${f2(m + 3)}V21A3 3 0 0 0 25 21V${f2(b)}`;

/** The pointed w used by Trazo and Papel. */
const POINTED = "M7 9L11.5 23L16 13L20.5 23L25 9";

/** The three bars of 07 that settle into a play triangle, the tip in the accent colour. */
const PX = [9, 15, 21];
const PLAY_REST = [18, 11, 4];

function PlayBars({ p, on, at = 16, T, H, dur = 3.6, ease }: { p: TP; on: boolean; at?: number; T?: number[]; H?: number[][]; dur?: number; ease?: string[] }) {
  const tt = T ?? [0, 0.1, 0.2, 0.3, 0.4, 0.52, 1];
  const hh = H ?? [
    [18, 9, 15, 6, 13, 18, 18],
    [11, 17, 7, 18, 8, 11, 11],
    [4, 13, 18, 10, 17, 4, 4],
  ];
  return (
    <>
      {PX.map((x, i) => (
        <Bar
          key={x}
          x={x}
          w={4}
          at={at}
          align="center"
          h={PLAY_REST[i]}
          fill={i === 2 ? p.pop : p.k}
          on={on}
          hs={{ v: hh[i], t: tt }}
          dur={dur}
          begin={i * 0.04}
          ease={ease ?? [EASE, EASE, EASE, EASE, SNAP, LIN]}
        />
      ))}
    </>
  );
}

/** A ball hopping between targets, landing at evenly spaced contacts with a squash. */
function ballTracks(route: number[], X: number[], rest: number[], peak: number, dip: number, R: number) {
  const n = route.length - 1;
  const contacts = route.map((_, k) => k / n);
  const cyK: Key[] = [];
  const cyE: string[] = [];
  route.forEach((b, k) => {
    cyK.push([k / n, rest[b] + dip]);
    if (k < n) {
      cyK.push([(k + 0.5) / n, peak]);
      cyE.push(UP, DOWN);
    }
  });
  const squash = (hit: number): Track => {
    const k: Key[] = [];
    contacts.forEach((c) => {
      if (c > 0) k.push([c - 0.04, R]);
      k.push([c, hit]);
      if (c < 1) k.push([c + 0.05, R]);
    });
    return keys(k);
  };
  const hitsOf = (i: number) => contacts.filter((_, k) => route[k] === i);
  return { cx: keys(route.map((b, k) => [k / n, X[b]] as Key)), cy: keys(cyK), cyE, rx: squash(R * 1.25), ry: squash(R * 0.8), hitsOf };
}

/** 0 → 1 → 0 around each contact: sinks just before the ball lands, recovers just after. */
const pulse = (t: number, cs: number[]) =>
  Math.max(
    0,
    ...cs.map((c) => {
      const dt = t - c;
      return dt >= -0.04 && dt <= 0 ? 1 + dt / 0.04 : dt > 0 && dt <= 0.06 ? 1 - dt / 0.06 : 0;
    }),
  );
const pulseTimes = (cs: number[]) =>
  [...new Set([0, 1, ...cs.flatMap((c) => [c - 0.04, c, c + 0.06])].filter((t) => t >= 0 && t <= 1).map((t) => +t.toFixed(4)))].sort((a, b) => a - b);

/** Mixes two #rrggbb colours: w = share of `b`. */
function mix(a: string, b: string, w: number) {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `#${[0, 1, 2].map((i) => Math.round(ch(a, i) * (1 - w) + ch(b, i) * w).toString(16).padStart(2, "0")).join("")}`;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const inOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/* ───────────────────────── De la W ───────────────────────── */

function Mesa({ p, on }: TM) {
  return (
    <>
      <Tile p={p} />
      {FX.map((x) => (
        <rect key={x} x={x + 1.5} y={4.5} width={1} height={23} rx={0.5} fill={p.k} opacity={0.26} />
      ))}
      <Faders fill={p.k} on={on} />
    </>
  );
}

function Hilo({ p, on }: TM) {
  const S: [number, number, number][] = [
    [8, 12, 8],
    [14, 8, 12],
    [7, 15, 7],
    [12, 10, 15],
    [8, 12, 8],
  ];
  return (
    <>
      <Tile p={p} />
      <path d={serpT(8, 12, 8)} fill="none" stroke={p.k} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
        {on && <A at="d" tr={even(S.map((s) => serpT(...s)))} dur={2.6} />}
      </path>
    </>
  );
}

function Trazo({ p, on }: TM) {
  const D = 3.4;
  const T = [0, 0.42, 0.7, 0.9, 1];
  return (
    <>
      <Tile p={p} />
      <path
        d={POINTED}
        pathLength={1}
        fill="none"
        stroke={p.k}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={on ? "1 2" : undefined}
      >
        {on && <A at="stroke-dashoffset" tr={{ v: [1.06, 0, 0, -1.06, -1.06], t: T }} dur={D} ease={[EASE, LIN, "0.5 0 0.7 1", LIN]} />}
      </path>
      <circle cx={on ? 0 : 25} cy={on ? 0 : 9} r={2.7} fill={p.pop}>
        {on && (
          <>
            <animateMotion
              path={POINTED}
              keyPoints="0;1;1;1;0"
              keyTimes={T.join(";")}
              calcMode="spline"
              keySplines={[EASE, LIN, LIN, LIN].join(";")}
              dur={`${D}s`}
              repeatCount="indefinite"
            />
            <A at="opacity" tr={keys([[0, 1], [0.88, 0]])} dur={D} discrete />
          </>
        )}
      </circle>
    </>
  );
}

/** Zigzag with a 14-unit period: tops at x = 2 + 14k, bottoms at 9 + 14k, long enough to slide one period. */
const ZIG = (() => {
  const pts: string[] = [];
  for (let k = -2; k <= 2; k++) pts.push(`${2 + 14 * k} 9`, `${9 + 14 * k} 23`);
  pts.push(`${2 + 14 * 3} 9`);
  return `M${pts.join("L")}`;
})();

function Cinta({ p, on }: TM) {
  const id = useUid("ci");
  return (
    <>
      <defs>
        <clipPath id={id}>
          <path d={p.d} />
        </clipPath>
      </defs>
      <Tile p={p} />
      <g clipPath={`url(#${id})`}>
        <g>
          {on && <AT type="translate" tr={keys([[0, "0 0"], [0.45, "0 0"], [0.8, "14 0"], [1, "14 0"]])} dur={3} ease={[LIN, EASE, LIN]} />}
          <path d={ZIG} fill="none" stroke={p.k} strokeWidth={6} strokeLinejoin="round" />
          {!p.mono && <path d={ZIG} fill="none" stroke={p.hue === "ink" ? p.a : p.t} strokeWidth={1.4} strokeLinejoin="round" opacity={0.9} />}
        </g>
      </g>
    </>
  );
}

function Papel({ p, on }: TM) {
  const id = useUid("pa");
  return (
    <>
      <defs>
        <pattern id={id} patternUnits="userSpaceOnUse" width={4} height={4} patternTransform="rotate(45)">
          <rect width={4} height={4} fill={p.k} />
          <rect width={2} height={4} fill={p.a} />
          {on && <animateTransform attributeName="patternTransform" type="translate" values="0 0;4 0" dur="2.4s" repeatCount="indefinite" additive="sum" />}
        </pattern>
      </defs>
      <Tile p={p} />
      <path d={POINTED} fill="none" stroke={`url(#${id})`} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function Recorte({ p, on }: TM) {
  const id = useUid("re");
  return (
    <>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={32} height={32}>
          <path d={p.d} fill="#fff" />
          <Faders fill="#000" on={on} />
        </mask>
      </defs>
      <path d={p.d} fill={p.t} mask={`url(#${id})`} />
    </>
  );
}

function Avance({ p, on }: TM) {
  const D = 3.6;
  const rot = (cx: number) =>
    keys([[0, `0 ${cx} 16`], [0.08, `0 ${cx} 16`], [0.2, `-90 ${cx} 16`], [0.55, `-90 ${cx} 16`], [0.67, `0 ${cx} 16`], [1, `0 ${cx} 16`]]);
  const tri = (d: string, cx: number, begin: number) => (
    <g>
      {on && <AT type="rotate" tr={rot(cx)} dur={D} begin={begin} ease={[LIN, SNAP, LIN, SNAP, LIN]} />}
      <path d={d} fill={p.k} stroke={p.k} strokeWidth={2.5} strokeLinejoin="round" />
    </g>
  );
  return (
    <>
      <Tile p={p} />
      <g>
        {on && (
          <AT
            type="translate"
            tr={keys([[0, "0 0"], [0.26, "0 0"], [0.31, "1.5 0"], [0.36, "0 0"], [0.41, "1.5 0"], [0.46, "0 0"], [1, "0 0"]])}
            dur={D}
          />
        )}
        {tri("M6 10.5H15.5L10.75 21.5Z", 10.75, 0)}
        {tri("M16.5 10.5H26L21.25 21.5Z", 21.25, 0.06)}
      </g>
    </>
  );
}

/* ───────────────────────── Del play ───────────────────────── */

function PlayT({ p, on }: TM) {
  return (
    <>
      <Tile p={p} />
      <PlayBars p={p} on={on} />
    </>
  );
}

function Rayas({ p, on }: TM) {
  const Y = [6, 10, 14, 18, 22];
  const L = [
    [5, 14, 8, 18, 6, 5, 5],
    [11, 6, 17, 9, 15, 11, 11],
    [17, 10, 13, 6, 19, 17, 17],
    [11, 18, 7, 15, 9, 11, 11],
    [5, 9, 16, 11, 14, 5, 5],
  ];
  const T = [0, 0.12, 0.24, 0.36, 0.48, 0.6, 1];
  return (
    <>
      <Tile p={p} />
      {L.map((ls, i) => (
        <rect key={i} x={9} y={Y[i]} width={ls[0]} height={3} rx={1.5} fill={p.k}>
          {on && <A at="width" tr={{ v: ls, t: T }} dur={3.8} begin={i * 0.05} ease={[EASE, EASE, EASE, EASE, SNAP, LIN]} />}
        </rect>
      ))}
    </>
  );
}

function Volteo({ p, on }: TM) {
  const back = tp(p.hue === "ink" ? "coral" : "ink", p.shape, p.mono);
  const D = 5;
  const IN = "0.55 0 1 0.45";
  const OUT = "0 0.55 0.45 1";
  return (
    <Around
      cx={16}
      cy={16}
      anim={
        on && (
          <AT
            type="scale"
            tr={keys([[0, "1 1"], [0.36, "1 1"], [0.45, "0.001 1"], [0.54, "1 1"], [0.86, "1 1"], [0.93, "0.001 1"], [1, "1 1"]])}
            dur={D}
            ease={[LIN, IN, OUT, LIN, IN, OUT]}
          />
        )
      }
    >
      <g>
        {on && <A at="opacity" tr={keys([[0, 1], [0.45, 0], [0.93, 1]])} dur={D} discrete />}
        <Tile p={p} />
        <Faders fill={p.k} on={false} />
      </g>
      <g opacity={0}>
        {on && <A at="opacity" tr={keys([[0, 0], [0.45, 1], [0.93, 0]])} dur={D} discrete />}
        <Tile p={back} />
        <PlayBars p={back} on={false} />
      </g>
    </Around>
  );
}

/* ───────────────────────── Del karaoke ───────────────────────── */

function KaraokeT({ p, on }: TM) {
  const X = [10, 16, 22];
  const TOP = [17, 12, 19];
  const BOT = 25;
  const R = 2.5;
  const DIP = 1.5;
  const D = 2.4;
  const b = ballTracks([1, 2, 1, 0, 1], X, TOP.map((t) => t - R), 5.5, DIP, R);
  return (
    <>
      <Tile p={p} />
      {X.map((x, i) => {
        const h = BOT - TOP[i];
        const ts = pulseTimes(b.hitsOf(i));
        return (
          <Bar key={x} x={x - 2} w={4} at={BOT} h={h} fill={p.k} on={on} hs={{ v: ts.map((t) => h - DIP * pulse(t, b.hitsOf(i))), t: ts }} dur={D} />
        );
      })}
      <ellipse cx={16} cy={TOP[1] - R} rx={R} ry={R} fill={p.pop}>
        {on && (
          <>
            <A at="cx" tr={b.cx} dur={D} ease={LIN} />
            <A at="cy" tr={b.cy} dur={D} ease={b.cyE} />
            <A at="rx" tr={b.rx} dur={D} />
            <A at="ry" tr={b.ry} dur={D} />
          </>
        )}
      </ellipse>
    </>
  );
}

function Rebote({ p, on }: TM) {
  const REST = [11, 15, 11]; // left end, hump, right end of the w
  const X = [7, 16, 25];
  const R = 2.25;
  const DIP = 2;
  const D = 2.6;
  const b = ballTracks([1, 0, 1, 2, 1], X, REST.map((y) => y - 2 - R), 4, DIP, R);
  const hits = REST.map((_, i) => b.hitsOf(i));
  const ts = pulseTimes(hits.flat());
  const at = (i: number, t: number) => REST[i] + DIP * pulse(t, hits[i]);
  return (
    <>
      <Tile p={p} />
      <path d={serpT(REST[0], REST[1], REST[2])} fill="none" stroke={p.k} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
        {on && <A at="d" tr={{ v: ts.map((t) => serpT(at(0, t), at(1, t), at(2, t))), t: ts }} dur={D} />}
      </path>
      <ellipse cx={16} cy={REST[1] - 2 - R} rx={R} ry={R} fill={p.pop}>
        {on && (
          <>
            <A at="cx" tr={b.cx} dur={D} ease={LIN} />
            <A at="cy" tr={b.cy} dur={D} ease={b.cyE} />
            <A at="rx" tr={b.rx} dur={D} />
            <A at="ry" tr={b.ry} dur={D} />
          </>
        )}
      </ellipse>
    </>
  );
}

/** A dotted w: the five vertices plus a dot halfway along each stroke (five big dots read as a dice). */
const DOTS = (() => {
  const V = [
    [6, 8],
    [11, 24],
    [16, 13],
    [21, 24],
    [26, 8],
  ];
  return V.flatMap((v, i) => (i < V.length - 1 ? [v, [(v[0] + V[i + 1][0]) / 2, (v[1] + V[i + 1][1]) / 2]] : [v]));
})();

function Puntos({ p, on }: TM) {
  const R = 2.2;
  const D = 2.8;
  const HOP = 3.5;
  return (
    <>
      <Tile p={p} />
      {DOTS.map(([x, y], i) => {
        const s = 0.05 + i * 0.055;
        const land = s + 0.14;
        return (
          <ellipse key={i} cx={x} cy={y} rx={R} ry={R} fill={i === 4 ? p.pop : p.k}>
            {on && (
              <>
                <A at="cy" tr={keys([[0, y], [s, y], [s + 0.07, y - HOP], [land, y + 0.6], [land + 0.05, y], [1, y]])} dur={D} ease={[LIN, UP, DOWN, EASE, LIN]} />
                <A at="rx" tr={keys([[0, R], [land - 0.02, R], [land, R + 0.5], [land + 0.06, R], [1, R]])} dur={D} />
                <A at="ry" tr={keys([[0, R], [land - 0.02, R], [land, R - 0.45], [land + 0.06, R], [1, R]])} dur={D} />
              </>
            )}
          </ellipse>
        );
      })}
    </>
  );
}

function Letra({ p, on }: TM) {
  const id = useUid("le");
  const L1: [number, number][] = [
    [4, 7],
    [13, 4],
    [19, 9],
  ];
  const L2: [number, number][] = [
    [7, 9],
    [18, 7],
  ];
  const R = 2;
  const C = L1.map(([x, w]) => x + w / 2);
  const Y0 = 14 - R;
  const D = 3.6;
  const words = (ws: [number, number][], y: number, opacity?: number) =>
    ws.map(([x, w]) => <rect key={x} x={x} y={y} width={w} height={4} rx={2} fill={p.k} opacity={opacity} />);
  return (
    <>
      <defs>
        <clipPath id={id}>
          <rect x={0} y={0} width={C[1]} height={32}>
            {on && <A at="width" tr={keys([[0, C[1]], [0.22, C[2]], [0.53, C[2]], [0.56, 0], [0.72, 0], [0.75, C[0]], [1, C[1]]])} dur={D} ease={LIN} />}
          </rect>
        </clipPath>
      </defs>
      <Tile p={p} />
      {words(L1, 14, 0.3)}
      {words(L2, 22, 0.3)}
      <g clipPath={`url(#${id})`}>
        {on && <A at="opacity" tr={keys([[0, 1], [0.5, 1], [0.54, 0], [0.72, 0], [0.73, 1], [1, 1]])} dur={D} ease={LIN} />}
        {words(L1, 14)}
      </g>
      <circle cx={C[1]} cy={Y0} r={R} fill={p.pop}>
        {on && (
          <>
            <A at="cx" tr={keys([[0, C[1]], [0.22, C[2]], [0.5, C[2]], [0.75, C[0]], [1, C[1]]])} dur={D} ease={LIN} />
            <A
              at="cy"
              tr={keys([[0, Y0], [0.11, 8], [0.22, Y0], [0.5, Y0], [0.625, 4.5], [0.75, Y0], [0.875, 8], [1, Y0]])}
              dur={D}
              ease={[UP, DOWN, LIN, UP, DOWN, UP, DOWN]}
            />
          </>
        )}
      </circle>
    </>
  );
}

/* ───────────────────────── Del cilindro ───────────────────────── */

function EnvueltoT({ p, on }: TM) {
  const t = useClock(on);
  const N = 8;
  const R = 9;
  const W0 = 4;
  const H = [17, 11, 14, 8, 16, 10, 13, 18];
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
      <Tile p={p} />
      {bars.map((b) => (
        <rect
          key={b.i}
          x={b.x - b.w / 2}
          y={16 - b.h / 2}
          width={b.w}
          height={b.h}
          rx={b.w / 2}
          ry={2}
          fill={b.i === 0 ? p.pop : p.k}
          opacity={b.c > 0 ? Math.min(1, b.c / 0.3) : 0.2 * Math.min(1, -b.c / 0.3)}
        />
      ))}
    </>
  );
}

function Torcida({ p, on }: TM) {
  const t = useClock(on);
  const phi0 = -Math.PI / 4 - (t / 3.2) * Math.PI * 2;
  return (
    <>
      <Tile p={p} />
      {FX.map((x, i) => {
        const c = Math.cos(phi0 + (i * Math.PI) / 4);
        const h = Math.max(4, 20 * Math.abs(c));
        return <rect key={x} x={x} y={16 - h / 2} width={4} height={h} rx={2} fill={p.k} opacity={c >= 0 ? 1 : 0.36} />;
      })}
    </>
  );
}

function Rodillo({ p, on }: TM) {
  const t = useClock(on);
  const D = 3.4;
  const u = on ? (t / D) % 1 : 0;
  const phi = (inOut(clamp01(u / 0.38)) * 2 * Math.PI) / 3; // a third of a turn, then rest
  const PAT = [FW[2], FW[1], FW[0], FW[1]]; // centre, low, high, low — repeats every 4 of the 12 slots
  const bars = Array.from({ length: 12 }, (_, j) => {
    const a = phi + (j * Math.PI) / 6;
    const c = Math.cos(a);
    return { j, c, x: 16 + 11 * Math.sin(a), w: 4 * c, ...PAT[j % 4] };
  }).filter((b) => b.c > 0.03);
  return (
    <>
      <Tile p={p} />
      {bars.map((b) => (
        <rect key={b.j} x={b.x - b.w / 2} y={b.y} width={b.w} height={b.h} rx={b.w / 2} ry={2} fill={p.k} opacity={Math.min(1, b.c / 0.4)} />
      ))}
    </>
  );
}

/* ───────────────────────── De la baldosa ───────────────────────── */

function Pegatina({ p, on }: TM) {
  const mid = useUid("pm");
  const cid = useUid("pc");
  const D = 4.2;
  // f = how far the bottom-right corner is peeled; the fold is the line x + y = 64 - f
  const F: [number, number][] = [
    [0, 9],
    [0.28, 9],
    [0.48, 17],
    [0.55, 15],
    [0.62, 17],
    [0.82, 9],
    [1, 9],
  ];
  const ease = [LIN, EASE, EASE, EASE, SNAP, LIN];
  const C = (f: number) => 64 - f;
  const region = (f: number) => `40 ${C(f) - 40} 40 40 ${C(f) - 40} 40`;
  const regionAnim = on && <A at="points" tr={keys(F.map(([t, f]) => [t, region(f)] as Key))} dur={D} ease={ease} />;
  return (
    <>
      <defs>
        <mask id={mid} maskUnits="userSpaceOnUse" x={-8} y={-8} width={48} height={48}>
          <path d={p.d} fill="#fff" />
          <polygon points={region(9)} fill="#000">
            {regionAnim}
          </polygon>
        </mask>
        <clipPath id={cid}>
          <polygon points={region(9)}>{regionAnim}</polygon>
        </clipPath>
      </defs>
      <g mask={`url(#${mid})`}>
        <Tile p={p} />
        <Faders fill={p.k} on={false} />
      </g>
      {/* the peeled corner, mirrored over the fold: the pale back of the sticker, lifted by a soft shadow */}
      <g transform={`translate(${C(9)} ${C(9)})`}>
        {on && <AT type="translate" tr={keys(F.map(([t, f]) => [t, `${C(f)} ${C(f)}`] as Key))} dur={D} ease={ease} />}
        <g transform="translate(-0.9 -0.9)" opacity={p.mono ? 0 : 0.2}>
          <g transform="matrix(0 -1 -1 0 0 0)">
            <path d={p.d} fill={INK_FIXED} clipPath={`url(#${cid})`} />
          </g>
        </g>
        <g transform="matrix(0 -1 -1 0 0 0)">
          <path d={p.d} fill={p.mono ? CREAM : mix(p.t, PAPER, 0.62)} clipPath={`url(#${cid})`} />
        </g>
      </g>
    </>
  );
}

function Pila({ p, on }: TM) {
  const t = useClock(on);
  const D = 3.6;
  const i0 = HUE_ORDER.indexOf(p.hue === "ink" ? "coral" : p.hue);
  const ring = HUE_ORDER.filter((h) => h !== "ink");
  const hues: TileHue[] = p.mono ? ["ink", "ink", "ink"] : [p.hue, ring[(i0 + 1) % ring.length], ring[(i0 + 3) % ring.length]];
  const n = on ? Math.floor(t / D) : 0;
  const u = on ? (t / D) % 1 : 0;
  const pr = inOut(clamp01((u - 0.62) / 0.26));
  const S = 24;
  const shape = tilePath(p.shape, 0, 0, S, S);
  const cards = [
    { key: n, hue: hues[n % 3], q: -pr, o: 1 - pr },
    { key: n + 1, hue: hues[(n + 1) % 3], q: 1 - pr, o: 1 },
    { key: n + 2, hue: hues[(n + 2) % 3], q: 2 - pr, o: 1 },
    ...(pr > 0 ? [{ key: n + 3, hue: hues[n % 3], q: 3 - pr, o: pr }] : []),
  ].sort((a, b) => b.q - a.q);
  return (
    <>
      {cards.map((c) => {
        const cp = tp(c.hue, p.shape, p.mono);
        const shade = p.mono ? 1 - 0.3 * Math.max(0, c.q) : 1;
        return (
          <g key={c.key} transform={`translate(${f2(4 * c.q)} ${f2(8 - 4 * c.q)})`} opacity={c.o * shade}>
            <path d={shape} fill={cp.t} />
            <g transform="scale(0.75)" opacity={clamp01(1 - Math.abs(c.q))}>
              <path d={serpT(8, 12, 8)} fill="none" stroke={cp.k} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
        );
      })}
    </>
  );
}

function Tecla({ p, on }: TM) {
  const D = 3.8;
  const DEPTH = 3.5;
  const face = tilePath(p.shape, 0, 0, 32, 32 - DEPTH);
  const darkTile = p.hue === "ink" || p.mono;
  const T = [0, 0.14, 0.24, 0.34, 0.44, 0.54, 0.66, 1];
  const H = [
    [18, 18, 9, 15, 6, 13, 18, 18],
    [11, 11, 17, 7, 18, 8, 11, 11],
    [4, 4, 13, 18, 10, 17, 4, 4],
  ];
  return (
    <>
      <Tile p={p} />
      <path d={p.d} fill={darkTile ? CREAM : INK_FIXED} opacity={darkTile ? 0.2 : 0.3} />
      <g>
        {on && (
          <AT
            type="translate"
            tr={keys([[0, "0 0"], [0.05, "0 0"], [0.1, `0 ${DEPTH - 1}`], [0.15, `0 ${DEPTH - 1}`], [0.22, "0 0"], [1, "0 0"]])}
            dur={D}
            ease={[LIN, "0.5 0 0.8 0.4", LIN, SNAP, LIN]}
          />
        )}
        <path d={face} fill={p.t} />
        <PlayBars p={p} on={on} at={(32 - DEPTH) / 2} T={T} H={H} dur={D} ease={[LIN, EASE, EASE, EASE, EASE, SNAP, LIN]} />
      </g>
    </>
  );
}

/* ── Catalogue ── */

type Raw2 = { name: string; family: string; from: string[]; hue: TileHue; concept: string; Mark: (props: TM) => ReactNode };

const RAW2: Raw2[] = [
  {
    name: "Mesa",
    family: "De la W",
    from: ["04", "20"],
    hue: "lilac",
    concept:
      "El 04 en baldosa: los cinco faders corren por sus raíles, como en una mesa de mezclas, y se colocan en W. La baldosa le da el marco que le faltaba.",
    Mark: Mesa,
  },
  {
    name: "Hilo",
    family: "De la W",
    from: ["06", "20"],
    hue: "sky",
    concept: "El 06 en baldosa: una sola línea que sube y baja como un ecualizador y que se lee como una w. Lo más limpio de la ronda.",
    Mark: Hilo,
  },
  {
    name: "Trazo",
    family: "De la W",
    from: ["06"],
    hue: "sun",
    concept: "La w escrita a mano: el trazo se dibuja de un tirón con la punta del boli delante, y se borra para volver a firmar.",
    Mark: Trazo,
  },
  {
    name: "Cinta",
    family: "De la W",
    from: ["06", "20"],
    hue: "coral",
    concept:
      "La w es una cinta de regalo que cruza la baldosa y se sale por los bordes, como si envolviera la caja. De vez en cuando alguien tira de ella.",
    Mark: Cinta,
  },
  {
    name: "Papel",
    family: "De la W",
    from: ["06", "20"],
    hue: "ink",
    concept: "La w rellena de papel de regalo a rayas, que se desliza despacio por dentro. En pequeño se queda en una w de dos tonos.",
    Mark: Papel,
  },
  {
    name: "Recorte",
    family: "De la W",
    from: ["04", "20"],
    hue: "mint",
    concept:
      "Los faders del 04 troquelados en la baldosa: la W es un hueco, así que en la pestaña se ve el fondo a través. Al moverse, la luz se cuela por las ranuras.",
    Mark: Recorte,
  },
  {
    name: "Avance",
    family: "De la W",
    from: ["04", "07"],
    hue: "pink",
    concept: "Dos play seguidos son el botón de avance rápido. Empujan un par de veces, giran un cuarto de vuelta y se quedan en W.",
    Mark: Avance,
  },
  {
    name: "Play en baldosa",
    family: "Del play",
    from: ["07", "20"],
    hue: "ink",
    concept: "El 07 en baldosa: tres barras que bailan y se ordenan en un botón de play, con la punta en coral.",
    Mark: PlayT,
  },
  {
    name: "Rayas",
    family: "Del play",
    from: ["07"],
    hue: "sky",
    concept: "Cinco rayas tumbadas que compiten por ser la más larga, como en la carrera del ranking, y terminan formando un play.",
    Mark: Rayas,
  },
  {
    name: "Volteo",
    family: "Del play",
    from: ["04", "07", "14"],
    hue: "coral",
    concept: "Una baldosa con dos caras que gira como una carta: por delante la W, por detrás el play. El giro es el del cilindro del 14.",
    Mark: Volteo,
  },
  {
    name: "Karaoke en baldosa",
    family: "Del karaoke",
    from: ["10", "20"],
    hue: "lilac",
    concept: "El 10 en baldosa: la pelotita salta de barra en barra y las hunde al caer.",
    Mark: KaraokeT,
  },
  {
    name: "Rebote",
    family: "Del karaoke",
    from: ["10", "06"],
    hue: "sun",
    concept: "La pelotita del karaoke bota sobre la w del 06, que hace de cama elástica y se hunde en cada salto.",
    Mark: Rebote,
  },
  {
    name: "Puntos",
    family: "Del karaoke",
    from: ["10", "04"],
    hue: "mint",
    concept: "Cinco pelotitas colocadas en W que saltan una detrás de otra, como la ola en un estadio.",
    Mark: Puntos,
  },
  {
    name: "Letra",
    family: "Del karaoke",
    from: ["10"],
    hue: "pink",
    concept: "Una pantalla de karaoke en miniatura: dos líneas de letra y la pelotita saltando palabra a palabra mientras las va pintando.",
    Mark: Letra,
  },
  {
    name: "Envuelto en baldosa",
    family: "Del cilindro",
    from: ["14", "20"],
    hue: "coral",
    concept: "El 14 en baldosa: las barras dan vueltas alrededor de un cilindro y la de color marca cada vuelta.",
    Mark: EnvueltoT,
  },
  {
    name: "Torcida",
    family: "Del cilindro",
    from: ["14"],
    hue: "sun",
    concept: "Una cinta de barras que se retuerce sin parar: cuando una barra enseña la cara de atrás, se vuelve más clara.",
    Mark: Torcida,
  },
  {
    name: "Rodillo",
    family: "Del cilindro",
    from: ["04", "14"],
    hue: "sky",
    concept: "La W de faders pintada en un rodillo: gira un tercio de vuelta y vuelve a quedar de frente. Quieto ya se ve en 3D.",
    Mark: Rodillo,
  },
  {
    name: "Pegatina",
    family: "De la baldosa",
    from: ["20", "04"],
    hue: "mint",
    concept: "La baldosa es una pegatina con la W: la esquina se despega como el celo de un regalo y vuelve a pegarse.",
    Mark: Pegatina,
  },
  {
    name: "Pila",
    family: "De la baldosa",
    from: ["20", "06"],
    hue: "pink",
    concept: "Una pila de baldosas, una por año: la de delante se va y pasa la siguiente, como en la máquina del tiempo.",
    Mark: Pila,
  },
  {
    name: "Tecla",
    family: "De la baldosa",
    from: ["20", "07"],
    hue: "lilac",
    concept: "La baldosa es una tecla con su grosor: se pulsa, las barras saltan a bailar y se vuelven a colocar en play.",
    Mark: Tecla,
  },
];

export const TILE_LOGOS: LogoDef[] = RAW2.map(({ Mark, hue, ...l }, i) => ({
  ...l,
  hue,
  round: 2,
  n: String(21 + i),
  id: slug(l.name),
  draw: (look, on) => <Mark p={tp(look.hue ?? hue, look.shape ?? "soft", look.mono, look.dark)} on={on} />,
}));
