"use client";

import { useMemo, useState } from "react";
import { dailyStreamCounts, listeningSessions } from "@/lib/stats";
import { clockByYear, deviceShare, listenerProfile, ListenerProfile } from "@/lab/analytics";
import { CalendarHeat, RadarChart, Ridgeline, StackedShare } from "@/lab/charts-habits";
import { Columns, Heatmap, RadialClock } from "@/lab/charts";
import { CountUp } from "@/lab/motion";
import { fmtDateLong, fmtDateShort, fmtInt, WEEKDAYS_LONG, WEEKDAYS_SHORT } from "@/lab/insights";
import { TabProps } from "./timeline";
import { Bento, Card, cssVars, DecoKind, Hint, Hue, IconBadge, IconName, Label, Mark } from "./ui";

/** Every axis is a real percentage, so the shape can be read and not only admired. */
const PROFILE_AXES: { key: keyof ListenerProfile; label: string; hint: string }[] = [
  { key: "constancia", label: "Constancia", hint: "Días con música de cada 100" },
  { key: "paciencia", label: "Paciencia", hint: "Canciones que no saltas, de cada 100" },
  { key: "fidelidad", label: "Fidelidad", hint: "Escuchas que se llevan tus 10 artistas favoritos" },
  { key: "nocturnidad", label: "Noche", hint: "Escuchas entre las 22:00 y las 06:00" },
  { key: "aleatorio", label: "Aleatorio", hint: "Escuchas con el modo aleatorio puesto" },
  { key: "descubrimiento", label: "Novedad", hint: "Escuchas que eran la primera vez de esa canción" },
];

const SESSION_LABELS = ["<10′", "10–30′", "30–60′", "1–2 h", "2–4 h", "+4 h"];

