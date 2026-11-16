import { SpotifyStreamRaw } from "@/types/spotify";
import { AlbumSpec, MAIN, Mood, TAIL } from "./catalog";

/*
 * A made-up listener for the demo, generated in the browser so no real history
 * ships with the app. Seeded: the same seed always gives the same plays.
 *
 * The story: someone from Madrid who opens the account in October 2016 in high
 * school, goes to uni (bus in the morning, studying in the afternoon, parties on
 * weekends), spends the 2020 lockdown at home with the computer on, does an
 * Erasmus in Bologna (2021-22), starts an office job in February 2023 (commute +
 * focus music at work) and travels now and then: London, Japan, Mexico for
 * Christmas 2024, Lisbon, Greece. Taste follows the albums in catalog.ts.
 *
 * Rows follow Spotify's extended streaming history: `ts` is when the play
 * stopped (UTC), reason_start of a track is the reason_end of the one before,
 * `skipped` is only filled in from 2022 on and the platform strings get
 * simplified in 2023, like in real exports.
 */

const DAY = 86_400_000;
const dayOf = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY);

const FIRST_DAY = dayOf("2016-10-03");
const LAST_DAY = dayOf("2026-10-31");

/* ── randomness ── */

function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

function pickWeighted<T>(rng: Rng, items: readonly T[], weights: readonly number[]): T {
  let total = 0;
  for (const w of weights) total += w;
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

const between = (rng: Rng, lo: number, hi: number) => lo + rng() * (hi - lo);

const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
/** A stable, fake track URI (it does not exist on Spotify). */
function fakeUri(key: string): string {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  let out = "";
  for (let i = 0; i < 22; i++) {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) + i;
    out += B62[(h >>> 0) % 62];
  }
  return `spotify:track:${out}`;
}

/* ── catalogue ── */

/** How much of an album's peak stays for good (scales the catalogue's `keep`). */
const KEEP = 0.5;
/** Scales every session length: tunes the size of the history (~70k plays). */
const SESSION_LENGTH = 0.55;

const MOOD_BIT: Record<Mood, number> = { pop: 1, fiesta: 2, noche: 4, focus: 8, guilty: 16 };

interface Track {
  title: string;
  artist: string;
  album: string;
  ms: number;
  uri: string;
  /** 1 for the album's hit, lower for the rest */
  rank: number;
}

interface Album {
  artist: string;
  moods: number;
  eras: { from: number; w: number; halfLife: number; keep: number }[];
  tracks: Track[];
  rankCum: number[];
}

function buildAlbum(spec: AlbumSpec, eras: Album["eras"]): Album {
  const tracks = spec.tracks.map(([title, sec], i) => ({
    title,
    artist: spec.artist,
    album: spec.album,
    ms: sec * 1000,
    uri: fakeUri(`${spec.artist}|${title}`),
    rank: 1 / Math.pow(i + 1, 0.6),
  }));
  const rankCum: number[] = [];
  let acc = 0;
  for (const t of tracks) rankCum.push((acc += t.rank));
  return { artist: spec.artist, moods: spec.moods.reduce((m, x) => m | MOOD_BIT[x], 0), eras, tracks, rankCum };
}

function buildCatalog(rng: Rng): Album[] {
  const albums = MAIN.map((spec) =>
    buildAlbum(
      spec,
      spec.eras.map(([from, w, halfLife, keep]) => ({ from: dayOf(from), w, halfLife: halfLife * 30.4, keep: keep * KEEP }))
    )
  );
  for (const [artist, album, year, moods, tracks, on] of TAIL) {
    let from: number;
    if (on) from = dayOf(on);
    else if (year < 2016) from = FIRST_DAY + Math.floor(rng() * (LAST_DAY - 150 - FIRST_DAY));
    else from = Math.max(FIRST_DAY, dayOf(`${year}-07-01`)) + Math.floor(rng() * 400);
    from = Math.min(from, LAST_DAY - 30);
    const w = between(rng, 0.9, 2.2);
    const eras = [{ from, w, halfLife: between(rng, 1.5, 4.5) * 30.4, keep: between(rng, 0.03, 0.12) }];
    // some songs come back a couple of years later
    const again = from + 250 + Math.floor(rng() * 700);
    if (rng() < 0.3 && again < LAST_DAY - 30) eras.push({ from: again, w: w * 0.6, halfLife: 60, keep: 0 });
    albums.push(
      buildAlbum({ artist, album, moods: moods.split(" ") as Mood[], eras: [], tracks }, eras)
    );
  }
  return albums;
}

