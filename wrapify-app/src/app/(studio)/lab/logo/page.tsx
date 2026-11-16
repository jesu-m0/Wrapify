"use client";

import { ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Equalizer } from "@/lab/motion";
import { Icon } from "@/lab/studio/ui";
import { LOGOS, Logo, LogoDef, Look, TileHue, TileShape, faviconHref } from "@/lab/logo/marks";
import { HUE_NAMES, HUE_ORDER, SHAPES, TILE_HUES, TILE_LOGOS, tilePath } from "@/lab/logo/tiles";

/* Logo lab. Round 1: twenty alternatives to the dancing-bars mark. Round 2: twenty more on a tile,
   grown from the round-1 picks. Each one is shown animated, next to the wordmark, and static at real
   favicon sizes. */

const ALL = [...LOGOS, ...TILE_LOGOS];
/** what the user picked from round 1 (2026-11-11); from 20 only the tile counted */
const PICKS = ["04", "06", "07", "10", "14", "20"];
const PICK_DEFS = LOGOS.filter((l) => PICKS.includes(l.n));
const byN = (n: string) => ALL.find((l) => l.n === n);

const CORAL = "#ff7d5c";
const FAV_KEY = "wrapify-logo-favs";

const TAB_LIGHT = { strip: "#dfe1e5", tab: "#ffffff", ink: "#1f1f1f" };
const TAB_DARK = { strip: "#202124", tab: "#35363a", ink: "#e8eaed" };

/* Browser-only prefs read through external stores, so the server render stays deterministic. */
const REDUCE_Q = "(prefers-reduced-motion: reduce)";
function subscribeReduce(cb: () => void) {
  const m = window.matchMedia(REDUCE_Q);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

const NO_FAVS: string[] = [];
let favCache: string[] | null = null;
const favListeners = new Set<() => void>();
function readFavs() {
  if (favCache === null) {
    try {
      const v = JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]");
      favCache = Array.isArray(v) ? v.filter((id) => ALL.some((l) => l.id === id)) : [];
    } catch {
      favCache = [];
    }
  }
  return favCache;
}
function writeFavs(next: string[]) {
  favCache = next;
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(next));
  } catch {}
  favListeners.forEach((l) => l());
}
function subscribeFavs(cb: () => void) {
  favListeners.add(cb);
  return () => favListeners.delete(cb);
}

function useFavicon() {
  const originals = useRef<Map<HTMLLinkElement, string>>(new Map());
  useEffect(() => {
    const saved = originals.current;
    return () => saved.forEach((href, link) => (link.href = href));
  }, []);
  return (href: string) => {
    let links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
    if (!links.length) {
      const l = document.createElement("link");
      l.rel = "icon";
      document.head.appendChild(l);
      links = [l];
    }
    links.forEach((l) => {
      if (!originals.current.has(l)) originals.current.set(l, l.href);
      l.type = "image/svg+xml";
      l.href = href;
    });
  };
}

