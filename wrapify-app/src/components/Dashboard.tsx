"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { SpotifyStream } from "@/types/spotify";
import PlotlyChart from "./PlotlyChart";
import Autocomplete from "./Autocomplete";
import {
  topSongs,
  topArtists,
  topAlbums,
  hourlyActivity,
  monthlyTrend,
  weekdayActivity,
  yearlyTrend,
  countryDistribution,
  summaryStats,
  hourDayHeatmap,
  busiestDay,
  artistsByUniqueTracks,
  artistMonthlyTrend,
  songMonthlyTrend,
  topSongsByArtist,
  allArtistNames,
  allTrackKeys,
  countryDistributionAll,
  iso2ToIso3,
  songsForDay,
  dailyStreamCounts,
  CountItem,
} from "@/lib/stats";

const COUNTRY_COLORS = [
  "#1DB954", "#e74c3c", "#3498db", "#f39c12", "#9b59b6",
  "#1abc9c", "#e67e22", "#2ecc71", "#e84393", "#00cec9",
];

const COMPARE_COLORS = [
  "#1DB954", "#e74c3c", "#3498db", "#f39c12", "#9b59b6",
  "#1abc9c", "#e67e22", "#e84393", "#00cec9", "#fd79a8",
];

const chartLayout = (title: string, extra?: Partial<Plotly.Layout>): Partial<Plotly.Layout> => ({
  title: { text: title, font: { size: 16 } },
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { color: "#a1a1aa" },
  margin: { t: 50, b: 60, l: 60, r: 20 },
  xaxis: { gridcolor: "#27272a" },
  yaxis: { gridcolor: "#27272a" },
  ...extra,
});

const chartConfig: Partial<Plotly.Config> = {
  displayModeBar: false,
  responsive: true,
};

interface DashboardProps {
  data: SpotifyStream[];
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-100">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function TopNInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-zinc-500">Top</label>
      <input
        type="number"
        min={1}
        max={100}
        value={value}
        onChange={(e) => onChange(Math.max(1, Math.min(100, Number(e.target.value) || 10)))}
        className="w-16 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 focus:border-green-500 focus:outline-none"
      />
    </div>
  );
}

function RankingList({
  title,
  items,
  topN,
  onTopNChange,
}: {
  title: string;
  items: CountItem[];
  topN: number;
  onTopNChange: (n: number) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
        <TopNInput value={topN} onChange={onTopNChange} />
      </div>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li key={item.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-3 min-w-0">
              <span className="w-6 text-right text-sm font-medium text-zinc-500">{i + 1}</span>
              <span className="truncate text-sm text-zinc-300">{item.name}</span>
            </span>
            <span className="shrink-0 text-sm font-medium text-zinc-400">
              {item.count.toLocaleString()}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TagList({ tags, onRemove }: { tags: string[]; onRemove: (tag: string) => void }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
        >
          {tag}
          <button
            onClick={() => onRemove(tag)}
            className="ml-1 text-zinc-500 hover:text-zinc-100"
          >
            x
          </button>
        </span>
      ))}
    </div>
  );
}

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function SongCard({ song, index }: { song: { time: string; track: string; artist: string; album: string; minutesPlayed: number }; index: number }) {
  const mins = Math.floor(song.minutesPlayed);
  const secs = Math.round((song.minutesPlayed - mins) * 60);
  return (
    <div className="group flex items-center gap-3 rounded-lg bg-zinc-800/40 p-3 hover:bg-zinc-700/50 transition-colors">
      {/* Track number / time */}
      <div className="shrink-0 w-10 text-center">
        <span className="text-sm font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">
          {index + 1}
        </span>
      </div>
      {/* Album art placeholder */}
      <div className="shrink-0 h-10 w-10 rounded bg-zinc-700 flex items-center justify-center">
        <svg className="w-5 h-5 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </div>
      {/* Song info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">{song.track}</p>
        <p className="truncate text-xs text-zinc-400">{song.artist}</p>
      </div>
      {/* Album */}
      <span className="hidden sm:block truncate text-xs text-zinc-500 max-w-[150px]">
        {song.album}
      </span>
      {/* Time played */}
      <span className="shrink-0 text-xs text-zinc-500 font-mono w-14 text-right">
        {song.time}
      </span>
      {/* Duration */}
      <span className="shrink-0 text-xs text-zinc-500 font-mono w-12 text-right">
        {mins}:{String(secs).padStart(2, "0")}
      </span>
    </div>
  );
}

