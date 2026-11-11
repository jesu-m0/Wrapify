"use client";

import { useSyncExternalStore } from "react";
import { SpotifyStream, SpotifyStreamRaw } from "@/types/spotify";
import { processRawStreams } from "@/lib/process-data";

/**
 * Tiny module-level store so the lab pages share the loaded history:
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

/**
 * The files of a drop, opening any folder in it (`dataTransfer.files` only lists
 * a dropped folder as one empty entry). Call it inside the drop handler: the
 * entries have to be taken before the event ends.
 */
export function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  const entries = Array.from(dt.items ?? [])
    .map((item) => (item.kind === "file" && typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null))
    .filter((e): e is FileSystemEntry => e !== null);
  if (entries.length === 0) return Promise.resolve(Array.from(dt.files));
  return collectFiles(entries);
}

const readBatch = (reader: FileSystemDirectoryReader) =>
  new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));

async function collectFiles(entries: FileSystemEntry[]): Promise<File[]> {
  const out: File[] = [];
  const walk = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      out.push(await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject)));
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      // readEntries hands a folder out in batches (about 100 at a time) until it returns none
      for (let batch = await readBatch(reader); batch.length > 0; batch = await readBatch(reader)) {
        for (const child of batch) await walk(child);
      }
    }
  };
  for (const entry of entries) await walk(entry);
  return out;
}

/** Says what went wrong when none of the files is an extended-history audio file. */
function whyNoAudio(files: File[]): string {
  const names = files.map((f) => f.name);
  if (names.some((n) => n.toLowerCase().endsWith(".zip"))) {
    return "Eso es el .zip tal cual llega. Descomprímelo y suelta la carpeta que trae dentro";
  }
  // the one-year "account data" export: StreamingHistory_music_0.json (older: StreamingHistory0.json)
  if (names.some((n) => /^StreamingHistory/.test(n))) {
    return "Eso es el historial de un año (el de «Datos de la cuenta»). Wrapify necesita el historial ampliado: mira el paso 2";
  }
  if (names.some((n) => n.startsWith("Streaming_History_Video_"))) {
    return "Solo veo archivos de vídeo. Faltan los Streaming_History_Audio_*.json de la misma carpeta";
  }
  return "No encuentro archivos Streaming_History_Audio_*.json entre los que has soltado";
}

export async function loadFromFiles(files: File[], onStatus: (s: string) => void) {
  const valid = files.filter(
    (f) => f.name.endsWith(".json") && f.name.startsWith("Streaming_History_Audio_")
  );
  if (valid.length === 0) throw new Error(whyNoAudio(files));
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
