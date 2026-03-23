import { SpotifyStream } from "@/types/spotify";

export interface CountItem {
  name: string;
  count: number;
}

export interface TimeSeriesItem {
  date: string;
  count: number;
}

export function generateMonthRange(streams: SpotifyStream[]): string[] {
  if (streams.length === 0) return [];
  let minY = Infinity, maxY = -Infinity, minM = 12, maxM = 1;
  for (const s of streams) {
    if (s.year < minY || (s.year === minY && s.month < minM)) { minY = s.year; minM = s.month; }
    if (s.year > maxY || (s.year === maxY && s.month > maxM)) { maxY = s.year; maxM = s.month; }
  }
  const months: string[] = [];
  let y = minY, m = minM;
  while (y < maxY || (y === maxY && m <= maxM)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

function fillMonths(data: Map<string, number>, allMonths: string[]): TimeSeriesItem[] {
  return allMonths.map((date) => ({ date, count: data.get(date) || 0 }));
}

export function topSongs(streams: SpotifyStream[], limit = 10): CountItem[] {
  const map = new Map<string, number>();
  for (const s of streams) {
    const key = `${s.master_metadata_track_name} - ${s.master_metadata_album_artist_name}`;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export function topArtists(streams: SpotifyStream[], limit = 20): CountItem[] {
  const map = new Map<string, number>();
  for (const s of streams) {
    const artist = s.master_metadata_album_artist_name;
    if (artist) map.set(artist, (map.get(artist) || 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export function topAlbums(streams: SpotifyStream[], limit = 15): CountItem[] {
  const map = new Map<string, number>();
  for (const s of streams) {
    const album = s.master_metadata_album_album_name;
    const artist = s.master_metadata_album_artist_name;
    if (album && artist) {
      const key = `${album} - ${artist}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export function hourlyActivity(streams: SpotifyStream[]): number[] {
  const hours = new Array(24).fill(0);
  for (const s of streams) {
    hours[s.hour]++;
  }
  return hours;
}

export function monthlyTrend(streams: SpotifyStream[]): TimeSeriesItem[] {
  const map = new Map<string, number>();
  for (const s of streams) {
    const key = `${s.year}-${String(s.month).padStart(2, "0")}`;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));
}

export function countryDistribution(streams: SpotifyStream[], limit = 10): CountItem[] {
  const map = new Map<string, number>();
  for (const s of streams) {
    if (s.conn_country) map.set(s.conn_country, (map.get(s.conn_country) || 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export function countryDistributionAll(streams: SpotifyStream[]): CountItem[] {
  const map = new Map<string, number>();
  for (const s of streams) {
    if (s.conn_country) map.set(s.conn_country, (map.get(s.conn_country) || 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

const ISO2_TO_ISO3: Record<string, string> = {
  AF:"AFG",AL:"ALB",DZ:"DZA",AS:"ASM",AD:"AND",AO:"AGO",AG:"ATG",AR:"ARG",AM:"ARM",AU:"AUS",
  AT:"AUT",AZ:"AZE",BS:"BHS",BH:"BHR",BD:"BGD",BB:"BRB",BY:"BLR",BE:"BEL",BZ:"BLZ",BJ:"BEN",
  BT:"BTN",BO:"BOL",BA:"BIH",BW:"BWA",BR:"BRA",BN:"BRN",BG:"BGR",BF:"BFA",BI:"BDI",KH:"KHM",
  CM:"CMR",CA:"CAN",CV:"CPV",CF:"CAF",TD:"TCD",CL:"CHL",CN:"CHN",CO:"COL",KM:"COM",CG:"COG",
  CD:"COD",CR:"CRI",CI:"CIV",HR:"HRV",CU:"CUB",CY:"CYP",CZ:"CZE",DK:"DNK",DJ:"DJI",DM:"DMA",
  DO:"DOM",EC:"ECU",EG:"EGY",SV:"SLV",GQ:"GNQ",ER:"ERI",EE:"EST",ET:"ETH",FJ:"FJI",FI:"FIN",
  FR:"FRA",GA:"GAB",GM:"GMB",GE:"GEO",DE:"DEU",GH:"GHA",GR:"GRC",GT:"GTM",GN:"GIN",GW:"GNB",
  GY:"GUY",HT:"HTI",HN:"HND",HU:"HUN",IS:"ISL",IN:"IND",ID:"IDN",IR:"IRN",IQ:"IRQ",IE:"IRL",
  IL:"ISR",IT:"ITA",JM:"JAM",JP:"JPN",JO:"JOR",KZ:"KAZ",KE:"KEN",KI:"KIR",KP:"PRK",KR:"KOR",
  KW:"KWT",KG:"KGZ",LA:"LAO",LV:"LVA",LB:"LBN",LS:"LSO",LR:"LBR",LY:"LBY",LI:"LIE",LT:"LTU",
  LU:"LUX",MK:"MKD",MG:"MDG",MW:"MWI",MY:"MYS",MV:"MDV",ML:"MLI",MT:"MLT",MH:"MHL",MR:"MRT",
  MU:"MUS",MX:"MEX",FM:"FSM",MD:"MDA",MC:"MCO",MN:"MNG",ME:"MNE",MA:"MAR",MZ:"MOZ",MM:"MMR",
  NA:"NAM",NR:"NRU",NP:"NPL",NL:"NLD",NZ:"NZL",NI:"NIC",NE:"NER",NG:"NGA",NO:"NOR",OM:"OMN",
  PK:"PAK",PW:"PLW",PA:"PAN",PG:"PNG",PY:"PRY",PE:"PER",PH:"PHL",PL:"POL",PT:"PRT",QA:"QAT",
  RO:"ROU",RU:"RUS",RW:"RWA",KN:"KNA",LC:"LCA",VC:"VCT",WS:"WSM",SM:"SMR",ST:"STP",SA:"SAU",
  SN:"SEN",RS:"SRB",SC:"SYC",SL:"SLE",SG:"SGP",SK:"SVK",SI:"SVN",SB:"SLB",SO:"SOM",ZA:"ZAF",
  SS:"SSD",ES:"ESP",LK:"LKA",SD:"SDN",SR:"SUR",SZ:"SWZ",SE:"SWE",CH:"CHE",SY:"SYR",TW:"TWN",
  TJ:"TJK",TZ:"TZA",TH:"THA",TL:"TLS",TG:"TGO",TO:"TON",TT:"TTO",TN:"TUN",TR:"TUR",TM:"TKM",
  TV:"TUV",UG:"UGA",UA:"UKR",AE:"ARE",GB:"GBR",US:"USA",UY:"URY",UZ:"UZB",VU:"VUT",VE:"VEN",
  VN:"VNM",YE:"YEM",ZM:"ZMB",ZW:"ZWE",XK:"XKX",PS:"PSE",HK:"HKG",MO:"MAC",PR:"PRI",
};

export function iso2ToIso3(code: string): string {
  return ISO2_TO_ISO3[code] || code;
}

export function weekdayActivity(streams: SpotifyStream[]): CountItem[] {
  // JS weekday: 0=Sun..6=Sat. Reorder to Mon-Sun
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const order = [1, 2, 3, 4, 5, 6, 0]; // Mon=1..Sun=0
  const counts = new Array(7).fill(0);
  for (const s of streams) {
    counts[s.weekday]++;
  }
  return days.map((name, i) => ({ name, count: counts[order[i]] }));
}

export function yearlyTrend(streams: SpotifyStream[]): CountItem[] {
  const map = new Map<number, number>();
  for (const s of streams) {
    map.set(s.year, (map.get(s.year) || 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, count]) => ({ name: String(year), count }));
}

export function monthlyAverage(streams: SpotifyStream[]): CountItem[] {
  const monthNames = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  const totals = new Array(12).fill(0);
  const yearsPerMonth = Array.from({ length: 12 }, () => new Set<number>());
  for (const s of streams) {
    totals[s.month - 1] += 1;
    yearsPerMonth[s.month - 1].add(s.year);
  }
  return monthNames.map((name, i) => ({
    name,
    count: yearsPerMonth[i].size > 0 ? Math.round(totals[i] / yearsPerMonth[i].size) : 0,
  }));
}

export interface SkipAnalysis {
  skipPercent: number;
  totalSkips: number;
  avgSecondsBeforeSkip: number;
  mostSkippedSongs: CountItem[];
  mostSkippedArtists: { name: string; skipRate: number; skips: number; total: number }[];
  skipRateByHour: number[];
  skipRateByYear: { year: string; rate: number }[];
  reasonEndDistribution: CountItem[];
}

const REASON_LABELS: Record<string, string> = {
  fwdbtn: "Skip (adelante)",
  backbtn: "Atrás",
  endplay: "Fin natural",
  trackdone: "Canción completa",
  logout: "Cierre sesión",
  unexpected_exit: "Cierre inesperado",
  unexpected_exit_while_paused: "Cierre en pausa",
  remote: "Control remoto",
  clickrow: "Click en otra canción",
  playbtn: "Botón play",
  appload: "Carga de app",
  unknown: "Desconocido",
};

export function skipAnalysis(streams: SpotifyStream[]): SkipAnalysis {
  let totalSkips = 0;
  let skipMsTotal = 0;
  const songSkipMap = new Map<string, number>();
  const artistPlays = new Map<string, number>();
  const artistSkips = new Map<string, number>();
  const hourPlays = new Array(24).fill(0);
  const hourSkips = new Array(24).fill(0);
  const yearPlays = new Map<number, number>();
  const yearSkips = new Map<number, number>();
  const reasonMap = new Map<string, number>();

  for (const s of streams) {
    const artist = s.master_metadata_album_artist_name;
    const track = s.master_metadata_track_name;
    hourPlays[s.hour]++;
    yearPlays.set(s.year, (yearPlays.get(s.year) || 0) + 1);
    if (artist) artistPlays.set(artist, (artistPlays.get(artist) || 0) + 1);

    const reason = s.reason_end || "unknown";
    const label = REASON_LABELS[reason] || reason;
    reasonMap.set(label, (reasonMap.get(label) || 0) + 1);

    if (s.skipped) {
      totalSkips++;
      skipMsTotal += s.ms_played;
      hourSkips[s.hour]++;
      yearSkips.set(s.year, (yearSkips.get(s.year) || 0) + 1);
      if (artist) artistSkips.set(artist, (artistSkips.get(artist) || 0) + 1);
      if (track && artist) {
        const key = `${track} - ${artist}`;
        songSkipMap.set(key, (songSkipMap.get(key) || 0) + 1);
      }
    }
  }

  const mostSkippedSongs = Array.from(songSkipMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }));

  const MIN_PLAYS_FOR_RATE = 20;
  const mostSkippedArtists = Array.from(artistPlays.entries())
    .filter(([, total]) => total >= MIN_PLAYS_FOR_RATE)
    .map(([name, total]) => {
      const skips = artistSkips.get(name) || 0;
      return { name, skipRate: Math.round((skips / total) * 1000) / 10, skips, total };
    })
    .sort((a, b) => b.skipRate - a.skipRate)
    .slice(0, 15);

  const skipRateByHour = hourPlays.map((plays, i) =>
    plays > 0 ? Math.round((hourSkips[i] / plays) * 1000) / 10 : 0
  );

  const skipRateByYear = Array.from(yearPlays.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, total]) => ({
      year: String(year),
      rate: Math.round(((yearSkips.get(year) || 0) / total) * 1000) / 10,
    }));

  const reasonEndDistribution = Array.from(reasonMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  return {
    skipPercent: streams.length > 0 ? Math.round((totalSkips / streams.length) * 1000) / 10 : 0,
    totalSkips,
    avgSecondsBeforeSkip: totalSkips > 0 ? Math.round(skipMsTotal / totalSkips / 1000) : 0,
    mostSkippedSongs,
    mostSkippedArtists,
    skipRateByHour,
    skipRateByYear,
    reasonEndDistribution,
  };
}

export function hourDayHeatmap(streams: SpotifyStream[]): number[][] {
  // rows reordered to Mon-Sun
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const s of streams) {
    grid[s.weekday][s.hour]++;
  }
  const order = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun
  return order.map((i) => grid[i]);
}

export function busiestDay(streams: SpotifyStream[]): { date: string; count: number } {
  const map = new Map<string, number>();
  for (const s of streams) {
    map.set(s.date, (map.get(s.date) || 0) + 1);
  }
  let best = { date: "", count: 0 };
  for (const [date, count] of map) {
    if (count > best.count) best = { date, count };
  }
  return best;
}

export function topSongsSingleDay(
  streams: SpotifyStream[],
  limit = 10
): { track: string; artist: string; date: string; count: number }[] {
  const map = new Map<string, number>();
  for (const s of streams) {
    const track = s.master_metadata_track_name;
    const artist = s.master_metadata_album_artist_name;
    if (!track || !artist) continue;
    const key = `${track}\0${artist}\0${s.date}`;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => {
      const [track, artist, date] = key.split("\0");
      return { track, artist, date, count };
    });
}

export function artistsByUniqueTracks(streams: SpotifyStream[], limit = 10): CountItem[] {
  const map = new Map<string, Set<string>>();
  for (const s of streams) {
    const artist = s.master_metadata_album_artist_name;
    const track = s.master_metadata_track_name;
    if (artist && track) {
      if (!map.has(artist)) map.set(artist, new Set());
      map.get(artist)!.add(track);
    }
  }
  return Array.from(map.entries())
    .map(([name, tracks]) => ({ name, count: tracks.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function artistMonthlyTrend(
  streams: SpotifyStream[],
  artistNames: string[]
): { artist: string; data: TimeSeriesItem[] }[] {
  const allMonths = generateMonthRange(streams);
  const lowerNames = artistNames.map((n) => n.toLowerCase());
  const maps = artistNames.map(() => new Map<string, number>());
  for (const s of streams) {
    const artist = s.master_metadata_album_artist_name?.toLowerCase();
    if (!artist) continue;
    const idx = lowerNames.indexOf(artist);
    if (idx === -1) continue;
    const key = `${s.year}-${String(s.month).padStart(2, "0")}`;
    maps[idx].set(key, (maps[idx].get(key) || 0) + 1);
  }
  return artistNames.map((artist, i) => ({
    artist,
    data: fillMonths(maps[i], allMonths),
  }));
}

export function songMonthlyTrend(
  streams: SpotifyStream[],
  songs: { track: string; artist: string }[]
): { label: string; data: TimeSeriesItem[] }[] {
  const keys = songs.map((s) => `${s.track.toLowerCase()}|||${s.artist.toLowerCase()}`);
  const maps = songs.map(() => new Map<string, number>());
  for (const s of streams) {
    const track = s.master_metadata_track_name?.toLowerCase();
    const artist = s.master_metadata_album_artist_name?.toLowerCase();
    if (!track || !artist) continue;
    const key = `${track}|||${artist}`;
    const idx = keys.indexOf(key);
    if (idx === -1) continue;
    const month = `${s.year}-${String(s.month).padStart(2, "0")}`;
    maps[idx].set(month, (maps[idx].get(month) || 0) + 1);
  }
  const allMonths = generateMonthRange(streams);
  return songs.map((song, i) => ({
    label: `${song.track} - ${song.artist}`,
    data: fillMonths(maps[i], allMonths),
  }));
}

export function topSongsByArtist(
  streams: SpotifyStream[],
  artistName: string,
  limit = 10
): CountItem[] {
  const lower = artistName.toLowerCase();
  const map = new Map<string, number>();
  for (const s of streams) {
    if (s.master_metadata_album_artist_name?.toLowerCase() !== lower) continue;
    const track = s.master_metadata_track_name;
    if (track) map.set(track, (map.get(track) || 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export function allArtistNames(streams: SpotifyStream[]): string[] {
  const set = new Set<string>();
  for (const s of streams) {
    if (s.master_metadata_album_artist_name) set.add(s.master_metadata_album_artist_name);
  }
  return Array.from(set).sort();
}

export function allTrackKeys(streams: SpotifyStream[]): { track: string; artist: string }[] {
  const set = new Set<string>();
  const results: { track: string; artist: string }[] = [];
  for (const s of streams) {
    const t = s.master_metadata_track_name;
    const a = s.master_metadata_album_artist_name;
    if (t && a) {
      const key = `${t}|||${a}`;
      if (!set.has(key)) {
        set.add(key);
        results.push({ track: t, artist: a });
      }
    }
  }
  return results.sort((a, b) => `${a.track} - ${a.artist}`.localeCompare(`${b.track} - ${b.artist}`));
}

export interface DaySong {
  time: string;       // HH:MM
  track: string;
  artist: string;
  album: string;
  minutesPlayed: number;
}

export function songsForDay(streams: SpotifyStream[], date: string): DaySong[] {
  return streams
    .filter((s) => s.date === date)
    .sort((a, b) => a.ts.localeCompare(b.ts))
    .map((s) => ({
      time: s.ts.slice(11, 16),
      track: s.master_metadata_track_name || "Unknown",
      artist: s.master_metadata_album_artist_name || "Unknown",
      album: s.master_metadata_album_album_name || "Unknown",
      minutesPlayed: Math.round(s.minutes_played * 10) / 10,
    }));
}

export function dailyStreamCounts(streams: SpotifyStream[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of streams) {
    map.set(s.date, (map.get(s.date) || 0) + 1);
  }
  return map;
}

export function topSongsByYear(
  streams: SpotifyStream[],
  limit = 10
): { year: number; songs: CountItem[] }[] {
  const byYear = new Map<number, Map<string, number>>();
  for (const s of streams) {
    const track = s.master_metadata_track_name;
    const artist = s.master_metadata_album_artist_name;
    if (!track || !artist) continue;
    if (!byYear.has(s.year)) byYear.set(s.year, new Map());
    const map = byYear.get(s.year)!;
    const key = `${track} - ${artist}`;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(byYear.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, map]) => ({
      year,
      songs: Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count })),
    }));
}

/* ── Scatter-plot data ── */

export interface ScatterPoint {
  name: string;
  x: number;
  y: number;
}

/** Chart 1: Per-song — plays vs skip rate (min 5 plays) */
export function scatterSongPlaysVsSkipRate(streams: SpotifyStream[]): ScatterPoint[] {
  const plays = new Map<string, number>();
  const skips = new Map<string, number>();
  for (const s of streams) {
    const t = s.master_metadata_track_name;
    const a = s.master_metadata_album_artist_name;
    if (!t || !a) continue;
    const key = `${t} - ${a}`;
    plays.set(key, (plays.get(key) || 0) + 1);
    if (s.skipped) skips.set(key, (skips.get(key) || 0) + 1);
  }
  const MIN = 5;
  const result: ScatterPoint[] = [];
  for (const [name, total] of plays) {
    if (total < MIN) continue;
    const skipCount = skips.get(name) || 0;
    result.push({ name, x: total, y: Math.round((skipCount / total) * 1000) / 10 });
  }
  return result;
}

/** Chart 2: Per-artist — plays vs unique tracks */
export function scatterArtistPlaysVsTracks(streams: SpotifyStream[]): ScatterPoint[] {
  const plays = new Map<string, number>();
  const tracks = new Map<string, Set<string>>();
  for (const s of streams) {
    const a = s.master_metadata_album_artist_name;
    const t = s.master_metadata_track_name;
    if (!a) continue;
    plays.set(a, (plays.get(a) || 0) + 1);
    if (t) {
      if (!tracks.has(a)) tracks.set(a, new Set());
      tracks.get(a)!.add(t);
    }
  }
  const result: ScatterPoint[] = [];
  for (const [name, total] of plays) {
    result.push({ name, x: total, y: tracks.get(name)?.size || 0 });
  }
  return result;
}

/** Chart 3: Per-artist — plays vs avg listen duration (seconds) */
export function scatterArtistPlaysVsDuration(streams: SpotifyStream[]): ScatterPoint[] {
  const plays = new Map<string, number>();
  const totalMs = new Map<string, number>();
  for (const s of streams) {
    const a = s.master_metadata_album_artist_name;
    if (!a) continue;
    plays.set(a, (plays.get(a) || 0) + 1);
    totalMs.set(a, (totalMs.get(a) || 0) + s.ms_played);
  }
  const MIN = 5;
  const result: ScatterPoint[] = [];
  for (const [name, total] of plays) {
    if (total < MIN) continue;
    const avgSec = Math.round((totalMs.get(name)! / total) / 1000);
    result.push({ name, x: total, y: avgSec });
  }
  return result;
}

/** Chart 4: Per-artist — first listen date (as days since epoch) vs plays in last 6 months */
export function scatterArtistAgeVsRecent(streams: SpotifyStream[]): (ScatterPoint & { firstDate: string })[] {
  const firstDate = new Map<string, string>();
  const recentPlays = new Map<string, number>();
  const totalPlays = new Map<string, number>();

  // Find the latest date in the dataset
  let maxDate = "";
  for (const s of streams) {
    if (s.date > maxDate) maxDate = s.date;
  }
  // 6 months before maxDate
  const cutoff = new Date(maxDate);
  cutoff.setMonth(cutoff.getMonth() - 6);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  for (const s of streams) {
    const a = s.master_metadata_album_artist_name;
    if (!a) continue;
    totalPlays.set(a, (totalPlays.get(a) || 0) + 1);
    const prev = firstDate.get(a);
    if (!prev || s.date < prev) firstDate.set(a, s.date);
    if (s.date >= cutoffStr) recentPlays.set(a, (recentPlays.get(a) || 0) + 1);
  }

  const MIN = 5;
  const result: (ScatterPoint & { firstDate: string })[] = [];
  for (const [name, total] of totalPlays) {
    if (total < MIN) continue;
    const fd = firstDate.get(name)!;
    // X = days since first listen (from earliest to latest in dataset)
    const daysSinceFirst = Math.round((new Date(maxDate).getTime() - new Date(fd).getTime()) / 86400000);
    const recent = recentPlays.get(name) || 0;
    result.push({ name, x: daysSinceFirst, y: recent, firstDate: fd });
  }
  return result;
}

/* ── Advanced analytics ── */

/** Lorenz curve: cumulative % of plays vs cumulative % of artists (sorted ascending) */
export function lorenzCurve(streams: SpotifyStream[]): { x: number[]; y: number[] } {
  const map = new Map<string, number>();
  for (const s of streams) {
    const a = s.master_metadata_album_artist_name;
    if (a) map.set(a, (map.get(a) || 0) + 1);
  }
  const counts = Array.from(map.values()).sort((a, b) => a - b);
  const total = counts.reduce((a, b) => a + b, 0);
  const n = counts.length;
  const x = [0];
  const y = [0];
  let cumSum = 0;
  for (let i = 0; i < n; i++) {
    cumSum += counts[i];
    x.push(((i + 1) / n) * 100);
    y.push((cumSum / total) * 100);
  }
  return { x, y };
}

/** Discovery rate: new unique artists and songs per month */
export function discoveryRate(streams: SpotifyStream[]): {
  months: string[];
  newArtists: number[];
  newSongs: number[];
} {
  const sorted = [...streams].sort((a, b) => a.ts.localeCompare(b.ts));
  const seenArtists = new Set<string>();
  const seenSongs = new Set<string>();
  const monthArtists = new Map<string, number>();
  const monthSongs = new Map<string, number>();

  for (const s of sorted) {
    const month = `${s.year}-${String(s.month).padStart(2, "0")}`;
    const a = s.master_metadata_album_artist_name;
    const t = s.master_metadata_track_name;
    if (a && !seenArtists.has(a)) {
      seenArtists.add(a);
      monthArtists.set(month, (monthArtists.get(month) || 0) + 1);
    }
    if (t && a) {
      const key = `${t}|||${a}`;
      if (!seenSongs.has(key)) {
        seenSongs.add(key);
        monthSongs.set(month, (monthSongs.get(month) || 0) + 1);
      }
    }
  }

  const allMonths = generateMonthRange(streams);
  return {
    months: allMonths,
    newArtists: allMonths.map((m) => monthArtists.get(m) || 0),
    newSongs: allMonths.map((m) => monthSongs.get(m) || 0),
  };
}

/** Seasonal artists: top N artists × 12 months heatmap */
export function seasonalArtists(
  streams: SpotifyStream[],
  limit = 20
): { artists: string[]; months: string[]; grid: number[][] } {
  const monthNames = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const artistTotal = new Map<string, number>();
  for (const s of streams) {
    const a = s.master_metadata_album_artist_name;
    if (a) artistTotal.set(a, (artistTotal.get(a) || 0) + 1);
  }
  const topArtistNames = Array.from(artistTotal.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);

  const grid: number[][] = topArtistNames.map(() => new Array(12).fill(0));
  const artistIdx = new Map(topArtistNames.map((a, i) => [a, i]));

  for (const s of streams) {
    const a = s.master_metadata_album_artist_name;
    if (!a) continue;
    const idx = artistIdx.get(a);
    if (idx !== undefined) grid[idx][s.month - 1]++;
  }

  return { artists: topArtistNames, months: monthNames, grid };
}

/** Listening sessions: group streams with <5 min gap */
export interface ListeningSession {
  start: string;
  end: string;
  date: string;
  durationMin: number;
  trackCount: number;
}

export function listeningSessions(streams: SpotifyStream[]): {
  sessions: ListeningSession[];
  avgDuration: number;
  longestSession: ListeningSession | null;
  durationDistribution: { bucket: string; count: number }[];
} {
  const sorted = [...streams].sort((a, b) => a.ts.localeCompare(b.ts));
  const GAP_MS = 5 * 60 * 1000;
  const sessions: ListeningSession[] = [];
  let sessionStart = sorted[0]?.ts || "";
  let sessionEnd = sessionStart;
  let trackCount = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].ts).getTime() + sorted[i - 1].ms_played;
    const curr = new Date(sorted[i].ts).getTime();
    if (curr - prev <= GAP_MS) {
      sessionEnd = sorted[i].ts;
      trackCount++;
    } else {
      const endTime = new Date(sessionEnd).getTime() + sorted[i - 1].ms_played;
      const durMin = Math.round((endTime - new Date(sessionStart).getTime()) / 60000);
      if (trackCount >= 2) {
        sessions.push({
          start: sessionStart,
          end: sessionEnd,
          date: sessionStart.slice(0, 10),
          durationMin: durMin,
          trackCount,
        });
      }
      sessionStart = sorted[i].ts;
      sessionEnd = sessionStart;
      trackCount = 1;
    }
  }
  // last session
  if (sorted.length > 0 && trackCount >= 2) {
    const last = sorted[sorted.length - 1];
    const endTime = new Date(sessionEnd).getTime() + last.ms_played;
    const durMin = Math.round((endTime - new Date(sessionStart).getTime()) / 60000);
    sessions.push({ start: sessionStart, end: sessionEnd, date: sessionStart.slice(0, 10), durationMin: durMin, trackCount });
  }

  const avgDuration = sessions.length > 0
    ? Math.round(sessions.reduce((a, s) => a + s.durationMin, 0) / sessions.length)
    : 0;
  const longestSession = sessions.length > 0
    ? sessions.reduce((best, s) => (s.durationMin > best.durationMin ? s : best))
    : null;

  // Distribution buckets
  const buckets = [
    { label: "<10 min", max: 10 },
    { label: "10-30 min", max: 30 },
    { label: "30-60 min", max: 60 },
    { label: "1-2h", max: 120 },
    { label: "2-4h", max: 240 },
    { label: "4h+", max: Infinity },
  ];
  const dist = buckets.map((b) => ({ bucket: b.label, count: 0 }));
  for (const s of sessions) {
    for (let i = 0; i < buckets.length; i++) {
      if (s.durationMin < buckets[i].max || i === buckets.length - 1) {
        dist[i].count++;
        break;
      }
    }
  }

  return { sessions, avgDuration, longestSession, durationDistribution: dist };
}

/** One-hit wonders: artists where 80%+ of plays are one song (min 10 plays) */
export function oneHitWonders(
  streams: SpotifyStream[],
  limit = 20
): { artist: string; topSong: string; topCount: number; total: number; pct: number }[] {
  const artistSongs = new Map<string, Map<string, number>>();
  for (const s of streams) {
    const a = s.master_metadata_album_artist_name;
    const t = s.master_metadata_track_name;
    if (!a || !t) continue;
    if (!artistSongs.has(a)) artistSongs.set(a, new Map());
    const songs = artistSongs.get(a)!;
    songs.set(t, (songs.get(t) || 0) + 1);
  }

  const result: { artist: string; topSong: string; topCount: number; total: number; pct: number }[] = [];
  for (const [artist, songs] of artistSongs) {
    if (songs.size < 2) continue; // needs at least 2 songs available
    const total = Array.from(songs.values()).reduce((a, b) => a + b, 0);
    if (total < 10) continue;
    const [topSong, topCount] = Array.from(songs.entries()).sort((a, b) => b[1] - a[1])[0];
    const pct = Math.round((topCount / total) * 1000) / 10;
    if (pct >= 60) result.push({ artist, topSong, topCount, total, pct });
  }
  return result.sort((a, b) => b.pct - a.pct).slice(0, limit);
}

/** Binge detector: days where one artist had 70%+ of plays (min 5 plays) */
export function bingeDays(
  streams: SpotifyStream[],
  limit = 30
): { date: string; artist: string; artistPlays: number; total: number; pct: number }[] {
  const dayArtist = new Map<string, Map<string, number>>();
  const dayTotal = new Map<string, number>();
  for (const s of streams) {
    const a = s.master_metadata_album_artist_name;
    if (!a) continue;
    dayTotal.set(s.date, (dayTotal.get(s.date) || 0) + 1);
    if (!dayArtist.has(s.date)) dayArtist.set(s.date, new Map());
    const artists = dayArtist.get(s.date)!;
    artists.set(a, (artists.get(a) || 0) + 1);
  }

  const result: { date: string; artist: string; artistPlays: number; total: number; pct: number }[] = [];
  for (const [date, artists] of dayArtist) {
    const total = dayTotal.get(date) || 0;
    if (total < 5) continue;
    const [topArtist, topCount] = Array.from(artists.entries()).sort((a, b) => b[1] - a[1])[0];
    const pct = Math.round((topCount / total) * 1000) / 10;
    if (pct >= 70) result.push({ date, artist: topArtist, artistPlays: topCount, total, pct });
  }
  return result.sort((a, b) => b.pct - a.pct).slice(0, limit);
}

/** Platform trends: stacked area of platforms by month */
export function platformTrends(streams: SpotifyStream[]): {
  months: string[];
  platforms: { name: string; counts: number[] }[];
} {
  const allMonths = generateMonthRange(streams);
  const platMonth = new Map<string, Map<string, number>>();
  const platTotal = new Map<string, number>();
  for (const s of streams) {
    const p = s.platform || "unknown";
    const month = `${s.year}-${String(s.month).padStart(2, "0")}`;
    platTotal.set(p, (platTotal.get(p) || 0) + 1);
    if (!platMonth.has(p)) platMonth.set(p, new Map());
    platMonth.get(p)!.set(month, (platMonth.get(p)!.get(month) || 0) + 1);
  }

  // Top 6 platforms, rest as "Otros"
  const topPlats = Array.from(platTotal.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name]) => name);
  const topSet = new Set(topPlats);

  const platforms = topPlats.map((name) => ({
    name,
    counts: allMonths.map((m) => platMonth.get(name)?.get(m) || 0),
  }));

  // "Otros"
  const otherCounts = allMonths.map((m) => {
    let sum = 0;
    for (const [p, mmap] of platMonth) {
      if (!topSet.has(p)) sum += mmap.get(m) || 0;
    }
    return sum;
  });
  if (otherCounts.some((c) => c > 0)) {
    platforms.push({ name: "Otros", counts: otherCounts });
  }

  return { months: allMonths, platforms };
}

/** Offline percentage by month */
export function offlineTrend(streams: SpotifyStream[]): { months: string[]; pct: number[] } {
  const allMonths = generateMonthRange(streams);
  const total = new Map<string, number>();
  const offline = new Map<string, number>();
  for (const s of streams) {
    const month = `${s.year}-${String(s.month).padStart(2, "0")}`;
    total.set(month, (total.get(month) || 0) + 1);
    if (s.offline) offline.set(month, (offline.get(month) || 0) + 1);
  }
  return {
    months: allMonths,
    pct: allMonths.map((m) => {
      const t = total.get(m) || 0;
      return t > 0 ? Math.round(((offline.get(m) || 0) / t) * 1000) / 10 : 0;
    }),
  };
}

/** Listening streaks: consecutive days with at least 1 play */
export function listeningStreaks(streams: SpotifyStream[]): {
  currentStreak: number;
  longestStreak: number;
  longestStart: string;
  longestEnd: string;
  streakDistribution: { length: number; count: number }[];
} {
  const days = new Set<string>();
  for (const s of streams) days.add(s.date);
  const sorted = Array.from(days).sort();

  const streaks: { start: string; end: string; length: number }[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  let len = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(prev);
    const currDate = new Date(sorted[i]);
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86400000);
    if (diffDays === 1) {
      len++;
    } else {
      streaks.push({ start, end: prev, length: len });
      start = sorted[i];
      len = 1;
    }
    prev = sorted[i];
  }
  if (sorted.length > 0) streaks.push({ start, end: prev, length: len });

  const longest = streaks.reduce((best, s) => (s.length > best.length ? s : best), streaks[0] || { start: "", end: "", length: 0 });
  const current = streaks.length > 0 ? streaks[streaks.length - 1].length : 0;

  // Distribution
  const distMap = new Map<number, number>();
  for (const s of streaks) {
    const bucket = s.length >= 30 ? 30 : s.length;
    distMap.set(bucket, (distMap.get(bucket) || 0) + 1);
  }

  return {
    currentStreak: current,
    longestStreak: longest.length,
    longestStart: longest.start,
    longestEnd: longest.end,
    streakDistribution: Array.from(distMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([length, count]) => ({ length, count })),
  };
}

/** Comeback songs: songs that peaked, dropped to 0 for 2+ months, then came back */
export function comebackSongs(
  streams: SpotifyStream[],
  limit = 15
): { name: string; peakMonth: string; peakCount: number; comebackMonth: string; comebackCount: number; gapMonths: number }[] {
  const allMonths = generateMonthRange(streams);
  const songMonth = new Map<string, Map<string, number>>();
  for (const s of streams) {
    const t = s.master_metadata_track_name;
    const a = s.master_metadata_album_artist_name;
    if (!t || !a) continue;
    const key = `${t} - ${a}`;
    const month = `${s.year}-${String(s.month).padStart(2, "0")}`;
    if (!songMonth.has(key)) songMonth.set(key, new Map());
    songMonth.get(key)!.set(month, (songMonth.get(key)!.get(month) || 0) + 1);
  }

  const results: { name: string; peakMonth: string; peakCount: number; comebackMonth: string; comebackCount: number; gapMonths: number }[] = [];

  for (const [name, months] of songMonth) {
    const timeline = allMonths.map((m) => months.get(m) || 0);
    // Find peak
    let peakIdx = 0;
    for (let i = 1; i < timeline.length; i++) {
      if (timeline[i] > timeline[peakIdx]) peakIdx = i;
    }
    if (timeline[peakIdx] < 5) continue;

    // After peak, find stretch of 0s of length >= 2, then comeback
    let gapStart = -1;
    let gapLen = 0;
    for (let i = peakIdx + 1; i < timeline.length; i++) {
      if (timeline[i] === 0) {
        if (gapStart === -1) gapStart = i;
        gapLen++;
      } else {
        if (gapLen >= 2 && timeline[i] >= 3) {
          results.push({
            name,
            peakMonth: allMonths[peakIdx],
            peakCount: timeline[peakIdx],
            comebackMonth: allMonths[i],
            comebackCount: timeline[i],
            gapMonths: gapLen,
          });
          break;
        }
        gapStart = -1;
        gapLen = 0;
      }
    }
  }

  return results.sort((a, b) => b.gapMonths - a.gapMonths || b.comebackCount - a.comebackCount).slice(0, limit);
}

export function summaryStats(streams: SpotifyStream[]) {
  const uniqueArtists = new Set(streams.map((s) => s.master_metadata_album_artist_name)).size;
  const uniqueTracks = new Set(streams.map((s) => s.master_metadata_track_name)).size;
  const totalMinutes = Math.round(streams.reduce((acc, s) => acc + s.minutes_played, 0));
  const years = new Set(streams.map((s) => s.year));
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  return {
    totalStreams: streams.length,
    uniqueArtists,
    uniqueTracks,
    totalMinutes,
    totalHours: Math.round(totalMinutes / 60),
    period: `${minYear} - ${maxYear}`,
  };
}
