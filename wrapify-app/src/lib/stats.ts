import { SpotifyStream } from "@/types/spotify";

export interface CountItem {
  name: string;
  count: number;
}

export interface TimeSeriesItem {
  date: string;
  count: number;
}

function generateMonthRange(streams: SpotifyStream[]): string[] {
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
