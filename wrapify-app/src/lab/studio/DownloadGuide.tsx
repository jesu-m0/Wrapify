"use client";

import { ReactNode } from "react";
import { cssVars, Deco, DecoKind, Hue, HUES, Icon, IconName, Sticker } from "./ui";

/*
 * "How do I get my history?" — the four steps to request the extended streaming
 * history from Spotify, as four colour blocks. Each step carries a small mock of
 * what the user will see (the path in the account page, the checkbox to tick,
 * the wait, the unzipped folder) so it reads at a glance.
 */

const PRIVACY_URL = "https://www.spotify.com/account/privacy/";

export default function DownloadGuide({ className = "", delay = 0 }: { className?: string; delay?: number }) {
  return (
    <section className={className} aria-labelledby="guide-title">
      <h2 id="guide-title" className="sr-only">
        Cómo conseguir tu historial de Spotify
      </h2>
      <ol className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2">
        <Step n={1} hue="coral" i={delay} title="Pídelo en tu cuenta">
          <p>Abre spotify.com en el navegador, entra en tu cuenta y busca el apartado de privacidad:</p>
          <Path steps={["Tu cuenta", "Privacidad", "Descargar tus datos"]} />
          <a
            href={PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-transform duration-200 hover:scale-105 active:scale-95"
            style={{ background: "var(--ink)", color: "var(--bg)" }}
          >
            Ir a la privacidad de Spotify
            <Icon name="external" size={16} />
          </a>
        </Step>

        <Step n={2} hue="sun" i={delay + 1} title="Marca solo el ampliado">
          <Checklist />
          <p className="mt-auto">
            Envía la solicitud y <b>confirma el correo</b> que te manda Spotify: hasta que no lo confirmas, no se pone en marcha.
          </p>
        </Step>

        <Step n={3} hue="lilac" i={delay + 2} title="Espera el correo" deco="disc">
          <p>
            Spotify lo prepara por su cuenta y te avisa por correo. Suele ir bastante más rápido que el máximo, pero no es al momento.
          </p>
          <div className="mt-auto flex items-end justify-between gap-4">
            <ul className="flex flex-col gap-2 text-[13px] font-bold">
              <Fact icon="mail">Mira también en spam</Fact>
              <Fact icon="clock">El enlace dura 14 días</Fact>
            </ul>
            <Sticker size={92}>
              <span className="block text-[11px] tracking-wide uppercase">hasta</span>
              <span className="block text-3xl leading-[0.9]">30</span>
              <span className="block text-[11px] tracking-wide uppercase">días</span>
            </Sticker>
          </div>
        </Step>

        <Step n={4} hue="mint" i={delay + 3} title="Descomprime y suelta">
          <p>
            Te llega un <b>.zip</b>. Descomprímelo y arrastra aquí la carpeta tal cual: Wrapify coge los archivos de audio y deja el resto.
          </p>
          <FileTree />
        </Step>
      </ol>
    </section>
  );
}

/* ── Pieces ── */

function Step({
  n,
  hue,
  i,
  title,
  deco,
  children,
}: {
  n: number;
  hue: Hue;
  i: number;
  title: string;
  /** backdrop for the steps that have room to spare */
  deco?: DecoKind;
  children: ReactNode;
}) {
  return (
    <li className="lab-card-in min-w-0" style={{ animationDelay: `${i * 70}ms` }}>
      <div className="lab-card lab-world h-full" style={cssVars({ "--bg": HUES[hue] })}>
        {deco && <Deco kind={deco} />}
        <div className="relative z-10 flex h-full flex-col p-6">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-extrabold tabular-nums"
              style={{ background: "var(--ink)", color: "var(--bg)" }}
              aria-hidden
            >
              {n}
            </span>
            <h3 className="text-2xl leading-tight font-extrabold tracking-tight">
              <span className="sr-only">Paso {n}: </span>
              {title}
            </h3>
          </div>
          <div className="mt-4 flex flex-1 flex-col gap-4 text-[15px] leading-snug font-medium">{children}</div>
        </div>
      </div>
    </li>
  );
}

/** The places to click through, as a staircase of chips ending on the one that matters. */
function Path({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-col items-start gap-1.5 text-[13px] font-bold">
      {steps.map((s, k) => (
        <li key={s} className="flex items-center gap-1.5" style={{ paddingLeft: k * 20 }}>
          {k > 0 && (
            <span aria-hidden className="opacity-60">
              ↳
            </span>
          )}
          <span className="rounded-full px-3 py-1" style={k === steps.length - 1 ? { background: "var(--ink)", color: "var(--bg)" } : { background: "var(--deco)" }}>
            {s}
          </span>
        </li>
      ))}
    </ol>
  );
}

const OPTIONS = [
  { label: "Datos de la cuenta", note: "Solo el último año", on: false },
  { label: "Historial de reproducción ampliado", note: "Todo, desde el primer día", on: true },
  { label: "Información técnica", note: "No hace falta", on: false },
];

/** The three boxes of Spotify's request form, with the right one ticked. */
function Checklist() {
  return (
    <ul className="flex flex-col gap-1 rounded-[20px] p-1.5" style={{ background: "var(--deco)" }}>
      {OPTIONS.map((o) => (
        <li
          key={o.label}
          className="flex items-center gap-3 rounded-[14px] px-3 py-2"
          style={o.on ? { background: "var(--ink)", color: "var(--bg)" } : { opacity: 0.62 }}
        >
          <span
            className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border-2"
            style={o.on ? { background: "var(--bg)", borderColor: "var(--bg)", color: "var(--ink)" } : { borderColor: "currentColor" }}
            role="img"
            aria-label={o.on ? "Marcado" : "Sin marcar"}
          >
            {o.on && (
              <span className="lab-pop flex" style={{ animationDelay: "700ms" }}>
                <Icon name="check" size={14} />
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] leading-tight font-bold">{o.label}</span>
            <span className="block text-[12px] leading-tight font-medium opacity-80">{o.note}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Fact({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Icon name={icon} size={17} />
      {children}
    </li>
  );
}

/** What's inside the zip: the folder to drop, the files Wrapify reads and the ones it skips. */
function FileTree() {
  const files = [
    { name: "Streaming_History_Audio_2017-2021_0.json", used: true },
    { name: "Streaming_History_Audio_2021_1.json", used: true },
    { name: "Streaming_History_Audio_…", used: true },
    { name: "Streaming_History_Video_2021-2026.json", used: false },
    { name: "ReadMeFirst_ExtendedStreamingHistory.pdf", used: false },
  ];
  return (
    <div className="mt-auto rounded-[20px] p-3 font-mono text-[11.5px] leading-none" style={{ background: "var(--deco)" }}>
      <p className="flex items-center gap-2 px-1.5 py-1 font-bold opacity-60">
        <Icon name="folder" size={15} />
        <span className="truncate">my_spotify_data.zip</span>
      </p>
      <div className="mt-1 ml-3.5 border-l-2 pl-2" style={{ borderColor: "var(--line)" }}>
        <p className="flex items-center gap-2 rounded-[10px] px-2 py-1.5 font-bold" style={{ background: "var(--ink)", color: "var(--bg)" }}>
          <Icon name="folder" size={15} />
          <span className="truncate">Spotify Extended Streaming History</span>
        </p>
        <ul className="mt-1 ml-3.5 border-l-2 pl-2" style={{ borderColor: "var(--line)" }}>
          {files.map((f) => (
            <li key={f.name} className="flex items-center gap-2 px-1.5 py-1.25" style={f.used ? undefined : { opacity: 0.45 }}>
              <span className="flex w-3.5 shrink-0 justify-center" aria-label={f.used ? "Se usa" : "Se ignora"} role="img">
                {f.used ? <Icon name="check" size={14} /> : "–"}
              </span>
              <span className="truncate">{f.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
