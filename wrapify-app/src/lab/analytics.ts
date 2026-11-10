// Pure analytics for the Studio charts. No React.
// Contract: every function takes streams already sorted ascending by `ts`, never re-sorts and never mutates.
// Because of that ordering, periods (month / year) are contiguous runs of rows, which lets most
// functions work period by period with a single reusable Map instead of one Map per period.

import type { SpotifyStream } from "@/types/spotify";

/* ───────────────────────── helpers ───────────────────────── */

const MS_DAY = 86400000;

const ymCache: string[] = [];
/** "YYYY-MM" for an absolute month index (year * 12 + month - 1). Cached. */
function ymFromIndex(mi: number): string {
  let v = ymCache[mi];
  if (v === undefined) {
    const y = Math.floor(mi / 12);
    const m = (mi % 12) + 1;
    v = `${y}-${m < 10 ? "0" : ""}${m}`;
    ymCache[mi] = v;
  }
  return v;
}

const miOf = (s: SpotifyStream): number => s.year * 12 + s.month - 1;

export const ymOf = (s: SpotifyStream): string => ymFromIndex(miOf(s));

/** `skipped` is only filled from 2022 on, so a skip is also any play ended with the forward button. */
export const isSkip = (s: SpotifyStream): boolean => s.skipped === true || s.reason_end === "fwdbtn";

/** Contiguous month list from first to last row (rows are sorted, so first/last are the extremes). */
function monthSpan(streams: SpotifyStream[]): { start: number; count: number; months: string[] } {
  if (streams.length === 0) return { start: 0, count: 0, months: [] };
  const start = miOf(streams[0]);
  const end = miOf(streams[streams.length - 1]);
  const months: string[] = [];
  for (let mi = start; mi <= end; mi++) months.push(ymFromIndex(mi));
  return { start, count: end - start + 1, months };
}

const r1 = (n: number): number => Math.round(n * 10) / 10;
const r2 = (n: number): number => Math.round(n * 100) / 100;


/* Local time without constructing a Date per row: the UTC offset is cached per UTC day when it is constant
 * across that day (DST switch days fall back to a real Date). */
const offCache = new Map<string, number>(); // date -> offset in minutes (getTimezoneOffset), NaN = not constant
function dayOffset(s: SpotifyStream): number {
  let o = offCache.get(s.date);
  if (o === undefined) {
    const a = new Date(Date.UTC(s.year, s.month - 1, s.day, 0, 0)).getTimezoneOffset();
    const b = new Date(Date.UTC(s.year, s.month - 1, s.day, 23, 59)).getTimezoneOffset();
    o = a === b ? a : NaN;
    offCache.set(s.date, o);
  }
  return o;
}
/** Local hour (0-23) of a play. Same result as `new Date(s.ts).getHours()`. */
function localHour(s: SpotifyStream): number {
  const o = dayOffset(s);
  if (o !== o) return new Date(s.ts).getHours();
  const ts = s.ts;
  const mins = (ts.charCodeAt(11) - 48) * 600 + (ts.charCodeAt(12) - 48) * 60 + (ts.charCodeAt(14) - 48) * 10 + (ts.charCodeAt(15) - 48) - o;
  return Math.floor((((mins % 1440) + 1440) % 1440) / 60);
}
/** Local year of a play. Same result as `new Date(s.ts).getFullYear()`. */
function localYear(s: SpotifyStream): number {
  if (s.month !== 1 && s.month !== 12) return s.year; // offsets never exceed one day
  return new Date(s.ts).getFullYear();
}

const artistOf = (s: SpotifyStream): string | null => s.master_metadata_album_artist_name || null;

/** Sorted-desc entries of a count map: plays desc, then name asc (deterministic). */
function sortedEntries(map: Map<string, number>): [string, number][] {
  const arr = Array.from(map);
  arr.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return arr;
}

/* ───────────────────────── 1 · Bar chart race ───────────────────────── */

export type RaceKind = "artists" | "songs" | "albums";
export interface RaceEntity { key: string; label: string; sub?: string }
export interface RaceData { months: string[]; entities: RaceEntity[]; /** cum[e][m] = cumulative plays of entity e at the end of months[m] */ cum: number[][] }