function eraWeight(a: Album, day: number): number {
  let total = 0;
  for (const e of a.eras) {
    if (day < e.from) continue;
    const d = day - e.from;
    const ramp = Math.min(1, (d + 1) / 6);
    total += e.w * ramp * (e.keep + (1 - e.keep) * Math.pow(2, -d / e.halfLife));
  }
  return total;
}

/** Songs played on repeat for a few weeks. */
const OBSESSIONS: [artist: string, title: string, from: string, days: number][] = [
  ["Arctic Monkeys", "505", "2017-01-08", 30],
  ["ROSALÍA", "MALAMENTE - Cap.1: Augurio", "2018-06-01", 40],
  ["The Weeknd", "Blinding Lights", "2020-01-10", 45],
  ["C. Tangana", "Tú Me Dejaste De Querer", "2020-12-01", 45],
  ["Måneskin", "Beggin'", "2021-07-12", 30],
  ["Kate Bush", "Running Up That Hill (A Deal With God)", "2022-06-03", 35],
  ["Bizarrap", "Quevedo: Bzrp Music Sessions, Vol. 52", "2022-07-08", 45],
  ["Mariya Takeuchi", "Plastic Love", "2023-04-01", 40],
  ["Billie Eilish", "BIRDS OF A FEATHER", "2024-07-01", 60],
  ["Bad Bunny", "DtMF", "2025-01-06", 40],
  ["ROSALÍA", "Berghain", "2025-11-08", 30],
  ["Fleetwood Mac", "Dreams", "2026-03-01", 30],
];

/* ── the listener's days ── */

type Device = "phone" | "desktop" | "web" | "tv" | "speaker";

interface Slot {
  from: number; // minutes after local midnight, can pass 24:00
  to: number;
  p: number;
  devices: Device[];
  moods: [Mood, number][];
  dur: [number, number]; // minutes
  offline?: boolean;
}

const hm = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

function S(from: string, to: string, p: number, devices: string, moods: string, dur: [number, number], offline = false): Slot {
  return {
    from: hm(from),
    to: hm(to),
    p,
    devices: devices.split("|") as Device[],
    moods: moods.split(" ").map((m) => {
      const [name, w] = m.split(":");
      return [name as Mood, w ? Number(w) : 1];
    }),
    dur,
    offline,
  };
}

const scale = (slots: Slot[], k: number) => slots.map((s) => ({ ...s, p: s.p * k }));

const STUDENT_WEEKDAY = [
  S("07:35", "08:05", 0.72, "phone", "pop", [25, 40]),
  S("14:20", "15:30", 0.38, "phone", "pop", [15, 35]),
  S("17:00", "19:30", 0.5, "desktop", "focus:.55 pop:.45", [45, 120]),
  S("21:30", "23:15", 0.55, "desktop|phone", "pop:.6 noche:.4", [25, 75]),
  S("24:00", "25:30", 0.3, "phone", "noche", [15, 45]),
];
const ERASMUS_WEEKDAY = [
  S("08:30", "09:00", 0.5, "phone", "pop", [15, 30]),
  ...STUDENT_WEEKDAY.slice(1),
];
const WORK_WEEKDAY = [
  S("07:50", "08:15", 0.85, "phone", "pop", [30, 45]),
  S("09:30", "10:30", 0.62, "web", "focus:.8 pop:.2", [80, 170]),
  S("14:45", "15:30", 0.5, "web", "focus:.7 pop:.3", [60, 140]),
  S("18:10", "18:40", 0.8, "phone", "pop", [30, 45]),
  S("21:00", "22:45", 0.45, "phone|speaker", "pop:.5 noche:.5", [25, 70]),
  S("23:45", "25:00", 0.15, "phone", "noche", [15, 35]),
];
const WEEKEND_DAY = [
  S("10:45", "13:00", 0.5, "phone|speaker", "pop", [30, 90]),
  S("17:00", "20:00", 0.42, "desktop|phone|speaker", "pop:.7 noche:.3", [30, 90]),
];
const PARTY = [
  S("22:00", "23:30", 0.55, "phone|speaker", "fiesta", [40, 100]),
  S("26:30", "28:00", 0.22, "phone", "noche:.5 fiesta:.5", [15, 40]),
];
const SUNDAY_NIGHT = [S("22:00", "23:30", 0.45, "desktop|phone", "noche:.6 pop:.4", [25, 60])];
const LOCKDOWN = [
  S("10:30", "12:30", 0.8, "desktop", "focus:.5 pop:.5", [60, 180]),
  S("16:00", "19:00", 0.7, "desktop|phone", "pop:.7 focus:.3", [60, 150]),
  S("22:00", "24:30", 0.75, "desktop|tv", "noche:.6 pop:.4", [45, 140]),
  S("25:30", "27:00", 0.3, "phone", "noche", [20, 50]),
];
const TRIP_DAY = [
  S("08:30", "09:30", 0.45, "phone", "pop", [20, 40]),
  S("15:00", "18:00", 0.45, "phone", "pop:.6 noche:.4", [25, 60]),
  S("23:00", "24:30", 0.5, "phone", "noche:.6 pop:.4", [20, 45]),
];
const FLIGHT = S("10:00", "13:00", 1, "phone", "pop:.5 noche:.5", [90, 200], true);

