"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { SpotifyStream } from "@/types/spotify";
import { comebackSongs, oneHitWonders } from "@/lib/stats";
import DataGate from "@/lab/DataGate";
import LabSwitcher from "@/lab/LabSwitcher";
import { AreaChart, BarList, Heatmap } from "@/lab/charts";
import { CountUp, Reveal } from "@/lab/motion";
import { setLabData } from "@/lab/store";
import {
  buildInsights,
  fmtDateLong,
  fmtDateShort,
  fmtHour,
  fmtInt,
  fmtMonthLong,
  monthSeries,
  WEEKDAYS_LONG,
} from "@/lab/insights";

/*
 * Version B — "Revista".
 * A light, editorial long-scroll: your history as a magazine feature.
 * Serif display type, one accent colour, charts that draw in as you read.
 */

export default function RevistaPage() {
  return (
    <div className="theme-revista">
      <DataGate tagline="Tu historial, maquetado como un reportaje.">{(data) => <Revista data={data} />}</DataGate>
    </div>
  );
}

const CHAPTERS = [
  { id: "tiempo", n: "01", title: "El tiempo" },
  { id: "artistas", n: "02", title: "Los de siempre" },
  { id: "canciones", n: "03", title: "La banda sonora" },
  { id: "anos", n: "04", title: "Año a año" },
  { id: "rutinas", n: "05", title: "Tus rutinas" },
  { id: "rarezas", n: "06", title: "Rarezas" },
];

function Chapter({ id, n, title, deck, children }: { id: string; n: string; title: string; deck: ReactNode; children: ReactNode }) {
  return (
    <section id={id} data-chapter={id} className="mx-auto max-w-6xl scroll-mt-20 px-8 py-24">
      <Reveal>
        <div className="flex items-baseline gap-5 border-t-2 pt-5" style={{ borderColor: "var(--ink)" }}>
          <span className="lab-serif text-2xl italic" style={{ color: "var(--accent)" }}>
            {n}
          </span>
          <h2 className="lab-serif text-[clamp(2.6rem,6vw,5.5rem)] leading-none font-semibold tracking-tight">{title}</h2>
        </div>
        <p className="mt-6 max-w-2xl text-xl leading-relaxed" style={{ color: "var(--muted)" }}>
          {deck}
        </p>
      </Reveal>
      <div className="mt-12">{children}</div>
    </section>
  );
}

const Mark = ({ children }: { children: ReactNode }) => (
  <strong className="font-semibold" style={{ color: "var(--ink)", boxShadow: "inset 0 -0.45em 0 color-mix(in srgb, var(--accent) 28%, transparent)" }}>
    {children}
  </strong>
);

function Vinyl({ label }: { label: string }) {
  return (
    <div className="lab-spin relative aspect-square w-full max-w-[340px]">
      <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-xl">
        <circle cx="100" cy="100" r="98" fill="#1b1814" />
        {[88, 80, 72, 64, 56, 48].map((r) => (
          <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#fff" strokeOpacity="0.07" strokeWidth="1" />
        ))}
        <path d="M100 2 A98 98 0 0 1 198 100" fill="none" stroke="#fff" strokeOpacity="0.12" strokeWidth="3" />
        <circle cx="100" cy="100" r="36" fill="var(--accent)" />
        <circle cx="100" cy="100" r="3.5" fill="#f4efe6" />
        <defs>
          <path id="lab-vinyl-arc" d="M100 100 m-26 0 a26 26 0 1 1 52 0 a26 26 0 1 1 -52 0" />
        </defs>
        <text fontSize="7.5" fontWeight="700" fill="#fffaf2" letterSpacing="1.2">
          <textPath href="#lab-vinyl-arc">{label.toUpperCase().slice(0, 44)}</textPath>
        </text>
      </svg>
    </div>
  );
}

