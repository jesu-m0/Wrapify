"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { comebackSongs, oneHitWonders } from "@/lib/stats";
import { artistDuel, artistPoints, concentration, discovery, playFlows, retentionCohorts, songHalfLife } from "@/lab/analytics";
import { SERIES } from "@/lab/chart-kit";
import { ConcentrationCurve, MatrixHeat, QuadrantScatter, Sankey } from "@/lab/charts-analysis";
import { DuelBars, MultiLine } from "@/lab/charts-habits";
import { AreaChart, Columns } from "@/lab/charts";
import { fmtDateShort, fmtInt, fmtMonthLong, monthSeries } from "@/lab/insights";
import { TabProps } from "./timeline";
import { Bento, Card, cssVars, Fill, Hint, Icon, Label, Mark, Segmented, TINT } from "./ui";

/* ── The artist map: three ways to cut the same cloud of artists ── */

const LENSES = ["Variedad", "Vigencia", "Paciencia"] as const;
type Lens = (typeof LENSES)[number];

const fmtPct = (n: number) => `${n.toFixed(1).replace(".", ",")} %`;

const LENS: Record<
  Lens,
  {
    hint: string;
    xLabel: string;
    yLabel: string;
    xLog?: boolean;
    yLog?: boolean;
    yFormat?: (n: number) => string;
    quadrants: { tl: string; tr: string; bl: string; br: string };
  }
> = {
  Variedad: {
    hint: "¿Le conoces toda la discografía o solo un par de temas? A la derecha, a quién escuchas más; arriba, de quién escuchas más canciones distintas.",
    xLabel: "Reproducciones",
    yLabel: "Canciones distintas",
    xLog: true,
    yLog: true,
    quadrants: { tl: "Mucho catálogo, poco uso", tr: "Fan total", bl: "De paso", br: "Un par de himnos" },
  },
  Vigencia: {
    hint: "¿Quién aguanta el paso del tiempo? A la derecha, los que llevan más contigo; arriba, los que más han sonado en los últimos seis meses.",
    xLabel: "Meses desde que lo descubriste",
    yLabel: "Escuchas en los últimos 6 meses",
    yLog: true,
    quadrants: { tl: "Flechazos recientes", tr: "Clásicos vivos", bl: "Recién llegados", br: "Viejas glorias" },
  },
  Paciencia: {
    hint: "¿A quién dejas sonar y a quién le das a «siguiente»? A la derecha, a quién escuchas más; arriba, a quién saltas más.",
    xLabel: "Reproducciones",
    yLabel: "Canciones saltadas",
    xLog: true,
    yFormat: fmtPct,
    quadrants: { tl: "Los pasas rápido", tr: "Amor-odio", bl: "Sin prisa", br: "Intocables" },
  },
};

/* ── A small searchable picker for the head-to-head ── */

