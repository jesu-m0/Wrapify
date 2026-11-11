"use client";

import Link from "next/link";
import { Equalizer } from "@/lab/motion";
import { useLabData } from "@/lab/store";
import { cssVars, HUES, Hue, Mark } from "@/lab/studio/ui";

/* Lab index: what is being tried out before it replaces the current dashboard. */

const PAGES: { href: string; name: string; pitch: string; tags: string[]; hue: Hue; motif: "bento" | "eq" }[] = [
  {
    href: "/lab/studio",
    name: "Studio",
    pitch: "El dashboard, repensado: pestañas, filtro por año, una ficha por artista y una máquina del tiempo que reproduce tu historial.",
    tags: ["Interactiva", "Bento", "Modo play"],
    hue: "coral",
    motif: "bento",
  },
  {
    href: "/lab/logo",
    name: "Logo",
    pitch: "Veinte alternativas de logo animado, cada una con su favicon. Marca con el corazón las que te gusten.",
    tags: ["20 propuestas", "Favicon"],
    hue: "lilac",
    motif: "eq",
  },
];

export default function LabIndex() {
  const loaded = useLabData() !== null;
  return (
    <div className="theme-studio">
      <div className="min-h-screen px-4 py-14 sm:px-6" style={{ background: "var(--page)", color: "var(--ink)" }}>
        <div className="mx-auto max-w-5xl">
          <p className="lab-rise flex items-center gap-2.5 text-sm font-bold tracking-[0.22em] uppercase" style={{ color: "var(--muted)" }}>
            <Equalizer /> Wrapify Lab
          </p>
          <h1 className="lab-rise mt-5 text-5xl leading-[1] font-extrabold tracking-[-0.035em] md:text-6xl" style={{ animationDelay: "80ms" }}>
            Lo que estamos <Mark tone="hl">probando</Mark>.
          </h1>
          <p className="lab-rise mt-5 max-w-2xl text-lg font-medium" style={{ color: "var(--muted)", animationDelay: "160ms" }}>
            La nueva cara de Wrapify, todavía en el laboratorio. Carga tu historial una vez y se queda mientras navegas por aquí.
            {loaded && (
              <span className="ml-2 inline-block rounded-full px-3 py-0.5 text-sm font-bold" style={{ background: HUES.mint, color: "#1e1728" }}>
                Datos cargados ✓
              </span>
            )}
          </p>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {PAGES.map((p, i) => (
              <Link
                key={p.href}
                href={p.href}
                className="lab-card-in group block"
                style={{ animationDelay: `${240 + i * 110}ms` }}
              >
                <span className="lab-card lab-world flex min-h-[400px] flex-col p-8" style={cssVars({ "--bg": HUES[p.hue] })}>
                  <span className="text-6xl leading-none font-extrabold tracking-[-0.035em]">{p.name}</span>

                  <span className="my-8 flex flex-1 items-center justify-center" aria-hidden>
                    {p.motif === "bento" ? (
                      <span className="grid w-full grid-cols-3 gap-2">
                        {[0, 1, 2, 3, 4].map((k) => (
                          <span
                            key={k}
                            className={`h-14 rounded-2xl transition-transform duration-500 group-hover:-translate-y-1 ${k === 0 ? "col-span-2" : ""}`}
                            style={{ transitionDelay: `${k * 60}ms`, background: k === 2 ? "var(--ink)" : "var(--deco)" }}
                          />
                        ))}
                      </span>
                    ) : (
                      <Equalizer className="text-[88px]" bars={5} />
                    )}
                  </span>

                  <span className="text-[17px] leading-snug font-medium">{p.pitch}</span>
                  <span className="mt-5 flex flex-wrap gap-2">
                    {p.tags.map((t) => (
                      <span key={t} className="rounded-full border px-3 py-1 text-xs font-bold" style={{ borderColor: "var(--line)" }}>
                        {t}
                      </span>
                    ))}
                  </span>
                  <span
                    className="absolute top-7 right-7 flex h-11 w-11 items-center justify-center rounded-full text-xl transition-transform duration-500 group-hover:rotate-[-45deg]"
                    style={{ background: "var(--ink)", color: "var(--bg)" }}
                  >
                    →
                  </span>
                </span>
              </Link>
            ))}
          </div>

          <p className="mt-10 text-sm font-medium" style={{ color: "var(--muted)" }}>
            <Link href="/" className="underline-offset-4 hover:underline">
              ← Volver al dashboard actual
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
