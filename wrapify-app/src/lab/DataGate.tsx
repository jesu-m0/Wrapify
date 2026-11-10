"use client";

import Link from "next/link";
import { ReactNode, useCallback, useRef, useState } from "react";
import { SpotifyStream } from "@/types/spotify";
import { loadDevData, loadFromFiles, useLabData } from "./store";
import { Equalizer } from "./motion";

/**
 * Friendly upload screen shared by the three lab versions. Wrap it in a
 * .theme-* element: it paints itself with that theme's --g-* tokens.
 * Renders `children(data)` once a history is loaded.
 */
export default function DataGate({
  tagline,
  children,
}: {
  tagline: string;
  children: (data: SpotifyStream[]) => ReactNode;
}) {
  const data = useLabData();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [help, setHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const loading = status !== null;

  const run = useCallback(async (job: (onStatus: (s: string) => void) => Promise<void>) => {
    setError(null);
    setStatus("Preparando…");
    try {
      await job(setStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo ha fallado al leer los archivos");
    } finally {
      setStatus(null);
    }
  }, []);

  if (data) return <>{children(data)}</>;

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 py-12"
      style={{ background: "var(--g-bg)", color: "var(--g-ink)" }}
    >
      <div className="w-full max-w-xl">
        <div className="lab-rise text-center">
          <Equalizer className="text-5xl" />
          <h1 className="mt-5 text-5xl font-extrabold tracking-tight">Wrapify</h1>
          <p className="mt-3 text-lg" style={{ color: "var(--g-muted)" }}>
            {tagline}
          </p>
        </div>

        <div
          className="lab-rise mt-10 rounded-[32px] border-2 border-dashed p-10 text-center transition-all duration-300"
          style={{
            animationDelay: "120ms",
            borderColor: dragOver ? "var(--g-accent)" : "var(--g-border)",
            background: dragOver ? "color-mix(in srgb, var(--g-accent) 12%, transparent)" : "var(--g-card)",
            transform: dragOver ? "scale(1.025)" : undefined,
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (!loading && e.dataTransfer.files.length > 0) {
              const files = Array.from(e.dataTransfer.files);
              run((s) => loadFromFiles(files, s));
            }
          }}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-5 py-6" role="status">
              <Equalizer className="text-6xl" bars={7} />
              <p className="text-base font-medium">{status}</p>
            </div>
          ) : (
            <>
              <p className="text-xl font-semibold">Suelta aquí tu historial de Spotify</p>
              <p className="mt-2 text-sm" style={{ color: "var(--g-muted)" }}>
                Los archivos <span className="font-mono">Streaming_History_Audio_*.json</span>. No salen de tu navegador.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="cursor-pointer rounded-full px-7 py-3 text-sm font-bold transition-transform duration-200 hover:scale-105 active:scale-95"
                  style={{ background: "var(--g-accent)", color: "var(--g-accent-ink)" }}
                >
                  Elegir archivos
                </button>
                <button
                  type="button"
                  onClick={() => run(loadDevData)}
                  className="cursor-pointer rounded-full border px-7 py-3 text-sm font-semibold transition-transform duration-200 hover:scale-105 active:scale-95"
                  style={{ borderColor: "var(--g-border)" }}
                >
                  Usar mis datos (dev)
                </button>
              </div>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  if (files.length > 0) run((s) => loadFromFiles(files, s));
                }}
              />
            </>
          )}
        </div>

        {error && (
          <p className="lab-rise mt-4 rounded-2xl px-4 py-3 text-center text-sm font-medium" style={{ background: "var(--g-card)" }} role="alert">
            {error}. Prueba con el botón de elegir archivos.
          </p>
        )}

        <div className="lab-rise mt-6 text-center" style={{ animationDelay: "240ms" }}>
          <button
            type="button"
            onClick={() => setHelp((h) => !h)}
            className="cursor-pointer text-sm underline decoration-dotted underline-offset-4"
            style={{ color: "var(--g-muted)" }}
            aria-expanded={help}
          >
            ¿De dónde saco esos archivos?
          </button>
          <div
            className="grid transition-[grid-template-rows,opacity] duration-500"
            style={{ gridTemplateRows: help ? "1fr" : "0fr", opacity: help ? 1 : 0 }}
          >
            <ol className="overflow-hidden text-left text-sm leading-relaxed" style={{ color: "var(--g-muted)" }}>
              <li className="mt-4">
                <b style={{ color: "var(--g-ink)" }}>1.</b> En spotify.com entra en Cuenta → Privacidad y pide tu{" "}
                <b style={{ color: "var(--g-ink)" }}>historial de reproducción ampliado</b>.
              </li>
              <li className="mt-1.5">
                <b style={{ color: "var(--g-ink)" }}>2.</b> Spotify te manda un .zip por correo (suele tardar unos días).
              </li>
              <li className="mt-1.5">
                <b style={{ color: "var(--g-ink)" }}>3.</b> Descomprímelo y arrastra aquí todos los archivos de audio.
              </li>
            </ol>
          </div>
        </div>

        <p className="mt-10 text-center text-xs" style={{ color: "var(--g-muted)" }}>
          <Link href="/lab" className="underline-offset-4 hover:underline">
            ← Ver las tres versiones
          </Link>
        </p>
      </div>
    </div>
  );
}