interface Trip {
  from: number;
  to: number;
  country: string;
  tz: number;
  dst: boolean;
}
const trip = (from: string, to: string, country: string, tz: number, dst: boolean): Trip => ({
  from: dayOf(from),
  to: dayOf(to),
  country,
  tz,
  dst,
});
const TRIPS: Trip[] = [
  trip("2018-08-04", "2018-08-11", "FR", 1, true),
  trip("2019-04-18", "2019-04-22", "GB", 0, true),
  trip("2023-03-31", "2023-04-15", "JP", 9, false),
  trip("2024-12-14", "2025-01-03", "MX", -6, false),
  trip("2025-06-12", "2025-06-16", "PT", 0, true),
  trip("2026-07-10", "2026-07-19", "GR", 2, true),
];

const LOCKDOWN_FROM = dayOf("2020-03-14");
const LOCKDOWN_TO = dayOf("2020-06-21");
const ERASMUS_FROM = dayOf("2021-09-13");
const ERASMUS_TO = dayOf("2022-06-30");
const JOB_FROM = dayOf("2023-02-01");

const YEAR_VOLUME: Record<number, number> = {
  2016: 0.7, 2017: 0.78, 2018: 0.86, 2019: 0.92, 2020: 1.05, 2021: 1,
  2022: 1, 2023: 1.02, 2024: 0.98, 2025: 1.03, 2026: 0.97,
};

function lastSunday(y: number, month: number): number {
  const d = new Date(Date.UTC(y, month + 1, 0));
  return d.getUTCDate() - d.getUTCDay();
}
/** Central European summer time, by local date. */
function euSummer(y: number, m: number, d: number): boolean {
  if (m < 2 || m > 9) return false;
  if (m > 2 && m < 9) return true;
  if (m === 2) return d >= lastSunday(y, 2);
  return d < lastSunday(y, 9);
}

interface DayPlan {
  slots: Slot[];
  country: string;
  utcOffset: number;
  offlineP: number;
  homeIp: string;
}

