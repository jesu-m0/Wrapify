"use client";

import { useState, useCallback, useRef } from "react";
import { SpotifyStreamRaw, SpotifyStream } from "@/types/spotify";
import { processRawStreams } from "@/lib/process-data";

interface UploadPageProps {
  onDataLoaded: (streams: SpotifyStream[]) => void;
}

export default function UploadPage({ onDataLoaded }: UploadPageProps) {
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setLoading(true);
      setStatus("Leyendo archivos...");
      try {
        const allRaw: SpotifyStreamRaw[] = [];
        const fileArray = Array.from(files).filter(
          (f) => f.name.endsWith(".json") && f.name.startsWith("Streaming_History_Audio_")
        );

        if (fileArray.length === 0) {
          setStatus("No se encontraron archivos Streaming_History_Audio_*.json");
          setLoading(false);
          return;
        }

        for (const file of fileArray) {
          const text = await file.text();
          const parsed: SpotifyStreamRaw[] = JSON.parse(text);
          allRaw.push(...parsed);
        }

        setStatus(`Procesando ${allRaw.length.toLocaleString()} streams...`);
        const processed = processRawStreams(allRaw);
        setStatus(null);
        onDataLoaded(processed);
      } catch {
        setStatus("Error al procesar los archivos");
      } finally {
        setLoading(false);
      }
    },
    [onDataLoaded]
  );

  const loadDevData = async () => {
    setLoading(true);
    setStatus("Cargando datos de desarrollo...");
    try {
      const res = await fetch("/api/dev-data");
      if (!res.ok) throw new Error("No se encontraron datos de desarrollo");
      const rawStreams: SpotifyStreamRaw[] = await res.json();
      setStatus(`Procesando ${rawStreams.length.toLocaleString()} streams...`);
      const processed = processRawStreams(rawStreams);
      setStatus(null);
      onDataLoaded(processed);
    } catch {
      setStatus("Error: no se encontró la carpeta de datos local");
      setLoading(false);
    }
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Wrapify</h1>
        <p className="mt-2 text-lg text-zinc-500">
          Visualiza tu historial de Spotify
        </p>
      </div>

      <div
        className={`flex w-full max-w-lg flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-12 transition-colors ${
          dragOver
            ? "border-green-500 bg-green-500/5"
            : "border-zinc-300 dark:border-zinc-700"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <svg
          className="h-12 w-12 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>

        <p className="text-center text-zinc-600 dark:text-zinc-400">
          Arrastra aquí tus archivos{" "}
          <span className="font-mono text-sm">
            Streaming_History_Audio_*.json
          </span>
        </p>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-50"
        >
          Seleccionar archivos
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".json"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      <button
        onClick={loadDevData}
        disabled={loading}
        className="rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900 disabled:opacity-50"
      >
        Cargar mis datos (dev)
      </button>

      {status && (
        <p className="text-sm text-zinc-500 animate-pulse">{status}</p>
      )}
    </div>
  );
}