function ArtistPicker({
  value,
  options,
  color,
  onChange,
  align = "left",
}: {
  value: string;
  options: { name: string; plays: number }[];
  color: string;
  onChange: (name: string) => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (needle ? options.filter((o) => o.name.toLowerCase().includes(needle)) : options).slice(0, 7);
  }, [q, options]);

  const choose = (name: string) => {
    onChange(name);
    setOpen(false);
    setQ("");
  };

  return (
    <div ref={box} className={`relative min-w-0 ${align === "right" ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`group flex max-w-full cursor-pointer items-center gap-2.5 ${align === "right" ? "ml-auto flex-row-reverse" : ""}`}
      >
        <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: color }} />
        <span className="truncate text-xl leading-tight font-extrabold tracking-tight md:text-2xl">{value || "Elige artista"}</span>
        <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors group-hover:bg-[var(--ink)] group-hover:text-[var(--g-bg)]" style={{ background: TINT }}>
          cambiar
        </span>
      </button>
      {open && (
        <div
          className={`lab-pop absolute top-full z-20 mt-2 w-[min(280px,80vw)] rounded-3xl border p-2 text-left shadow-[0_18px_40px_-18px_rgba(30,23,40,0.55)] ${align === "right" ? "right-0" : "left-0"}`}
          style={{ background: "var(--g-bg)", borderColor: "var(--line)", animationDuration: "0.25s" }}
        >
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && matches[0] && choose(matches[0].name)}
            placeholder="Busca un artista…"
            aria-label="Buscar artista"
            className="w-full rounded-full border-2 px-4 py-2 text-sm font-semibold outline-none placeholder:font-medium placeholder:text-[var(--muted)] focus:border-[var(--ink)]"
            style={{ borderColor: "var(--line)" }}
          />
          <ul className="mt-1.5">
            {matches.map((o) => (
              <li key={o.name}>
                <button
                  type="button"
                  onClick={() => choose(o.name)}
                  className="flex w-full cursor-pointer items-baseline justify-between gap-3 rounded-2xl px-3 py-1.5 text-left text-sm font-semibold transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_9%,transparent)]"
                >
                  <span className="truncate">{o.name}</span>
                  <span className="shrink-0 text-xs tabular-nums" style={{ color: "var(--muted)" }}>
                    {fmtInt(o.plays)}
                  </span>
                </button>
              </li>
            ))}
            {matches.length === 0 && (
              <li className="px-3 py-2 text-sm" style={{ color: "var(--muted)" }}>
                Nadie con ese nombre.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

const DISCOVERY_VIEWS = ["Artistas nuevos", "Canciones nuevas", "Variedad"] as const;

export default function Explorar({ ins, data, base, history, year, tl, openArtist }: TabProps) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return ins.allArtists.filter((a) => a.name.toLowerCase().includes(needle)).slice(0, 8);
  }, [q, ins]);
  const wonders = useMemo(() => oneHitWonders(data, 6), [data]);
  const comebacks = useMemo(() => comebackSongs(data, 4), [data]);

  /* artist map */
  const [lens, setLens] = useState<Lens>("Variedad");
  const points = useMemo(() => artistPoints(data, 15, 140), [data]);
  const scatter = useMemo(
    () =>
      points.map((p) => ({
        key: p.name,
        label: p.name,
        size: p.hours,
        x: lens === "Vigencia" ? p.monthsSinceFirst : p.plays,
        y: lens === "Variedad" ? p.tracks : lens === "Vigencia" ? p.recentPlays : p.skipPct,
      })),
    [points, lens]
  );

  /* head to head: the two favourites until the user picks someone else */
  const [pickA, setPickA] = useState<string | null>(null);
  const [pickB, setPickB] = useState<string | null>(null);
  const a = pickA ?? ins.artists[0]?.name ?? "";
  const b = pickB ?? ins.artists.find((x) => x.name !== a)?.name ?? "";
  const duel = useMemo(() => artistDuel(data, a, b), [data, a, b]);
  const daysSince = (date: string) => (date ? Math.round((Date.parse(ins.lastDate) - Date.parse(date)) / 86400000) : 0);

  /* loyalty: cohorts need several years, so a single selected year falls back to the whole history */
  const cohorts = useMemo(() => retentionCohorts(year === null ? data : history), [data, history, year]);
  const cohortRows = cohorts.cohorts.filter((c) => c.retention.length > 1);
  const cohortCols = Array.from({ length: Math.max(0, cohorts.maxOffset) }, (_, k) => `+${k + 1} ${k === 0 ? "año" : "años"}`);

  const conc = useMemo(() => concentration(data), [data]);
  const halfX = conc.artists ? (conc.halfCount / conc.artists) * 100 : 0;

  /* discovery is counted month by month, so playback only reveals what is already computed */
  const [discView, setDiscView] = useState<(typeof DISCOVERY_VIEWS)[number]>("Artistas nuevos");
  const disc = useMemo(() => discovery(base), [base]);
  const discSeries = useMemo(() => {
    const values = discView === "Artistas nuevos" ? disc.newArtists : discView === "Canciones nuevas" ? disc.newSongs : disc.effectiveArtists;
    return monthSeries(
      disc.months.map((ym) => ({ ym })),
      (i) => values[i]
    );
  }, [disc, discView]);

  const half = useMemo(() => songHalfLife(data), [data]);
  const halfPeak = half.buckets.reduce((best, bk, i, arr) => (bk.count > arr[best].count ? i : best), 0);
  const flows = useMemo(() => playFlows(data), [data]);
  const letItPlay = flows.total ? ((flows.targets.find((t) => t.name === "Sonó entera")?.value ?? 0) / flows.total) * 100 : 0;

  return (
    <Bento>
      <Card className="col-span-12 lg:row-span-2" i={0}>
        <Label>Busca cualquier artista de tu historial</Label>
        <div className="relative mt-4">
          <span className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2" style={{ color: "var(--muted)" }}>
            <Icon name="search" />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Prueba con «${ins.artists[1]?.name ?? ins.artists[0]?.name ?? "tu artista favorito"}»`}
            aria-label="Buscar artista"
            className="w-full rounded-full border-2 py-4 pr-6 pl-14 text-lg font-semibold outline-none transition-[border-color,box-shadow] duration-300 placeholder:font-medium placeholder:text-[var(--muted)] focus:border-[var(--ink)] focus:shadow-[0_0_0_5px_var(--line)]"
            style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--ink) 4%, transparent)" }}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(q.trim() ? results : ins.allArtists.slice(0, 12)).map((x, i) => (
            <button
              key={x.name}
              type="button"
              onClick={() => openArtist(x.name)}
              className="lab-pop group cursor-pointer rounded-full px-4 py-2 text-sm font-bold transition-[background-color,color,scale] duration-200 hover:scale-105 hover:bg-[var(--ink)] hover:text-[var(--g-bg)] active:scale-95"
              style={{ animationDelay: `${i * 35}ms`, background: TINT }}
            >
              {x.name}
              <span className="ml-2 text-xs font-semibold tabular-nums opacity-60">{fmtInt(x.plays)}</span>
            </button>
          ))}
          {q.trim() && results.length === 0 && (
            <p className="py-2 text-sm" style={{ color: "var(--muted)" }}>
              No hay ningún artista que se llame así en tu historial.
            </p>
          )}
        </div>
      </Card>

      <Card className="col-span-12 lg:col-span-8 lg:row-span-5" i={1}>
        <div className="flex h-full flex-col">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <Label>El mapa de tus artistas</Label>
            <Segmented options={LENSES} value={lens} onChange={setLens} className="w-full sm:w-[330px]" />
          </div>
          <Hint>{LENS[lens].hint} Cada punto es un artista (más grande = más horas); las líneas discontinuas marcan la mediana.</Hint>
          <QuadrantScatter
            points={scatter}
            xLabel={LENS[lens].xLabel}
            yLabel={LENS[lens].yLabel}
            xLog={LENS[lens].xLog}
            yLog={LENS[lens].yLog}
            yFormat={LENS[lens].yFormat}
            quadrants={LENS[lens].quadrants}
            onSelect={(d) => openArtist(d.key)}
            minHeight={380}
            className="mt-4 flex-1"
          />
        </div>
      </Card>

      <Card className="col-span-12 lg:col-span-4 lg:row-span-5" i={2} hue="pink">
        <Label>One-hit wonders personales</Label>
        <p className="mt-2 mb-4 text-base font-semibold">Artistas de los que, en realidad, solo escuchas una canción.</p>
        {wonders.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>No hay ninguno en este periodo.</p>}
        <ul className="flex flex-col gap-1">
          {wonders.map((w) => (
            <li key={w.artist}>
              <button
                type="button"
                onClick={() => openArtist(w.artist)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-[background,transform] duration-200 hover:translate-x-1 hover:bg-[color-mix(in_srgb,var(--ink)_9%,transparent)]"
              >
                <span className="w-[4.6rem] shrink-0 text-[1.7rem] font-extrabold tracking-tight tabular-nums">{Math.round(w.pct)}%</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold">{w.topSong}</span>
                  <span className="block truncate text-[13px] font-medium" style={{ color: "var(--muted)" }}>
                    {w.artist} · {fmtInt(w.topCount)} de {fmtInt(w.total)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="col-span-12 lg:col-span-7 lg:row-span-6" i={3}>
        <div className="flex h-full flex-col">
          <Label>Cara a cara</Label>
          <Hint>Dos artistas, frente a frente, como las estadísticas de un partido. El marcador cuenta los meses en los que cada uno sonó más que el otro.</Hint>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <ArtistPicker value={a} options={ins.allArtists} color={SERIES[0]} onChange={setPickA} />
            <p className="rounded-2xl px-3 py-1.5 text-2xl font-extrabold tracking-tight tabular-nums md:text-3xl" style={{ background: "var(--ink)", color: "var(--g-bg)" }}>
              {duel.monthsWonA}–{duel.monthsWonB}
            </p>
            <ArtistPicker value={b} options={ins.allArtists} color={SERIES[1]} onChange={setPickB} align="right" />
          </div>
          <DuelBars
            className="mt-5"
            rows={[
              { label: "Reproducciones", a: duel.a.plays, b: duel.b.plays },
              { label: "Horas", a: duel.a.hours, b: duel.b.hours },
              { label: "Canciones distintas", a: duel.a.tracks, b: duel.b.tracks },
              { label: "Días que sonó", a: duel.a.activeDays, b: duel.b.activeDays },
              { label: "Saltadas", a: duel.a.skipPct, b: duel.b.skipPct, format: fmtPct, lowerWins: true },
              {
                label: "Contigo desde",
                a: daysSince(duel.a.first),
                b: daysSince(duel.b.first),
                aText: duel.a.first ? fmtDateShort(duel.a.first) : "—",
                bText: duel.b.first ? fmtDateShort(duel.b.first) : "—",
              },
            ]}
          />
          <MultiLine
            periods={tl.months}
            series={[
              { name: a, values: duel.a.monthly },
              { name: b, values: duel.b.monthly },
            ]}
            smooth={3}
            minHeight={170}
            className="mt-5 flex-1"
          />
        </div>
      </Card>

      <Card className="col-span-12 lg:col-span-5 lg:row-span-3" i={4}>
        <Label>¿Eres fiel a lo que descubres?</Label>
        <Hint>
          De los artistas que descubriste cada año, qué porcentaje seguías escuchando los años siguientes.
          {year !== null ? " (Con todo tu historial: un solo año no da para comparar.)" : ""}
        </Hint>
        <MatrixHeat
          className="mt-4"
          rows={cohortRows.map((c) => ({ label: String(c.year), sub: `${fmtInt(c.size)} artistas`, values: c.retention.slice(1) }))}
          cols={cohortCols}
          max={100}
          format={(v) => `${Math.round(v)}%`}
          hint="Pasa el ratón por una celda"
          tip={(r, c, v) => `De los ${fmtInt(cohortRows[r].size)} artistas que descubriste en ${cohortRows[r].year}, el ${Math.round(v)} % seguía sonando ${c + 1} ${c === 0 ? "año" : "años"} después`}
        />
      </Card>

      <Card className="col-span-12 lg:col-span-5 lg:row-span-3" i={5} tone="contrast">
        <div className="flex h-full flex-col">
          <Label>¿Cuánto se concentra tu música?</Label>
          <p className="mt-3 text-2xl leading-tight font-extrabold tracking-tight">
            <Mark tone="hl">{fmtInt(conc.halfCount)} artistas</Mark> suman la mitad de todo lo que escuchas
          </p>
          <p className="mt-1.5 text-[13px] font-medium" style={{ color: "var(--muted)" }}>
            Y eso que por aquí han pasado {fmtInt(conc.artists)}. El 1 % más escuchado se lleva el {fmtPct(conc.top1Share)}.
          </p>
          <ConcentrationCurve
            curve={conc.curve}
            marks={conc.artists ? [{ x: halfX, y: 50, label: `${fmtInt(conc.halfCount)} artistas · 50 %` }] : []}
            xLabel="Tus artistas, del más al menos escuchado →"
            yLabel="Reproducciones acumuladas"
            minHeight={150}
            className="mt-3 flex-1"
          />
        </div>
      </Card>

      <Card className="col-span-12 lg:col-span-5 lg:row-span-4" i={6} hue="mint">
        <div className="flex h-full flex-col">
          <Label>¿Cuánto te dura una canción?</Label>
          <p className="mt-3 text-2xl leading-tight font-extrabold tracking-tight">
            La mitad de las escuchas de una canción llegan en sus primeros <Mark>{fmtInt(half.medianDays)} días</Mark>
          </p>
          <p className="mt-1.5 text-[13px] font-medium" style={{ color: "var(--muted)" }}>
            Tiempo que tarda cada canción en gastar la mitad de sus reproducciones ({fmtInt(half.songs)} canciones con 20 escuchas o más).
          </p>
          <div className="mt-auto pt-5" style={cssVars({ "--accent": "rgba(255,255,255,0.62)" })}>
            <Columns items={half.buckets.map((bk) => ({ label: bk.label.replace(" semanas", " sem").replace(" semana", " sem").replace(" meses", " m").replace(" años", " a"), value: bk.count, sub: "canciones" }))} height={120} highlight={halfPeak} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { title: "Flor de un día", list: half.fastest },
              { title: "A fuego lento", list: half.slowest },
            ].map((g) => (
              <div key={g.title} className="min-w-0 rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.3)" }}>
                <p className="text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--muted)" }}>
                  {g.title}
                </p>
                {g.list.slice(0, 2).map((s) => (
                  <button key={s.track + s.artist} type="button" onClick={() => openArtist(s.artist)} className="mt-1.5 block w-full min-w-0 cursor-pointer text-left">
                    <span className="block truncate text-sm font-bold">{s.track}</span>
                    <span className="block truncate text-xs font-medium" style={{ color: "var(--muted)" }}>
                      {s.days < 1 ? "el mismo día" : `${fmtInt(s.days)} ${Math.round(s.days) === 1 ? "día" : "días"}`} · {s.artist}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="col-span-12 lg:col-span-7 lg:row-span-4" i={7}>
        <div className="flex h-full flex-col">
          <Label>¿Cómo navegas tu música?</Label>
          <Hint>
            A la izquierda, cómo empezó a sonar cada canción; a la derecha, cómo terminó. Dejas sonar hasta el final el {fmtPct(letItPlay)} de lo que escuchas.
          </Hint>
          <Sankey sources={flows.sources} targets={flows.targets} links={flows.links} total={flows.total} minHeight={300} className="mt-4 flex-1" />
        </div>
      </Card>

      <Card className="col-span-12 lg:col-span-8 lg:row-span-3" i={8}>
        <div className="flex h-full flex-col">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <Label>Tu lado explorador, mes a mes</Label>
            <Segmented options={DISCOVERY_VIEWS} value={discView} onChange={setDiscView} className="w-full sm:w-[520px]" />
          </div>
          <Hint>
            {discView === "Variedad"
              ? "Cuántos artistas llenan de verdad cada mes: 1 sería un mes de un solo artista; cuanto más alto, más repartido."
              : `${discView} que sonaron por primera vez cada mes. Los picos son tus épocas de descubrimiento.`}
          </Hint>
          <Fill min={170} className="mt-4">
            <AreaChart data={discSeries} height="fill" upTo={tl.cursor ?? undefined} />
          </Fill>
        </div>
      </Card>

      <Card className="col-span-12 lg:col-span-4 lg:row-span-3" i={9} hue="sky">
        <Label>Grandes regresos</Label>
        <p className="mt-2 mb-3 text-base font-semibold">Canciones que desaparecieron durante meses y un día volvieron.</p>
        {comebacks.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>No hay ninguno en este periodo.</p>}
        <ul className="flex flex-col">
          {comebacks.map((c) => (
            <li key={c.name} className="flex items-center gap-3 px-1 py-1.5">
              <span className="w-12 shrink-0 text-[1.7rem] font-extrabold tracking-tight tabular-nums">{c.gapMonths}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold">{c.name}</span>
                <span className="block truncate text-[13px] font-medium" style={{ color: "var(--muted)" }}>
                  meses en silencio · volvió en {fmtMonthLong(c.comebackMonth)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </Bento>
  );
}
