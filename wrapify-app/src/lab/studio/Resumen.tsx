"use client";

import { useEffect, useMemo, useState } from "react";
import { AreaChart, BarList, Columns, Sparkline } from "@/lab/charts";
import { CountUp } from "@/lab/motion";
import { artistDetail, fmtDateLong, fmtDateShort, fmtHour, fmtInt, fmtMonthLong, monthSeries } from "@/lab/insights";
import { TabProps } from "./timeline";
import { Bento, Card, cssVars, Fill, IconBadge, Label, Mark, Pill, Sticker } from "./ui";

const ORDINALS = ["", "", "2.º ", "3.er ", "4.º ", "5.º ", "6.º ", "7.º ", "8.º ", "9.º ", "10.º "];

export default function Resumen({ ins, full, all, data, year, tl, openArtist, goTops }: TabProps & { goTops: () => void }) {
  const top = ins.artists[0];
  // the axis belongs to the whole range, so the line is drawn onto a fixed canvas while the history plays
  const series = useMemo(() => monthSeries(full.monthly, (i) => full.monthly[i].hours), [full]);
  const topTrend = useMemo(() => (top ? artistDetail(data, top.name).monthly.map((m) => m.plays) : []), [data, top]);

  // year by year: the years on screen, or every year (with the chosen one lit) when a single year is selected
  const yearList = year === null ? ins.years : all.years;
  const peakYear = yearList.reduce((best, y, i) => (y.hours > yearList[best].hours ? i : best), 0);
  const litYear = year === null ? peakYear : yearList.findIndex((y) => y.year === year);
  const yearRank = year === null ? 0 : yearList.filter((y) => y.hours > (yearList[litYear]?.hours ?? 0)).length + 1;

  const facts = useMemo(
    () => [
      { k: "Racha más larga", big: `${fmtInt(ins.streak.longest)} días`, text: ins.streak.start ? `seguidos, del ${fmtDateShort(ins.streak.start)} al ${fmtDateShort(ins.streak.end)}` : "seguidos" },
      { k: "Tu hora punta", big: fmtHour(ins.peakHour), text: `Eres ${ins.persona.title}. ${ins.persona.blurb}` },
      { k: "Dedo inquieto", big: `${ins.skipPct.toFixed(1).replace(".", ",")} %`, text: "de las canciones acaban en «siguiente»" },
      ...(ins.peakMonth ? [{ k: "Mes más intenso", big: `${fmtInt(ins.peakMonth.hours)} h`, text: `en ${fmtMonthLong(ins.peakMonth.ym)}` }] : []),
    ],
    [ins]
  );
  const [fact, setFact] = useState(0);
  const [hold, setHold] = useState(false);
  useEffect(() => {
    if (hold) return;
    const t = setInterval(() => setFact((f) => f + 1), 4800);
    return () => clearInterval(t);
  }, [hold]);
  const fi = fact % facts.length;
  const f = facts[fi];

  return (
    <Bento>
      <Card className="col-span-12 lg:col-span-7 lg:row-span-3" i={0} hue="coral" deco="arcs">
        <Label>Has escuchado</Label>
        <p className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2 leading-[0.88] font-extrabold tracking-[-0.045em]">
          <CountUp value={ins.totalHours} className="text-[clamp(4.5rem,10vw,9rem)]" />
          <span className="mb-3 text-2xl tracking-normal md:text-3xl">
            <Mark>horas</Mark>
          </span>
        </p>
        <p className="mt-4 max-w-xl text-base font-medium md:text-lg">
          Unos {fmtInt(ins.totalDays)} días enteros de música, entre el {fmtDateShort(ins.firstDate)} y el {fmtDateShort(ins.lastDate)}.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t-2 pt-6 md:grid-cols-4" style={{ borderColor: "var(--line)" }}>
          {[
            { l: "Reproducciones", v: ins.totalPlays },
            { l: "Artistas", v: ins.uniqueArtists },
            { l: "Canciones", v: ins.uniqueTracks },
            { l: "Días con música", v: ins.activeDays },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-3xl font-extrabold tracking-tight">
                <CountUp value={s.v} duration={1200} />
              </p>
              <p className="mt-0.5 text-[13px] font-semibold" style={{ color: "var(--muted)" }}>
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {top && (
        <Card className="col-span-12 lg:col-span-5 lg:row-span-3" i={1} hue="sun">
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Label>Tu artista nº 1</Label>
                <p key={top.name} className="lab-pop mt-3 text-[clamp(2.4rem,4.4vw,4.2rem)] leading-[0.95] font-extrabold tracking-[-0.035em] text-balance" style={{ animationDelay: tl.cursor === null ? "300ms" : "0ms" }}>
                  {top.name}
                </p>
              </div>
              <Sticker>
                <span className="block text-[10px] tracking-[0.18em] uppercase">Top</span>
                <span className="block text-3xl">1</span>
              </Sticker>
            </div>
            <p className="mt-3 text-[15px] font-semibold">
              {fmtInt(top.plays)} reproducciones · {fmtInt(top.minutes / 60)} h · desde {fmtMonthLong(top.first)}
            </p>
            <div className="mt-auto pt-5">
              <Sparkline values={topTrend} height={92} />
            </div>
            <div className="mt-4">
              <Pill onClick={() => openArtist(top.name)}>Ver su ficha →</Pill>
            </div>
          </div>
        </Card>
      )}

      <Card className="col-span-12 lg:col-span-8 lg:row-span-3" i={2}>
        <div className="flex h-full flex-col">
          <Label>Tu ritmo, mes a mes (horas)</Label>
          <Fill min={230} className="mt-5">
            <AreaChart data={series} height="fill" unit=" h" upTo={tl.cursor ?? undefined} />
          </Fill>
        </div>
      </Card>

      <Card className="col-span-12 lg:col-span-4 lg:row-span-4" i={3} hue="lilac">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Label>Artistas más escuchados</Label>
          <Pill onClick={goTops}>Ver todos →</Pill>
        </div>
        <BarList items={ins.artists.slice(0, 7).map((a) => ({ key: a.name, label: a.name, value: a.plays }))} onSelect={(it) => openArtist(it.key)} />
      </Card>

      <Card className="col-span-12 md:col-span-5 lg:col-span-3 lg:row-span-3" i={4} tone="contrast" deco="bars">
        <div className="flex h-full flex-col" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
          <Label>¿Sabías que…?</Label>
          <div key={fact} className="mt-5 flex-1">
            <p className="lab-rise text-sm font-bold">
              <Mark tone="hl" r={-2}>
                {f.k}
              </Mark>
            </p>
            <p className="lab-pop mt-3 text-[clamp(2.6rem,3.6vw,3.5rem)] leading-[0.95] font-extrabold tracking-[-0.04em]" style={{ animationDelay: "120ms" }}>
              {f.big}
            </p>
            <p className="lab-rise mt-3 text-[15px] leading-snug font-medium" style={{ animationDelay: "260ms", color: "var(--muted)" }}>
              {f.text}
            </p>
          </div>
          <div className="mt-5 flex gap-1.5">
            {facts.map((x, i) => (
              <button
                key={x.k}
                type="button"
                aria-label={x.k}
                onClick={() => setFact(i)}
                className="h-2 cursor-pointer rounded-full transition-all duration-500"
                style={{ width: i === fi ? 30 : 8, background: i === fi ? "var(--accent)" : "var(--line)" }}
              />
            ))}
          </div>
        </div>
      </Card>

      <Card className="col-span-12 md:col-span-7 lg:col-span-5 lg:row-span-3" i={5} hue="mint">
        <div className="flex h-full flex-col">
          <Label>Año a año (horas)</Label>
          {yearList[litYear] && (
            <p className="mt-3 text-2xl leading-tight font-extrabold tracking-tight md:text-[1.7rem]">
              {year === null ? (
                <>
                  Tu año más intenso fue <Mark>{yearList[litYear].year}</Mark>
                </>
              ) : (
                <>
                  <Mark>{year}</Mark> fue tu {ORDINALS[yearRank] ?? `${yearRank}.º `}año con más música
                </>
              )}
            </p>
          )}
          {/* the lit year wears ink; the others step back to white-on-colour */}
          <div className="mt-auto pt-5" style={cssVars({ "--accent": "rgba(255,255,255,0.62)" })}>
            <Columns
              items={yearList.map((y) => ({ label: yearList.length > 8 ? `’${String(y.year).slice(2)}` : String(y.year), value: y.hours, sub: `${y.year} · nº 1: ${y.topArtist}` }))}
              height={150}
              unit=" h"
              highlight={litYear}
            />
          </div>
        </div>
      </Card>

      <Card className="col-span-12 lg:col-span-4 lg:row-span-3" i={6} hue="pink">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Label>Canciones más escuchadas</Label>
          <Pill onClick={goTops}>Ver todas →</Pill>
        </div>
        <BarList
          items={ins.songs.slice(0, 5).map((s) => ({ key: s.track + "\u0000" + s.artist, label: s.track, sub: s.artist, value: s.plays }))}
          onSelect={(it) => openArtist(it.sub || "")}
        />
      </Card>

      <Card className="col-span-12 lg:col-span-8 lg:row-span-1" i={7} hue="sky" dense>
        <div className="flex h-full items-center gap-4">
          <IconBadge name="trophy" size={48} />
          <div className="min-w-0 flex-1">
            <Label>Tu día récord</Label>
            <p className="mt-1 truncate text-xl font-extrabold tracking-tight md:text-2xl">
              {fmtInt(ins.busiest.plays)} canciones el {fmtDateLong(ins.busiest.date)}
            </p>
          </div>
          {ins.busiest.topTrack && (
            <button
              type="button"
              onClick={() => openArtist(ins.busiest.topArtist || "")}
              className="hidden max-w-[42%] min-w-0 cursor-pointer rounded-2xl px-4 py-2 text-left transition-transform duration-200 hover:scale-[1.03] md:block"
              style={{ background: "rgba(255,255,255,0.32)" }}
            >
              <span className="block text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--muted)" }}>
                Lo que más sonó
              </span>
              <span className="block truncate text-[15px] font-bold">
                {ins.busiest.topTrack} · {ins.busiest.topArtist}
              </span>
            </button>
          )}
        </div>
      </Card>
    </Bento>
  );
}
