"use client";

import { useMemo, useState } from "react";
import { champions, raceData, RaceKind, rankHistory } from "@/lab/analytics";
import { BumpChart } from "@/lab/charts-analysis";
import { BarItem, BarList } from "@/lab/charts";
import { fmtInt, fmtMonthShort } from "@/lab/insights";
import { BarRace } from "@/lab/race";
import { TabProps } from "./timeline";
import { Bento, Card, Hint, Icon, INK, Label, Mark, Segmented } from "./ui";

const TOP_KINDS = ["Artistas", "Canciones", "Álbumes"] as const;
type TopKind = (typeof TOP_KINDS)[number];
const RACE_KIND: Record<TopKind, RaceKind> = { Artistas: "artists", Canciones: "songs", Álbumes: "albums" };
const RACE_MODES = ["Acumulado", "Último año"] as const;

/** podium blocks, 1st to 3rd: ink, then two steps of white over the card colour */
const PODIUM = [
  { bg: "var(--ink)", fg: "var(--g-bg)" },
  { bg: "rgba(255,255,255,0.7)", fg: INK },
  { bg: "rgba(255,255,255,0.4)", fg: INK },
];

export default function Tops({ ins, data, base, tl, openArtist }: TabProps) {
  const [kind, setKind] = useState<TopKind>("Artistas");
  const [count, setCount] = useState(12);
  const [mode, setMode] = useState<(typeof RACE_MODES)[number]>("Acumulado");

  const items: BarItem[] = useMemo(() => {
    if (kind === "Artistas") return ins.artists.map((a) => ({ key: a.name, label: a.name, value: a.plays }));
    if (kind === "Canciones") return ins.songs.map((s) => ({ key: s.track + "\u0000" + s.artist, label: s.track, sub: s.artist, value: s.plays }));
    return ins.albums.map((a) => ({ key: a.album + "\u0000" + a.artist, label: a.album, sub: a.artist, value: a.plays }));
  }, [ins, kind]);

  // the race is counted once for the whole range; playing only moves its index
  const race = useMemo(() => raceData(base, RACE_KIND[kind]), [base, kind]);
  const lastMonth = race.months.length - 1;

  // short ranges are told month by month, long ones year by year
  const by = tl.months.length <= 24 ? "month" : "year";
  const bumpAxis = useMemo(() => rankHistory(base, by).periods, [base, by]);
  const bump = useMemo(() => rankHistory(data, by), [data, by]);
  const champs = useMemo(() => champions(data, by), [data, by]);
  const fmtPeriod = (p: string) => (by === "month" ? fmtMonthShort(p).slice(0, 3) : bumpAxis.length > 9 ? `’${p.slice(2)}` : p);

  const podium = items.slice(0, 3);
  const share = (n: number) => (items.slice(0, n).reduce((a, it) => a + it.value, 0) / Math.max(1, ins.totalPlays)) * 100;
  const order = [1, 0, 2]; // 2nd · 1st · 3rd
  const heights = [190, 255, 150];
  const pick = (it: { key: string; sub?: string }) => openArtist(kind === "Artistas" ? it.key : it.sub || "");

  return (
    <>
      <div className="lab-rise mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented options={TOP_KINDS} value={kind} onChange={setKind} className="w-full max-w-md" />
        <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          Toca cualquier fila para abrir la ficha del artista
        </p>
      </div>

      <Bento>
        <Card className="col-span-12 lg:col-span-8 lg:row-span-5" i={1}>
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
              <div className="min-w-[240px] flex-1">
                <Label>La carrera · {kind.toLowerCase()}</Label>
                <Hint>
                  {mode === "Acumulado"
                    ? "Reproducciones acumuladas desde el primer día. Dale al play y mira quién adelanta a quién."
                    : "Reproducciones de los últimos 12 meses en cada momento: tus épocas, una detrás de otra."}
                </Hint>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Segmented options={RACE_MODES} value={mode} onChange={setMode} className="w-[250px]" />
                <button
                  type="button"
                  onClick={tl.toggle}
                  aria-label={tl.playing ? "Pausar" : "Reproducir la carrera"}
                  className="flex h-10 cursor-pointer items-center gap-2 rounded-full pr-4 pl-3 text-sm font-bold transition-transform duration-200 hover:scale-105 active:scale-95"
                  style={{ background: "var(--ink)", color: "var(--g-bg)" }}
                >
                  <Icon name={tl.playing ? "pause" : "play"} size={18} />
                  {tl.playing ? "Pausa" : "Play"}
                </button>
              </div>
            </div>
            <BarRace
              key={kind}
              data={race}
              index={tl.cursor ?? lastMonth}
              mode={mode === "Acumulado" ? "total" : "rolling"}
              stepMs={tl.playing ? tl.stepMs : tl.cursor !== null ? 220 : 0}
              onSelect={pick}
              minHeight={400}
              className="mt-5 flex-1"
            />
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-4 lg:row-span-4" i={2} hue="lilac">
          <div className="flex h-full flex-col">
            <Label>El podio</Label>
            <div key={kind} className="mt-auto flex items-end justify-center gap-3 pt-6">
              {order.map((pos, col) => {
                const it = podium[pos];
                if (!it) return null;
                return (
                  <button key={it.key} type="button" onClick={() => pick(it)} className="group flex min-w-0 flex-1 cursor-pointer flex-col items-center">
                    {pos === 0 && (
                      <span className="lab-pop mb-1.5" style={{ animationDelay: "850ms" }}>
                        <span className="lab-float block" style={{ animationDuration: "3.6s" }}>
                          <Icon name="crown" size={30} />
                        </span>
                      </span>
                    )}
                    <span className="lab-rise w-full text-center" style={{ animationDelay: `${300 + pos * 150}ms` }}>
                      <span className="line-clamp-2 text-base leading-tight font-extrabold text-balance [overflow-wrap:anywhere]">{it.label}</span>
                      <span className="mt-1 block text-xs font-semibold tabular-nums" style={{ color: "var(--muted)" }}>
                        {fmtInt(it.value)}
                      </span>
                    </span>
                    <span
                      className="lab-grow-y mt-3 flex w-full items-start justify-center rounded-t-3xl pt-3 text-4xl font-extrabold transition-[translate] duration-300 group-hover:-translate-y-1"
                      style={{ height: heights[col], animationDelay: `${pos * 150}ms`, background: PODIUM[pos].bg, color: PODIUM[pos].fg }}
                    >
                      {pos + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* two small tiles: how much of everything lives in the top */}
        {([3, 10] as const).map((n, i) => (
          <Card key={n} className="col-span-6 lg:col-span-2 lg:row-span-1" i={3 + i} hue={n === 3 ? "sun" : "mint"} dense>
            <p className="text-[1.75rem] leading-none font-extrabold tracking-tight tabular-nums">{share(n).toFixed(1).replace(".", ",")} %</p>
            <p className="mt-1.5 text-[13px] leading-tight font-semibold" style={{ color: "var(--muted)" }}>
              se lo lleva tu top {n}
            </p>
          </Card>
        ))}

        <Card className="col-span-12 lg:col-span-5 lg:row-span-7" i={5}>
          <div className="mb-3 flex items-center justify-between">
            <Label>
              Top {Math.min(count, items.length)} · {kind.toLowerCase()} por reproducciones
            </Label>
          </div>
          <BarList key={kind} items={items.slice(0, count)} onSelect={pick} />
          {count < items.length && (
            <button
              type="button"
              onClick={() => setCount((c) => c + 10)}
              className="mt-4 w-full cursor-pointer rounded-full border-2 py-3 text-sm font-bold transition-[background-color,color,border-color,scale] duration-200 hover:border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--g-bg)] active:scale-[0.98]"
              style={{ borderColor: "var(--line)" }}
            >
              Mostrar 10 más
            </button>
          )}
        </Card>

        <Card className="col-span-12 lg:col-span-7 lg:row-span-4" i={6}>
          <div className="flex h-full flex-col">
            <Label>La clasificación de artistas, {by === "year" ? "año a año" : "mes a mes"}</Label>
            <Hint>
              Como la tabla de una liga: cada línea es un artista y su puesto en el top 10 de cada {by === "year" ? "año" : "mes"}. Las que se cruzan son
              adelantamientos.
            </Hint>
            <BumpChart periods={bumpAxis} series={bump.series} formatPeriod={fmtPeriod} onSelect={openArtist} minHeight={330} className="mt-4 flex-1" />
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-7 lg:row-span-3" i={7} hue="sun">
          <Label>Palmarés · tu campeón de cada {by === "year" ? "año" : "mes"}</Label>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {champs.slice(-12).map((c) => (
              <button
                key={c.period}
                type="button"
                onClick={() => openArtist(c.artist)}
                className="min-w-0 cursor-pointer rounded-2xl px-3.5 py-2.5 text-left transition-transform duration-200 hover:scale-[1.03]"
                style={{ background: "rgba(255,255,255,0.34)" }}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-extrabold tabular-nums">
                    <Mark r={-2}>{by === "year" ? c.period : fmtMonthShort(c.period).slice(0, 3)}</Mark>
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: "var(--muted)" }}>
                    {fmtInt(c.artistPlays)}
                  </span>
                </span>
                <span className="mt-1.5 block truncate text-[15px] leading-tight font-extrabold">{c.artist}</span>
                <span className="block truncate text-xs font-medium" style={{ color: "var(--muted)" }}>
                  {c.song}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </Bento>
    </>
  );
}