/** Keeps every entity that is in the top `keep` at the end of ANY month, either by cumulative plays or by plays in the trailing 12 months. */
export function raceData(streams: SpotifyStream[], kind: RaceKind, keep = 12): RaceData {
  const { start, count: M, months } = monthSpan(streams);
  if (M === 0) return { months: [], entities: [], cum: [] };
  const n = streams.length;

  // Pass 1: intern entities.
  const idOf = new Map<string, number>();
  const all: RaceEntity[] = [];
  const ids = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const s = streams[i];
    const artist = s.master_metadata_album_artist_name;
    let id = -1;
    if (artist) {
      if (kind === "artists") {
        id = idOf.get(artist) ?? -1;
        if (id < 0) { id = all.length; idOf.set(artist, id); all.push({ key: artist, label: artist }); }
      } else {
        const title = kind === "songs" ? s.master_metadata_track_name : s.master_metadata_album_album_name;
        if (title) {
          const key = title + "\u0000" + artist;
          id = idOf.get(key) ?? -1;
          if (id < 0) { id = all.length; idOf.set(key, id); all.push({ key, label: title, sub: artist }); }
        }
      }
    }
    ids[i] = id;
  }
  const E = all.length;
  if (E === 0) return { months, entities: [], cum: [] };

  // Pass 2: counts laid out month-major (m * E + e) so the per-month scans are contiguous.
  const c = new Int32Array(E * M);
  for (let i = 0; i < n; i++) {
    const id = ids[i];
    if (id >= 0) c[(miOf(streams[i]) - start) * E + id]++;
  }
  for (let m = 1; m < M; m++) {
    const o = m * E, p = o - E;
    for (let e = 0; e < E; e++) c[o + e] += c[p + e];
  }

  // Per month, mark the top `keep` (value > 0) with a min-heap: worst element at the root.
  const k = Math.max(1, keep);
  const marked = new Uint8Array(E);
  const hv = new Int32Array(k);
  const hi = new Int32Array(k);
  const worse = (va: number, ia: number, vb: number, ib: number) => va < vb || (va === vb && ia > ib);
  const markTop = (m: number, lag: number) => {
    let size = 0;
    const o = m * E;
    const po = lag > 0 && m >= lag ? (m - lag) * E : -1;
    for (let e = 0; e < E; e++) {
      const v = po >= 0 ? c[o + e] - c[po + e] : c[o + e];
      if (v <= 0) continue;
      if (size < k) {
        let j = size++;
        while (j > 0) {
          const p = (j - 1) >> 1;
          if (!worse(v, e, hv[p], hi[p])) break;
          hv[j] = hv[p]; hi[j] = hi[p]; j = p;
        }
        hv[j] = v; hi[j] = e;
      } else if (worse(hv[0], hi[0], v, e)) {
        let j = 0;
        for (;;) {
          let ch = 2 * j + 1;
          if (ch >= size) break;
          if (ch + 1 < size && worse(hv[ch + 1], hi[ch + 1], hv[ch], hi[ch])) ch++;
          if (!worse(hv[ch], hi[ch], v, e)) break;
          hv[j] = hv[ch]; hi[j] = hi[ch]; j = ch;
        }
        hv[j] = v; hi[j] = e;
      }
    }
    for (let j = 0; j < size; j++) marked[hi[j]] = 1;
  };
  for (let m = 0; m < M; m++) { markTop(m, 0); markTop(m, 12); }

  const kept: number[] = [];
  for (let e = 0; e < E; e++) if (marked[e]) kept.push(e);
  const last = (M - 1) * E;
  kept.sort((a, b) => c[last + b] - c[last + a] || a - b);

  const entities: RaceEntity[] = new Array(kept.length);
  const cum: number[][] = new Array(kept.length);
  for (let x = 0; x < kept.length; x++) {
    const e = kept[x];
    entities[x] = all[e];
    const row = new Array<number>(M);
    for (let m = 0; m < M; m++) row[m] = c[m * E + e];
    cum[x] = row;
  }
  return { months, entities, cum };
}

/* ───────────────────────── 2 · Rank history and champions ───────────────────────── */

export interface RankHistory { periods: string[]; series: { name: string; ranks: (number | null)[]; plays: number[] }[] }
export interface Champion { period: string; plays: number; artist: string; artistPlays: number; song: string; songArtist: string; songPlays: number }

/** Period index of a row: year offset or month offset from `start`. */
const periodIndexer = (by: "year" | "month") =>
  by === "year" ? (s: SpotifyStream) => s.year : miOf;

