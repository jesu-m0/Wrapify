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
  topSongsByYear,
  monthlyAverage,
  skipAnalysis,
  CountItem,
} from "@/lib/stats";

/* ── Palette ── */

const COUNTRY_COLORS = [
  "#1DB954", "#e74c3c", "#3498db", "#f39c12", "#9b59b6",
  "#1abc9c", "#e67e22", "#2ecc71", "#e84393", "#00cec9",
];

const COMPARE_COLORS = [
  "#1DB954", "#e74c3c", "#3498db", "#f39c12", "#9b59b6",
  "#1abc9c", "#e67e22", "#e84393", "#00cec9", "#fd79a8",
];

/* ── Shared Plotly helpers ── */

const CARD = "rounded-2xl border border-zinc-800/50 bg-zinc-900/50";

const chartLayout = (title: string, extra?: Partial<Plotly.Layout>): Partial<Plotly.Layout> => ({
  title: { text: title, font: { size: 14, color: "#d4d4d8" } },
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { color: "#a1a1aa", size: 11 },
  margin: { t: 40, b: 50, l: 50, r: 16 },
  xaxis: { gridcolor: "#27272a" },
  yaxis: { gridcolor: "#27272a" },
  ...extra,
});

const chartConfig: Partial<Plotly.Config> = {
  displayModeBar: false,
  responsive: true,
};

/* ── Small reusable components ── */

