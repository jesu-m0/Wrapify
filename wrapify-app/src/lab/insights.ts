import { SpotifyStream } from "@/types/spotify";
import { generateMonthRange, listeningStreaks } from "@/lib/stats";

/* ── Formatting helpers (es) ── */

const INT = new Intl.NumberFormat("de-DE"); // dots as thousands separator, also for 4 digits
export const fmtInt = (n: number) => INT.format(Math.round(n));

const MONTHS_LONG = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const WEEKDAYS_LONG = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
export const WEEKDAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** "2025-02-17" → "17 de febrero de 2025" */
export function fmtDateLong(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} de ${MONTHS_LONG[m - 1]} de ${y}`;
}
/** "2025-02-17" → "17 feb 2025" */
export function fmtDateShort(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}
/** "2025-02" (or a full date) → "febrero de 2025" */
export function fmtMonthLong(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} de ${y}`;
}
/** "2025-02" → "feb 2025" */
export function fmtMonthShort(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${y}`;
}
export const fmtHour = (h: number) => `${String(h).padStart(2, "0")}:00`;

/* ── Types ── */

export interface RankedArtist {
  name: string;
  plays: number;
  minutes: number;
  first: string;
}
export interface RankedSong {
  track: string;
  artist: string;
  plays: number;
}
export interface RankedAlbum {
  album: string;
  artist: string;
  plays: number;
}
export interface YearInfo {
  year: number;
  plays: number;
  hours: number;
  topArtist: string;
  topArtistPlays: number;
  topSong: RankedSong | null;
  newArtists: number;
}
export interface MonthPoint {
  ym: string;
  plays: number;
  hours: number;
}
export interface Persona {
  title: string;
  blurb: string;
}

export interface Insights {
  totalPlays: number;
  totalMinutes: number;
  totalHours: number;
  totalDays: number;
  uniqueArtists: number;
  uniqueTracks: number;
  activeDays: number;
  avgMinutesPerActiveDay: number;
  firstDate: string;
  lastDate: string;
  spanYears: number;
  artists: RankedArtist[];
  allArtists: { name: string; plays: number }[];
  songs: RankedSong[];
  albums: RankedAlbum[];
  topArtistTopSong: string | null;
  /** local time, index = hour */
  hourly: number[];
  /** Mon..Sun */
  weekday: number[];
  /** [Mon..Sun][hour], local time */
  heat: number[][];
  peakHour: number;
  peakWeekday: number;
  persona: Persona;
  years: YearInfo[];
  monthly: MonthPoint[];
  peakMonth: MonthPoint | null;
  busiest: { date: string; plays: number; topTrack: string | null; topArtist: string | null };
  streak: { longest: number; start: string; end: string };
  skipPct: number;
}

const SEP = "\u0000";

function personaFor(peakHour: number): Persona {
  if (peakHour >= 22 || peakHour <= 4)
    return { title: "búho nocturno", blurb: "Cuando el mundo se apaga, tú subes el volumen." };
  if (peakHour <= 10)
    return { title: "alondra madrugadora", blurb: "El día no arranca hasta que suena la primera canción." };
  if (peakHour <= 16)
    return { title: "melómano de mediodía", blurb: "La música es tu banda sonora de trabajo y sobremesa." };
  return { title: "alma de atardecer", blurb: "Tus mejores canciones suenan cuando cae el sol." };
}

function argMax(arr: number[]): number {
  let best = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[best]) best = i;
  return best;
}

function topEntry(map: Map<string, number>): [string, number] | null {
  let best: [string, number] | null = null;
  for (const entry of map) if (!best || entry[1] > best[1]) best = entry;
  return best;
}

/** One pass over the history → everything the lab UIs need. Works on any subset. */
export function buildInsights(streams: SpotifyStream[]): Insights {
  const artistMap = new Map<string, { plays: number; minutes: number; first: string }>();
  const songMap = new Map<string, number>();
  const albumMap = new Map<string, number>();
  const yearMap = new Map<
    number,
    { plays: number; minutes: number; artists: Map<string, number>; songs: Map<string, number> }
  >();
  const monthMap = new Map<string, { plays: number; minutes: number }>();
  const dayMap = new Map<string, number>();
  const hourly = new Array<number>(24).fill(0);
  const weekday = new Array<number>(7).fill(0);
  const heat = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));

  let totalMinutes = 0;
  let skips = 0;
  let firstDate = "9999-12-31";
  let lastDate = "";

  for (const s of streams) {
    const artist = s.master_metadata_album_artist_name;
    const track = s.master_metadata_track_name;
    const album = s.master_metadata_album_album_name;
    const min = s.ms_played / 60000;
    totalMinutes += min;
    if (s.skipped) skips++;
    if (s.date < firstDate) firstDate = s.date;
    if (s.date > lastDate) lastDate = s.date;
    dayMap.set(s.date, (dayMap.get(s.date) || 0) + 1);

    // clock stats in the listener's local time (ts is UTC)
    const local = new Date(s.ts);
    const h = local.getHours();
    const wd = (local.getDay() + 6) % 7;
    hourly[h]++;
    weekday[wd]++;
    heat[wd][h]++;

    const ym = `${s.year}-${s.month < 10 ? "0" : ""}${s.month}`;
    const mAgg = monthMap.get(ym);
    if (mAgg) {
      mAgg.plays++;
      mAgg.minutes += min;
    } else monthMap.set(ym, { plays: 1, minutes: min });

    let yAgg = yearMap.get(s.year);
    if (!yAgg) {
      yAgg = { plays: 0, minutes: 0, artists: new Map(), songs: new Map() };
      yearMap.set(s.year, yAgg);
    }
    yAgg.plays++;
    yAgg.minutes += min;

    if (artist) {
      const a = artistMap.get(artist);
      if (a) {
        a.plays++;
        a.minutes += min;
        if (s.date < a.first) a.first = s.date;
      } else artistMap.set(artist, { plays: 1, minutes: min, first: s.date });
      yAgg.artists.set(artist, (yAgg.artists.get(artist) || 0) + 1);
      if (track) {
        const key = track + SEP + artist;
        songMap.set(key, (songMap.get(key) || 0) + 1);
        yAgg.songs.set(key, (yAgg.songs.get(key) || 0) + 1);
      }
      if (album) {
        const key = album + SEP + artist;
        albumMap.set(key, (albumMap.get(key) || 0) + 1);
      }
    }
  }

  const allArtistsFull = Array.from(artistMap.entries())
    .map(([name, a]) => ({ name, ...a }))
    .sort((a, b) => b.plays - a.plays);
  const artists = allArtistsFull.slice(0, 50);

  const songs: RankedSong[] = Array.from(songMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([key, plays]) => {
      const [track, artist] = key.split(SEP);
      return { track, artist, plays };
    });

  const albums: RankedAlbum[] = Array.from(albumMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([key, plays]) => {
      const [album, artist] = key.split(SEP);
      return { album, artist, plays };
    });

  // new artists per year (first appearance)
  const newByYear = new Map<number, number>();
  for (const a of allArtistsFull) {
    const y = Number(a.first.slice(0, 4));
    newByYear.set(y, (newByYear.get(y) || 0) + 1);
  }

  const years: YearInfo[] = Array.from(yearMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, agg]) => {
      const ta = topEntry(agg.artists);
      const ts = topEntry(agg.songs);
      let topSong: RankedSong | null = null;
      if (ts) {
        const [track, artist] = ts[0].split(SEP);
        topSong = { track, artist, plays: ts[1] };
      }
      return {
        year,
        plays: agg.plays,
        hours: Math.round(agg.minutes / 60),
        topArtist: ta ? ta[0] : "—",
        topArtistPlays: ta ? ta[1] : 0,
        topSong,
        newArtists: newByYear.get(year) || 0,
      };
    });

  const monthly: MonthPoint[] = generateMonthRange(streams).map((ym) => {
    const agg = monthMap.get(ym);
    return { ym, plays: agg?.plays || 0, hours: agg ? Math.round(agg.minutes / 60) : 0 };
  });
  let peakMonth: MonthPoint | null = null;
  for (const m of monthly) if (!peakMonth || m.hours > peakMonth.hours) peakMonth = m;

  // busiest day + what was on repeat that day
  let busiestDate = "";
  let busiestPlays = 0;
  for (const [date, count] of dayMap) {
    if (count > busiestPlays) {
      busiestPlays = count;
      busiestDate = date;
    }
  }
  const dayTracks = new Map<string, number>();
  for (const s of streams) {
    if (s.date !== busiestDate) continue;
    const key = (s.master_metadata_track_name || "") + SEP + (s.master_metadata_album_artist_name || "");
    dayTracks.set(key, (dayTracks.get(key) || 0) + 1);
  }
  const busiestTop = topEntry(dayTracks);

  // the #1 artist's most played song
  let topArtistTopSong: string | null = null;
  if (artists[0]) {
    const mine = new Map<string, number>();
    for (const [key, plays] of songMap) {
      const [track, artist] = key.split(SEP);
      if (artist === artists[0].name) mine.set(track, plays);
    }
    topArtistTopSong = topEntry(mine)?.[0] ?? null;
  }

  const streaks = streams.length > 0 ? listeningStreaks(streams) : null;
  const peakHour = argMax(hourly);
  const totalHours = Math.round(totalMinutes / 60);
  const activeDays = dayMap.size;

  return {
    totalPlays: streams.length,
    totalMinutes: Math.round(totalMinutes),
    totalHours,
    totalDays: Math.round((totalMinutes / 60 / 24) * 10) / 10,
    uniqueArtists: artistMap.size,
    uniqueTracks: songMap.size,
    activeDays,
    avgMinutesPerActiveDay: activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0,
    firstDate,
    lastDate,
    spanYears: Math.max(1, Number(lastDate.slice(0, 4)) - Number(firstDate.slice(0, 4))),
    artists,
    allArtists: allArtistsFull.map(({ name, plays }) => ({ name, plays })),
    songs,
    albums,
    topArtistTopSong,
    hourly,
    weekday,
    heat,
    peakHour,
    peakWeekday: argMax(weekday),
    persona: personaFor(peakHour),
    years,
    monthly,
    peakMonth,
    busiest: {
      date: busiestDate,
      plays: busiestPlays,
      topTrack: busiestTop ? busiestTop[0].split(SEP)[0] || null : null,
      topArtist: busiestTop ? busiestTop[0].split(SEP)[1] || null : null,
    },
    streak: {
      longest: streaks?.longestStreak ?? 0,
      start: streaks?.longestStart ?? "",
      end: streaks?.longestEnd ?? "",
    },
    skipPct: streams.length > 0 ? Math.round((skips / streams.length) * 1000) / 10 : 0,
  };
}

export interface ArtistDetail {
  name: string;
  plays: number;
  hours: number;
  first: string;
  last: string;
  songCount: number;
  songs: { track: string; plays: number }[];
  monthly: { ym: string; plays: number }[];
}

export function artistDetail(streams: SpotifyStream[], name: string): ArtistDetail {
  const songs = new Map<string, number>();
  const months = new Map<string, number>();
  let plays = 0;
  let minutes = 0;
  let first = "9999-12-31";
  let last = "";
  for (const s of streams) {
    if (s.master_metadata_album_artist_name !== name) continue;
    plays++;
    minutes += s.ms_played / 60000;
    if (s.date < first) first = s.date;
    if (s.date > last) last = s.date;
    const t = s.master_metadata_track_name;
    if (t) songs.set(t, (songs.get(t) || 0) + 1);
    const ym = `${s.year}-${s.month < 10 ? "0" : ""}${s.month}`;
    months.set(ym, (months.get(ym) || 0) + 1);
  }
  return {
    name,
    plays,
    hours: Math.round(minutes / 60),
    first,
    last,
    songCount: songs.size,
    songs: Array.from(songs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([track, p]) => ({ track, plays: p })),
    monthly: generateMonthRange(streams).map((ym) => ({ ym, plays: months.get(ym) || 0 })),
  };
}

/** Monthly points → chart series with a year tick on each January (or month ticks for ≤ 18 months). */
export function monthSeries(
  monthly: { ym: string }[],
  value: (i: number) => number
): { label: string; value: number; tick?: string }[] {
  const short = monthly.length <= 18;
  return monthly.map((m, i) => {
    const month = Number(m.ym.slice(5, 7));
    return {
      label: fmtMonthShort(m.ym),
      value: value(i),
      tick: short ? MONTHS_SHORT[month - 1] : month === 1 ? m.ym.slice(0, 4) : undefined,
    };
  });
}
