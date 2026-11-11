"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { SpotifyStream } from "@/types/spotify";
import DataGate from "@/lab/DataGate";
import { Equalizer } from "@/lab/motion";
import { setLabData } from "@/lab/store";
import { generateMonthRange } from "@/lib/stats";
import { buildInsights, fmtMonthLong } from "@/lab/insights";
import { TransportDock } from "@/lab/race";
import { monthEnds, TabProps, useTimeline } from "@/lab/studio/timeline";
import ArtistDrawer from "@/lab/studio/ArtistDrawer";
import Explorar from "@/lab/studio/Explorar";
import Habitos from "@/lab/studio/Habitos";
import Resumen from "@/lab/studio/Resumen";
import Tops from "@/lab/studio/Tops";
import { Hue, HUES, Icon, INK, Mark, Segmented } from "@/lab/studio/ui";

/*
 * Version C — "Studio".
 * The practical evolution of the current dashboard (four tabs, year chips,
 * an artist drawer you can open from anywhere) as flat colour blocks.
 * Building blocks and colour rules live in src/lab/studio/ui.tsx; the tabs are
 * bento grids in src/lab/studio/*. A "time machine" (timeline.ts) can replay the
 * history month by month: every tab then only sees the plays up to the cursor.
 */

export default function StudioPage() {
  const [dark, setDark] = useState(false);
  return (
    <div className="theme-studio" data-mode={dark ? "dark" : "light"}>
      <DataGate dark={dark} toggleDark={() => setDark((d) => !d)}>
        {(data) => <Studio data={data} dark={dark} toggleDark={() => setDark((d) => !d)} />}
      </DataGate>
    </div>
  );
}

const TABS = ["Resumen", "Tops", "Hábitos", "Explorar"] as const;
type Tab = (typeof TABS)[number];
/** The tab thumb borrows the colour of that tab's lead card. */
const TAB_HUE: Record<Tab, Hue> = { Resumen: "coral", Tops: "lilac", Hábitos: "mint", Explorar: "pink" };

/* ── Shell ── */