function planDay(day: number): DayPlan {
  const date = new Date(day * DAY);
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const dow = date.getUTCDay(); // 0 = Sunday
  const summer = euSummer(y, m, d);

  const t = TRIPS.find((tr) => day >= tr.from && day <= tr.to);
  if (t) {
    const flight = day === t.from || day === t.to;
    return {
      slots: flight ? [FLIGHT, ...TRIP_DAY.slice(1)] : TRIP_DAY,
      country: t.country,
      utcOffset: t.tz + (t.dst && summer ? 1 : 0),
      offlineP: 0.12,
      homeIp: `192.0.2.${(day % 200) + 20}`,
    };
  }

  const erasmus = day >= ERASMUS_FROM && day <= ERASMUS_TO;
  const worker = day >= JOB_FROM;
  const plan: DayPlan = {
    slots: [],
    country: erasmus ? "IT" : "ES",
    utcOffset: 1 + (summer ? 1 : 0),
    offlineP: 0.01,
    homeIp: erasmus ? "203.0.113.142" : worker ? "203.0.113.88" : "203.0.113.17",
  };

  const christmas = (m === 11 && d >= 23) || (m === 0 && d <= 6);
  const holidays = worker
    ? christmas || (m === 7 && d <= 21)
    : christmas || (m === 6 || (m === 7) || (m === 8 && d <= 10));

  if (day >= LOCKDOWN_FROM && day <= LOCKDOWN_TO) plan.slots = LOCKDOWN;
  else if (holidays) {
    plan.slots = [...WEEKEND_DAY, ...scale(PARTY, christmas ? 0.9 : 1.15)];
    if (m === 6 || m === 7) plan.offlineP = 0.25; // the beach
  } else if (dow >= 1 && dow <= 4) {
    plan.slots = worker ? WORK_WEEKDAY : erasmus ? ERASMUS_WEEKDAY : STUDENT_WEEKDAY;
    if (erasmus && dow === 4) plan.slots = [...plan.slots.slice(0, 3), ...scale(PARTY, 0.8)];
  } else if (dow === 5) {
    const days = worker ? WORK_WEEKDAY.slice(0, 4) : erasmus ? ERASMUS_WEEKDAY.slice(0, 3) : STUDENT_WEEKDAY.slice(0, 3);
    plan.slots = [...days, ...scale(PARTY, worker ? 0.8 : erasmus ? 1.25 : 1)];
  } else if (dow === 6) {
    plan.slots = [...WEEKEND_DAY, ...scale(PARTY, worker ? 0.8 : erasmus ? 1.25 : 1)];
  } else {
    plan.slots = [...WEEKEND_DAY, ...SUNDAY_NIGHT];
  }

  if (m === 11 && (d === 24 || d === 31)) plan.slots = [...plan.slots, S("23:40", "24:20", 0.9, "phone|speaker", "fiesta", [90, 180])];
  return plan;
}

function platformFor(device: Device, day: number, rng: Rng): string {
  const simple = day >= dayOf("2023-05-01"); // newer exports use short names
  switch (device) {
    case "tv":
      if (day >= dayOf("2018-12-01") && day < dayOf("2022-12-01")) return "Partner SCEI sony_tv;ps4;;";
      return platformFor("desktop", day, rng);
    case "speaker":
      if (day >= dayOf("2021-01-01")) return "Partner google cast_tv;Chromecast;;";
      return platformFor("phone", day, rng);
    case "web":
      return simple ? "web_player" : "web_player windows 10;chrome 109.0.0.0;desktop";
    case "desktop":
      if (simple) return "windows";
      return day < dayOf("2019-06-01") ? "Windows 10 (10.0.17134; x64)" : "Windows 10 (10.0.19044; x64; AppX)";
    case "phone":
      if (day < dayOf("2019-09-01")) return "Android OS 7.0 API 24 (samsung, SM-G930F)";
      if (day < dayOf("2021-03-01")) return "Android OS 10 API 29 (Xiaomi, Mi 9T)";
      if (day < JOB_FROM) return "Android OS 11 API 30 (Xiaomi, Mi 9T)";
      return simple ? "ios" : "iOS 16.3 (iPhone14,5)";
  }
}

/* ── one listening session ── */

type Kind = "mix" | "album" | "artist" | "repeat";
const KINDS: Record<Mood, [Kind, number][]> = {
  pop: [["mix", 0.55], ["album", 0.2], ["artist", 0.17], ["repeat", 0.08]],
  fiesta: [["mix", 0.85], ["artist", 0.15]],
  noche: [["mix", 0.5], ["album", 0.35], ["artist", 0.15]],
  focus: [["album", 0.4], ["mix", 0.6]],
  guilty: [["mix", 1]],
};
const SKIP_BASE: Record<Kind, number> = { mix: 0.2, artist: 0.14, album: 0.07, repeat: 0.03 };

function lastReason(device: Device, rng: Rng): string {
  if (device === "tv" || device === "speaker")
    return pickWeighted(rng, ["remote", "endplay", "trackdone"], [0.4, 0.4, 0.2]);
  if (device === "phone")
    return pickWeighted(
      rng,
      ["endplay", "unexpected-exit-while-paused", "trackdone", "logout", "unexpected-exit"],
      [0.35, 0.3, 0.25, 0.07, 0.03]
    );
  return pickWeighted(rng, ["endplay", "logout", "trackdone", "unexpected-exit"], [0.45, 0.25, 0.2, 0.1]);
}