/** Artists ranked by plays inside each period (not cumulative). */
export function rankHistory(streams: SpotifyStream[], by: "year" | "month", top = 10): RankHistory {
  if (streams.length === 0) return { periods: [], series: [] };
  const idx = periodIndexer(by);
  const first = idx(streams[0]);
  const lastP = idx(streams[streams.length - 1]);
  const P = lastP - first + 1;
  const periods: string[] = new Array(P);
  for (let p = 0; p < P; p++) periods[p] = by === "year" ? String(first + p) : ymFromIndex(first + p);

  // plays[name][p]
  const playsBy = new Map<string, number[]>();
  const topByPeriod: string[][] = new Array(P);
  const cur = new Map<string, number>();
  let curP = idx(streams[0]) - first;
  const flush = () => {
    const entries = sortedEntries(cur);
    const t: string[] = [];
    for (let i = 0; i < entries.length; i++) {
      const [name, v] = entries[i];
      let arr = playsBy.get(name);
      if (!arr) { arr = new Array<number>(P).fill(0); playsBy.set(name, arr); }
      arr[curP] = v;
      if (i < top) t.push(name);
    }
    topByPeriod[curP] = t;
    cur.clear();
  };
  for (let i = 0; i < streams.length; i++) {
    const s = streams[i];
    const p = idx(s) - first;
    if (p !== curP) { flush(); curP = p; }
    const a = artistOf(s);
    if (a) cur.set(a, (cur.get(a) || 0) + 1);
  }
  flush();

  const rankMap = new Map<string, (number | null)[]>();
  for (let p = 0; p < P; p++) {
    const t = topByPeriod[p];
    if (!t) continue;
    for (let r = 0; r < t.length; r++) {
      let arr = rankMap.get(t[r]);
      if (!arr) { arr = new Array<number | null>(P).fill(null); rankMap.set(t[r], arr); }
      arr[p] = r + 1;
    }
  }
  const series: RankHistory["series"] = [];
  const totals = new Map<string, number>();
  rankMap.forEach((ranks, name) => {
    const plays = playsBy.get(name)!;
    let tot = 0;
    for (let p = 0; p < P; p++) tot += plays[p];
    totals.set(name, tot);
    series.push({ name, ranks, plays });
  });
  series.sort((a, b) => {
    const ra = a.ranks[P - 1], rb = b.ranks[P - 1];
    if (ra !== rb) {
      if (ra === null) return 1;
      if (rb === null) return -1;
      return ra - rb;
    }
    return totals.get(b.name)! - totals.get(a.name)! || (a.name < b.name ? -1 : 1);
  });
  return { periods, series };
}

/** Most played artist and song of each period (periods with no plays are omitted), chronological. */
export function champions(streams: SpotifyStream[], by: "year" | "month"): Champion[] {
  const out: Champion[] = [];
  if (streams.length === 0) return out;
  const idx = periodIndexer(by);
  const artists = new Map<string, number>();
  const songs = new Map<string, number>();
  let curP = idx(streams[0]);
  let total = 0;
  const flush = () => {
    if (total === 0) return;
    let bestA = "", bestAn = 0;
    artists.forEach((v, k) => { if (v > bestAn || (v === bestAn && k < bestA)) { bestA = k; bestAn = v; } });
    let bestS = "", bestSn = 0;
    songs.forEach((v, k) => { if (v > bestSn || (v === bestSn && k < bestS)) { bestS = k; bestSn = v; } });
    const cut = bestS.indexOf("\u0000");
    out.push({
      period: by === "year" ? String(curP) : ymFromIndex(curP),
      plays: total,
      artist: bestA, artistPlays: bestAn,
      song: cut >= 0 ? bestS.slice(0, cut) : bestS,
      songArtist: cut >= 0 ? bestS.slice(cut + 1) : "",
      songPlays: bestSn,
    });
  };
  for (let i = 0; i < streams.length; i++) {
    const s = streams[i];
    const p = idx(s);
    if (p !== curP) { flush(); artists.clear(); songs.clear(); total = 0; curP = p; }
    total++;
    const a = artistOf(s);
    if (!a) continue;
    artists.set(a, (artists.get(a) || 0) + 1);
    const t = s.master_metadata_track_name;
    if (t) {
      const key = t + "\u0000" + a;
      songs.set(key, (songs.get(key) || 0) + 1);
    }
  }
  flush();
  return out;
}

/* ───────────────────────── 3 · Listening clock per year ───────────────────────── */

export interface YearClock { year: number; total: number; hours: number[] /* 24 play counts */ }