function Studio({ data, dark, toggleDark }: { data: SpotifyStream[]; dark: boolean; toggleDark: () => void }) {
  const [tab, setTab] = useState<Tab>("Resumen");
  const [year, setYear] = useState<number | null>(null);
  const [artist, setArtist] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [hello] = useState(() => {
    const h = new Date().getHours();
    if (h >= 6 && h < 13) return { text: "Buenos días", icon: "sun" as const, hue: HUES.sun };
    if (h >= 13 && h < 21) return { text: "Buenas tardes", icon: "sun" as const, hue: HUES.coral };
    return { text: "Buenas noches", icon: "moon" as const, hue: HUES.lilac };
  });

  // chronological once, so a month of the timeline is just a prefix of the list
  const history = useMemo(() => [...data].sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0)), [data]);
  const years = useMemo(() => Array.from(new Set(history.map((s) => s.year))).sort((a, b) => a - b), [history]);
  const all = useMemo(() => buildInsights(history), [history]);
  const base = useMemo(() => (year === null ? history : history.filter((s) => s.year === year)), [history, year]);
  const full = useMemo(() => (base === history ? all : buildInsights(base)), [base, history, all]);

  const months = useMemo(() => generateMonthRange(base), [base]);
  const ends = useMemo(() => monthEnds(base, months), [base, months]);
  const tl = useTimeline(months);
  // the dock and the race follow the cursor at once; the heavy recount may lag a frame behind
  const shown = useDeferredValue(tl.cursor);
  const view = useMemo(
    () => (shown === null || shown >= months.length - 1 ? base : base.slice(0, ends[shown])),
    [shown, base, ends, months]
  );
  const ins = useMemo(() => (view === base ? full : buildInsights(view)), [view, base, full]);

  const pickYear = (y: number | null) => {
    tl.exit();
    startTransition(() => setYear(y));
  };
  const openArtist = (name: string) => name && setArtist(name);
  const tabProps: TabProps = { ins, full, all, data: view, base, history, year, tl, openArtist };
  const ghost = "cursor-pointer rounded-full border transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]";

  return (
    <div className="relative min-h-screen overflow-x-clip transition-colors duration-500" style={{ background: "var(--page)", color: "var(--ink)" }}>
      <div className="relative mx-auto max-w-[1400px] px-6 pt-5 pb-36">
        {/* top bar */}
        <header
          className="lab-rise sticky top-3 z-30 -mx-3 flex flex-wrap items-center justify-between gap-3 rounded-[28px] border px-4 py-2 shadow-[0_14px_30px_-22px_rgba(30,23,40,0.55)] backdrop-blur-xl"
          style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--paper) 84%, transparent)" }}
        >
          <span className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
            <Equalizer /> Wrapify
          </span>
          <Segmented options={TABS} value={tab} onChange={setTab} thumb={HUES[TAB_HUE[tab]]} onThumb={INK} className="order-3 w-full md:order-none md:w-[440px]" />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setLabData(null)} className={`${ghost} px-3 py-2 text-xs font-semibold whitespace-nowrap`} style={{ borderColor: "var(--g-border)" }}>
              Cambiar datos
            </button>
            <button
              type="button"
              onClick={toggleDark}
              aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
              aria-pressed={dark}
              className={`${ghost} flex h-[34px] w-[34px] items-center justify-center`}
              style={{ borderColor: "var(--g-border)" }}
            >
              <Icon name={dark ? "sun" : "moon"} size={16} />
            </button>
          </div>
        </header>

        {/* greeting + year chips */}
        <div className="mt-10 mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="flex items-center gap-4 text-5xl leading-[0.95] font-extrabold tracking-[-0.035em] md:text-6xl">
              <span className="-mb-[0.14em] overflow-hidden pb-[0.14em]">
                <span className="lab-mask-in block">{hello.text}</span>
              </span>
              <span className="lab-pop" style={{ animationDelay: "450ms" }}>
                <span className="flex h-[0.95em] w-[0.95em] items-center justify-center rounded-full" style={{ background: hello.hue, color: INK }}>
                  <Icon name={hello.icon} size={30} />
                </span>
              </span>
            </h1>
            <p className="lab-rise mt-4 text-lg font-medium md:text-xl" style={{ animationDelay: "200ms", color: "var(--muted)" }}>
              {tl.cursor !== null ? "Tu historia, tal y como iba en " : year === null ? "Esto es lo que has escuchado en " : "Así sonó tu "}
              <b className="font-extrabold">
                <Mark tone="hl" r={-1}>
                  {tl.cursor !== null
                    ? fmtMonthLong(months[tl.cursor])
                    : year === null
                      ? `${full.spanYears} ${full.spanYears === 1 ? "año" : "años"}`
                      : year}
                </Mark>
              </b>
            </p>
          </div>
          <div className="lab-rise flex flex-wrap items-center gap-1.5" style={{ animationDelay: "120ms" }} role="group" aria-label="Filtrar por año">
            {[null, ...years].map((y) => {
              const on = y === year;
              return (
                <button
                  key={y ?? "all"}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pickYear(y)}
                  className={`cursor-pointer rounded-full border-2 px-3.5 py-1.5 text-sm font-bold tabular-nums transition-all duration-300 hover:-translate-y-0.5 active:scale-95 ${on ? "scale-105" : ""}`}
                  style={
                    on
                      ? { background: "var(--ink)", borderColor: "var(--ink)", color: "var(--page)" }
                      : { background: "transparent", borderColor: "var(--line)", color: "var(--muted)" }
                  }
                >
                  {y ?? "Todo"}
                </button>
              );
            })}
          </div>
        </div>

        <main key={tab} className="transition-opacity duration-300" style={{ opacity: isPending ? 0.45 : 1 }}>
          {tab === "Resumen" && <Resumen {...tabProps} goTops={() => setTab("Tops")} />}
          {tab === "Tops" && <Tops {...tabProps} />}
          {tab === "Hábitos" && <Habitos {...tabProps} />}
          {tab === "Explorar" && <Explorar {...tabProps} />}
        </main>
      </div>

      <TransportDock
        months={months}
        cursor={tl.cursor}
        playing={tl.playing}
        speed={tl.speed}
        onToggle={tl.toggle}
        onSeek={tl.seek}
        onSpeed={tl.cycleSpeed}
        onExit={tl.exit}
      />
      <ArtistDrawer data={view} ins={ins} name={artist} onClose={() => setArtist(null)} />
    </div>
  );
}