function fmtDuration(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min - h * 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

export default function Habitos({ ins, data, base, history, year, tl }: TabProps) {
  const skipEvery = ins.skipPct > 0 ? Math.max(2, Math.round(100 / ins.skipPct)) : 0;
  const tiles: { k: string; v: number; unit: string; text: string; hue: Hue; deco: DecoKind; icon: IconName }[] = [
    { k: "Racha más larga", v: ins.streak.longest, unit: "días seguidos", text: ins.streak.start ? `Del ${fmtDateShort(ins.streak.start)} al ${fmtDateShort(ins.streak.end)}` : "", hue: "coral", deco: "arcs", icon: "flame" },
    { k: "Día récord", v: ins.busiest.plays, unit: "canciones", text: ins.busiest.date ? `El ${fmtDateLong(ins.busiest.date)}` : "", hue: "sun", deco: "bars", icon: "trophy" },
  ];

  // calendar: one year at a time; it follows the data on screen unless the user steps to another year
  const days = useMemo(() => dailyStreamCounts(data), [data]);
  const firstYear = Number(ins.firstDate.slice(0, 4));
  const lastYear = Number(ins.lastDate.slice(0, 4)) || firstYear;
  const [pinnedYear, setPinnedYear] = useState<number | null>(null);
  // by default the latest year with enough days to be worth a look (a year that has just started is mostly blank)
  const fullestRecent = useMemo(() => {
    const perYear = new Map<number, number>();
    for (const date of days.keys()) {
      const y = Number(date.slice(0, 4));
      perYear.set(y, (perYear.get(y) || 0) + 1);
    }
    for (let y = lastYear; y >= firstYear; y--) if ((perYear.get(y) || 0) >= 120) return y;
    return lastYear;
  }, [days, firstYear, lastYear]);
  const calYear = tl.cursor !== null ? lastYear : pinnedYear !== null && pinnedYear >= firstYear && pinnedYear <= lastYear ? pinnedYear : fullestRecent;
  const daysOfYear = useMemo(() => {
    let active = 0;
    let plays = 0;
    const prefix = `${calYear}-`;
    for (const [date, n] of days) {
      if (!date.startsWith(prefix)) continue;
      active++;
      plays += n;
    }
    return { active, plays };
  }, [days, calYear]);

  const sessions = useMemo(() => listeningSessions(data), [data]);
  const longest = sessions.longestSession;

  const profile = useMemo(() => listenerProfile(data), [data]);
  const reference = useMemo(() => listenerProfile(history), [history]);
  const compare = data !== history;

  const clocks = useMemo(() => clockByYear(data), [data]);

  // device shares are counted per month, so the whole range is computed once and playback just reveals it
  const devices = useMemo(() => deviceShare(base), [base]);
  const deviceSeries = useMemo(
    () => (tl.cursor === null ? devices.series : devices.series.map((s) => ({ name: s.name, values: s.values.slice(0, tl.cursor! + 1) }))),
    [devices, tl.cursor]
  );

  const stepper = "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-base font-bold transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_9%,transparent)] disabled:cursor-default disabled:opacity-25 disabled:hover:bg-transparent";

  return (
    <Bento>
      <Card className="col-span-12 md:col-span-6 lg:col-span-4 lg:row-span-4" i={0}>
        <Label>Tu reloj de escucha (hora local)</Label>
        <div className="mt-2 flex justify-center">
          <RadialClock values={ins.hourly} size={300} />
        </div>
        <p className="mt-2 text-center text-2xl font-extrabold tracking-tight">
          Eres <Mark tone="hl">{ins.persona.title}</Mark>
        </p>
        <p className="mt-2 text-center text-sm" style={{ color: "var(--muted)" }}>
          {ins.persona.blurb}
        </p>
      </Card>

      <Card className="col-span-12 md:col-span-6 lg:col-span-5 lg:row-span-4" i={1} hue="mint">
        <div className="flex h-full flex-col">
          <Label>Reproducciones por día de la semana</Label>
          <p className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
            Tu día es el <Mark>{WEEKDAYS_LONG[ins.peakWeekday]}</Mark>
          </p>
          {/* the peak wears ink; the other days step back to white-on-colour */}
          <div className="mt-auto pt-6" style={cssVars({ "--accent": "rgba(255,255,255,0.62)" })}>
            <Columns items={ins.weekday.map((v, i) => ({ label: WEEKDAYS_SHORT[i], value: v }))} height={250} highlight={ins.peakWeekday} />
          </div>
        </div>
      </Card>

      {tiles.map((s, i) => (
        <Card key={s.k} className="col-span-12 md:col-span-6 lg:col-span-3 lg:row-span-2" i={2 + i} hue={s.hue} deco={s.deco}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Label>{s.k}</Label>
              <p className="mt-3 text-6xl leading-none font-extrabold tracking-[-0.04em]">
                <CountUp value={s.v} />
              </p>
            </div>
            <IconBadge name={s.icon} />
          </div>
          <p className="mt-2 text-lg font-bold">{s.unit}</p>
          <p className="mt-1 text-sm font-medium" style={{ color: "var(--muted)" }}>
            {s.text}
          </p>
        </Card>
      ))}

      <Card className="col-span-12 lg:col-span-9 lg:row-span-3" i={4}>
        <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Label>Tu calendario · {calYear}</Label>
            <Hint>
              Cada cuadrado es un día; cuanto más oscuro, más música. En {calYear} escuchaste {fmtInt(daysOfYear.plays)} canciones en {fmtInt(daysOfYear.active)} días.
            </Hint>
          </div>
          {year === null && tl.cursor === null && lastYear > firstYear && (
            <div className="flex items-center gap-1" role="group" aria-label="Cambiar de año">
              <button type="button" className={stepper} disabled={calYear <= firstYear} onClick={() => setPinnedYear(calYear - 1)} aria-label="Año anterior">
                ←
              </button>
              <span className="w-12 text-center text-sm font-extrabold tabular-nums">{calYear}</span>
              <button type="button" className={stepper} disabled={calYear >= lastYear} onClick={() => setPinnedYear(calYear + 1)} aria-label="Año siguiente">
                →
              </button>
            </div>
          )}
        </div>
        <CalendarHeat days={days} year={calYear} className="my-auto pt-4" />
        </div>
      </Card>

      <Card className="col-span-12 md:col-span-6 lg:col-span-3 lg:row-span-3" i={5} hue="sky">
        <div className="flex h-full flex-col">
          <Label>Tus sesiones</Label>
          <p className="mt-3 text-5xl leading-none font-extrabold tracking-[-0.04em]">
            <CountUp value={sessions.avgDuration} /> <span className="text-2xl tracking-normal">min</span>
          </p>
          <p className="mt-1.5 text-sm font-semibold">dura de media cada vez que te pones música</p>
          <div className="mt-auto pt-4" style={cssVars({ "--accent": "rgba(255,255,255,0.62)" })}>
            <Columns
              items={sessions.durationDistribution.map((b, i) => ({ label: SESSION_LABELS[i] ?? b.bucket, value: b.count, sub: "sesiones" }))}
              height={84}
              highlight={sessions.durationDistribution.reduce((best, b, i, arr) => (b.count > arr[best].count ? i : best), 0)}
            />
          </div>
          {longest && (
            <p className="mt-3 text-[13px] leading-snug font-medium" style={{ color: "var(--muted)" }}>
              La más larga: {fmtDuration(longest.durationMin)}, el {fmtDateShort(longest.date)}
            </p>
          )}
        </div>
      </Card>

      <Card className="col-span-12 lg:col-span-8 lg:row-span-3" i={6}>
        <Label>Semana tipo: día × hora</Label>
        <div className="mt-5">
          <Heatmap grid={ins.heat} />
        </div>
      </Card>

      <Card className="col-span-12 md:col-span-6 lg:col-span-4 lg:row-span-4" i={7} tone="contrast">
        <div className="flex h-full flex-col">
          <Label>Tu perfil de oyente</Label>
          <Hint>Seis rasgos, de 0 a 100. Pasa el ratón por cada uno para ver qué mide.</Hint>
          <RadarChart
            axes={PROFILE_AXES}
            series={[
              { name: year !== null ? String(year) : tl.cursor !== null ? "Hasta este mes" : "Tú", values: PROFILE_AXES.map((a) => profile[a.key]), tone: "main" },
              ...(compare ? [{ name: "Todo tu historial", values: PROFILE_AXES.map((a) => reference[a.key]), tone: "ghost" as const }] : []),
            ]}
            minHeight={290}
            className="mt-2 flex-1"
          />
        </div>
      </Card>

      <Card className="col-span-12 md:col-span-6 lg:col-span-4 lg:row-span-4" i={8}>
        <div className="flex h-full flex-col">
          <Label>Tu horario, año a año</Label>
          <Hint>Cada cresta es el reloj de un año. Si se desplaza, es que te cambió la vida (o el trabajo).</Hint>
          <Ridgeline rows={clocks.map((c) => ({ label: String(c.year), values: c.hours }))} minHeight={300} className="mt-4 flex-1" />
        </div>
      </Card>

      <Card className="col-span-12 md:col-span-6 lg:col-span-4 lg:row-span-1" i={9} hue="lilac" dense>
        <div className="flex h-full items-center gap-4">
          <IconBadge name="headphones" size={48} />
          <div className="min-w-0">
            <Label>Media diaria</Label>
            <p className="mt-1 text-xl leading-tight font-extrabold tracking-tight">
              <CountUp value={ins.avgMinutesPerActiveDay} /> min los días que escuchas
              {skipEvery ? <span className="font-semibold"> · saltas 1 de cada {skipEvery}</span> : null}
            </p>
          </div>
        </div>
      </Card>

      <Card className="col-span-12 lg:col-span-8 lg:row-span-3" i={10}>
        <div className="flex h-full flex-col">
          <Label>¿Dónde escuchas?</Label>
          <Hint>Qué parte de tus reproducciones sale de cada tipo de dispositivo, mes a mes.</Hint>
          <StackedShare periods={tl.months} series={deviceSeries} minHeight={190} className="mt-4 flex-1" />
        </div>
      </Card>
    </Bento>
  );
}