export function clockByYear(streams: SpotifyStream[]): YearClock[] {
  const out: YearClock[] = [];
  let cur: YearClock | null = null;
  for (let i = 0; i < streams.length; i++) {
    const y = localYear(streams[i]);
    if (!cur || cur.year !== y) {
      // Sorted by ts, so local years are non-decreasing; still guard against a revisit.
      cur = out.find((c) => c.year === y) ?? null;
      if (!cur) {
        cur = { year: y, total: 0, hours: new Array<number>(24).fill(0) };
        out.push(cur);
      }
    }
    cur.total++;
    cur.hours[localHour(streams[i])]++;
  }
  out.sort((a, b) => a.year - b.year);
  return out;
}

/* ───────────────────────── 4 · Listener profile ───────────────────────── */

export interface ListenerProfile {
  constancia: number;
  paciencia: number;
  fidelidad: number;
  nocturnidad: number;
  aleatorio: number;
  descubrimiento: number;
}

export function listenerProfile(streams: SpotifyStream[]): ListenerProfile {
  const n = streams.length;
  if (n === 0) return { constancia: 0, paciencia: 0, fidelidad: 0, nocturnidad: 0, aleatorio: 0, descubrimiento: 0 };
  let activeDays = 0, prevDate = "";
  let notSkipped = 0, night = 0, shuffled = 0;
  let withArtist = 0, withSong = 0;
  const artists = new Map<string, { n: number; tracks: Set<string> }>();
  let distinctSongs = 0;
  for (let i = 0; i < n; i++) {
    const s = streams[i];
    if (s.date !== prevDate) { activeDays++; prevDate = s.date; }
    if (!isSkip(s)) notSkipped++;
    if (s.shuffle === true) shuffled++;
    const h = localHour(s);
    if (h >= 22 || h < 6) night++;
    const a = artistOf(s);
    if (a) {
      withArtist++;
      let acc = artists.get(a);
      if (!acc) { acc = { n: 0, tracks: new Set() }; artists.set(a, acc); }
      acc.n++;
      const t = s.master_metadata_track_name;
      if (t) { withSong++; const before = acc.tracks.size; acc.tracks.add(t); if (acc.tracks.size > before) distinctSongs++; }
    }
  }
  const spanDays = Math.round((Date.parse(streams[n - 1].date) - Date.parse(streams[0].date)) / MS_DAY) + 1;
  const counts = Array.from(artists.values(), (x) => x.n).sort((a, b) => b - a);
  let top10 = 0;
  for (let i = 0; i < Math.min(10, counts.length); i++) top10 += counts[i];
  return {
    constancia: r1(Math.min(100, (activeDays / Math.max(1, spanDays)) * 100)),
    paciencia: r1((notSkipped / n) * 100),
    fidelidad: withArtist ? r1((top10 / withArtist) * 100) : 0,
    nocturnidad: r1((night / n) * 100),
    aleatorio: r1((shuffled / n) * 100),
    descubrimiento: withSong ? r1((distinctSongs / withSong) * 100) : 0,
  };
}

/* ───────────────────────── 5 · Devices ───────────────────────── */

export interface DeviceShare { months: string[]; series: { name: string; values: number[] /* plays per month */ }[] }

const FAMILIES = ["Móvil y tablet", "Ordenador", "Navegador", "Tele y consola", "Otros"] as const;
const TV_WORDS = ["tv", "cast", "ps3", "ps4", "ps5", "playstation", "xbox", "tizen", "webos", "roku", "sonos", "speaker", "echo", "google_home"];
const MOBILE_WORDS = ["ios", "iphone", "ipad", "android"];
const DESKTOP_WORDS = ["windows", "os x", "osx", "mac", "linux"];

function classifyPlatform(platform: string | null | undefined): number {
  const p = (platform || "").toLowerCase();
  if (p.includes("web_player") || p.includes("web player")) return 2;
  for (const w of TV_WORDS) if (p.includes(w)) return 3;
  for (const w of MOBILE_WORDS) if (p.includes(w)) return 0;
  for (const w of DESKTOP_WORDS) if (p.includes(w)) return 1;
  return 4;
}

