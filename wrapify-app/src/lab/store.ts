"use client";

import { useSyncExternalStore } from "react";
import { SpotifyStream, SpotifyStreamRaw } from "@/types/spotify";
import { processRawStreams } from "@/lib/process-data";

/**
 * Tiny module-level store so the three lab versions share the loaded history:
 * load it once, then jump between /lab/* routes without uploading again.
 */
let current: SpotifyStream[] | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setLabData(data: SpotifyStream[] | null) {
  current = data;
  listeners.forEach((l) => l());
}

export function useLabData(): SpotifyStream[] | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null
  );
}

export async function loadFromFiles(files: File[], onStatus: (s: string) => void) {
  const valid = files.filter(
    (f) => f.name.endsWith(".json") && f.name.startsWith("Streaming_History_Audio_")
  );
  if (valid.length === 0) {
    throw new Error("No encuentro archivos Streaming_History_Audio_*.json entre los que has soltado");
  }
  onStatus(`Leyendo ${valid.length} ${valid.length === 1 ? "archivo" : "archivos"}…`);
  const raw: SpotifyStreamRaw[] = [];
  for (const file of valid) {
    const parsed: SpotifyStreamRaw[] = JSON.parse(await file.text());
    for (const row of parsed) raw.push(row);
  }
  await finish(raw, onStatus);
}

export async function loadDevData(onStatus: (s: string) => void) {
  onStatus("Buscando tus datos locales…");
  const res = await fetch("/api/dev-data");
  if (!res.ok) throw new Error("No he encontrado la carpeta de datos local");
  const raw: SpotifyStreamRaw[] = await res.json();
  await finish(raw, onStatus);
}

async function finish(raw: SpotifyStreamRaw[], onStatus: (s: string) => void) {
  onStatus(`Afinando ${raw.length.toLocaleString("de-DE")} reproducciones…`);
  // let the status paint before the synchronous crunch
  await new Promise((r) => setTimeout(r, 30));
  const processed = processRawStreams(raw);
  if (processed.length === 0) throw new Error("Los archivos no contienen reproducciones de música");
  setLabData(processed);
}