function TimelineCard({ data }: { data: SpotifyStream[] }) {
  const [tab, setTab] = useState<"calendar" | "slider">("calendar");

  const [viewYear, setViewYear] = useState(() => {
    const years = data.map((s) => s.year);
    return Math.max(...years);
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const latest = data.reduce((best, s) => (s.ts > best.ts ? s : best), data[0]);
    return latest.month;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const counts = useMemo(() => dailyStreamCounts(data), [data]);

  const maxCount = useMemo(() => {
    let max = 0;
    for (const c of counts.values()) if (c > max) max = c;
    return max;
  }, [counts]);

  const daySongs = useMemo(
    () => (selectedDate ? songsForDay(data, selectedDate) : []),
    [data, selectedDate]
  );

  // Sorted unique dates for the slider
  const allDates = useMemo(() => {
    const set = new Set<string>();
    for (const s of data) set.add(s.date);
    return Array.from(set).sort();
  }, [data]);

  const sliderIndex = useMemo(() => {
    if (!selectedDate) return allDates.length - 1;
    const idx = allDates.indexOf(selectedDate);
    return idx === -1 ? allDates.length - 1 : idx;
  }, [allDates, selectedDate]);

  // Build calendar grid for viewYear/viewMonth
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1);
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    let startWeekday = firstDay.getDay() - 1;
    if (startWeekday < 0) startWeekday = 6;
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const navigate = useCallback(
    (dir: -1 | 1) => {
      let m = viewMonth + dir;
      let y = viewYear;
      if (m < 1) { m = 12; y--; }
      if (m > 12) { m = 1; y++; }
      setViewMonth(m);
      setViewYear(y);
      setSelectedDate(null);
    },
    [viewMonth, viewYear]
  );

  const formatDate = (day: number) =>
    `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const getDayIntensity = (day: number): string => {
    const count = counts.get(formatDate(day)) || 0;
    if (count === 0) return "bg-zinc-800/50";
    const ratio = count / maxCount;
    if (ratio < 0.25) return "bg-green-900/60";
    if (ratio < 0.5) return "bg-green-700/70";
    if (ratio < 0.75) return "bg-green-600/80";
    return "bg-green-500";
  };

  const totalForDay = selectedDate ? (counts.get(selectedDate) || 0) : 0;

  // Debounced slider: preview date updates instantly, song list is debounced
  const [sliderPreviewDate, setSliderPreviewDate] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSliderChange = useCallback(
    (idx: number) => {
      const date = allDates[idx];
      if (!date) return;
      // Instant: update the preview label
      setSliderPreviewDate(date);
      // Debounced: update the actual selected date (triggers song list compute)
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSelectedDate(date);
        const [y, m] = date.split("-").map(Number);
        setViewYear(y);
        setViewMonth(m);
        setSliderPreviewDate(null);
      }, 250);
    },
    [allDates]
  );

  // The date shown in the slider header: preview (while dragging) or selected
  const sliderDisplayDate = sliderPreviewDate ?? selectedDate ?? allDates[allDates.length - 1];
  const sliderDisplayCount = sliderPreviewDate
    ? counts.get(sliderPreviewDate) || 0
    : totalForDay;

  // Format a date string nicely for the slider display
  const formatNiceDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const jsDate = new Date(y, m - 1, d);
    const weekday = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][jsDate.getDay()];
    return `${weekday}, ${d} ${MONTH_NAMES[m - 1]} ${y}`;
  };

  // Slider progress percentage
  const sliderProgress = allDates.length > 1 ? (sliderIndex / (allDates.length - 1)) * 100 : 0;
  const sliderPreviewProgress = useMemo(() => {
    if (!sliderPreviewDate) return null;
    const idx = allDates.indexOf(sliderPreviewDate);
    if (idx === -1) return null;
    return (idx / (allDates.length - 1)) * 100;
  }, [allDates, sliderPreviewDate]);
  const currentProgress = sliderPreviewProgress ?? sliderProgress;

  // Year + quarter tick marks for the slider
  const sliderTicks = useMemo(() => {
    if (allDates.length < 2) return [];
    const firstDate = allDates[0];
    const lastDate = allDates[allDates.length - 1];
    const startYear = Number(firstDate.slice(0, 4));
    const endYear = Number(lastDate.slice(0, 4));
    const totalDates = allDates.length - 1;

    // Helper: find the index of the closest date to a target YYYY-MM-DD
    const findClosestIdx = (target: string) => {
      // Binary search for the closest date
      let lo = 0, hi = allDates.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (allDates[mid] < target) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    };

    const ticks: { pct: number; label?: string }[] = [];
    for (let y = startYear; y <= endYear; y++) {
      // Year mark: Jan 1
      const yearTarget = `${y}-01-01`;
      const yi = findClosestIdx(yearTarget);
      ticks.push({ pct: (yi / totalDates) * 100, label: String(y) });

      // Quarter dots: Apr 1, Jul 1, Oct 1
      for (const qm of ["04", "07", "10"]) {
        const qTarget = `${y}-${qm}-01`;
        if (qTarget > lastDate) break;
        if (qTarget < firstDate) continue;
        const qi = findClosestIdx(qTarget);
        ticks.push({ pct: (qi / totalDates) * 100 });
      }
    }
    return ticks;
  }, [allDates]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      {/* Header with tabs */}
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-100">Timeline</h3>
        <div className="flex rounded-lg bg-zinc-800 p-0.5">
          <button
            onClick={() => setTab("calendar")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "calendar"
                ? "bg-green-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Calendario
          </button>
          <button
            onClick={() => setTab("slider")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "slider"
                ? "bg-green-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Slider
          </button>
        </div>
      </div>

      {/* === CALENDAR TAB === */}
      {tab === "calendar" && (
        <>
          {/* Month navigation */}
          <div className="mb-4 flex items-center justify-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            >
              &larr;
            </button>
            <span className="min-w-[180px] text-center text-lg font-semibold text-zinc-100">
              {MONTH_NAMES[viewMonth - 1]} {viewYear}
            </span>
            <button
              onClick={() => navigate(1)}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            >
              &rarr;
            </button>
          </div>

          {/* Calendar grid */}
          <div className="mx-auto max-w-md">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-xs text-zinc-500 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) =>
                day === null ? (
                  <div key={`empty-${i}`} className="aspect-square" />
                ) : (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(formatDate(day))}
                    className={`aspect-square rounded-md flex flex-col items-center justify-center text-xs transition-all ${getDayIntensity(day)} ${
                      selectedDate === formatDate(day)
                        ? "ring-2 ring-green-400 ring-offset-1 ring-offset-zinc-950"
                        : "hover:ring-1 hover:ring-zinc-600"
                    }`}
                  >
                    <span className="font-medium text-zinc-200">{day}</span>
                    {(counts.get(formatDate(day)) || 0) > 0 && (
                      <span className="text-[10px] text-zinc-400">
                        {counts.get(formatDate(day))}
                      </span>
                    )}
                  </button>
                )
              )}
            </div>
          </div>
        </>
      )}

      {/* === SLIDER TAB === */}
      {tab === "slider" && (
        <div className="space-y-4">
          {/* Current date display */}
          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-100">
              {formatNiceDate(sliderDisplayDate)}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {sliderDisplayCount} {sliderDisplayCount === 1 ? "stream" : "streams"}
            </p>
          </div>

          {/* Slider track */}
          <div className="px-2">
            <div className="relative h-6 flex items-center">
              {/* Background bar */}
              <div className="h-1 w-full rounded-full bg-zinc-700" />
              {/* Progress fill */}
              <div
                className="absolute top-1/2 -translate-y-1/2 left-0 h-1 rounded-full bg-green-500"
                style={{ width: `${currentProgress}%` }}
              />
              {/* Thumb dot */}
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-md shadow-black/30 pointer-events-none"
                style={{ left: `calc(${currentProgress}% - 6px)` }}
              />
              {/* Invisible range input on top */}
              <input
                type="range"
                min={0}
                max={allDates.length - 1}
                value={sliderPreviewDate ? allDates.indexOf(sliderPreviewDate) : sliderIndex}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                className="absolute top-0 left-0 h-full w-full cursor-pointer opacity-0"
                style={{ margin: 0 }}
              />
            </div>
            {/* Year + quarter tick marks */}
            <div className="relative h-5 mt-1">
              {sliderTicks.map((tick, i) => (
                <div
                  key={i}
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${tick.pct}%` }}
                >
                  {tick.label ? (
                    <>
                      <div className="w-px h-2 bg-zinc-500" />
                      <span className="text-[10px] text-zinc-500 mt-0.5">{tick.label}</span>
                    </>
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-zinc-600 mt-0.5" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Song list for selected day */}
      {selectedDate && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-100">
              {selectedDate}{" "}
              <span className="font-normal text-zinc-400">
                ({totalForDay} {totalForDay === 1 ? "stream" : "streams"})
              </span>
            </h4>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-xs text-zinc-500 hover:text-zinc-100"
            >
              Cerrar
            </button>
          </div>
          {daySongs.length === 0 ? (
            <p className="text-sm text-zinc-500">No hay canciones este día.</p>
          ) : (
            <>
              {/* Spotify-style list header */}
              <div className="flex items-center gap-3 px-3 pb-2 border-b border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-600">
                <span className="w-10 text-center">#</span>
                <span className="w-10" />
                <span className="flex-1">Título</span>
                <span className="hidden sm:block w-[150px]">Álbum</span>
                <span className="w-14 text-right">Hora</span>
                <span className="w-12 text-right">Dur.</span>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-0.5 pt-1 pr-1">
                {daySongs.map((song, i) => (
                  <SongCard key={`${song.time}-${song.track}-${i}`} song={song} index={i} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ data }: DashboardProps) {
  const [topNSongs, setTopNSongs] = useState(10);
  const [topNArtists, setTopNArtists] = useState(10);
  const [topNAlbums, setTopNAlbums] = useState(10);
  const [topNUnique, setTopNUnique] = useState(10);

  // Artist comparison
  const [compareArtists, setCompareArtists] = useState<string[]>([]);

  // Song comparison
  const [compareSongs, setCompareSongs] = useState<{ track: string; artist: string }[]>([]);

  // Top songs by artist
  const [artistForSongs, setArtistForSongs] = useState<string | null>(null);
  const [topNArtistSongs, setTopNArtistSongs] = useState(10);

  // 3D heatmap toggle
  const [show3D, setShow3D] = useState(false);

  const stats = useMemo(() => summaryStats(data), [data]);
  const songs = useMemo(() => topSongs(data, topNSongs), [data, topNSongs]);
  const artists = useMemo(() => topArtists(data, topNArtists), [data, topNArtists]);
  const albums = useMemo(() => topAlbums(data, topNAlbums), [data, topNAlbums]);
  const hourly = useMemo(() => hourlyActivity(data), [data]);
  const monthly = useMemo(() => monthlyTrend(data), [data]);
  const weekday = useMemo(() => weekdayActivity(data), [data]);
  const yearly = useMemo(() => yearlyTrend(data), [data]);
  const countries = useMemo(() => countryDistribution(data), [data]);
  const countriesAll = useMemo(() => countryDistributionAll(data), [data]);
  const heatmap = useMemo(() => hourDayHeatmap(data), [data]);
  const busiest = useMemo(() => busiestDay(data), [data]);
  const uniqueTrackArtists = useMemo(() => artistsByUniqueTracks(data, topNUnique), [data, topNUnique]);

  const artistNames = useMemo(() => allArtistNames(data), [data]);
  const trackKeys = useMemo(() => allTrackKeys(data), [data]);
  const trackSuggestions = useMemo(
    () => trackKeys.map((t) => `${t.track} - ${t.artist}`),
    [trackKeys]
  );

  const artistTrends = useMemo(
    () => (compareArtists.length > 0 ? artistMonthlyTrend(data, compareArtists) : []),
    [data, compareArtists]
  );

  const songTrends = useMemo(
    () => (compareSongs.length > 0 ? songMonthlyTrend(data, compareSongs) : []),
    [data, compareSongs]
  );

  const artistSongsResult = useMemo(
    () => (artistForSongs ? topSongsByArtist(data, artistForSongs, topNArtistSongs) : []),
    [data, artistForSongs, topNArtistSongs]
  );

  const totalCountryStreams = countries.reduce((a, c) => a + c.count, 0);
  const dayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}h`);

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Streams" value={stats.totalStreams} />
        <StatCard label="Horas escuchadas" value={stats.totalHours} />
        <StatCard label="Minutos totales" value={stats.totalMinutes} />
        <StatCard label="Artistas únicos" value={stats.uniqueArtists} />
        <StatCard label="Canciones únicas" value={stats.uniqueTracks} />
        <StatCard label="Periodo" value={stats.period} />
      </div>

      {/* Busiest Day */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <p className="text-sm text-zinc-500">Día con más canciones escuchadas</p>
        <p className="mt-1 text-2xl font-bold text-zinc-100">
          {busiest.date}{" "}
          <span className="text-lg font-normal text-zinc-400">
            ({busiest.count.toLocaleString()} streams)
          </span>
        </p>
      </div>

      {/* Timeline */}
      <TimelineCard data={data} />

      {/* Rankings */}
      <div className="grid gap-4 md:grid-cols-2">
        <RankingList title="Canciones" items={songs} topN={topNSongs} onTopNChange={setTopNSongs} />
        <RankingList title="Artistas" items={artists} topN={topNArtists} onTopNChange={setTopNArtists} />
        <RankingList title="Álbumes" items={albums} topN={topNAlbums} onTopNChange={setTopNAlbums} />
        <RankingList title="Artistas (canciones únicas)" items={uniqueTrackArtists} topN={topNUnique} onTopNChange={setTopNUnique} />
      </div>

      {/* Top songs by artist */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-100">Canciones más escuchadas de un artista</h3>
          {artistForSongs && <TopNInput value={topNArtistSongs} onChange={setTopNArtistSongs} />}
        </div>
        <div className="mb-4 max-w-md">
          <Autocomplete
            suggestions={artistNames}
            placeholder="Buscar artista..."
            onSelect={(name) => setArtistForSongs(name)}
          />
        </div>
        {artistForSongs && (
          <>
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                {artistForSongs}
              </span>
              <button
                onClick={() => setArtistForSongs(null)}
                className="text-xs text-zinc-500 hover:text-zinc-100"
              >
                x
              </button>
            </div>
            <ol className="space-y-2">
              {artistSongsResult.map((item, i) => (
                <li key={item.name} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-right text-sm font-medium text-zinc-500">{i + 1}</span>
                    <span className="truncate text-sm text-zinc-300">{item.name}</span>
                  </span>
                  <span className="shrink-0 text-sm font-medium text-zinc-400">
                    {item.count.toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      {/* Artist comparison */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="mb-4 text-base font-semibold text-zinc-100">Comparar artistas (evolución mensual)</h3>
        <div className="mb-4 max-w-md">
          <Autocomplete
            suggestions={artistNames.filter((n) => !compareArtists.includes(n))}
            placeholder="Añadir artista..."
            onSelect={(name) => setCompareArtists((prev) => [...prev, name])}
          />
        </div>
        <TagList tags={compareArtists} onRemove={(tag) => setCompareArtists((prev) => prev.filter((a) => a !== tag))} />
        {artistTrends.length > 0 && (
          <div className="mt-4">
            <PlotlyChart
              data={artistTrends.map((t, i) => {
                const color = COMPARE_COLORS[i % COMPARE_COLORS.length];
                return {
                  type: "scatter" as const,
                  mode: "lines" as const,
                  name: t.artist,
                  x: t.data.map((d) => d.date),
                  y: t.data.map((d) => d.count),
                  line: { color, width: 2 },
                  fill: "tozeroy" as const,
                  fillcolor: color + "20",
                };
              })}
              layout={chartLayout("Streams mensuales por artista", {
                height: 400,
                showlegend: true,
                legend: { font: { color: "#a1a1aa" } },
                hovermode: "closest" as const,
              })}
              config={chartConfig}
              style={{ width: "100%" }}
            />
          </div>
        )}
      </div>

      {/* Song comparison */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="mb-4 text-base font-semibold text-zinc-100">Comparar canciones (evolución mensual)</h3>
        <div className="mb-4 max-w-md">
          <Autocomplete
            suggestions={trackSuggestions.filter(
              (s) => !compareSongs.some((cs) => `${cs.track} - ${cs.artist}` === s)
            )}
            placeholder="Buscar canción - artista..."
            onSelect={(value) => {
              const sepIdx = value.lastIndexOf(" - ");
              if (sepIdx === -1) return;
              const track = value.slice(0, sepIdx);
              const artist = value.slice(sepIdx + 3);
              setCompareSongs((prev) => [...prev, { track, artist }]);
            }}
          />
        </div>
        <TagList
          tags={compareSongs.map((s) => `${s.track} - ${s.artist}`)}
          onRemove={(tag) => {
            const sepIdx = tag.lastIndexOf(" - ");
            const track = tag.slice(0, sepIdx);
            const artist = tag.slice(sepIdx + 3);
            setCompareSongs((prev) => prev.filter((s) => !(s.track === track && s.artist === artist)));
          }}
        />
        {songTrends.length > 0 && (
          <div className="mt-4">
            <PlotlyChart
              data={songTrends.map((t, i) => {
                const color = COMPARE_COLORS[i % COMPARE_COLORS.length];
                return {
                  type: "scatter" as const,
                  mode: "lines" as const,
                  name: t.label,
                  x: t.data.map((d) => d.date),
                  y: t.data.map((d) => d.count),
                  line: { color, width: 2 },
                  fill: "tozeroy" as const,
                  fillcolor: color + "20",
                };
              })}
              layout={chartLayout("Streams mensuales por canción", {
                height: 400,
                showlegend: true,
                legend: { font: { color: "#a1a1aa" } },
                hovermode: "closest" as const,
              })}
              config={chartConfig}
              style={{ width: "100%" }}
            />
          </div>
        )}
      </div>

      {/* Monthly Trend - full width */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <PlotlyChart
          data={[
            {
              type: "scatter",
              mode: "lines",
              x: monthly.map((m) => m.date),
              y: monthly.map((m) => m.count),
              line: { color: "#1DB954", width: 2 },
              fill: "tozeroy",
              fillcolor: "rgba(29,185,84,0.1)",
            },
          ]}
          layout={chartLayout("Streams por Mes", { height: 350 })}
          config={chartConfig}
          style={{ width: "100%" }}
        />
      </div>

      {/* Yearly Trend - full width */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <PlotlyChart
          data={[
            {
              type: "bar",
              x: yearly.map((y) => y.name),
              y: yearly.map((y) => y.count),
              marker: { color: "#1DB954" },
            },
          ]}
          layout={chartLayout("Streams por Año", { height: 350 })}
          config={chartConfig}
          style={{ width: "100%" }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Hourly Activity - Polar */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <PlotlyChart
            data={[
              {
                type: "barpolar",
                r: hourly,
                theta: hourLabels,
                marker: {
                  color: hourly,
                  colorscale: [[0, "#0d7a36"], [1, "#1ed760"]],
                },
              },
            ]}
            layout={{
              ...chartLayout("Actividad por Hora del Día"),
              polar: {
                bgcolor: "transparent",
                radialaxis: { visible: true, color: "#3f3f46" },
                angularaxis: { color: "#a1a1aa", direction: "clockwise" },
              },
              height: 400,
              showlegend: false,
            }}
            config={chartConfig}
            style={{ width: "100%" }}
          />
        </div>

        {/* Weekday Activity */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <PlotlyChart
            data={[
              {
                type: "bar",
                x: weekday.map((d) => d.name),
                y: weekday.map((d) => d.count),
                marker: { color: "#1DB954" },
              },
            ]}
            layout={chartLayout("Actividad por Día de la Semana", { height: 400 })}
            config={chartConfig}
            style={{ width: "100%" }}
          />
        </div>
      </div>

      {/* Heatmap: Day x Hour */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-2 flex items-center justify-end">
          <button
            onClick={() => setShow3D((v) => !v)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              show3D
                ? "bg-green-600 text-white"
                : "border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            3D
          </button>
        </div>
        {show3D ? (
          <PlotlyChart
            data={(() => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const traces: any[] = [];
              const maxVal = Math.max(...heatmap.flat(), 1);
              // Use square aspect: both x and y step = 1, no gaps
              for (let d = 0; d < dayLabels.length; d++) {
                for (let h = 0; h < 24; h++) {
                  const val = heatmap[d][h];
                  if (val === 0) continue;
                  const norm = val / maxVal;
                  const green = Math.round(122 + norm * 93);
                  const fillColor = `rgb(${Math.round(13 + norm * 17)},${green},${Math.round(54 + norm * 42)})`;
                  const edgeColor = `rgb(${Math.round(40 + norm * 30)},${Math.round(180 + norm * 50)},${Math.round(80 + norm * 50)})`;
                  // 8 vertices of unit cube at (h,d)
                  const x0 = h, x1 = h + 1, y0 = d, y1 = d + 1;
                  // Mesh face — 8 vertices, 12 triangles (2 per face)
                  // 0:(x0,y0,0) 1:(x1,y0,0) 2:(x1,y1,0) 3:(x0,y1,0)
                  // 4:(x0,y0,v) 5:(x1,y0,v) 6:(x1,y1,v) 7:(x0,y1,v)
                  traces.push({
                    type: "mesh3d" as const,
                    x: [x0, x1, x1, x0, x0, x1, x1, x0],
                    y: [y0, y0, y1, y1, y0, y0, y1, y1],
                    z: [0, 0, 0, 0, val, val, val, val],
                    i: [0, 0, 4, 4, 0, 0, 2, 2, 0, 0, 1, 1],
                    j: [1, 2, 6, 7, 5, 4, 7, 6, 3, 7, 5, 6],
                    k: [2, 3, 5, 4, 1, 5, 3, 7, 7, 4, 6, 2],
                    color: fillColor,
                    hovertext: `${dayLabels[d]} ${h}h: ${val} streams`,
                    hoverinfo: "text" as const,
                    showlegend: false,
                    flatshading: true,
                    lighting: { ambient: 0.8, diffuse: 0.3, specular: 0.1 },
                  });
                  // Wireframe edges (12 edges of a cube)
                  const vx = [x0, x1, x1, x0, x0, x1, x1, x0];
                  const vy = [y0, y0, y1, y1, y0, y0, y1, y1];
                  const vz = [0, 0, 0, 0, val, val, val, val];
                  const edges = [
                    [0,1],[1,2],[2,3],[3,0], // bottom
                    [4,5],[5,6],[6,7],[7,4], // top
                    [0,4],[1,5],[2,6],[3,7], // verticals
                  ];
                  const ex: (number | null)[] = [];
                  const ey: (number | null)[] = [];
                  const ez: (number | null)[] = [];
                  for (const [a, b] of edges) {
                    ex.push(vx[a], vx[b], null);
                    ey.push(vy[a], vy[b], null);
                    ez.push(vz[a], vz[b], null);
                  }
                  traces.push({
                    type: "scatter3d" as const,
                    mode: "lines" as const,
                    x: ex, y: ey, z: ez,
                    line: { color: edgeColor, width: 1.5 },
                    hoverinfo: "skip" as const,
                    showlegend: false,
                  });
                }
              }
              return traces;
            })()}
            layout={{
              ...chartLayout("Actividad por Día y Hora (3D)"),
              height: 550,
              margin: { t: 50, b: 40, l: 20, r: 20 },
              scene: {
                xaxis: {
                  title: { text: "Hora" },
                  color: "#a1a1aa",
                  gridcolor: "#27272a",
                  tickvals: Array.from({ length: 24 }, (_, i) => i + 0.5),
                  ticktext: hourLabels,
                },
                yaxis: {
                  title: { text: "Día" },
                  color: "#a1a1aa",
                  gridcolor: "#27272a",
                  tickvals: dayLabels.map((_, i) => i + 0.5),
                  ticktext: dayLabels,
                },
                zaxis: { title: { text: "Streams" }, color: "#a1a1aa", gridcolor: "#27272a" },
                bgcolor: "transparent",
                aspectmode: "manual",
                aspectratio: { x: 3, y: 1, z: 1 },
              },
              showlegend: false,
            }}
            config={chartConfig}
            style={{ width: "100%" }}
          />
        ) : (
          <PlotlyChart
            data={[
              {
                type: "heatmap",
                z: heatmap,
                x: hourLabels,
                y: dayLabels,
                colorscale: [[0, "#09090b"], [0.5, "#166534"], [1, "#1ed760"]],
                hovertemplate: "%{y} %{x}: %{z} streams<extra></extra>",
              },
            ]}
            layout={chartLayout("Actividad por Día y Hora", {
              height: 300,
              yaxis: { gridcolor: "#27272a", autorange: "reversed" },
              margin: { l: 60, t: 50, b: 40, r: 20 },
            })}
            config={chartConfig}
            style={{ width: "100%" }}
          />
        )}
      </div>

      {/* Country Distribution - Pie */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <PlotlyChart
          data={[
            {
              type: "pie",
              labels: countries.map(
                (c) =>
                  `${c.name} (${c.count.toLocaleString()} - ${((c.count / totalCountryStreams) * 100).toFixed(1)}%)`
              ),
              values: countries.map((c) => c.count),
              marker: { colors: COUNTRY_COLORS },
              textinfo: "label+percent",
              textposition: "outside",
              hovertemplate: "%{label}<br>%{value} streams<extra></extra>",
            },
          ]}
          layout={{
            ...chartLayout("Distribución por País"),
            height: 500,
            showlegend: true,
            legend: { font: { color: "#a1a1aa", size: 12 } },
          }}
          config={chartConfig}
          style={{ width: "100%" }}
        />
      </div>

      {/* Country Distribution - World Map */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <PlotlyChart
          data={[
            {
              type: "choropleth",
              locationmode: "ISO-3" as const,
              locations: countriesAll.map((c) => iso2ToIso3(c.name)),
              z: countriesAll.map((c) => {
                const n = c.count;
                if (n <= 50) return 1;
                if (n <= 200) return 2;
                if (n <= 1000) return 3;
                if (n <= 5000) return 4;
                if (n <= 20000) return 5;
                return 6;
              }),
              zmin: 1,
              zmax: 6,
              text: countriesAll.map(
                (c) => `${c.name}: ${c.count.toLocaleString()} streams`
              ),
              hoverinfo: "text" as const,
              colorscale: [
                [0, "#14532d"],
                [0.2, "#166534"],
                [0.4, "#15803d"],
                [0.6, "#22c55e"],
                [0.8, "#4ade80"],
                [1, "#1ed760"],
              ],
              colorbar: {
                title: { text: "Streams", font: { color: "#a1a1aa" } },
                tickfont: { color: "#a1a1aa" },
                tickvals: [1, 2, 3, 4, 5, 6],
                ticktext: ["1–50", "51–200", "201–1k", "1k–5k", "5k–20k", "20k+"],
              },
              marker: { line: { color: "#22c55e", width: 1 } },
            },
          ]}
          layout={{
            ...chartLayout("Mapa de escuchas por país"),
            height: 500,
            geo: {
              bgcolor: "transparent",
              showframe: false,
              showcoastlines: true,
              coastlinecolor: "#3f3f46",
              showland: true,
              landcolor: "#18181b",
              showocean: true,
              oceancolor: "#09090b",
              showcountries: true,
              countrycolor: "#27272a",
              projection: { type: "natural earth" as const },
            },
            margin: { t: 50, b: 10, l: 10, r: 10 },
          }}
          config={chartConfig}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}
