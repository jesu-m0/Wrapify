"use client";

import Link from "next/link";
import { Equalizer } from "@/lab/motion";
import { useLabData } from "@/lab/store";

/* Lab index: pick one of the three UI proposals. */

const VERSIONS = [
  {
    href: "/lab/stories",
    letter: "A",
    name: "Stories",
    pitch: "Una historia a pantalla completa que avanza sola, con un mundo de color por idea.",
    tags: ["Inmersiva", "Para enseñar", "10 diapositivas"],
    theme: "theme-stories",
    bg: "linear-gradient(140deg, #6a1fff 0%, #ff5a36 60%, #ffe94a 115%)",
    ink: "#ffffff",
    font: "var(--font-bricolage)",
  },
  {
    href: "/lab/revista",
    letter: "B",
    name: "Revista",
    pitch: "Tu historial como un reportaje: scroll largo, tipografía editorial y gráficas que se dibujan al leer.",
    tags: ["Clara", "Narrativa", "Tema claro"],
    theme: "theme-revista",
    bg: "#f4efe6",
    ink: "#1b1814",
    font: "var(--font-fraunces)",
  },
  {
    href: "/lab/studio",
    letter: "C",
    name: "Studio",
    pitch: "El dashboard, repensado: pestañas, filtro por año y una ficha para cada artista.",
    tags: ["Interactiva", "Para explorar", "Bloques de color"],
    theme: "theme-studio",
    bg: "#f6f0e4",
    ink: "#1e1728",
    font: "var(--font-bricolage)",
  },
] as const;

export default function LabIndex() {
  const loaded = useLabData() !== null;
  return (
    <div className="min-h-screen bg-[#0b0b0d] px-6 py-16 text-zinc-100" style={{ fontFamily: "var(--font-outfit), system-ui, sans-serif" }}>
      <div className="mx-auto max-w-6xl">
        <p className="lab-rise flex items-center gap-2.5 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
          <Equalizer /> Wrapify Lab
        </p>
        <h1 className="lab-rise mt-5 max-w-3xl text-5xl leading-[1.05] font-bold tracking-tight md:text-6xl" style={{ animationDelay: "80ms" }}>
          Tres maneras de ver la misma música.
        </h1>
        <p className="lab-rise mt-5 max-w-2xl text-lg text-zinc-400" style={{ animationDelay: "160ms" }}>
          Mismos datos, tres interfaces. Carga tu historial en cualquiera y salta entre ellas sin volver a subirlo.
          {loaded && <span className="ml-2 rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-300">Datos cargados ✓</span>}
        </p>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {VERSIONS.map((v, i) => (
            <Link
              key={v.href}
              href={v.href}
              className={`lab-rise group relative flex min-h-[440px] flex-col overflow-hidden rounded-[36px] p-8 transition-transform duration-500 hover:-translate-y-2 ${v.theme}`}
              style={{ animationDelay: `${260 + i * 120}ms`, background: v.bg, color: v.ink, fontFamily: `${v.font}, system-ui, sans-serif` }}
            >
              <span className="text-sm font-bold uppercase tracking-[0.25em] opacity-70">Versión {v.letter}</span>
              <span className="mt-3 text-6xl leading-none font-bold tracking-tight">{v.name}</span>

              {/* tiny live motif per version */}
              <span className="relative my-8 flex flex-1 items-center justify-center" aria-hidden>
                {v.letter === "A" && (
                  <span className="flex w-full gap-1.5">
                    {[100, 100, 60, 0, 0].map((w, k) => (
                      <span key={k} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/30">
                        <span className="block h-full rounded-full bg-white transition-[width] duration-700 group-hover:w-full" style={{ width: `${w}%` }} />
                      </span>
                    ))}
                  </span>
                )}
                {v.letter === "B" && (
                  <span className="w-full">
                    <span className="block border-t-2 border-current pt-3 text-3xl italic">
                      Los de <span style={{ color: "#d9482b" }}>siempre</span>
                    </span>
                    {[92, 70, 48].map((w, k) => (
                      <span key={k} className="mt-3 block h-1.5 rounded-full bg-black/10">
                        <span
                          className="block h-full origin-left scale-x-50 rounded-full transition-transform duration-700 group-hover:scale-x-100"
                          style={{ width: `${w}%`, background: "#d9482b", transitionDelay: `${k * 80}ms` }}
                        />
                      </span>
                    ))}
                  </span>
                )}
                {v.letter === "C" && (
                  <span className="grid w-full grid-cols-3 gap-2">
                    {[0, 1, 2, 3, 4, 5].map((k) => (
                      <span
                        key={k}
                        className={`h-14 rounded-2xl transition-transform duration-500 group-hover:-translate-y-1 ${k === 0 ? "col-span-2" : ""} ${k === 5 ? "hidden" : ""}`}
                        style={{ transitionDelay: `${k * 60}ms`, background: ["#ff7d5c", "#ffc94d", "#1e1728", "#ab96ff", "#ffa9d2"][k] }}
                      />
                    ))}
                  </span>
                )}
              </span>

              <span className="text-[17px] leading-snug opacity-90" style={{ fontFamily: "var(--font-outfit), system-ui, sans-serif" }}>
                {v.pitch}
              </span>
              <span className="mt-5 flex flex-wrap gap-2" style={{ fontFamily: "var(--font-outfit), system-ui, sans-serif" }}>
                {v.tags.map((t) => (
                  <span key={t} className="rounded-full border border-current/25 px-3 py-1 text-xs font-semibold opacity-80">
                    {t}
                  </span>
                ))}
              </span>
              <span className="absolute top-7 right-7 flex h-11 w-11 items-center justify-center rounded-full border border-current/30 text-xl transition-transform duration-500 group-hover:rotate-[-45deg]">
                →
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-sm text-zinc-500">
          <Link href="/" className="underline-offset-4 hover:underline">
            ← Volver al dashboard actual
          </Link>
        </p>
      </div>
    </div>
  );
}