interface DashboardProps {
  data: SpotifyStream[];
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`${
        accent
          ? "rounded-2xl bg-green-950/40 border border-green-800/30 p-4"
          : `${CARD} p-4`
      }`}
    >
      <p
        className={`text-[11px] font-semibold uppercase tracking-wider ${
          accent ? "text-green-400/70" : "text-zinc-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1.5 text-2xl font-bold ${
          accent ? "text-green-300" : "text-zinc-100"
        }`}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && (
        <p className={`mt-0.5 text-xs ${accent ? "text-green-400/50" : "text-zinc-600"}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

function TopNInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[11px] text-zinc-500">Top</label>
      <input
        type="number"
        min={1}
        max={100}
        value={value}
        onChange={(e) => onChange(Math.max(1, Math.min(100, Number(e.target.value) || 10)))}
        className="w-14 rounded-lg border border-zinc-700/60 bg-zinc-800/60 px-2 py-1 text-xs text-zinc-100 focus:border-green-500 focus:outline-none"
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
    <div className={`${CARD} p-5 flex flex-col`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        <TopNInput value={topN} onChange={onTopNChange} />
      </div>
      <ol className="space-y-1.5 overflow-y-auto flex-1" style={{ maxHeight: 360 }}>
        {items.map((item, i) => (
          <li key={item.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="w-5 text-right text-xs font-medium text-zinc-600">{i + 1}</span>
              <span className="truncate text-[13px] text-zinc-300">{item.name}</span>
            </span>
            <span className="shrink-0 text-xs font-medium tabular-nums text-zinc-500">
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
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-xs text-zinc-300"
        >
          {tag}
          <button
            onClick={() => onRemove(tag)}
            className="ml-0.5 text-zinc-500 hover:text-zinc-100"
          >
            x
          </button>
        </span>
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="col-span-12 flex items-center gap-3 pt-4 pb-1">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
        {children}
      </h2>
      <div className="h-px flex-1 bg-zinc-800/40" />
    </div>
  );
}

/* ── Day names / month names ── */

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/* ── Song card ── */

function SongCard({ song, index }: { song: { time: string; track: string; artist: string; album: string; minutesPlayed: number }; index: number }) {
  const mins = Math.floor(song.minutesPlayed);
  const secs = Math.round((song.minutesPlayed - mins) * 60);
  return (
    <div className="group flex items-center gap-3 rounded-lg bg-zinc-800/30 p-2.5 hover:bg-zinc-700/40 transition-colors">
      <div className="shrink-0 w-8 text-center">
        <span className="text-xs font-medium text-zinc-600 group-hover:text-zinc-400 transition-colors">
          {index + 1}
        </span>
      </div>
      <div className="shrink-0 h-8 w-8 rounded bg-zinc-700/60 flex items-center justify-center">
        <svg className="w-4 h-4 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-zinc-100">{song.track}</p>
        <p className="truncate text-xs text-zinc-500">{song.artist}</p>
      </div>
      <span className="hidden sm:block truncate text-xs text-zinc-600 max-w-[140px]">
        {song.album}
      </span>
      <span className="shrink-0 text-xs text-zinc-600 font-mono w-12 text-right">
        {song.time}
      </span>
      <span className="shrink-0 text-xs text-zinc-600 font-mono w-10 text-right">
        {mins}:{String(secs).padStart(2, "0")}
      </span>
    </div>
  );
}

/* ── Timeline card ── */

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

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    for (const s of data) set.add(s.year);
    return Array.from(set).sort((a, b) => a - b);
  }, [data]);

  const formatDate = (day: number) =>
    `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const getDayIntensity = (day: number): string => {
    const count = counts.get(formatDate(day)) || 0;
    if (count === 0) return "bg-zinc-800/40";
    const ratio = count / maxCount;
    if (ratio < 0.25) return "bg-green-900/50";
    if (ratio < 0.5) return "bg-green-700/60";
    if (ratio < 0.75) return "bg-green-600/70";
    return "bg-green-500";
  };

  const totalForDay = selectedDate ? (counts.get(selectedDate) || 0) : 0;

  const navigateDay = useCallback(
    (dir: -1 | 1) => {
      const currentIdx = selectedDate ? allDates.indexOf(selectedDate) : allDates.length - 1;
      const newIdx = Math.max(0, Math.min(allDates.length - 1, currentIdx + dir));
      const date = allDates[newIdx];
      if (!date) return;
      setSelectedDate(date);
      const [y, m] = date.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m);
    },
    [allDates, selectedDate]
  );

  const [sliderPreviewDate, setSliderPreviewDate] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSliderChange = useCallback(
    (idx: number) => {
      const date = allDates[idx];
      if (!date) return;
      setSliderPreviewDate(date);
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

  const sliderDisplayDate = sliderPreviewDate ?? selectedDate ?? allDates[allDates.length - 1];
  const sliderDisplayCount = sliderPreviewDate
    ? counts.get(sliderPreviewDate) || 0
    : totalForDay;

  const formatNiceDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const jsDate = new Date(y, m - 1, d);
    const weekday = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][jsDate.getDay()];
    return `${weekday}, ${d} ${MONTH_NAMES[m - 1]} ${y}`;
  };

  const sliderProgress = allDates.length > 1 ? (sliderIndex / (allDates.length - 1)) * 100 : 0;
  const sliderPreviewProgress = useMemo(() => {
    if (!sliderPreviewDate) return null;
    const idx = allDates.indexOf(sliderPreviewDate);
    if (idx === -1) return null;
    return (idx / (allDates.length - 1)) * 100;
  }, [allDates, sliderPreviewDate]);
  const currentProgress = sliderPreviewProgress ?? sliderProgress;

  const sliderTicks = useMemo(() => {
    if (allDates.length < 2) return [];
    const startYear = Number(allDates[0].slice(0, 4));
    const endYear = Number(allDates[allDates.length - 1].slice(0, 4));
    const totalDates = allDates.length - 1;

    const findClosestIdx = (target: string) => {
      let lo = 0, hi = allDates.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (allDates[mid] < target) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    };

    const ticks: { pct: number; label: string }[] = [];
    for (let y = startYear + 1; y <= endYear; y++) {
      const yi = findClosestIdx(`${y}-01-01`);
      ticks.push({ pct: (yi / totalDates) * 100, label: String(y) });
    }
    return ticks;
  }, [allDates]);

  return (
    <div className={`${CARD} p-5`}>
      {/* Header with tabs */}
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100">Timeline</h3>
        <div className="flex rounded-lg bg-zinc-800/80 p-0.5">
          <button
            onClick={() => setTab("calendar")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              tab === "calendar"
                ? "bg-green-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Calendario
          </button>
          <button
            onClick={() => setTab("slider")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
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
          <div className="mb-4 flex items-center justify-center gap-3">
            <select
              value={viewMonth}
              onChange={(e) => { setViewMonth(Number(e.target.value)); setSelectedDate(null); }}
              className="rounded-lg border border-zinc-700/60 bg-zinc-800/60 px-3 py-1.5 text-sm text-zinc-100 focus:border-green-500 focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
            <select
              value={viewYear}
              onChange={(e) => { setViewYear(Number(e.target.value)); setSelectedDate(null); }}
              className="rounded-lg border border-zinc-700/60 bg-zinc-800/60 px-3 py-1.5 text-sm text-zinc-100 focus:border-green-500 focus:outline-none cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="mx-auto max-w-md">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-[11px] text-zinc-600 py-1">{d}</div>
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
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all ${getDayIntensity(day)} ${
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
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigateDay(-1)}
              disabled={sliderIndex <= 0}
              className="rounded-lg border border-zinc-700/60 px-2.5 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              &larr;
            </button>
            <div className="text-center">
              <p className="text-xl font-bold text-zinc-100">
                {formatNiceDate(sliderDisplayDate)}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {sliderDisplayCount} {sliderDisplayCount === 1 ? "stream" : "streams"}
              </p>
            </div>
            <button
              onClick={() => navigateDay(1)}
              disabled={sliderIndex >= allDates.length - 1}
              className="rounded-lg border border-zinc-700/60 px-2.5 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              &rarr;
            </button>
          </div>

          <div className="px-2">
            <div className="relative h-6 flex items-center">
              <div className="h-1 w-full rounded-full bg-zinc-700/60" />
              <div
                className="absolute top-1/2 -translate-y-1/2 left-0 h-1 rounded-full bg-green-500"
                style={{ width: `${currentProgress}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-md shadow-black/30 pointer-events-none"
                style={{ left: `calc(${currentProgress}% - 6px)` }}
              />
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
            <div className="relative h-5 mt-1">
              {sliderTicks.map((tick, i) => (
                <div
                  key={i}
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${tick.pct}%` }}
                >
                  <div className="w-px h-2 bg-zinc-600" />
                  <span className="text-[10px] text-zinc-600 mt-0.5">{tick.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Song list for selected day */}
      {selectedDate && (
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-100">
              {selectedDate}{" "}
              <span className="font-normal text-zinc-500">
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
              <div className="flex items-center gap-3 px-2.5 pb-2 border-b border-zinc-800/60 text-[10px] uppercase tracking-wider text-zinc-600">
                <span className="w-8 text-center">#</span>
                <span className="w-8" />
                <span className="flex-1">Título</span>
                <span className="hidden sm:block w-[140px]">Álbum</span>
                <span className="w-12 text-right">Hora</span>
                <span className="w-10 text-right">Dur.</span>
              </div>
              <div className="max-h-80 overflow-y-auto space-y-0.5 pt-1 pr-1">
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

/* ════════════════════════════════════════════════════════════════════
   DASHBOARD — Bento Grid Layout
   ════════════════════════════════════════════════════════════════════ */

export default function Dashboard({ data }: DashboardProps) {
  const [topNSongs, setTopNSongs] = useState(10);
  const [topNArtists, setTopNArtists] = useState(10);
  const [topNAlbums, setTopNAlbums] = useState(10);
  const [topNUnique, setTopNUnique] = useState(10);

  const [compareArtists, setCompareArtists] = useState<string[]>([]);
  const [compareSongs, setCompareSongs] = useState<{ track: string; artist: string }[]>([]);
  const [artistForSongs, setArtistForSongs] = useState<string | null>(null);
  const [topNArtistSongs, setTopNArtistSongs] = useState(10);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [topNYearSongs, setTopNYearSongs] = useState(10);
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

  const songsByYear = useMemo(() => topSongsByYear(data, topNYearSongs), [data, topNYearSongs]);
  const monthAvg = useMemo(() => monthlyAverage(data), [data]);
  const skips = useMemo(() => skipAnalysis(data), [data]);
  const activeYear = selectedYear ?? (songsByYear.length > 0 ? songsByYear[songsByYear.length - 1].year : null);
  const activeYearSongs = songsByYear.find((y) => y.year === activeYear)?.songs ?? [];

  const totalCountryStreams = countries.reduce((a, c) => a + c.count, 0);
  const dayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}h`);

  /* ── JSX ── */

  return (
    <div className="grid grid-cols-12 gap-3">

      {/* ── Overview stats ── */}
      <div className="col-span-2">
        <StatCard label="Total Streams" value={stats.totalStreams} />
      </div>
      <div className="col-span-2">
        <StatCard label="Horas escuchadas" value={stats.totalHours} />
      </div>
      <div className="col-span-2">
        <StatCard label="Minutos totales" value={stats.totalMinutes} />
      </div>
      <div className="col-span-2">
        <StatCard label="Artistas únicos" value={stats.uniqueArtists} />
      </div>
      <div className="col-span-2">
        <StatCard label="Canciones únicas" value={stats.uniqueTracks} />
      </div>
      <div className="col-span-2">
        <StatCard
          label="Día más escuchado"
          value={busiest.date}
          sub={`${busiest.count.toLocaleString()} streams`}
          accent
        />
      </div>

      {/* ── Timeline + Yearly trend ── */}
      <div className="col-span-8">
        <TimelineCard data={data} />
      </div>
      <div className={`col-span-4 ${CARD} p-4 flex flex-col`}>
        <PlotlyChart
          data={[
            {
              type: "bar",
              x: yearly.map((y) => y.name),
              y: yearly.map((y) => y.count),
              marker: { color: "#1DB954" },
              text: yearly.map((y) => y.count.toLocaleString()),
              textposition: "outside" as const,
              textfont: { color: "#a1a1aa", size: 11 },
            },
          ]}
          layout={chartLayout("Streams por Año", {
            height: 380,
            margin: { t: 40, b: 50, l: 45, r: 10 },
          })}
          config={chartConfig}
          style={{ width: "100%", flex: 1 }}
        />
      </div>

      {/* ── Rankings ── */}
      <SectionLabel>Rankings</SectionLabel>
      <div className="col-span-3">
        <RankingList title="Canciones" items={songs} topN={topNSongs} onTopNChange={setTopNSongs} />
      </div>
      <div className="col-span-3">
        <RankingList title="Artistas" items={artists} topN={topNArtists} onTopNChange={setTopNArtists} />
      </div>
      <div className="col-span-3">
        <RankingList title="Álbumes" items={albums} topN={topNAlbums} onTopNChange={setTopNAlbums} />
      </div>
      <div className="col-span-3">
        <RankingList title="Artistas (canciones únicas)" items={uniqueTrackArtists} topN={topNUnique} onTopNChange={setTopNUnique} />
      </div>

      {/* ── Explore: Top by year + Top by artist ── */}
      <SectionLabel>Explorar</SectionLabel>

      {/* Top songs by year */}
      <div className={`col-span-6 ${CARD} p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-100">Top canciones por año</h3>
          <TopNInput value={topNYearSongs} onChange={setTopNYearSongs} />
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {songsByYear.map(({ year }) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                year === activeYear
                  ? "bg-green-600 text-white"
                  : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60"
              }`}
            >
              {year}
            </button>
          ))}
        </div>
        {activeYear && (
          <ol className="space-y-1.5 overflow-y-auto" style={{ maxHeight: 320 }}>
            {activeYearSongs.map((item, i) => (
              <li key={item.name} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 text-right text-xs font-medium text-zinc-600">{i + 1}</span>
                  <span className="truncate text-[13px] text-zinc-300">{item.name}</span>
                </span>
                <span className="shrink-0 text-xs font-medium tabular-nums text-zinc-500">
                  {item.count.toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Top songs by artist */}
      <div className={`col-span-6 ${CARD} p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-100">Canciones más escuchadas de un artista</h3>
          {artistForSongs && <TopNInput value={topNArtistSongs} onChange={setTopNArtistSongs} />}
        </div>
        <div className="mb-3 max-w-sm">
          <Autocomplete
            suggestions={artistNames}
            placeholder="Buscar artista..."
            onSelect={(name) => setArtistForSongs(name)}
          />
        </div>
        {artistForSongs && (
          <>
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-xs text-zinc-300">
                {artistForSongs}
              </span>
              <button
                onClick={() => setArtistForSongs(null)}
                className="text-xs text-zinc-500 hover:text-zinc-100"
              >
                x
              </button>
            </div>
            <ol className="space-y-1.5 overflow-y-auto" style={{ maxHeight: 320 }}>
              {artistSongsResult.map((item, i) => (
                <li key={item.name} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 text-right text-xs font-medium text-zinc-600">{i + 1}</span>
                    <span className="truncate text-[13px] text-zinc-300">{item.name}</span>
                  </span>
                  <span className="shrink-0 text-xs font-medium tabular-nums text-zinc-500">
                    {item.count.toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      {/* ── Comparisons ── */}
      <SectionLabel>Comparar</SectionLabel>

      {/* Artist comparison */}
      <div className={`col-span-6 ${CARD} p-5`}>
        <h3 className="mb-3 text-sm font-semibold text-zinc-100">Comparar artistas</h3>
        <div className="mb-3 max-w-sm">
          <Autocomplete
            suggestions={artistNames.filter((n) => !compareArtists.includes(n))}
            placeholder="Añadir artista..."
            onSelect={(name) => setCompareArtists((prev) => [...prev, name])}
          />
        </div>
        <TagList tags={compareArtists} onRemove={(tag) => setCompareArtists((prev) => prev.filter((a) => a !== tag))} />
        {artistTrends.length > 0 && (
          <div className="mt-3">
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
                height: 320,
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
      <div className={`col-span-6 ${CARD} p-5`}>
        <h3 className="mb-3 text-sm font-semibold text-zinc-100">Comparar canciones</h3>
        <div className="mb-3 max-w-sm">
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
          <div className="mt-3">
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
                height: 320,
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

      {/* ── Trends ── */}
      <SectionLabel>Tendencias</SectionLabel>

      {/* Monthly Trend — full width */}
      <div className={`col-span-12 ${CARD} p-4`}>
        <PlotlyChart
          data={[
            {
              type: "bar",
              x: monthly.map((m) => m.date),
              y: monthly.map((m) => m.count),
              marker: { color: "#1DB954" },
            },
          ]}
          layout={chartLayout("Streams por Mes", { height: 300 })}
          config={chartConfig}
          style={{ width: "100%" }}
        />
      </div>

      {/* Hourly Polar | Weekday | Monthly Average */}
      <div className={`col-span-4 ${CARD} p-4`}>
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
            ...chartLayout("Actividad por Hora"),
            polar: {
              bgcolor: "transparent",
              radialaxis: { visible: true, color: "#3f3f46" },
              angularaxis: { color: "#a1a1aa", direction: "clockwise" },
            },
            height: 360,
            showlegend: false,
          }}
          config={chartConfig}
          style={{ width: "100%" }}
        />
      </div>
      <div className={`col-span-4 ${CARD} p-4`}>
        <PlotlyChart
          data={[
            {
              type: "bar",
              x: weekday.map((d) => d.name),
              y: weekday.map((d) => d.count),
              marker: { color: "#1DB954" },
            },
          ]}
          layout={chartLayout("Actividad por Día", { height: 360 })}
          config={chartConfig}
          style={{ width: "100%" }}
        />
      </div>
      <div className={`col-span-4 ${CARD} p-4`}>
        <PlotlyChart
          data={[
            {
              type: "bar",
              x: monthAvg.map((m) => m.name),
              y: monthAvg.map((m) => m.count),
              marker: { color: "#1DB954" },
            },
          ]}
          layout={chartLayout("Media Streams / Mes", { height: 360 })}
          config={chartConfig}
          style={{ width: "100%" }}
        />
      </div>

      {/* Heatmap: Day x Hour */}
      <div className={`col-span-12 ${CARD} p-4`}>
        <div className="mb-2 flex items-center justify-end">
          <button
            onClick={() => setShow3D((v) => !v)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              show3D
                ? "bg-green-600 text-white"
                : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60"
            }`}
          >
            3D
          </button>
        </div>
        {show3D ? (
          <PlotlyChart
            data={(() => {
              const maxVal = Math.max(...heatmap.flat(), 1);
              const meshX: number[] = [];
              const meshY: number[] = [];
              const meshZ: number[] = [];
              const meshI: number[] = [];
              const meshJ: number[] = [];
              const meshK: number[] = [];
              const faceColors: string[] = [];
              const vertexTexts: string[] = [];
              const wireX: (number | null)[] = [];
              const wireY: (number | null)[] = [];
              const wireZ: (number | null)[] = [];

              const ci = [0, 0, 4, 4, 0, 0, 3, 3, 0, 0, 1, 1];
              const cj = [2, 3, 5, 6, 1, 5, 7, 6, 4, 7, 2, 6];
              const ck = [1, 2, 6, 7, 5, 4, 6, 2, 7, 3, 6, 5];
              const edgePairs = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];

              for (let d = 0; d < dayLabels.length; d++) {
                for (let h = 0; h < 24; h++) {
                  const val = heatmap[d][h];
                  if (val === 0) continue;
                  const norm = val / maxVal;
                  const fillColor = `rgb(${Math.round(13 + norm * 17)},${Math.round(122 + norm * 93)},${Math.round(54 + norm * 42)})`;

                  const base = meshX.length;
                  const x0 = h, x1 = h + 1, y0 = d, y1 = d + 1;

                  meshX.push(x0, x1, x1, x0, x0, x1, x1, x0);
                  meshY.push(y0, y0, y1, y1, y0, y0, y1, y1);
                  meshZ.push(0, 0, 0, 0, val, val, val, val);

                  const label = `${dayLabels[d]} ${h}h: ${val} streams`;
                  for (let v = 0; v < 8; v++) vertexTexts.push(label);

                  for (let t = 0; t < 12; t++) {
                    meshI.push(ci[t] + base);
                    meshJ.push(cj[t] + base);
                    meshK.push(ck[t] + base);
                    faceColors.push(fillColor);
                  }

                  const vx = [x0, x1, x1, x0, x0, x1, x1, x0];
                  const vy = [y0, y0, y1, y1, y0, y0, y1, y1];
                  const vz = [0, 0, 0, 0, val, val, val, val];
                  for (const [a, b] of edgePairs) {
                    wireX.push(vx[a], vx[b], null);
                    wireY.push(vy[a], vy[b], null);
                    wireZ.push(vz[a], vz[b], null);
                  }
                }
              }

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return [
                {
                  type: "mesh3d",
                  x: meshX, y: meshY, z: meshZ,
                  i: meshI, j: meshJ, k: meshK,
                  facecolor: faceColors,
                  text: vertexTexts,
                  hoverinfo: "text",
                  flatshading: true,
                  lighting: { ambient: 0.8, diffuse: 0.3, specular: 0.1 },
                  showlegend: false,
                },
                {
                  type: "scatter3d",
                  mode: "lines",
                  x: wireX, y: wireY, z: wireZ,
                  line: { color: "#22c55e", width: 1.5 },
                  hoverinfo: "skip",
                  showlegend: false,
                },
              ] as any[];
            })()}
            layout={{
              ...chartLayout("Actividad por Día y Hora (3D)"),
              height: 500,
              margin: { t: 40, b: 30, l: 20, r: 20 },
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
              height: 280,
              yaxis: { gridcolor: "#27272a", autorange: "reversed" },
              margin: { l: 50, t: 40, b: 40, r: 16 },
            })}
            config={chartConfig}
            style={{ width: "100%" }}
          />
        )}
      </div>

      {/* ── Skip analysis ── */}
      <SectionLabel>Skips</SectionLabel>

      {/* Skip stat cards */}
      <div className="col-span-3">
        <StatCard label="Canciones skipeadas" value={`${skips.skipPercent}%`} sub={`${skips.totalSkips.toLocaleString()} skips totales`} />
      </div>
      <div className="col-span-3">
        <StatCard label="Tiempo medio antes de skip" value={`${skips.avgSecondsBeforeSkip}s`} sub="segundos de media" />
      </div>
      <div className="col-span-3">
        <StatCard label="Canciones completadas" value={`${(100 - skips.skipPercent).toFixed(1)}%`} sub="escuchadas hasta el final" />
      </div>
      <div className="col-span-3">
        <StatCard
          label="Hora con más skips"
          value={`${skips.skipRateByHour.indexOf(Math.max(...skips.skipRateByHour))}h`}
          sub={`${Math.max(...skips.skipRateByHour)}% de skip rate`}
        />
      </div>

      {/* How songs end + skip rate by year */}
      <div className={`col-span-5 ${CARD} p-4`}>
        <PlotlyChart
          data={[
            {
              type: "pie",
              labels: skips.reasonEndDistribution.map((r) => r.name),
              values: skips.reasonEndDistribution.map((r) => r.count),
              hole: 0.45,
              marker: {
                colors: ["#e74c3c", "#f39c12", "#1DB954", "#22c55e", "#9b59b6",
                         "#3498db", "#1abc9c", "#e67e22", "#e84393", "#00cec9"],
              },
              textinfo: "label+percent",
              textposition: "outside",
              textfont: { size: 10 },
              hovertemplate: "%{label}<br>%{value:,} veces (%{percent})<extra></extra>",
            },
          ]}
          layout={{
            ...chartLayout("Cómo terminan tus canciones"),
            height: 380,
            showlegend: true,
            legend: { font: { color: "#a1a1aa", size: 10 } },
            margin: { t: 40, b: 10, l: 10, r: 10 },
          }}
          config={chartConfig}
          style={{ width: "100%" }}
        />
      </div>
      <div className={`col-span-7 ${CARD} p-4`}>
        <PlotlyChart
          data={[
            {
              type: "bar",
              x: skips.skipRateByYear.map((y) => y.year),
              y: skips.skipRateByYear.map((y) => y.rate),
              marker: {
                color: skips.skipRateByYear.map((y) => y.rate),
                colorscale: [[0, "#22c55e"], [1, "#e74c3c"]],
              },
              text: skips.skipRateByYear.map((y) => `${y.rate}%`),
              textposition: "outside" as const,
              textfont: { color: "#a1a1aa", size: 11 },
            },
          ]}
          layout={chartLayout("Evolución del % de skips por año", {
            height: 380,
            yaxis: { gridcolor: "#27272a", title: { text: "% skip" } },
          })}
          config={chartConfig}
          style={{ width: "100%" }}
        />
      </div>

      {/* Skip rate by hour */}
      <div className={`col-span-12 ${CARD} p-4`}>
        <PlotlyChart
          data={[
            {
              type: "bar",
              x: hourLabels,
              y: skips.skipRateByHour,
              marker: {
                color: skips.skipRateByHour,
                colorscale: [[0, "#22c55e"], [1, "#e74c3c"]],
              },
            },
          ]}
          layout={chartLayout("% de skips por hora del día", {
            height: 260,
            yaxis: { gridcolor: "#27272a", title: { text: "% skip" } },
          })}
          config={chartConfig}
          style={{ width: "100%" }}
        />
      </div>

      {/* Most skipped songs + artists */}
      <div className={`col-span-6 ${CARD} p-4`}>
        <PlotlyChart
          data={[
            {
              type: "bar",
              x: skips.mostSkippedSongs.map((s) => s.count),
              y: skips.mostSkippedSongs.map((s) => s.name),
              orientation: "h" as const,
              marker: { color: "#e74c3c" },
            },
          ]}
          layout={chartLayout("Canciones más skipeadas", {
            height: Math.max(320, skips.mostSkippedSongs.length * 26 + 70),
            yaxis: { gridcolor: "#27272a", autorange: "reversed" as const },
            xaxis: { gridcolor: "#27272a", title: { text: "Skips" } },
            margin: { l: 220, t: 40, b: 50, r: 16 },
          })}
          config={chartConfig}
          style={{ width: "100%" }}
        />
      </div>
      <div className={`col-span-6 ${CARD} p-4`}>
        <PlotlyChart
          data={[
            {
              type: "bar",
              x: skips.mostSkippedArtists.map((a) => a.skipRate),
              y: skips.mostSkippedArtists.map((a) => a.name),
              orientation: "h" as const,
              marker: {
                color: skips.mostSkippedArtists.map((a) => a.skipRate),
                colorscale: [[0, "#f39c12"], [1, "#e74c3c"]],
              },
              text: skips.mostSkippedArtists.map(
                (a) => `${a.skipRate}% (${a.skips}/${a.total})`
              ),
              textposition: "outside" as const,
              textfont: { color: "#a1a1aa", size: 10 },
              hovertemplate: "%{y}<br>%{x}% skip rate<br>%{text}<extra></extra>",
            },
          ]}
          layout={chartLayout("Artistas con mayor % de skip (mín. 20 plays)", {
            height: Math.max(320, skips.mostSkippedArtists.length * 26 + 70),
            yaxis: { gridcolor: "#27272a", autorange: "reversed" as const },
            xaxis: { gridcolor: "#27272a", title: { text: "% skip" } },
            margin: { l: 180, t: 40, b: 50, r: 70 },
          })}
          config={chartConfig}
          style={{ width: "100%" }}
        />
      </div>

      {/* ── Geography ── */}
      <SectionLabel>Geografía</SectionLabel>

      {/* Country Pie + World Map */}
      <div className={`col-span-5 ${CARD} p-4`}>
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
            height: 440,
            showlegend: true,
            legend: { font: { color: "#a1a1aa", size: 10 } },
            margin: { t: 40, b: 10, l: 10, r: 10 },
          }}
          config={chartConfig}
          style={{ width: "100%" }}
        />
      </div>
      <div className={`col-span-7 ${CARD} p-4`}>
        <PlotlyChart
          data={[
            {
              type: "choropleth",
              locationmode: "ISO-3" as const,
              locations: countriesAll.map((c) => iso2ToIso3(c.name)),
              z: countriesAll.map((c) => {
                const n = c.count;
                if (n <= 100) return 1;
                if (n <= 500) return 2;
                if (n <= 2000) return 3;
                if (n <= 8000) return 4;
                if (n <= 25000) return 5;
                if (n <= 60000) return 6;
                return 7;
              }),
              zmin: 1,
              zmax: 7,
              text: countriesAll.map(
                (c) => `${c.name}: ${c.count.toLocaleString()} streams`
              ),
              hoverinfo: "text" as const,
              colorscale: [
                [0, "#14532d"],
                [0.167, "#166534"],
                [0.333, "#15803d"],
                [0.5, "#16a34a"],
                [0.667, "#22c55e"],
                [0.833, "#4ade80"],
                [1, "#1ed760"],
              ],
              colorbar: {
                title: { text: "Streams", font: { color: "#a1a1aa" } },
                tickfont: { color: "#a1a1aa" },
                tickvals: [1, 2, 3, 4, 5, 6, 7],
                ticktext: ["1–100", "101–500", "501–2k", "2k–8k", "8k–25k", "25k–60k", "60k+"],
              },
              marker: { line: { color: "#22c55e", width: 1 } },
            },
          ]}
          layout={{
            ...chartLayout("Mapa de escuchas por país"),
            height: 440,
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
            margin: { t: 40, b: 10, l: 10, r: 10 },
          }}
          config={chartConfig}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}