export function deviceShare(streams: SpotifyStream[]): DeviceShare {
  const { start, count: M, months } = monthSpan(streams);
  if (M === 0) return { months: [], series: [] };
  const vals: number[][] = FAMILIES.map(() => new Array<number>(M).fill(0));
  const totals = [0, 0, 0, 0, 0];
  const cache = new Map<string, number>();
  for (let i = 0; i < streams.length; i++) {
    const s = streams[i];
    const raw = s.platform;
    let f = cache.get(raw);
    if (f === undefined) { f = classifyPlatform(raw); cache.set(raw, f); }
    vals[f][miOf(s) - start]++;
    totals[f]++;
  }
  const series: DeviceShare["series"] = [];
  for (let f = 0; f < FAMILIES.length; f++) if (totals[f] > 0) series.push({ name: FAMILIES[f], values: vals[f] });
  return { months, series };
}

/* ───────────────────────── 6 · Artist map ───────────────────────── */

export interface ArtistPoint { name: string; plays: number; hours: number; tracks: number; skipPct: number; firstDate: string; monthsSinceFirst: number; recentPlays: number }

/** Index of the first row whose ts is >= cutMs (rows are sorted). */
function firstIndexAtOrAfter(streams: SpotifyStream[], cutMs: number): number {
  let lo = 0, hi = streams.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (Date.parse(streams[mid].ts) < cutMs) lo = mid + 1; else hi = mid;
  }
  return lo;
}

export function artistPoints(streams: SpotifyStream[], minPlays = 15, limit = 300): ArtistPoint[] {
  const n = streams.length;
  if (n === 0) return [];
  interface Acc { plays: number; ms: number; skips: number; first: string; fy: number; fm: number; recent: number; tracks: Set<string> }
  const map = new Map<string, Acc>();
  const recentFrom = firstIndexAtOrAfter(streams, Date.parse(streams[n - 1].ts) - 183 * MS_DAY);
  for (let i = 0; i < n; i++) {
    const s = streams[i];
    const a = artistOf(s);
    if (!a) continue;
    let acc = map.get(a);
    if (!acc) {
      acc = { plays: 0, ms: 0, skips: 0, first: s.date, fy: s.year, fm: s.month, recent: 0, tracks: new Set() };
      map.set(a, acc);
    }
    acc.plays++;
    acc.ms += s.ms_played;
    if (isSkip(s)) acc.skips++;
    if (i >= recentFrom) acc.recent++;
    const t = s.master_metadata_track_name;
    if (t) acc.tracks.add(t);
  }
  const last = streams[n - 1];
  const lastIdx = miOf(last);
  const rows: [string, Acc][] = [];
  map.forEach((acc, name) => { if (acc.plays >= minPlays) rows.push([name, acc]); });
  rows.sort((x, y) => y[1].plays - x[1].plays || (x[0] < y[0] ? -1 : 1));
  if (rows.length > limit) rows.length = limit;
  return rows.map(([name, acc]) => ({
    name,
    plays: acc.plays,
    hours: r1(acc.ms / 3600000),
    tracks: acc.tracks.size,
    skipPct: r1((acc.skips / acc.plays) * 100),
    firstDate: acc.first,
    monthsSinceFirst: Math.max(0, lastIdx - (acc.fy * 12 + acc.fm - 1)),
    recentPlays: acc.recent,
  }));
}

/* ───────────────────────── 7 · Head to head ───────────────────────── */

export interface DuelSide { name: string; plays: number; hours: number; tracks: number; activeDays: number; skipPct: number; first: string /* date or "" */;
  peak: { ym: string; plays: number } | null; topSong: { track: string; plays: number } | null; monthly: number[] /* aligned with Duel.months */ }
export interface Duel { months: string[]; a: DuelSide; b: DuelSide; monthsWonA: number; monthsWonB: number }