export default function LogoLab() {
  const reduced = useSyncExternalStore(subscribeReduce, () => window.matchMedia(REDUCE_Q).matches, () => false);
  const [motion, setOn] = useState<boolean | null>(null);
  const on = motion ?? !reduced;
  const [dark, setDark] = useState(false);
  const [round, setRound] = useState<1 | 2>(2);
  const [hue, setHue] = useState<TileHue | null>(null);
  const [shape, setShape] = useState<TileShape>("soft");
  const favs = useSyncExternalStore(subscribeFavs, readFavs, () => NO_FAVS);
  const [inTab, setInTab] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const setFavicon = useFavicon();

  const tile = { hue, shape };
  const look = (d: boolean): Look => ({ dark: d, ...tile });
  const list = round === 2 ? TILE_LOGOS : LOGOS;

  const toggleFav = (id: string) => writeFavs(favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id]);

  const tryInTab = (def: LogoDef, svg: SVGSVGElement | null) => {
    if (!svg) return;
    setFavicon(faviconHref(svg));
    setInTab(def.id);
  };

  const favDefs = ALL.filter((l) => favs.includes(l.id));
  const tileNote =
    favDefs.some((l) => l.round === 2) && (hue || shape !== "soft")
      ? ` (baldosa ${hue ? HUE_NAMES[hue] : "con su color"}, forma ${SHAPES.find((s) => s.id === shape)?.name.toLowerCase()})`
      : "";
  const copyFavs = async () => {
    const text = `Logos que me gustan: ${favDefs.map((l) => `${l.n} ${l.name}`).join(", ")}${tileNote}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const headerDef = ALL.find((l) => l.id === inTab) ?? list[0];
  const ghost = "cursor-pointer rounded-full border transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]";
  const goRound = (r: 1 | 2) => {
    setRound(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="theme-studio" data-mode={dark ? "dark" : "light"}>
      <div className="min-h-screen overflow-x-clip transition-colors duration-500" style={{ background: "var(--page)", color: "var(--ink)" }}>
        <div className="mx-auto max-w-[1320px] px-4 pt-4 pb-36 sm:px-6">
          {/* top bar */}
          <header
            className="lab-rise sticky top-3 z-30 rounded-[24px] border px-4 py-2 shadow-[0_14px_30px_-22px_rgba(30,23,40,0.55)] backdrop-blur-xl"
            style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--paper) 84%, transparent)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5 text-xl font-extrabold tracking-tight">
                <Logo def={headerDef} size={26} look={look(dark)} on={on} />
                Wrapify
                <span className="hidden truncate text-sm font-semibold sm:inline" style={{ color: "var(--muted)" }}>
                  · {headerDef.n} {headerDef.name}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <Segmented
                  label="Movimiento"
                  value={on}
                  onChange={setOn}
                  options={[
                    { v: true, label: "Animado" },
                    { v: false, label: "Estático" },
                  ]}
                />
                <button
                  type="button"
                  onClick={() => setDark((d) => !d)}
                  aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
                  aria-pressed={dark}
                  className={`${ghost} flex h-[34px] w-[34px] items-center justify-center`}
                  style={{ borderColor: "var(--g-border)" }}
                >
                  <Icon name={dark ? "sun" : "moon"} size={16} />
                </button>
              </div>
            </div>
            {round === 2 && <TileControls hue={hue} setHue={setHue} shape={shape} setShape={setShape} />}
          </header>

          {/* intro */}
          {round === 2 ? (
            <section className="grid items-end gap-6 pt-12 pb-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div>
                <p className="lab-rise text-xs font-bold tracking-[0.22em] uppercase" style={{ color: "var(--muted)" }}>
                  Wrapify Lab · Logo · Ronda 2
                </p>
                <h1 className="lab-rise mt-3 text-5xl leading-[1.02] font-extrabold tracking-tight md:text-6xl" style={{ animationDelay: "80ms" }}>
                  Veinte más,
                  <br />
                  en baldosa.
                </h1>
                <p className="lab-rise mt-5 max-w-xl text-lg" style={{ color: "var(--muted)", animationDelay: "160ms" }}>
                  Salen de los que elegiste: las W del 04 y el 06, el play del 07, la pelotita del 10 y el cilindro del 14, todos sobre la
                  baldosa del 20. Como la baldosa trae su propio fondo, el favicon se ve igual en pestañas claras y oscuras. Con «Color» y
                  «Forma», arriba, los cambias todos a la vez.
                </p>
              </div>
              <div className="lab-rise rounded-[26px] border p-5" style={{ background: "var(--paper)", borderColor: "var(--line)", animationDelay: "240ms" }}>
                <p className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: "var(--muted)" }}>
                  Tus elegidos de la ronda 1
                </p>
                <div className="mt-3 grid grid-cols-6 gap-1.5">
                  {PICK_DEFS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        setRound(1);
                        requestAnimationFrame(() => document.getElementById(`logo-${l.id}`)?.scrollIntoView({ behavior: "smooth" }));
                      }}
                      className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl py-2 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
                      title={`${l.n} ${l.name}`}
                    >
                      <Logo def={l} size={36} look={{ dark }} on={on} />
                      <span className="text-[11px] font-semibold tabular-nums" style={{ color: "var(--muted)" }}>
                        {l.n}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  Del 20 me quedo solo con la baldosa: las barras de dentro no vuelven. Cada ficha dice de cuáles sale.
                </p>
              </div>
            </section>
          ) : (
            <section className="grid items-end gap-6 pt-12 pb-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div>
                <p className="lab-rise text-xs font-bold tracking-[0.22em] uppercase" style={{ color: "var(--muted)" }}>
                  Wrapify Lab · Logo · Ronda 1
                </p>
                <h1 className="lab-rise mt-3 text-5xl leading-[1.02] font-extrabold tracking-tight md:text-6xl" style={{ animationDelay: "80ms" }}>
                  Veinte logos,
                  <br />
                  el mismo pulso.
                </h1>
                <p className="lab-rise mt-5 max-w-xl text-lg" style={{ color: "var(--muted)", animationDelay: "160ms" }}>
                  Todos salen de las barras de ahora. Los que elegiste llevan la etiqueta «Elegido»; de ellos sale la ronda 2.
                </p>
              </div>
              <div className="lab-rise rounded-[26px] border p-5" style={{ background: "var(--paper)", borderColor: "var(--line)", animationDelay: "240ms" }}>
                <p className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: "var(--muted)" }}>
                  El de ahora
                </p>
                <div className="mt-3 flex items-center gap-2.5 text-2xl font-extrabold tracking-tight">
                  <span className={on ? "" : "lg-still"}>
                    <style>{".lg-still .lab-eq > span { animation: none }"}</style>
                    <Equalizer />
                  </span>
                  Wrapify
                </div>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  Cinco barras iguales con el mismo ritmo desfasado. En movimiento se lee como «cargando…», y quieto son cinco palos
                  iguales: no tiene silueta propia que aguante de favicon.
                </p>
              </div>
            </section>
          )}

          {/* rounds */}
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              label="Ronda"
              value={round}
              onChange={goRound}
              big
              options={[
                { v: 2 as const, label: "Ronda 2 · en baldosa" },
                { v: 1 as const, label: "Ronda 1" },
              ]}
            />
          </div>

          {/* contact sheet */}
          <Section title="De un vistazo" note="Toca uno para ir a su ficha">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-10">
              {list.map((l) => (
                <a
                  key={l.id}
                  href={`#logo-${l.id}`}
                  className="group relative flex flex-col items-center gap-2 rounded-[20px] border px-1 pt-4 pb-3 transition-transform duration-300 hover:-translate-y-1"
                  style={{ background: "var(--paper)", borderColor: "var(--line)" }}
                >
                  {favs.includes(l.id) && (
                    <span className="absolute top-2 right-2" style={{ color: CORAL }}>
                      <Heart filled size={12} />
                    </span>
                  )}
                  {l.round === 1 && PICKS.includes(l.n) && (
                    <span className="absolute top-2 left-2 h-2 w-2 rounded-full" style={{ background: "var(--ink)" }} title="Elegido" />
                  )}
                  <Logo def={l} size={52} look={look(dark)} on={on} />
                  <span className="text-center text-[11px] leading-tight font-semibold">
                    <span style={{ color: "var(--muted)" }}>{l.n}</span> {l.name}
                  </span>
                </a>
              ))}
            </div>
          </Section>

          {/* favicon strip */}
          <Section title="A tamaño favicon" note="16 px reales, como en la barra de pestañas">
            <div className="grid gap-2">
              {[
                { c: TAB_LIGHT, d: false, label: "Navegador claro" },
                { c: TAB_DARK, d: true, label: "Navegador oscuro" },
              ].map((row) => (
                <div key={row.label} className="rounded-[20px] p-2" style={{ background: row.c.strip }}>
                  <span className="sr-only">{row.label}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((l) => (
                      <span
                        key={l.id}
                        title={`${l.n} ${l.name}`}
                        className="flex items-center gap-1.5 rounded-[10px] px-2 py-1.5 text-[11px] font-semibold tabular-nums"
                        style={{ background: row.c.tab, color: row.c.ink, fontFamily: "system-ui, sans-serif" }}
                      >
                        <Logo def={l} size={16} look={look(row.d)} on={false} />
                        {l.n}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* detail cards */}
          <Section title="Uno a uno">
            <div className="grid gap-5 lg:grid-cols-2">
              {list.map((l) => (
                <LogoCard
                  key={l.id}
                  def={l}
                  on={on}
                  dark={dark}
                  tile={tile}
                  fav={favs.includes(l.id)}
                  onFav={() => toggleFav(l.id)}
                  inTab={inTab === l.id}
                  onTry={(svg) => tryInTab(l, svg)}
                />
              ))}
            </div>
          </Section>
        </div>

        {/* favourites bar */}
        {favDefs.length > 0 && (
          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
            <div
              className="lab-rise pointer-events-auto flex max-w-full items-center gap-3 rounded-full py-2 pr-2 pl-4 shadow-[0_18px_40px_-18px_rgba(30,23,40,0.7)]"
              style={{ background: "var(--ink)", color: "var(--page)" }}
            >
              <span className="shrink-0 text-xs font-bold tracking-[0.18em] uppercase opacity-70">Te gustan</span>
              <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
                {favDefs.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      setRound(l.round);
                      requestAnimationFrame(() => document.getElementById(`logo-${l.id}`)?.scrollIntoView({ behavior: "smooth" }));
                    }}
                    className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-sm font-semibold"
                    style={{ background: "color-mix(in srgb, var(--page) 12%, transparent)" }}
                  >
                    <Logo def={l} size={16} look={look(!dark)} on={false} />
                    {l.n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={copyFavs}
                className="shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-bold"
                style={{ background: CORAL, color: "#1e1728" }}
              >
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Segmented<T extends string | number | boolean>({
  label,
  value,
  onChange,
  options,
  big,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
  big?: boolean;
}) {
  return (
    <div
      className={`flex rounded-full border p-1 font-semibold ${big ? "text-sm" : "text-xs"}`}
      style={{ borderColor: "var(--g-border)", background: big ? "var(--paper)" : undefined }}
      role="group"
      aria-label={label}
    >
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          className={`cursor-pointer rounded-full transition-colors ${big ? "px-4 py-2" : "px-3 py-1.5"}`}
          style={value === o.v ? { background: "var(--ink)", color: "var(--page)" } : undefined}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TileControls({
  hue,
  setHue,
  shape,
  setShape,
}: {
  hue: TileHue | null;
  setHue: (h: TileHue | null) => void;
  shape: TileShape;
  setShape: (s: TileShape) => void;
}) {
  const chip = "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors";
  const pressed = { background: "var(--ink)", color: "var(--page)", borderColor: "var(--ink)" };
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-2 pb-0.5" style={{ borderColor: "var(--line)" }}>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Color de la baldosa">
        <span className="mr-1 text-[11px] font-bold tracking-[0.16em] uppercase" style={{ color: "var(--muted)" }}>
          Color
        </span>
        <button
          type="button"
          onClick={() => setHue(null)}
          aria-pressed={hue === null}
          className={chip}
          style={hue === null ? pressed : { borderColor: "var(--g-border)" }}
        >
          Cada uno el suyo
        </button>
        {HUE_ORDER.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHue(h)}
            aria-pressed={hue === h}
            aria-label={`Baldosa ${HUE_NAMES[h]}`}
            title={HUE_NAMES[h]}
            className="h-6 w-6 cursor-pointer rounded-full transition-transform active:scale-90"
            style={{
              background: TILE_HUES[h],
              boxShadow: hue === h ? "0 0 0 2px var(--paper), 0 0 0 4px var(--ink)" : "inset 0 0 0 1px rgba(30,23,40,0.16)",
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Forma de la baldosa">
        <span className="mr-1 text-[11px] font-bold tracking-[0.16em] uppercase" style={{ color: "var(--muted)" }}>
          Forma
        </span>
        {SHAPES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setShape(s.id)}
            aria-pressed={shape === s.id}
            className={chip}
            style={shape === s.id ? pressed : { borderColor: "var(--g-border)" }}
          >
            <svg viewBox="0 0 32 32" width={13} height={13} aria-hidden>
              <path d={tilePath(s.id)} fill="currentColor" />
            </svg>
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
        {note && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {note}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function LogoCard({
  def,
  on,
  dark,
  tile,
  fav,
  onFav,
  inTab,
  onTry,
}: {
  def: LogoDef;
  on: boolean;
  dark: boolean;
  tile: Look;
  fav: boolean;
  onFav: () => void;
  inTab: boolean;
  onTry: (svg: SVGSVGElement | null) => void;
}) {
  const src = useRef<HTMLSpanElement>(null);
  const light = { dark: false, ...tile };
  const darkL = { dark: true, ...tile };
  const picked = def.round === 1 && PICKS.includes(def.n);
  return (
    <article id={`logo-${def.id}`} className="scroll-mt-36 rounded-[30px] border p-5 sm:p-6" style={{ background: "var(--paper)", borderColor: "var(--line)" }}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: "var(--muted)" }}>
            {def.family}
            {picked && (
              <span className="rounded-full px-2 py-0.5 text-[10px] tracking-[0.12em]" style={{ background: "var(--ink)", color: "var(--page)" }}>
                Elegido
              </span>
            )}
          </p>
          <h3 className="mt-1 text-2xl font-extrabold tracking-tight">
            <span className="mr-2 tabular-nums" style={{ color: "var(--muted)" }}>
              {def.n}
            </span>
            {def.name}
          </h3>
        </div>
        <button
          type="button"
          onClick={onFav}
          aria-pressed={fav}
          aria-label={fav ? `Quitar ${def.name} de favoritos` : `Me gusta ${def.name}`}
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-transform duration-200 active:scale-90"
          style={fav ? { background: CORAL, borderColor: CORAL, color: "#1e1728" } : { borderColor: "var(--g-border)" }}
        >
          <Heart filled={fav} size={18} />
        </button>
      </header>

      <div className="mt-4 grid gap-5 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="grid aspect-[4/3] place-items-center rounded-[22px] sm:aspect-square" style={{ background: "var(--page)" }}>
          <Logo def={def} size={136} look={dark ? darkL : light} on={on} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <p className="text-[15px] leading-relaxed">{def.concept}</p>

          {def.from && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold tracking-[0.16em] uppercase" style={{ color: "var(--muted)" }}>
                Viene de
              </span>
              {def.from.map((n) => {
                const s = byN(n);
                return (
                  s && (
                    <span
                      key={n}
                      className="flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-1 text-xs font-semibold"
                      style={{ borderColor: "var(--line)" }}
                      title={s.name}
                    >
                      <Logo def={s} size={18} look={{ dark }} on={false} />
                      {n} {n === "20" ? "baldosa" : s.name}
                    </span>
                  )
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Lockup def={def} on={on} look={light} light />
            <Lockup def={def} on={on} look={darkL} light={false} />
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <Size label="32 px">
              <Logo def={def} size={32} look={light} on={false} />
            </Size>
            <Size label="16 px">
              <Logo def={def} size={16} look={light} on={false} />
            </Size>
            <Size label="16 px" dark>
              <Logo def={def} size={16} look={darkL} on={false} />
            </Size>
            <Size label="1 tinta">
              <Logo def={def} size={32} look={{ mono: true, shape: tile.shape }} on={false} />
            </Size>
          </div>

          <button
            type="button"
            onClick={() => onTry(src.current?.querySelector("svg") ?? null)}
            className="mt-auto flex cursor-pointer items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition-colors"
            style={inTab ? { background: "var(--ink)", color: "var(--page)", borderColor: "var(--ink)" } : { borderColor: "var(--g-border)" }}
          >
            {inTab ? (
              <>
                <Check /> En tu pestaña
              </>
            ) : (
              "Probar en la pestaña"
            )}
          </button>
        </div>
      </div>

      {/* the static light mark the favicon is serialised from */}
      <span ref={src} hidden>
        <Logo def={def} size={32} look={light} on={false} />
      </span>
    </article>
  );
}

function Lockup({ def, on, look, light }: { def: LogoDef; on: boolean; look: Look; light: boolean }) {
  return (
    <div
      className="flex min-w-0 items-center justify-center gap-2 rounded-2xl border px-3 py-3"
      style={light ? { background: "#f6f0e4", color: "#1e1728", borderColor: "rgba(30,23,40,0.1)" } : { background: "#1e1728", color: "#f6f0e4", borderColor: "transparent" }}
    >
      <Logo def={def} size={24} look={look} on={on} className="shrink-0" />
      <span className="truncate text-xl font-extrabold tracking-tight">Wrapify</span>
    </div>
  );
}

function Size({ label, dark, children }: { label: string; dark?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="grid h-12 w-12 place-items-center rounded-xl border"
        style={dark ? { background: TAB_DARK.tab, borderColor: "transparent" } : { background: "#ffffff", borderColor: "rgba(30,23,40,0.1)" }}
      >
        {children}
      </span>
      <span className="text-[10px] font-semibold" style={{ color: "var(--muted)" }}>
        {label}
        {dark ? " osc." : ""}
      </span>
    </div>
  );
}

function Heart({ filled, size = 18 }: { filled: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.7 3.8 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.3 0 5.5 3.2 4.3 6.6-1.7 4.8-9.2 9.4-9.2 9.4Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