function Revista({ data }: { data: SpotifyStream[] }) {
  const ins = useMemo(() => buildInsights(data), [data]);
  const wonders = useMemo(() => oneHitWonders(data, 1), [data]);
  const comebacks = useMemo(() => comebackSongs(data, 1), [data]);
  const [active, setActive] = useState<string>("");
  const progressRef = useRef<HTMLDivElement>(null);
  const yearsRef = useRef<HTMLDivElement>(null);

  // reading progress bar (direct DOM write: no re-render per scroll frame)
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // which chapter is being read
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.chapter || "");
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    document.querySelectorAll("[data-chapter]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const top = ins.artists[0];
  const topShare = top ? (top.plays / ins.totalPlays) * 100 : 0;
  const series = useMemo(() => monthSeries(ins.monthly, (i) => ins.monthly[i].hours), [ins]);
  const y0 = ins.firstDate.slice(0, 4);
  const y1 = ins.lastDate.slice(0, 4);
  const marquee = ins.artists.slice(0, 14).map((a) => a.name);
  const sideA = ins.songs.slice(0, 5);
  const sideB = ins.songs.slice(5, 10);

  return (
    <div className="lab-paper min-h-screen" style={{ color: "var(--ink)" }}>
      {/* masthead */}
      <header className="sticky top-0 z-40 backdrop-blur-md" style={{ background: "color-mix(in srgb, var(--g-bg) 82%, transparent)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-3">
          <span className="lab-serif text-xl font-bold tracking-tight">
            Wrapify<span style={{ color: "var(--accent)" }}>.</span>
          </span>
          <span className="hidden text-xs font-medium uppercase tracking-[0.22em] md:block" style={{ color: "var(--muted)" }}>
            Edición personal · {y0}–{y1}
          </span>
          <div className="flex items-center gap-2">
            <LabSwitcher current="/lab/revista" />
            <button
              type="button"
              onClick={() => setLabData(null)}
              className="cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold transition-colors hover:bg-black/5"
              style={{ borderColor: "var(--g-border)" }}
            >
              Cambiar datos
            </button>
          </div>
        </div>
        <div className="h-[3px]" style={{ background: "var(--line)" }}>
          <div ref={progressRef} className="h-full origin-left" style={{ background: "var(--accent)", transform: "scaleX(0)" }} />
        </div>
      </header>

      {/* chapter rail */}
      <nav aria-label="Capítulos" className="fixed top-1/2 right-5 z-30 hidden -translate-y-1/2 flex-col gap-1 xl:flex">
        {CHAPTERS.map((c) => {
          const on = active === c.id;
          return (
            <a key={c.id} href={`#${c.id}`} className="group flex items-center justify-end gap-2 py-1.5">
              <span
                className="text-xs font-medium transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                style={{ opacity: on ? 1 : 0, transform: on ? "none" : "translateX(6px)", color: on ? "var(--ink)" : "var(--muted)" }}
              >
                {c.title}
              </span>
              <span
                className="block h-[3px] rounded-full transition-all duration-300"
                style={{ width: on ? 28 : 14, background: on ? "var(--accent)" : "var(--g-border)" }}
              />
            </a>
          );
        })}
      </nav>

      {/* hero */}
      <section className="mx-auto max-w-6xl px-8 pt-20 pb-10">
        <p className="lab-rise text-sm font-medium uppercase tracking-[0.25em]" style={{ color: "var(--muted)" }}>
          Del {fmtDateLong(ins.firstDate)} al {fmtDateLong(ins.lastDate)}
        </p>
        <h1 className="lab-serif mt-6 text-[clamp(3.4rem,10vw,10rem)] leading-[0.92] font-semibold tracking-[-0.03em]">
          <span className="-mb-[0.1em] block overflow-hidden pb-[0.1em]">
            <span className="lab-mask-in block" style={{ animationDelay: "100ms" }}>
              Tu vida en
            </span>
          </span>
          <span className="-mb-[0.1em] block overflow-hidden pb-[0.1em]">
            <span className="lab-mask-in block italic" style={{ animationDelay: "260ms", color: "var(--accent)" }}>
              <CountUp value={ins.totalPlays} duration={2400} delay={400} />
            </span>
          </span>
          <span className="-mb-[0.1em] block overflow-hidden pb-[0.1em]">
            <span className="lab-mask-in block" style={{ animationDelay: "420ms" }}>
              canciones
            </span>
          </span>
        </h1>
        <p className="lab-rise mt-10 max-w-2xl text-2xl leading-relaxed" style={{ animationDelay: "900ms", color: "var(--muted)" }}>
          Durante {ins.spanYears} {ins.spanYears === 1 ? "año" : "años"} pasaste <Mark>{fmtInt(ins.totalHours)} horas</Mark> con los
          auriculares puestos, entre <Mark>{fmtInt(ins.uniqueArtists)} artistas</Mark> distintos. Este es el reportaje de todo lo que sonó.
        </p>
        <p className="lab-rise mt-10 text-sm font-medium" style={{ animationDelay: "1300ms", color: "var(--muted)" }}>
          <span className="lab-float inline-block">↓</span> Sigue bajando
        </p>
      </section>

      {/* marquee of names */}
      <div className="overflow-hidden border-y py-5" style={{ borderColor: "var(--ink)" }} aria-hidden>
        <div className="lab-marquee">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 items-center">
              {marquee.map((name, i) => (
                <span key={name} className={`lab-serif px-6 text-5xl font-semibold whitespace-nowrap ${i % 2 ? "lab-outline italic" : ""}`}>
                  {name}
                  <span className="pl-12 not-italic" style={{ color: "var(--accent)", WebkitTextStroke: 0 }}>
                    ✺
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 01 — time */}
      <Chapter
        id="tiempo"
        n="01"
        title="El tiempo"
        deck={
          <>
            Si lo pusieras todo seguido, tendrías música para <Mark>{fmtInt(ins.totalDays)} días</Mark> sin parar.
            {ins.peakMonth && (
              <>
                {" "}
                Tu mes más intenso fue <Mark>{fmtMonthLong(ins.peakMonth.ym)}</Mark>, con {fmtInt(ins.peakMonth.hours)} horas.
              </>
            )}
          </>
        }
      >
        <div className="grid gap-x-10 gap-y-12 md:grid-cols-3">
          {[
            { v: ins.totalHours, l: "horas escuchadas" },
            { v: ins.activeDays, l: "días con música" },
            { v: ins.avgMinutesPerActiveDay, l: "minutos al día, de media" },
          ].map((s, i) => (
            <Reveal key={s.l} delay={i * 120}>
              <div className="lab-serif text-7xl leading-none font-semibold tracking-tight">
                <CountUp value={s.v} />
              </div>
              <p className="mt-3 border-t pt-3 text-sm font-medium uppercase tracking-[0.18em]" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
                {s.l}
              </p>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-16">
          <h3 className="mb-6 text-sm font-semibold uppercase tracking-[0.18em]">Horas de música, mes a mes</h3>
          <AreaChart data={series} height={320} unit=" h" />
        </Reveal>
      </Chapter>

      {/* 02 — artists */}
      {top && (
        <Chapter
          id="artistas"
          n="02"
          title="Los de siempre"
          deck="Hay artistas que pasan y artistas que se quedan a vivir. Estos son los que más alquiler te deben."
        >
          <div className="grid gap-14 lg:grid-cols-[1.1fr_1fr]">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                Nº 1 indiscutible
              </p>
              <h3 className="lab-serif mt-3 text-[clamp(3rem,7vw,6.5rem)] leading-[0.95] font-semibold tracking-tight text-balance italic">
                {top.name}
              </h3>
              <p className="lab-dropcap mt-8 text-lg leading-relaxed" style={{ color: "var(--muted)" }}>
                Desde {fmtMonthLong(top.first)}, {top.name} ha sonado <Mark>{fmtInt(top.plays)} veces</Mark> en tus auriculares: unas{" "}
                {fmtInt(top.minutes / 60)} horas, o lo que es lo mismo, <Mark>{topShare.toFixed(1)}%</Mark> de todo lo que has escuchado.
                {ins.topArtistTopSong && <> Su canción que más has repetido es «{ins.topArtistTopSong}».</>}
              </p>
            </Reveal>
            <Reveal delay={150}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em]">Los diez primeros, por reproducciones</h3>
              <BarList items={ins.artists.slice(0, 10).map((a) => ({ key: a.name, label: a.name, value: a.plays }))} />
            </Reveal>
          </div>
        </Chapter>
      )}

      {/* 03 — songs */}
      {sideA.length > 0 && (
        <Chapter
          id="canciones"
          n="03"
          title="La banda sonora"
          deck={
            <>
              Si tu historial fuese un vinilo, este sería el tracklist. Abre la cara A <Mark>«{sideA[0].track}»</Mark>, que has puesto{" "}
              {fmtInt(sideA[0].plays)} veces.
            </>
          }
        >
          <div className="grid items-center gap-14 lg:grid-cols-[auto_1fr]">
            <Reveal className="flex justify-center lg:w-[340px]">
              <Vinyl label={`${sideA[0].track} · ${sideA[0].artist} · `} />
            </Reveal>
            <div className="grid gap-10 md:grid-cols-2">
              {[
                { name: "Cara A", list: sideA, start: 1 },
                { name: "Cara B", list: sideB, start: 6 },
              ].map((side, k) => (
                <Reveal key={side.name} delay={k * 150}>
                  <p className="lab-serif border-b-2 pb-2 text-2xl font-semibold italic" style={{ borderColor: "var(--ink)" }}>
                    {side.name}
                  </p>
                  <ol>
                    {side.list.map((s, i) => (
                      <li
                        key={s.track + s.artist}
                        className="group flex items-baseline gap-4 border-b py-3.5 transition-[padding] duration-300 hover:pl-2"
                        style={{ borderColor: "var(--line)" }}
                      >
                        <span className="lab-serif w-7 text-xl tabular-nums italic" style={{ color: "var(--accent)" }}>
                          {side.start + i}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-lg font-semibold">{s.track}</span>
                          <span className="block truncate text-sm" style={{ color: "var(--muted)" }}>
                            {s.artist}
                          </span>
                        </span>
                        <span className="text-sm tabular-nums" style={{ color: "var(--muted)" }}>
                          {fmtInt(s.plays)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </Reveal>
              ))}
            </div>
          </div>
        </Chapter>
      )}

      {/* 04 — years */}
      <Chapter id="anos" n="04" title="Año a año" deck="Cada año tuvo su dueño y su himno. Desliza para viajar en el tiempo.">
        <Reveal>
          <div ref={yearsRef} className="lab-noscroll -mx-8 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-8 pb-4">
            {ins.years.map((y) => (
              <article
                key={y.year}
                className="group w-[300px] shrink-0 snap-start rounded-[28px] border p-7 transition-[transform,box-shadow,background] duration-300 hover:-translate-y-2 hover:shadow-xl"
                style={{ borderColor: "var(--g-border)", background: "color-mix(in srgb, #fff 55%, transparent)" }}
              >
                <p className="lab-serif text-7xl leading-none font-semibold tracking-tight transition-colors duration-300 group-hover:text-[var(--accent)]">
                  {y.year}
                </p>
                <p className="mt-3 text-sm tabular-nums" style={{ color: "var(--muted)" }}>
                  {fmtInt(y.hours)} h · {fmtInt(y.plays)} reproducciones
                </p>
                <dl className="mt-6 space-y-4 border-t pt-5" style={{ borderColor: "var(--line)" }}>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                      Artista del año
                    </dt>
                    <dd className="mt-1 truncate text-xl font-semibold">{y.topArtist}</dd>
                  </div>
                  {y.topSong && (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                        Himno
                      </dt>
                      <dd className="mt-1 truncate text-lg font-semibold">{y.topSong.track}</dd>
                      <dd className="truncate text-sm" style={{ color: "var(--muted)" }}>
                        {y.topSong.artist} · {fmtInt(y.topSong.plays)} veces
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                      Descubrimientos
                    </dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums">{fmtInt(y.newArtists)} artistas nuevos</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            {[-1, 1].map((dir) => (
              <button
                key={dir}
                type="button"
                aria-label={dir < 0 ? "Años anteriores" : "Años siguientes"}
                onClick={() => yearsRef.current?.scrollBy({ left: dir * 640, behavior: "smooth" })}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border text-lg transition-all duration-200 hover:bg-[var(--ink)] hover:text-[var(--g-bg)] active:scale-90"
                style={{ borderColor: "var(--ink)" }}
              >
                {dir < 0 ? "←" : "→"}
              </button>
            ))}
          </div>
        </Reveal>
      </Chapter>

      {/* 05 — routines */}
      <Chapter
        id="rutinas"
        n="05"
        title="Tus rutinas"
        deck={
          <>
            Eres {ins.persona.title}: tu hora punta son las <Mark>{fmtHour(ins.peakHour)}</Mark> y tu día fuerte, el{" "}
            <Mark>{WEEKDAYS_LONG[ins.peakWeekday]}</Mark>. {ins.persona.blurb}
          </>
        }
      >
        <Reveal>
          <h3 className="mb-6 text-sm font-semibold uppercase tracking-[0.18em]">Cuándo escuchas: día de la semana × hora</h3>
          <Heatmap grid={ins.heat} />
        </Reveal>
      </Chapter>

      {/* 06 — oddities */}
      <Chapter id="rarezas" n="06" title="Rarezas" deck="Los datos sueltos que no caben en ningún gráfico pero que dicen mucho de ti.">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              k: "Día récord",
              big: fmtInt(ins.busiest.plays),
              unit: "canciones",
              text: `El ${fmtDateLong(ins.busiest.date)}${ins.busiest.topTrack ? `, con «${ins.busiest.topTrack}» en cabeza.` : "."}`,
            },
            {
              k: "Racha más larga",
              big: fmtInt(ins.streak.longest),
              unit: "días seguidos",
              text: ins.streak.start ? `Del ${fmtDateShort(ins.streak.start)} al ${fmtDateShort(ins.streak.end)}, sin fallar ni un día.` : "",
            },
            {
              k: "Dedo inquieto",
              big: `${ins.skipPct.toFixed(1)}%`,
              unit: "de saltos",
              text: "De cada cien canciones que empiezas, estas son las que no llegas a terminar.",
            },
            ...(wonders[0]
              ? [
                  {
                    k: "One-hit wonder personal",
                    big: `${Math.round(wonders[0].pct)}%`,
                    unit: "una sola canción",
                    text: `De ${wonders[0].artist} casi solo escuchas «${wonders[0].topSong}» (${fmtInt(wonders[0].topCount)} de ${fmtInt(wonders[0].total)} veces).`,
                  },
                ]
              : []),
            ...(comebacks[0]
              ? [
                  {
                    k: "El gran regreso",
                    big: fmtInt(comebacks[0].gapMonths),
                    unit: "meses de silencio",
                    text: `«${comebacks[0].name}» desapareció de tu vida y volvió como si nada.`,
                  },
                ]
              : []),
            {
              k: "Catálogo",
              big: fmtInt(ins.uniqueTracks),
              unit: "canciones distintas",
              text: `Repartidas entre ${fmtInt(ins.uniqueArtists)} artistas.`,
            },
          ].map((c, i) => (
            <Reveal key={c.k} delay={(i % 3) * 120}>
              <article
                className="h-full rounded-[28px] border p-7 transition-transform duration-300 hover:-translate-y-1.5 hover:rotate-[-0.6deg]"
                style={{ borderColor: "var(--g-border)", background: "color-mix(in srgb, #fff 55%, transparent)" }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                  {c.k}
                </p>
                <p className="lab-serif mt-4 text-6xl leading-none font-semibold tracking-tight">{c.big}</p>
                <p className="mt-1 text-sm font-medium" style={{ color: "var(--muted)" }}>
                  {c.unit}
                </p>
                <p className="mt-5 text-[15px] leading-relaxed" style={{ color: "var(--muted)" }}>
                  {c.text}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </Chapter>

      <footer className="border-t-2 py-16 text-center" style={{ borderColor: "var(--ink)" }}>
        <p className="lab-serif text-4xl font-semibold italic">Fin.</p>
        <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
          Impreso en tu navegador · tus datos no han salido de aquí
        </p>
      </footer>
    </div>
  );
}