export function artistDuel(streams: SpotifyStream[], a: string, b: string): Duel {
  const { start, count: M, months } = monthSpan(streams);
  const mk = () => ({ plays: 0, ms: 0, skips: 0, days: 0, lastDay: "", first: "", monthly: new Array<number>(M).fill(0), songs: new Map<string, number>() });
  const A = mk(), B = mk();
  for (let i = 0; i < streams.length; i++) {
    const s = streams[i];
    const art = s.master_metadata_album_artist_name;
    const side = art === a ? A : art === b ? B : null;
    if (!side) continue;
    side.plays++;
    side.ms += s.ms_played;
    if (isSkip(s)) side.skips++;
    if (s.date !== side.lastDay) { side.days++; side.lastDay = s.date; }
    if (!side.first) side.first = s.date;
    side.monthly[miOf(s) - start]++;
    const t = s.master_metadata_track_name;
    if (t) side.songs.set(t, (side.songs.get(t) || 0) + 1);
  }
  const finish = (name: string, x: ReturnType<typeof mk>): DuelSide => {
    let peak: DuelSide["peak"] = null;
    for (let m = 0; m < M; m++) if (x.monthly[m] > 0 && (!peak || x.monthly[m] > peak.plays)) peak = { ym: months[m], plays: x.monthly[m] };
    let topSong: DuelSide["topSong"] = null;
    x.songs.forEach((v, t) => { if (!topSong || v > topSong.plays || (v === topSong.plays && t < topSong.track)) topSong = { track: t, plays: v }; });
    return {
      name, plays: x.plays, hours: r1(x.ms / 3600000), tracks: x.songs.size, activeDays: x.days,
      skipPct: x.plays ? r1((x.skips / x.plays) * 100) : 0, first: x.first, peak, topSong, monthly: x.monthly,
    };
  };
  let wonA = 0, wonB = 0;
  for (let m = 0; m < M; m++) {
    if (A.monthly[m] > B.monthly[m]) wonA++;
    else if (B.monthly[m] > A.monthly[m]) wonB++;
  }
  return { months, a: finish(a, A), b: finish(b, B), monthsWonA: wonA, monthsWonB: wonB };
}

/* ───────────────────────── 8 · Retention cohorts ───────────────────────── */

export interface Cohorts { cohorts: { year: number; size: number; retention: number[] }[]; maxOffset: number }

export function retentionCohorts(streams: SpotifyStream[], minPlays = 3): Cohorts {
  if (streams.length === 0) return { cohorts: [], maxOffset: 0 };
  const y0 = streams[0].year;
  const Y = streams[streams.length - 1].year - y0 + 1;
  const map = new Map<string, { first: number; counts: Int32Array }>();
  for (let i = 0; i < streams.length; i++) {
    const s = streams[i];
    const a = artistOf(s);
    if (!a) continue;
    const yi = s.year - y0;
    let acc = map.get(a);
    if (!acc) { acc = { first: yi, counts: new Int32Array(Y) }; map.set(a, acc); }
    acc.counts[yi]++;
  }
  const size = new Int32Array(Y);
  const still = new Int32Array(Y * Y); // [cohort * Y + offset]
  map.forEach((acc) => {
    const c = acc.first;
    if (acc.counts[c] < minPlays) return;
    size[c]++;
    for (let yi = c; yi < Y; yi++) if (acc.counts[yi] >= minPlays) still[c * Y + (yi - c)]++;
  });
  const cohorts: Cohorts["cohorts"] = [];
  let maxOffset = 0;
  for (let c = 0; c < Y; c++) {
    if (size[c] === 0) continue;
    const retention: number[] = [];
    for (let k = 0; c + k < Y; k++) retention.push(Math.round((still[c * Y + k] / size[c]) * 100));
    if (retention.length - 1 > maxOffset) maxOffset = retention.length - 1;
    cohorts.push({ year: y0 + c, size: size[c], retention });
  }
  return { cohorts, maxOffset };
}

/* ───────────────────────── 9 · Discovery and diversity ───────────────────────── */

export interface Discovery { months: string[]; newArtists: number[]; newSongs: number[]; effectiveArtists: number[] }

export function discovery(streams: SpotifyStream[]): Discovery {
  const { start, count: M, months } = monthSpan(streams);
  const newArtists = new Array<number>(M).fill(0);
  const newSongs = new Array<number>(M).fill(0);
  const effectiveArtists = new Array<number>(M).fill(0);
  if (M === 0) return { months, newArtists, newSongs, effectiveArtists };
  const seen = new Map<string, Set<string>>(); // artist -> tracks seen
  const cur = new Map<string, number>();
  let curM = 0, curTotal = 0;
  const flush = () => {
    if (curTotal > 0) {
      let h = 0;
      cur.forEach((v) => { const p = v / curTotal; h -= p * Math.log(p); });
      effectiveArtists[curM] = r1(Math.exp(h));
    }
    cur.clear();
    curTotal = 0;
  };
  for (let i = 0; i < streams.length; i++) {
    const s = streams[i];
    const m = miOf(s) - start;
    if (m !== curM) { flush(); curM = m; }
    const a = artistOf(s);
    if (!a) continue;
    let tracks = seen.get(a);
    if (!tracks) { tracks = new Set(); seen.set(a, tracks); newArtists[m]++; }
    const t = s.master_metadata_track_name;
    if (t) {
      const before = tracks.size;
      tracks.add(t);
      if (tracks.size > before) newSongs[m]++;
    }
    cur.set(a, (cur.get(a) || 0) + 1);
    curTotal++;
  }
  flush();
  return { months, newArtists, newSongs, effectiveArtists };
}