function firstReason(device: Device, rng: Rng): string {
  if (device === "tv" || device === "speaker") return pickWeighted(rng, ["remote", "playbtn", "clickrow"], [0.65, 0.2, 0.15]);
  if (device === "phone") return pickWeighted(rng, ["clickrow", "playbtn", "appload", "unknown"], [0.5, 0.25, 0.2, 0.05]);
  return pickWeighted(rng, ["clickrow", "appload", "playbtn"], [0.45, 0.35, 0.2]);
}

export function generateDemoHistory(seed = 20161003): SpotifyStreamRaw[] {
  const rng = mulberry32(seed);
  const albums = buildCatalog(rng);

  const byArtist = new Map<string, number[]>();
  albums.forEach((a, i) => byArtist.set(a.artist, [...(byArtist.get(a.artist) ?? []), i]));
  const findTrack = (artist: string, title: string) => {
    for (const i of byArtist.get(artist) ?? []) {
      const t = albums[i].tracks.find((x) => x.title === title);
      if (t) return t;
    }
    throw new Error(`demo catalogue: no "${title}" by ${artist}`);
  };
  const obsessions = OBSESSIONS.map(([artist, title, from, days]) => ({
    track: findTrack(artist, title),
    from: dayOf(from),
    days,
  }));

  const rows: SpotifyStreamRaw[] = [];
  const weights = new Float64Array(albums.length);
  let busyUntil = 0;

  for (let day = FIRST_DAY; day <= LAST_DAY; day++) {
    const plan = planDay(day);
    const year = new Date(day * DAY).getUTCFullYear();
    // some days there's no music at all, and every day is a bit different
    if (rng() < 0.045) continue;
    const volume = (YEAR_VOLUME[year] ?? 1) * between(rng, 0.65, 1.35);

    for (let i = 0; i < albums.length; i++) weights[i] = eraWeight(albums[i], day);
    const moodCum = new Map<Mood, Float64Array>();
    const cumFor = (mood: Mood) => {
      let cum = moodCum.get(mood);
      if (cum) return cum;
      cum = new Float64Array(albums.length);
      let acc = 0;
      const bit = MOOD_BIT[mood];
      for (let i = 0; i < albums.length; i++) {
        const a = albums[i];
        let f = a.moods & bit ? 1 : 0.15;
        if (!(a.moods & bit) && (mood === "focus" || mood === "guilty" || a.moods === MOOD_BIT.guilty)) f = 0;
        cum[i] = acc += weights[i] * f;
      }
      moodCum.set(mood, cum);
      return cum;
    };
    const pickAlbum = (mood: Mood): Album => {
      let cum = cumFor(mood);
      if (cum[cum.length - 1] < 0.5 && mood !== "guilty") cum = cumFor("pop");
      const r = rng() * cum[cum.length - 1];
      let lo = 0, hi = cum.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] > r) hi = mid;
        else lo = mid + 1;
      }
      return albums[lo];
    };
    const pickTrack = (a: Album): Track => {
      const r = rng() * a.rankCum[a.rankCum.length - 1];
      let i = 0;
      while (a.rankCum[i] <= r && i < a.tracks.length - 1) i++;
      return a.tracks[i];
    };
    const obs = obsessions.find((o) => day >= o.from && day < o.from + o.days);
    const obsShare = obs ? 0.22 * (1 - ((day - obs.from) / obs.days) * 0.6) : 0;

    const midnight = day * DAY - plan.utcOffset * 3_600_000;

    for (const slot of plan.slots) {
      if (rng() >= Math.min(0.97, slot.p * volume)) continue;
      let start = midnight + between(rng, slot.from, slot.to) * 60_000;
      if (start < busyUntil) {
        start = busyUntil + between(rng, 5, 40) * 60_000;
        if (start > midnight + (slot.to + 60) * 60_000) continue;
      }

      let mood = pickWeighted(rng, slot.moods.map((m) => m[0]), slot.moods.map((m) => m[1]));
      const incognito = rng() < 0.006;
      if (incognito) mood = "guilty";
      const device = slot.devices[Math.floor(rng() * slot.devices.length)];
      const platform = platformFor(device, day, rng);
      const kinds = KINDS[mood].filter(([k]) => k !== "repeat" || obs);
      let kind = pickWeighted(rng, kinds.map((k) => k[0]), kinds.map((k) => k[1]));
      const shuffle = kind === "mix" || kind === "artist" ? rng() < 0.85 : rng() < 0.08;
      const offline = slot.offline === true || rng() < plan.offlineP;
      const ip = device === "phone" && rng() < 0.4 ? `198.51.100.${1 + Math.floor(rng() * 254)}` : plan.homeIp;
      const target = start + between(rng, slot.dur[0], slot.dur[1]) * SESSION_LENGTH * 60_000;
      const skipYear = 1 + 0.05 * (year - 2016);

      let album = pickAlbum(mood);
      let pos = rng() < 0.7 ? 0 : Math.floor(rng() * album.tracks.length);
      const artistAlbums = byArtist.get(album.artist)!;
      let repeatsLeft = kind === "repeat" ? 3 + Math.floor(rng() * 5) : 0;
      const recent: Track[] = [];

      const nextTrack = (): Track => {
        if (kind === "repeat" && obs) {
          if (repeatsLeft-- > 0) return obs.track;
          kind = "mix";
        }
        if (kind === "album") {
          if (pos >= album.tracks.length) {
            album = pickAlbum(mood);
            pos = 0;
          }
          return album.tracks[pos++];
        }
        for (let tries = 0; tries < 6; tries++) {
          let t: Track;
          if (obs && mood !== "focus" && mood !== "guilty" && rng() < obsShare) t = obs.track;
          else if (kind === "artist") {
            const ws = artistAlbums.map((i) => weights[i] + 0.3);
            t = pickTrack(albums[pickWeighted(rng, artistAlbums, ws)]);
          } else t = pickTrack(pickAlbum(mood));
          if (!recent.includes(t) || tries === 5) return t;
        }
        return album.tracks[0];
      };

      let cursor = start;
      let reasonStart = firstReason(device, rng);
      let track = nextTrack();
      for (let n = 0; n < 150; n++) {
        const last = cursor + track.ms * 0.6 >= target;
        let reasonEnd: string;
        if (last) reasonEnd = lastReason(device, rng);
        else {
          let p = SKIP_BASE[kind] * (0.6 + (1 - track.rank)) * skipYear;
          if (mood === "focus") p *= 0.4;
          if (obs && track === obs.track) p *= 0.2;
          const r = rng();
          if (r < p) reasonEnd = "fwdbtn";
          else if (r < p + 0.012) reasonEnd = "backbtn";
          else if (r < p + 0.05) reasonEnd = "endplay"; // picked another song by hand
          else reasonEnd = "trackdone";
        }

        let ms: number;
        if (reasonEnd === "trackdone") ms = track.ms - Math.floor(rng() * 600);
        else if (reasonEnd === "fwdbtn") ms = 800 + Math.floor(Math.pow(rng(), 2) * 40_000);
        else if (reasonEnd === "backbtn") ms = 1500 + Math.floor(rng() * 25_000);
        else ms = Math.floor(track.ms * between(rng, 0.05, 0.95));

        const end = cursor + ms;
        rows.push({
          ts: new Date(end).toISOString().slice(0, 19) + "Z",
          platform,
          ms_played: ms,
          conn_country: plan.country,
          ip_addr: ip,
          master_metadata_track_name: track.title,
          master_metadata_album_artist_name: track.artist,
          master_metadata_album_album_name: track.album,
          spotify_track_uri: track.uri,
          episode_name: null,
          episode_show_name: null,
          spotify_episode_uri: null,
          audiobook_title: null,
          audiobook_uri: null,
          audiobook_chapter_uri: null,
          audiobook_chapter_title: null,
          reason_start: reasonStart,
          reason_end: reasonEnd,
          shuffle,
          skipped: year >= 2022 ? reasonEnd === "fwdbtn" : false,
          offline,
          offline_timestamp: Math.floor(cursor / 1000),
          incognito_mode: incognito,
        });

        cursor = end + Math.floor(reasonEnd === "trackdone" ? rng() * 1500 : 300 + rng() * 2500);
        if (last) break;
        recent.push(track);
        if (recent.length > 4) recent.shift();
        if (reasonEnd === "backbtn") {
          reasonStart = "backbtn"; // the same song again
        } else {
          reasonStart = reasonEnd === "endplay" ? "clickrow" : reasonEnd;
          track = nextTrack();
        }
      }
      busyUntil = cursor;
    }
  }

  rows.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
  return rows;
}
