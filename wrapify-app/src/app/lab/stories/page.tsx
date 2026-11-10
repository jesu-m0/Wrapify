"use client";

import Link from "next/link";
import { CSSProperties, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { SpotifyStream } from "@/types/spotify";
import DataGate from "@/lab/DataGate";
import LabSwitcher from "@/lab/LabSwitcher";
import { RadialClock } from "@/lab/charts";
import { CountUp, Equalizer } from "@/lab/motion";
import {
  buildInsights,
  fmtDateLong,
  fmtDateShort,
  fmtHour,
  fmtInt,
  fmtMonthLong,
  Insights,
  WEEKDAYS_LONG,
} from "@/lab/insights";

/*
 * Version A — "Stories".
 * A full-screen, auto-advancing story (à la Wrapped): one idea per slide,
 * huge type, a colour world per slide. → / ← / click to navigate, space to pause.
 */

export default function StoriesPage() {
  return (
    <div className="theme-stories">
      <DataGate tagline="Tu historial, contado como una historia.">{(data) => <Stories data={data} />}</DataGate>
    </div>
  );
}

/* ── Building blocks ── */

type DecoKind = "rings" | "burst" | "blobs" | "stripes" | "dots" | "bars";

interface Slide {
  id: string;
  bg: string;
  ink: string;
  accent: string;
  deco: DecoKind;
  /** blob colours for the "blobs" deco (defaults to the accent) */
  glow?: [string, string];
  ms: number;
  body: ReactNode;
}

const BIG = "font-extrabold leading-[0.95] tracking-[-0.035em]";

function Kicker({ children, d = 0 }: { children: ReactNode; d?: number }) {
  return (
    <p className="lab-rise text-sm font-bold uppercase tracking-[0.28em] opacity-75 md:text-base" style={{ animationDelay: `${d}ms` }}>
      {children}
    </p>
  );
}

/** A headline line that slides up from behind a mask. */
function Line({ children, d = 0, className = "" }: { children: ReactNode; d?: number; className?: string }) {
  return (
    <span className="-mb-[0.14em] block overflow-hidden pb-[0.14em]">
      <span className={`lab-mask-in block ${className}`} style={{ animationDelay: `${d}ms` }}>
        {children}
      </span>
    </span>
  );
}

function Rise({ children, d = 0, className = "" }: { children: ReactNode; d?: number; className?: string }) {
  return (
    <div className={`lab-rise ${className}`} style={{ animationDelay: `${d}ms` }}>
      {children}
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-block rounded-full px-5 py-2 text-base font-bold md:text-lg"
      style={{ background: "var(--ink)", color: "var(--bg)" }}
    >
      {children}
    </span>
  );
}

const Hi = ({ children }: { children: ReactNode }) => <span style={{ color: "var(--accent)" }}>{children}</span>;

/** Font size that keeps a name of unknown length on roughly one line. */
function fitSize(text: string, maxVw = 15, budgetVw = 105): string {
  const vw = Math.min(maxVw, budgetVw / Math.max(4, text.length));
  return `clamp(2.6rem, ${vw.toFixed(2)}vw, 13rem)`;
}

const BURST = Array.from({ length: 32 }, (_, i) => {
  const r = i % 2 === 0 ? 100 : 74;
  const a = (i / 32) * Math.PI * 2;
  return `${(100 + Math.cos(a) * r).toFixed(1)},${(100 + Math.sin(a) * r).toFixed(1)}`;
}).join(" ");

function Deco({ kind, glow }: { kind: DecoKind; glow?: [string, string] }) {
  return (
    <div className="lab-fade pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {kind === "rings" && (
        <div className="absolute top-1/2 right-[8%] h-[70vh] w-[70vh] -translate-y-1/2">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="absolute inset-0 rounded-full border-[3px]"
              style={{ borderColor: "var(--accent)", animation: `lab-pulse-ring 5.2s ${i * 1.3}s ease-out infinite`, opacity: 0 }}
            />
          ))}
        </div>
      )}
      {kind === "burst" && (
        <svg viewBox="0 0 200 200" className="lab-spin-slow absolute -right-[20vh] -bottom-[30vh] h-[80vh] w-[80vh]">
          <polygon points={BURST} fill="var(--accent)" opacity={0.9} />
        </svg>
      )}
      {kind === "blobs" && (
        <>
          <span className="lab-drift absolute -top-[20%] -right-[10%] h-[70vh] w-[70vh] rounded-full blur-3xl" style={{ background: glow?.[0] ?? "var(--accent)", opacity: 0.55 }} />
          <span className="lab-drift absolute -bottom-[30%] -left-[10%] h-[60vh] w-[60vh] rounded-full blur-3xl" style={{ background: glow?.[1] ?? "var(--accent)", opacity: 0.4, animationDelay: "-8s" }} />
        </>
      )}
      {kind === "stripes" && (
        <div className="lab-stripes absolute top-0 -right-[10%] h-full w-[45%] -skew-x-12 opacity-[0.14]" style={{ color: "var(--ink)" }} />
      )}
      {kind === "dots" && <div className="lab-dots absolute inset-0 opacity-[0.16]" style={{ color: "var(--ink)" }} />}
      {kind === "bars" && (
        <div className="absolute inset-x-0 bottom-0 flex h-[38vh] items-end gap-[1.2vw] px-[2vw] opacity-25">
          {Array.from({ length: 28 }, (_, i) => (
            <span
              key={i}
              className="flex-1 rounded-t-full"
              style={{
                height: `${30 + ((i * 37) % 70)}%`,
                background: "var(--accent)",
                transformOrigin: "center bottom",
                animation: `lab-eq ${1.2 + ((i * 13) % 9) / 10}s ${-(i % 7) * 0.2}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Slides ── */

function buildSlides(ins: Insights, restart: () => void): Slide[] {
  const top = ins.artists[0];
  const song = ins.songs[0];
  const peakYear = ins.years.reduce((best, y) => (y.hours > best.hours ? y : best), ins.years[0]);
  const maxYearHours = Math.max(1, ...ins.years.map((y) => y.hours));
  const top5 = ins.artists.slice(0, 5);
  const y0 = ins.firstDate.slice(0, 4);
  const y1 = ins.lastDate.slice(0, 4);
  const skipEvery = ins.skipPct > 0 ? Math.max(2, Math.round(100 / ins.skipPct)) : 0;

  return [
    {
      id: "intro",
      bg: "#1a0b2e",
      ink: "#f5f0ff",
      accent: "#c6ff3d",
      deco: "blobs",
      glow: ["#7a2cff", "#ff3d8b"],
      ms: 7000,
      body: (
        <div>
          <Kicker>
            Wrapify · {y0}–{y1}
          </Kicker>
          <h1 className={`${BIG} mt-6 text-[clamp(3.5rem,10.5vw,11rem)]`}>
            <Line d={150}>Tu vida,</Line>
            <Line d={300}>contada en</Line>
            <Line d={450}>
              <Hi>canciones.</Hi>
            </Line>
          </h1>
          <Rise d={1200} className="mt-8 max-w-2xl text-xl opacity-80 md:text-2xl">
            {fmtInt(ins.activeDays)} días con música desde el {fmtDateLong(ins.firstDate)}. Sube el volumen.
          </Rise>
        </div>
      ),
    },
    {
      id: "time",
      bg: "#ff5a36",
      ink: "#1d0a04",
      accent: "#ffe94a",
      deco: "rings",
      ms: 9000,
      body: (
        <div>
          <Kicker>Primero, lo gordo</Kicker>
          <Rise d={200} className="mt-6 text-3xl font-bold md:text-5xl">
            Le has dado al play
          </Rise>
          <div className={`${BIG} lab-pop mt-2 text-[clamp(4.5rem,15vw,15rem)]`} style={{ animationDelay: "450ms" }}>
            <CountUp value={ins.totalPlays} duration={2600} delay={500} />
          </div>
          <Rise d={900} className="text-3xl font-bold md:text-5xl">
            veces.
          </Rise>
          <Rise d={3200} className="mt-8 max-w-3xl text-xl md:text-2xl">
            Eso son <b>{fmtInt(ins.totalHours)} horas</b> de música: <b>{fmtInt(ins.totalDays)} días enteros</b> sin dormir,
            sin comer y sin darle al pause.
          </Rise>
        </div>
      ),
    },
    {
      id: "artist",
      bg: "#c6ff3d",
      ink: "#12200a",
      accent: "#6a1fff",
      deco: "burst",
      ms: 9500,
      body: top ? (
        <div>
          <Kicker>Tu artista nº 1</Kicker>
          <Rise d={250} className="mt-6 text-2xl font-semibold md:text-4xl">
            Hay alguien que nunca te falla…
          </Rise>
          <h2 className={`${BIG} lab-pop mt-4 text-balance`} style={{ animationDelay: "1300ms", fontSize: fitSize(top.name) }}>
            {top.name}
          </h2>
          <Rise d={2200} className="mt-8 flex flex-wrap gap-3">
            <Chip>{fmtInt(top.plays)} reproducciones</Chip>
            <Chip>{fmtInt(top.minutes / 60)} horas</Chip>
            <Chip>desde {fmtMonthLong(top.first)}</Chip>
          </Rise>
          {ins.topArtistTopSong && (
            <Rise d={2900} className="mt-6 max-w-3xl text-xl md:text-2xl">
              Y de todo su repertorio, la que más veces has puesto es <b>«{ins.topArtistTopSong}»</b>.
            </Rise>
          )}
        </div>
      ) : null,
    },
    {
      id: "top5",
      bg: "#2a1cff",
      ink: "#ffffff",
      accent: "#ff9bd6",
      deco: "stripes",
      ms: 9000,
      body: (
        <div>
          <Kicker>El podio completo</Kicker>
          <h2 className={`${BIG} mt-5 text-[clamp(2.5rem,6vw,6rem)]`}>
            <Line d={150}>
              Tus cinco <Hi>imprescindibles</Hi>
            </Line>
          </h2>
          <ol className="mt-9 flex max-w-4xl flex-col gap-4">
            {top5.map((a, i) => (
              <li key={a.name} className="lab-slide-left flex items-center gap-5" style={{ animationDelay: `${600 + i * 220}ms` }}>
                <span className="w-12 text-right text-4xl font-extrabold tabular-nums opacity-60 md:text-5xl">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="truncate text-2xl font-extrabold tracking-tight md:text-4xl">{a.name}</span>
                    <span className="shrink-0 text-base font-semibold tabular-nums opacity-80 md:text-lg">{fmtInt(a.plays)}</span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--ink) 16%, transparent)" }}>
                    <div
                      className="lab-grow-x h-full rounded-full"
                      style={{ width: `${(a.plays / top5[0].plays) * 100}%`, background: "var(--accent)", animationDelay: `${800 + i * 220}ms` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ),
    },
    {
      id: "songs",
      bg: "#ff8fd0",
      ink: "#2b0619",
      accent: "#2a1cff",
      deco: "dots",
      ms: 9500,
      body: song ? (
        <div className="grid items-center gap-12 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <Kicker>En bucle</Kicker>
            <Rise d={250} className="mt-6 text-2xl font-semibold md:text-3xl">
              La canción de tu vida (de momento)
            </Rise>
            <h2
              className={`${BIG} lab-pop mt-4 line-clamp-3 text-balance`}
              style={{ animationDelay: "900ms", fontSize: fitSize(song.track, 9, 120) }}
            >
              <Hi>{song.track}</Hi>
            </h2>
            <Rise d={1500} className="mt-5 text-2xl font-bold md:text-3xl">
              {song.artist}
            </Rise>
            <Rise d={1900} className="mt-6">
              <Chip>{fmtInt(song.plays)} veces</Chip>
            </Rise>
          </div>
          <ol className="flex flex-col gap-3">
            {ins.songs.slice(1, 5).map((s, i) => (
              <li
                key={s.track + s.artist}
                className="lab-rise flex items-center gap-4 rounded-3xl px-5 py-4"
                style={{ animationDelay: `${2300 + i * 180}ms`, background: "color-mix(in srgb, var(--ink) 9%, transparent)" }}
              >
                <span className="w-8 text-3xl font-extrabold tabular-nums opacity-55">{i + 2}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xl font-extrabold">{s.track}</span>
                  <span className="block truncate text-base opacity-75">{s.artist}</span>
                </span>
                <span className="text-base font-bold tabular-nums">{fmtInt(s.plays)}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null,
    },
    {
      id: "clock",
      bg: "#0c1a2b",
      ink: "#eaf2ff",
      accent: "#ffd84a",
      deco: "blobs",
      glow: ["#2a4bff", "#7a2cff"],
      ms: 9500,
      body: (
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Kicker>Tu reloj musical</Kicker>
            <h2 className={`${BIG} mt-6 text-[clamp(3rem,7.5vw,8rem)]`}>
              <Line d={200}>Eres</Line>
              <Line d={380}>
                <Hi>{ins.persona.title}</Hi>
              </Line>
            </h2>
            <Rise d={1100} className="mt-7 max-w-xl text-xl opacity-85 md:text-2xl">
              {ins.persona.blurb}
            </Rise>
            <Rise d={1700} className="mt-7 flex flex-wrap gap-3">
              <Chip>Hora punta: {fmtHour(ins.peakHour)}</Chip>
              <Chip>Tu día: {WEEKDAYS_LONG[ins.peakWeekday]}</Chip>
            </Rise>
          </div>
          <Rise d={500} className="flex justify-center">
            <RadialClock values={ins.hourly} size={460} interactive={false} />
          </Rise>
        </div>
      ),
    },
    {
      id: "years",
      bg: "#ffe94a",
      ink: "#1f1a02",
      accent: "#ff4d2e",
      deco: "dots",
      ms: 10000,
      body: (
        <div>
          <Kicker>Máquina del tiempo</Kicker>
          <h2 className={`${BIG} mt-5 text-[clamp(2.4rem,5.6vw,5.6rem)]`}>
            <Line d={150}>
              <Hi>{peakYear.year}</Hi> fue tu año más intenso
            </Line>
          </h2>
          <Rise d={700} className="mt-3 text-xl md:text-2xl">
            {fmtInt(peakYear.hours)} horas. Y esto es quien mandaba en cada etapa:
          </Rise>
          <div className="mt-8 flex items-end gap-3">
            {ins.years.map((y, i) => (
              <div key={y.year} className="flex min-w-0 flex-1 flex-col items-center">
                <div className="flex h-[30vh] w-full items-end">
                  <div
                    className="lab-grow-y w-full rounded-t-2xl"
                    style={{
                      height: `${Math.max(3, (y.hours / maxYearHours) * 100)}%`,
                      background: y.year === peakYear.year ? "var(--accent)" : "var(--ink)",
                      animationDelay: `${900 + i * 130}ms`,
                    }}
                  />
                </div>
                <div className="lab-rise mt-3 w-full text-center" style={{ animationDelay: `${1200 + i * 130}ms` }}>
                  <div className="text-lg font-extrabold tabular-nums md:text-xl">{y.year}</div>
                  <div className="truncate text-xs font-semibold opacity-75 md:text-sm" title={y.topArtist}>
                    {y.topArtist}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "record",
      bg: "#6a1fff",
      ink: "#ffffff",
      accent: "#c6ff3d",
      deco: "bars",
      ms: 9500,
      body: (
        <div>
          <Kicker>Día récord</Kicker>
          <Rise d={250} className="mt-6 text-2xl font-semibold md:text-4xl">
            El {fmtDateLong(ins.busiest.date)} no hubo quien te parase:
          </Rise>
          <div className={`${BIG} lab-pop mt-3 text-[clamp(4.5rem,14vw,14rem)]`} style={{ animationDelay: "800ms" }}>
            <Hi>
              <CountUp value={ins.busiest.plays} duration={2000} delay={850} />
            </Hi>
          </div>
          <Rise d={1100} className="text-3xl font-bold md:text-5xl">
            canciones en un solo día.
          </Rise>
          {ins.busiest.topTrack && (
            <Rise d={2600} className="mt-7 max-w-3xl text-xl md:text-2xl">
              La que más sonó aquel día: <b>«{ins.busiest.topTrack}»</b>
              {ins.busiest.topArtist ? `, de ${ins.busiest.topArtist}` : ""}.
            </Rise>
          )}
          {ins.streak.longest > 1 && (
            <Rise d={3200} className="mt-6">
              <Chip>
                Racha más larga: {fmtInt(ins.streak.longest)} días seguidos con música
              </Chip>
            </Rise>
          )}
        </div>
      ),
    },
    {
      id: "explore",
      bg: "#00c9a7",
      ink: "#01261f",
      accent: "#ffffff",
      deco: "rings",
      ms: 9000,
      body: (
        <div>
          <Kicker>Espíritu explorador</Kicker>
          <h2 className={`${BIG} mt-6 text-[clamp(3rem,8.5vw,9rem)]`}>
            <Line d={200}>
              <CountUp value={ins.uniqueArtists} duration={1800} delay={300} /> artistas.
            </Line>
            <Line d={450}>
              <Hi>
                <CountUp value={ins.uniqueTracks} duration={2200} delay={550} /> canciones.
              </Hi>
            </Line>
          </h2>
          <Rise d={1700} className="mt-8 max-w-3xl text-xl md:text-2xl">
            Todas distintas. Y aun así tienes criterio:{" "}
            {skipEvery > 0 ? (
              <>
                le das a «siguiente» en <b>1 de cada {skipEvery}</b> canciones.
              </>
            ) : (
              <>casi nunca te saltas una canción.</>
            )}
          </Rise>
        </div>
      ),
    },
    {
      id: "finale",
      bg: "#120a1f",
      ink: "#f5f0ff",
      accent: "#c6ff3d",
      deco: "blobs",
      glow: ["#6a1fff", "#ff5a36"],
      ms: 0,
      body: <Finale ins={ins} restart={restart} />,
    },
  ];
}

function Finale({ ins, restart }: { ins: Insights; restart: () => void }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  return (
    <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">
      <div>
        <Kicker>Y esto es todo… por ahora</Kicker>
        <h2 className={`${BIG} mt-6 text-[clamp(3rem,7vw,7.5rem)]`}>
          <Line d={150}>Tu música,</Line>
          <Line d={320}>
            <Hi>en una tarjeta.</Hi>
          </Line>
        </h2>
        <Rise d={1000} className="mt-7 max-w-lg text-xl opacity-80">
          {ins.spanYears} {ins.spanYears === 1 ? "año" : "años"} resumidos. ¿Quieres ver más detalle? Hay dos formas más de explorarlo.
        </Rise>
        <div className="lab-rise pointer-events-auto relative z-30 mt-8 flex flex-wrap gap-3" style={{ animationDelay: "1400ms" }}>
          <button
            type="button"
            onClick={restart}
            className="cursor-pointer rounded-full px-7 py-3.5 text-base font-extrabold transition-transform duration-200 hover:scale-105 active:scale-95"
            style={{ background: "var(--accent)", color: "#14210a" }}
          >
            ↺ Verlo otra vez
          </button>
          <Link
            href="/lab/studio"
            className="rounded-full border-2 px-7 py-3.5 text-base font-bold transition-transform duration-200 hover:scale-105"
            style={{ borderColor: "var(--ink)" }}
          >
            Explorar a fondo →
          </Link>
          <Link
            href="/lab/revista"
            className="rounded-full border-2 px-7 py-3.5 text-base font-bold transition-transform duration-200 hover:scale-105"
            style={{ borderColor: "color-mix(in srgb, var(--ink) 40%, transparent)" }}
          >
            Leerlo como revista →
          </Link>
        </div>
      </div>

      <div
        className="lab-pop pointer-events-auto relative z-30"
        style={{ animationDelay: "500ms", perspective: 1200 }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -14, y: ((e.clientX - r.left) / r.width - 0.5) * 14 });
        }}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      >
        <div
          className="w-[min(86vw,400px)] rounded-[36px] p-7 shadow-2xl transition-transform duration-200 ease-out"
          style={{
            background: "linear-gradient(150deg, #6a1fff 0%, #ff5a36 55%, #ffe94a 110%)",
            color: "#fff",
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          }}
        >
          <div className="flex items-center justify-between text-sm font-bold uppercase tracking-[0.2em]">
            <span className="flex items-center gap-2">
              <Equalizer /> Wrapify
            </span>
            <span>
              {ins.firstDate.slice(0, 4)}–{ins.lastDate.slice(0, 4)}
            </span>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-75">Top artistas</p>
              <ol className="mt-2 space-y-1 text-[15px] font-bold leading-snug">
                {ins.artists.slice(0, 5).map((a, i) => (
                  <li key={a.name} className="truncate">
                    <span className="opacity-60">{i + 1}</span> {a.name}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-75">Top canciones</p>
              <ol className="mt-2 space-y-1 text-[15px] font-bold leading-snug">
                {ins.songs.slice(0, 5).map((s, i) => (
                  <li key={s.track + s.artist} className="truncate">
                    <span className="opacity-60">{i + 1}</span> {s.track}
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-5 border-t border-white/30 pt-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-75">Horas</p>
              <p className="text-4xl font-extrabold tracking-tight tabular-nums">{fmtInt(ins.totalHours)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-75">Reproducciones</p>
              <p className="text-4xl font-extrabold tracking-tight tabular-nums">{fmtInt(ins.totalPlays)}</p>
            </div>
          </div>
          <p className="mt-5 text-sm font-semibold opacity-85">
            {ins.persona.title.charAt(0).toUpperCase() + ins.persona.title.slice(1)} · récord el {fmtDateShort(ins.busiest.date)}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Player ── */

function Stories({ data }: { data: SpotifyStream[] }) {
  const ins = useMemo(() => buildInsights(data), [data]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const restart = useCallback(() => {
    setIndex(0);
    setPaused(false);
  }, []);
  const slides = useMemo(() => buildSlides(ins, restart).filter((s) => s.body !== null), [ins, restart]);
  const last = slides.length - 1;

  const next = useCallback(() => setIndex((i) => Math.min(last, i + 1)), [last]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const slide = slides[index];
  const vars = {
    background: slide.bg,
    color: slide.ink,
    "--bg": slide.bg,
    "--g-bg": slide.bg,
    "--g-ink": slide.ink,
    "--g-border": `color-mix(in srgb, ${slide.ink} 30%, transparent)`,
    "--ink": slide.ink,
    "--muted": `color-mix(in srgb, ${slide.ink} 65%, transparent)`,
    "--accent": slide.accent,
    "--line": `color-mix(in srgb, ${slide.ink} 14%, transparent)`,
  } as CSSProperties;

  return (
    <div className="fixed inset-0 overflow-hidden transition-colors duration-700" style={vars}>
      <Deco key={`deco-${index}`} kind={slide.deco} glow={slide.glow} />

      {/* progress segments */}
      <div className="absolute inset-x-0 top-0 z-40 flex gap-1.5 px-5 pt-4">
        {slides.map((s, k) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Ir a la diapositiva ${k + 1}`}
            onClick={() => setIndex(k)}
            className="h-5 flex-1 cursor-pointer"
          >
            <span className="block h-1 overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--ink) 22%, transparent)" }}>
              <span
                key={k === index ? `run-${index}` : "idle"}
                className={`block h-full rounded-full ${k === index && s.ms > 0 ? "lab-progress" : ""}`}
                style={{
                  background: "var(--ink)",
                  width: k < index || (k === index && s.ms === 0) ? "100%" : "0%",
                  animationDuration: `${s.ms}ms`,
                  animationPlayState: paused ? "paused" : "running",
                }}
                onAnimationEnd={k === index ? next : undefined}
              />
            </span>
          </button>
        ))}
      </div>

      {/* top bar */}
      <div className="absolute inset-x-0 top-9 z-40 flex items-center justify-between px-6">
        <span className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
          <Equalizer /> Wrapify
        </span>
        <div className="flex items-center gap-2">
          <LabSwitcher current="/lab/stories" />
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Reanudar" : "Pausar"}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border text-sm font-bold transition-transform hover:scale-110"
            style={{ borderColor: "var(--g-border)" }}
          >
            {paused ? "▶" : "❚❚"}
          </button>
        </div>
      </div>

      {/* click zones */}
      <button type="button" aria-label="Anterior" onClick={prev} className="absolute top-24 bottom-0 left-0 z-20 w-1/4 cursor-w-resize" />
      <button type="button" aria-label="Siguiente" onClick={next} className="absolute top-24 right-0 bottom-0 z-20 w-3/4 cursor-e-resize" />

      {/* slide */}
      <main key={slide.id} className="pointer-events-none relative flex h-full items-center pt-16">
        <div className="mx-auto w-full max-w-7xl px-8 md:px-14">{slide.body}</div>
      </main>

      {/* footer hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex items-center justify-end gap-4 px-6 text-sm font-semibold opacity-60">
        {index < last && <span>← → para moverte · espacio para pausar</span>}
        <span className="tabular-nums">
          {index + 1} / {slides.length}
        </span>
      </div>
    </div>
  );
}