/* ───────────────────────── 10 · Concentration ───────────────────────── */

export interface Concentration { artists: number; plays: number;
  curve: { x: number; y: number }[];
  gini: number; top1Share: number; top10Share: number;
  halfCount: number; p90Count: number }

export function concentration(streams: SpotifyStream[]): Concentration {
  const map = new Map<string, number>();
  for (let i = 0; i < streams.length; i++) {
    const a = artistOf(streams[i]);
    if (a) map.set(a, (map.get(a) || 0) + 1);
  }
  const A = map.size;
  if (A === 0) return { artists: 0, plays: 0, curve: [{ x: 0, y: 0 }], gini: 0, top1Share: 0, top10Share: 0, halfCount: 0, p90Count: 0 };
  const asc = new Int32Array(A);
  let j = 0;
  map.forEach((v) => { asc[j++] = v; });
  asc.sort(); // typed arrays sort numerically
  let plays = 0;
  for (let i = 0; i < A; i++) plays += asc[i];

  // cum[i] = plays of the i+1 most played artists
  const cum = new Float64Array(A + 1);
  for (let i = 0; i < A; i++) cum[i + 1] = cum[i] + asc[A - 1 - i];

  // Gini from the ascending order: G = 2 * sum(i * x_i) / (n * sum) - (n + 1) / n, i 1-based.
  let weighted = 0;
  for (let i = 0; i < A; i++) weighted += (i + 1) * asc[i];
  const gini = Math.max(0, Math.min(1, (2 * weighted) / (A * plays) - (A + 1) / A));

  // Curve: indices spaced quadratically so it is dense near 0.
  const P = Math.min(A, 150);
  const picks: number[] = [0];
  for (let q = 1; q < P; q++) {
    const idx = Math.max(1, Math.round(A * Math.pow(q / P, 2)));
    if (idx > picks[picks.length - 1]) picks.push(idx);
  }
  if (picks[picks.length - 1] !== A) picks.push(A);
  const curve = picks.map((i) => ({ x: i === A ? 100 : r2((i / A) * 100), y: i === A ? 100 : r2((cum[i] / plays) * 100) }));

  const countFor = (frac: number) => {
    const target = plays * frac;
    let lo = 1, hi = A;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] >= target) hi = mid; else lo = mid + 1; }
    return lo;
  };
  const share = (frac: number) => r1((cum[Math.min(A, Math.max(1, Math.round(A * frac)))] / plays) * 100);
  return { artists: A, plays, curve, gini: r2(gini), top1Share: share(0.01), top10Share: share(0.1), halfCount: countFor(0.5), p90Count: countFor(0.9) };
}

/* ───────────────────────── 11 · Song half-life ───────────────────────── */

export interface HalfLifeSong { track: string; artist: string; days: number; plays: number }
export interface HalfLife { songs: number; medianDays: number; buckets: { label: string; count: number }[]; fastest: HalfLifeSong[]; slowest: HalfLifeSong[] }

const BUCKETS: { label: string; below: number }[] = [
  { label: "< 1 semana", below: 7 },
  { label: "1–4 semanas", below: 28 },
  { label: "1–3 meses", below: 91 },
  { label: "3–12 meses", below: 365 },
  { label: "1–2 años", below: 730 },
  { label: "+ 2 años", below: Infinity },
];

