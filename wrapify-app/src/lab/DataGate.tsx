"use client";

import Link from "next/link";
import { DragEvent, ReactNode, useCallback, useRef, useState } from "react";
import { SpotifyStream } from "@/types/spotify";
import { filesFromDrop, loadDevData, loadFromFiles, useLabData } from "./store";
import { Equalizer } from "./motion";
import DownloadGuide from "./studio/DownloadGuide";
import { HUES, Icon, INK, Mark } from "./studio/ui";

/**
 * Studio's front door: the drop zone for the history and, next to it, the steps
 * to request it from Spotify for whoever doesn't have it yet. Wrap it in
 * .theme-studio. The whole page takes the drop, not only the card.
 * Renders `children(data)` once a history is loaded.
 */
export default function DataGate({
  dark,
  toggleDark,
  children,
}: {
  dark: boolean;
  toggleDark: () => void;
  children: (data: SpotifyStream[]) => ReactNode;
}) {
  const data = useLabData();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // dragenter/leave fire for every child the pointer crosses: count them
  const depth = useRef(0);
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

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const ghost = "cursor-pointer rounded-full border transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]";

  return (
    <div
      className="min-h-screen overflow-x-clip transition-colors duration-500"
      style={{ background: "var(--page)", color: "var(--ink)" }}
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth.current += 1;
        setDragOver(true);
      }}
      onDragOver={(e) => {
        if (hasFiles(e)) e.preventDefault();
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setDragOver(false);
        if (loading) return;
        const files = filesFromDrop(e.dataTransfer); // has to start inside the event
        run(async (s) => loadFromFiles(await files, s));
      }}
    >
      <div className="mx-auto max-w-[1320px] px-4 pt-5 pb-16 sm:px-6">
        <header className="lab-rise flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
            <Equalizer /> Wrapify
          </span>
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
        </header>

        <section className="mt-12 mb-10 grid items-end gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <h1 className="text-5xl leading-[0.98] font-extrabold tracking-[-0.04em] md:text-7xl">
            <span className="-mb-[0.14em] block overflow-hidden pb-[0.14em]">
              <span className="lab-mask-in block">Tu historial,</span>
            </span>
            <span className="-mb-[0.14em] block overflow-hidden pb-[0.14em]">
              <span className="lab-mask-in block" style={{ animationDelay: "90ms" }}>
                para explorarlo
              </span>
            </span>
            <span className="lab-pop mt-1 inline-block" style={{ animationDelay: "380ms" }}>
              <Mark tone="hl">a tu ritmo</Mark>
            </span>
          </h1>
          <p className="lab-rise max-w-md text-lg leading-snug font-medium" style={{ color: "var(--muted)", animationDelay: "200ms" }}>
            Wrapify lee el historial completo que Spotify te deja descargar: cada canción desde que tienes cuenta. ¿Ya lo
            tienes? Suéltalo aquí. ¿Todavía no? Son cuatro pasos y solo se hacen una vez.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {/* drop zone */}
          <section className="lab-card-in min-w-0 xl:col-span-4" style={{ animationDelay: "120ms" }}>
            <div className="lab-card lab-card--contrast h-full p-3">
              <div
                className="flex h-full min-h-[340px] flex-col rounded-[24px] border-2 border-dashed p-7 text-center transition-[background-color,border-color] duration-300"
                style={{
                  borderColor: dragOver ? "var(--accent)" : "var(--line)",
                  background: dragOver ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
                }}
              >
                <div className="flex flex-1 flex-col items-center justify-center">
                  {loading ? (
                    <div className="flex flex-col items-center gap-5" role="status">
                      <Equalizer className="text-6xl" bars={7} />
                      <p className="text-base font-semibold">{status}</p>
                    </div>
                  ) : (
                    <>
                      <span
                        className={`flex h-20 w-20 items-center justify-center rounded-full transition-transform duration-300 ${dragOver ? "scale-110" : ""}`}
                        style={{ background: "var(--accent)", color: INK }}
                      >
                        <Icon name="folder" size={38} />
                      </span>
                      <p className="mt-6 text-3xl leading-tight font-extrabold tracking-tight">
                        {dragOver ? "¡Suéltalo!" : "Suelta aquí tu historial"}
                      </p>
                      <p className="mt-2.5 max-w-xs text-[15px] leading-snug font-medium" style={{ color: "var(--muted)" }}>
                        La carpeta <b style={{ color: "var(--ink)" }}>Spotify Extended Streaming History</b> entera, o sus
                        archivos
                        <span className="mt-1 block font-mono text-[13px]">Streaming_History_Audio_*.json</span>
                      </p>
                      <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => inputRef.current?.click()}
                          className="cursor-pointer rounded-full px-6 py-3 text-sm font-bold transition-transform duration-200 hover:scale-105 active:scale-95"
                          style={{ background: "var(--accent)", color: INK }}
                        >
                          Elegir archivos
                        </button>
                        <button
                          type="button"
                          onClick={() => run(loadDevData)}
                          className={`${ghost} px-6 py-3 text-sm font-semibold`}
                          style={{ borderColor: "var(--line)" }}
                        >
                          Usar mis datos (dev)
                        </button>
                      </div>
                      {error && (
                        <p
                          className="lab-pop mt-6 max-w-sm rounded-2xl px-4 py-3 text-sm leading-snug font-semibold"
                          style={{ background: HUES.coral, color: INK }}
                          role="alert"
                        >
                          {error}.
                        </p>
                      )}
                    </>
                  )}
                </div>
                <p className="mt-8 flex items-center justify-center gap-2 text-[13px] font-medium" style={{ color: "var(--muted)" }}>
                  <Icon name="lock" size={15} />
                  Tus archivos no salen de tu navegador.
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    e.target.value = ""; // picking the same files again should still fire
                    if (files.length > 0) run((s) => loadFromFiles(files, s));
                  }}
                />
              </div>
            </div>
          </section>

          <DownloadGuide className="min-w-0 xl:col-span-8" delay={2} />
        </div>

        <p className="mt-10 text-sm font-medium" style={{ color: "var(--muted)" }}>
          <Link href="/lab" className="underline-offset-4 hover:underline">
            ← Volver al lab
          </Link>
        </p>
      </div>
    </div>
  );
}