export function songHalfLife(streams: SpotifyStream[], minPlays = 20, listSize = 4): HalfLife {
  const n = streams.length;
  const buckets = BUCKETS.map((b) => ({ label: b.label, count: 0 }));
  const empty: HalfLife = { songs: 0, medianDays: 0, buckets, fastest: [], slowest: [] };
  if (n === 0) return empty;

  // Pass 1: intern songs, count totals, remember first row.
  const idOf = new Map<string, number>();
  const ids = new Int32Array(n);
  const total: number[] = [];
  const firstRow: number[] = [];
  const names: string[] = []; // track, artist alternating
  for (let i = 0; i < n; i++) {
    const s = streams[i];
    const t = s.master_metadata_track_name, a = s.master_metadata_album_artist_name;
    if (!t || !a) { ids[i] = -1; continue; }
    const key = t + "\u0000" + a;
    let id = idOf.get(key);
    if (id === undefined) { id = total.length; idOf.set(key, id); total.push(0); firstRow.push(i); names.push(t, a); }
    ids[i] = id;
    total[id]++;
  }
  const S = total.length;
  const lastMs = Date.parse(streams[n - 1].ts);
  const cutoff = lastMs - 183 * MS_DAY;

  // Pass 2: for eligible songs find the play reaching 50% of its total.
  const need = new Int32Array(S); // plays still needed; 0 = not eligible / done
  const eligible = new Uint8Array(S);
  const firstMs = new Float64Array(S);
  for (let id = 0; id < S; id++) {
    if (total[id] < minPlays) continue;
    const f = Date.parse(streams[firstRow[id]].ts);
    if (f > cutoff) continue;
    eligible[id] = 1;
    firstMs[id] = f;
    need[id] = Math.ceil(total[id] / 2);
  }
  const days: number[] = [];
  const found: HalfLifeSong[] = [];
  for (let i = 0; i < n; i++) {
    const id = ids[i];
    if (id < 0 || need[id] === 0) continue;
    if (--need[id] === 0) {
      const d = r1((Date.parse(streams[i].ts) - firstMs[id]) / MS_DAY);
      days.push(d);
      found.push({ track: names[id * 2], artist: names[id * 2 + 1], days: d, plays: total[id] });
      for (let b = 0; b < BUCKETS.length; b++) if (d < BUCKETS[b].below) { buckets[b].count++; break; }
    }
  }
  if (found.length === 0) return empty;
  const sortedDays = days.slice().sort((x, y) => x - y);
  const mid = sortedDays.length >> 1;
  const median = sortedDays.length % 2 ? sortedDays[mid] : (sortedDays[mid - 1] + sortedDays[mid]) / 2;
  const tie = (x: HalfLifeSong, y: HalfLifeSong) => y.plays - x.plays || (x.track < y.track ? -1 : 1);
  found.sort((x, y) => x.days - y.days || tie(x, y));
  const fastest = found.slice(0, listSize);
  found.sort((x, y) => y.days - x.days || tie(x, y));
  const slowest = found.slice(0, listSize);
  return { songs: found.length, medianDays: r1(median), buckets, fastest, slowest };
}

/* ───────────────────────── 12 · Play flows ───────────────────────── */

export interface Flows { total: number; sources: { name: string; value: number }[]; targets: { name: string; value: number }[]; links: { source: string; target: string; value: number }[] }

const SOURCES = ["Vino sola", "Tras un salto", "La elegiste tú", "Volviste atrás", "Otros"];
const TARGETS = ["Sonó entera", "La saltaste", "Pusiste otra", "Volviste atrás", "Cerraste la app", "Otros"];

function startGroup(r: string | null): number {
  switch (r) {
    case "trackdone": return 0;
    case "fwdbtn": return 1;
    case "clickrow": case "playbtn": return 2;
    case "backbtn": return 3;
    default: return 4;
  }
}
function endGroup(r: string | null): number {
  switch (r) {
    case "trackdone": return 0;
    case "fwdbtn": return 1;
    case "endplay": return 2;
    case "backbtn": return 3;
    case "logout": case "unexpected-exit": case "unexpected-exit-while-paused": return 4;
    default: return 5;
  }
}

export function playFlows(streams: SpotifyStream[]): Flows {
  const T = TARGETS.length;
  const m = new Int32Array(SOURCES.length * T);
  for (let i = 0; i < streams.length; i++) {
    const s = streams[i];
    m[startGroup(s.reason_start) * T + endGroup(s.reason_end)]++;
  }
  const sources: Flows["sources"] = [];
  const targets: Flows["targets"] = [];
  const links: Flows["links"] = [];
  for (let a = 0; a < SOURCES.length; a++) {
    let v = 0;
    for (let b = 0; b < T; b++) {
      v += m[a * T + b];
      if (m[a * T + b] > 0) links.push({ source: SOURCES[a], target: TARGETS[b], value: m[a * T + b] });
    }
    if (v > 0) sources.push({ name: SOURCES[a], value: v });
  }
  for (let b = 0; b < T; b++) {
    let v = 0;
    for (let a = 0; a < SOURCES.length; a++) v += m[a * T + b];
    if (v > 0) targets.push({ name: TARGETS[b], value: v });
  }
  return { total: streams.length, sources, targets, links };
}
