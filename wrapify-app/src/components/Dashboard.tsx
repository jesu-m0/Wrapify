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
  topSongsSingleDay,
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
  scatterSongPlaysVsSkipRate,
  scatterArtistPlaysVsTracks,
  scatterArtistPlaysVsDuration,
  scatterArtistAgeVsRecent,
  lorenzCurve,
  discoveryRate,
  seasonalArtists,
  listeningSessions,
  oneHitWonders,
  bingeDays,
  platformTrends,
  offlineTrend,
  listeningStreaks,
  comebackSongs,
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

const CARD = "rounded-3xl bg-[#111]";

const chartLayout = (title: string, extra?: Partial<Plotly.Layout>): Partial<Plotly.Layout> => ({
  title: { text: title, font: { size: 14, color: "#e4e4e7" } },
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { color: "#a1a1aa", size: 11 },
  margin: { t: 40, b: 50, l: 50, r: 16 },
  xaxis: { gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
  yaxis: { gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
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
  big,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  big?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`${
        accent
          ? "rounded-3xl bg-emerald-950 p-5"
          : `${CARD} p-5`
      } flex flex-col justify-between ${className || ""}`}
    >
      <p
        className={`text-[11px] font-bold uppercase tracking-wider ${
          accent ? "text-emerald-400/80" : "text-zinc-500"
        }`}
      >
        {label}
      </p>
      <div className="mt-auto">
        <p
          className={`${big ? "text-5xl" : "text-2xl"} font-black tracking-tight ${
            accent ? "text-emerald-300" : "text-white"
          }`}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {sub && (
          <p className={`mt-1 text-xs ${accent ? "text-emerald-400/50" : "text-zinc-600"}`}>
            {sub}
          </p>
        )}
      </div>
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
        className="w-14 rounded-xl border-0 bg-white/5 px-2 py-1 text-xs text-zinc-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
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
      <ol className="space-y-1 overflow-y-auto flex-1" style={{ maxHeight: 360 }}>
        {items.map((item, i) => (
          <li key={item.name} className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 hover:bg-white/[0.03] transition-colors">
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="w-5 text-right text-xs font-bold text-zinc-600">{i + 1}</span>
              <span className="truncate text-[13px] text-zinc-300">{item.name}</span>
            </span>
            <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-400">
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
          className="flex items-center gap-1 rounded-full bg-emerald-950 px-3 py-1 text-xs font-medium text-emerald-300 cursor-pointer"
          onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); } }}
          onMouseUp={(e) => { if (e.button === 1) { e.preventDefault(); onRemove(tag); } }}
        >
          {tag}
          <button
            onClick={() => onRemove(tag)}
            className="ml-0.5 text-emerald-500 hover:text-white"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="col-span-12 pt-8 pb-2">
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500">
        {children}
      </h2>
    </div>
  );
}

/* ── Day names / month names ── */

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MONTH_SHORT = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

/** "YYYY-MM-DD" → "17 Feb 2025" */
function formatDateEs(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MONTH_SHORT[m - 1]} ${y}`;
}

/* ── Song card ── */

function SongCard({ song, index }: { song: { time: string; track: string; artist: string; album: string; minutesPlayed: number }; index: number }) {
  const mins = Math.floor(song.minutesPlayed);
  const secs = Math.round((song.minutesPlayed - mins) * 60);
  return (
    <div className="group flex items-center gap-3 rounded-2xl bg-white/[0.03] p-2.5 hover:bg-white/[0.06] transition-colors">
      <div className="shrink-0 w-8 text-center">
        <span className="text-xs font-bold text-zinc-600 group-hover:text-zinc-400 transition-colors">
          {index + 1}
        </span>
      </div>
      <div className="shrink-0 h-8 w-8 rounded-xl bg-emerald-950 flex items-center justify-center">
        <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-white">{song.track}</p>
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
    if (count === 0) return "bg-white/[0.03]";
    const ratio = count / maxCount;
    if (ratio < 0.25) return "bg-emerald-950";
    if (ratio < 0.5) return "bg-emerald-900/70";
    if (ratio < 0.75) return "bg-emerald-700/60";
    return "bg-emerald-500";
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
    return `${weekday}, ${d} ${MONTH_SHORT[m - 1]} ${y}`;
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
        <h3 className="text-sm font-bold text-white">Timeline</h3>
        <div className="flex rounded-2xl bg-white/5 p-0.5">
          <button
            onClick={() => setTab("calendar")}
            className={`rounded-xl px-3 py-1 text-xs font-semibold transition-colors ${
              tab === "calendar"
                ? "bg-emerald-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Calendario
          </button>
          <button
            onClick={() => setTab("slider")}
            className={`rounded-xl px-3 py-1 text-xs font-semibold transition-colors ${
              tab === "slider"
                ? "bg-emerald-600 text-white"
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
              className="rounded-xl border-0 bg-white/5 px-3 py-1.5 text-sm text-zinc-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
            <select
              value={viewYear}
              onChange={(e) => { setViewYear(Number(e.target.value)); setSelectedDate(null); }}
              className="rounded-xl border-0 bg-white/5 px-3 py-1.5 text-sm text-zinc-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
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
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs transition-all ${getDayIntensity(day)} ${
                      selectedDate === formatDate(day)
                        ? "ring-2 ring-emerald-400 ring-offset-1 ring-offset-[#111]"
                        : "hover:ring-1 hover:ring-zinc-700"
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
              className="rounded-xl bg-white/5 px-2.5 py-1.5 text-sm text-zinc-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
              className="rounded-xl bg-white/5 px-2.5 py-1.5 text-sm text-zinc-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              &rarr;
            </button>
          </div>

          <div className="px-2">
            <div className="relative h-6 flex items-center">
              <div className="h-1 w-full rounded-full bg-white/10" />
              <div
                className="absolute top-1/2 -translate-y-1/2 left-0 h-1 rounded-full bg-emerald-500"
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
            <h4 className="text-sm font-bold text-white">
              {formatDateEs(selectedDate)}{" "}
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
              <div className="flex items-center gap-3 px-2.5 pb-2 border-b border-white/5 text-[10px] uppercase tracking-wider text-zinc-600">
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
  const [topSongDayOpen, setTopSongDayOpen] = useState(false);

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
  const topSongsDayList = useMemo(() => topSongsSingleDay(data), [data]);
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

  const scatterPlaysSkip = useMemo(() => scatterSongPlaysVsSkipRate(data), [data]);
  const scatterPlaysTracks = useMemo(() => scatterArtistPlaysVsTracks(data), [data]);
  const scatterPlaysDuration = useMemo(() => scatterArtistPlaysVsDuration(data), [data]);
  const scatterAgeRecent = useMemo(() => scatterArtistAgeVsRecent(data), [data]);

  const lorenz = useMemo(() => lorenzCurve(data), [data]);
  const discovery = useMemo(() => discoveryRate(data), [data]);
  const seasonal = useMemo(() => seasonalArtists(data), [data]);
  const sessions = useMemo(() => listeningSessions(data), [data]);
  const oneHits = useMemo(() => oneHitWonders(data), [data]);
  const binges = useMemo(() => bingeDays(data), [data]);
  const platTrends = useMemo(() => platformTrends(data), [data]);
  const offTrend = useMemo(() => offlineTrend(data), [data]);
  const streaks = useMemo(() => listeningStreaks(data), [data]);
  const comebacks = useMemo(() => comebackSongs(data), [data]);

  const totalCountryStreams = countries.reduce((a, c) => a + c.count, 0);
  const dayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}h`);

  /* ── JSX ── */

  return (
    <div className="space-y-4">

      {/* ── Overview stats — Bento Grid ── */}
      <div className="grid grid-cols-12 auto-rows-[100px] gap-4">
        <div className="col-span-4 row-span-3 flex flex-col gap-4">
          <StatCard label="Total Streams" value={stats.totalStreams} accent big className="flex-1" />
          {topSongsDayList.length > 0 && (
            <div
              className={`rounded-3xl bg-emerald-950 p-5 flex flex-col cursor-pointer transition-all ${
                topSongDayOpen ? "" : "flex-1"
              }`}
              onClick={() => setTopSongDayOpen((o) => !o)}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/80">
                  Top canción en un solo día
                </p>
                <span className={`text-emerald-400/60 text-xs transition-transform ${topSongDayOpen ? "rotate-180" : ""}`}>
                  ▼
                </span>
              </div>
              <div className="mt-auto">
                <p className="text-lg font-black tracking-tight text-emerald-300 truncate">
                  {topSongsDayList[0].track}
                </p>
                <p className="mt-0.5 text-xs text-emerald-400/50">
                  {topSongsDayList[0].count} streams · {topSongsDayList[0].artist} · {formatDateEs(topSongsDayList[0].date)}
                </p>
              </div>
              {topSongDayOpen && (
                <div className="mt-3 space-y-1.5 border-t border-emerald-400/10 pt-3">
                  {topSongsDayList.slice(1).map((s, i) => (
                    <div key={i} className="flex items-baseline gap-2">
                      <span className="text-[11px] font-bold text-emerald-400/40 w-4 shrink-0">{i + 2}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-emerald-300/90 truncate">{s.track}</p>
                        <p className="text-[10px] text-emerald-400/40 truncate">
                          {s.count} streams · {s.artist} · {formatDateEs(s.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="col-span-4 row-span-1">
          <StatCard label="Horas escuchadas" value={stats.totalHours} className="h-full" />
        </div>
        <div className="col-span-4 row-span-1">
          <StatCard label="Artistas únicos" value={stats.uniqueArtists} className="h-full" />
        </div>
        <div className="col-span-4 row-span-1">
          <StatCard label="Minutos totales" value={stats.totalMinutes} className="h-full" />
        </div>
        <div className="col-span-4 row-span-1">
          <StatCard label="Canciones únicas" value={stats.uniqueTracks} className="h-full" />
        </div>
        <div className="col-span-8 row-span-1">
          <StatCard
            label="Día más escuchado"
            value={formatDateEs(busiest.date)}
            sub={`${busiest.count.toLocaleString()} streams`}
            accent
            className="h-full"
          />
        </div>
      </div>

      {/* ── Timeline + Yearly trend ── */}
      <div className="grid grid-cols-12 gap-4">
      <div className="col-span-7">
        <TimelineCard data={data} />
      </div>
      <div className={`col-span-5 ${CARD} p-4 flex flex-col`}>
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
      </div>

      {/* ── Rankings ── */}
      <div>
        <SectionLabel>Rankings</SectionLabel>
        <div className="grid grid-cols-12 gap-4">
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
        </div>
      </div>

      {/* ── Explore: Top by year + Top by artist ── */}
      <div>
        <SectionLabel>Explorar</SectionLabel>
        <div className="grid grid-cols-12 gap-4">

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
              <span
                className="rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-xs text-zinc-300 cursor-pointer"
                onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); } }}
                onMouseUp={(e) => { if (e.button === 1) { e.preventDefault(); setArtistForSongs(null); } }}
              >
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
        </div>
      </div>

      {/* ── Comparisons ── */}
      <div>
        <SectionLabel>Comparar</SectionLabel>
        <div className="grid grid-cols-12 gap-4">

      {/* Artist comparison */}
      <div className={`col-span-6 ${CARD} p-5`}>
        <h3 className="mb-3 text-sm font-bold text-white">Comparar artistas</h3>
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

        </div>
      </div>

      {/* ── Trends ── */}
      <div>
        <SectionLabel>Tendencias</SectionLabel>
        <div className="grid grid-cols-12 gap-4">

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
      <div className={`col-span-5 ${CARD} p-4`}>
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
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-100">Actividad por Día y Hora</h3>
          <div className="flex items-center rounded-xl bg-zinc-800/60 p-0.5">
            <button
              onClick={() => setShow3D(false)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                !show3D
                  ? "bg-emerald-600 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              2D
            </button>
            <button
              onClick={() => setShow3D(true)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                show3D
                  ? "bg-emerald-600 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              3D
            </button>
          </div>
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

        </div>
      </div>

      {/* ── Skip analysis ── */}
      <div>
        <SectionLabel>Skips</SectionLabel>
        <div className="grid grid-cols-12 gap-4">
          {/* Skip stat cards — bento sub-grid */}
          <div className="col-span-5 grid grid-cols-2 auto-rows-[90px] gap-4">
            <div className="col-span-1 row-span-2">
              <StatCard label="Canciones skipeadas" value={`${skips.skipPercent}%`} sub={`${skips.totalSkips.toLocaleString()} skips totales`} accent className="h-full" />
            </div>
            <div className="col-span-1">
              <StatCard label="Tiempo medio antes de skip" value={`${skips.avgSecondsBeforeSkip}s`} sub="segundos de media" className="h-full" />
            </div>
            <div className="col-span-1">
              <StatCard label="Completadas" value={`${(100 - skips.skipPercent).toFixed(1)}%`} sub="hasta el final" className="h-full" />
            </div>
          </div>
          <div className={`col-span-7 ${CARD} p-4`}>
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

          <div className={`col-span-8 ${CARD} p-4`}>
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
                height: 340,
                yaxis: { gridcolor: "#1a1a1a", title: { text: "% skip" } },
              })}
              config={chartConfig}
              style={{ width: "100%" }}
            />
          </div>
          <div className={`col-span-4 ${CARD} p-5 flex flex-col justify-center items-center`}>
            <p className="text-6xl font-black text-amber-400">{skips.skipRateByHour.indexOf(Math.max(...skips.skipRateByHour))}h</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Hora con más skips</p>
            <p className="text-sm text-zinc-600">{Math.max(...skips.skipRateByHour)}% skip rate</p>
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
                yaxis: { gridcolor: "#1a1a1a", title: { text: "% skip" } },
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
                yaxis: { gridcolor: "#1a1a1a", autorange: "reversed" as const },
                xaxis: { gridcolor: "#1a1a1a", title: { text: "Skips" } },
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
                yaxis: { gridcolor: "#1a1a1a", autorange: "reversed" as const },
                xaxis: { gridcolor: "#1a1a1a", title: { text: "% skip" } },
                margin: { l: 180, t: 40, b: 50, r: 70 },
              })}
              config={chartConfig}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>

      {/* ── Scatter / Quadrant charts ── */}
      <div>
        <SectionLabel>Radiografía</SectionLabel>
        <div className="grid grid-cols-12 gap-4">

          {/* 1 — Popularidad vs Skip Rate (canciones) */}
          <div className={`col-span-6 ${CARD} p-4`}>
            <PlotlyChart
              data={(() => {
                const pts = scatterPlaysSkip;
                const medX = pts.length > 0 ? [...pts].sort((a, b) => a.x - b.x)[Math.floor(pts.length / 2)].x : 0;
                const medY = pts.length > 0 ? [...pts].sort((a, b) => a.y - b.y)[Math.floor(pts.length / 2)].y : 0;
                const maxX = pts.length > 0 ? Math.max(...pts.map(p => p.x)) : 1;
                const maxY = pts.length > 0 ? Math.max(...pts.map(p => p.y)) : 1;
                return [
                  {
                    type: "scattergl" as const,
                    mode: "markers" as const,
                    x: pts.map(p => p.x),
                    y: pts.map(p => p.y),
                    text: pts.map(p => p.name),
                    hovertemplate: "<b>%{text}</b><br>%{x} plays · %{y}% skip<extra></extra>",
                    marker: {
                      size: 5,
                      color: pts.map(p => {
                        if (p.x >= medX && p.y < medY) return "#22c55e";   // fav real
                        if (p.x < medX && p.y < medY) return "#3b82f6";    // joya oculta
                        if (p.x >= medX && p.y >= medY) return "#f59e0b";  // hype
                        return "#ef4444";                                    // no conectó
                      }),
                      opacity: 0.6,
                    },
                  },
                  {
                    type: "scatter" as const,
                    mode: "lines" as const,
                    x: [medX, medX],
                    y: [0, maxY * 1.05],
                    line: { color: "#3f3f46", width: 1, dash: "dash" as const },
                    hoverinfo: "skip" as const,
                    showlegend: false,
                  },
                  {
                    type: "scatter" as const,
                    mode: "lines" as const,
                    x: [0, maxX * 1.05],
                    y: [medY, medY],
                    line: { color: "#3f3f46", width: 1, dash: "dash" as const },
                    hoverinfo: "skip" as const,
                    showlegend: false,
                  },
                ];
              })()}
              layout={(() => {
                const pts = scatterPlaysSkip;
                const medX = pts.length > 0 ? [...pts].sort((a, b) => a.x - b.x)[Math.floor(pts.length / 2)].x : 0;
                const medY = pts.length > 0 ? [...pts].sort((a, b) => a.y - b.y)[Math.floor(pts.length / 2)].y : 0;
                const maxX = pts.length > 0 ? Math.max(...pts.map(p => p.x)) : 1;
                const maxY = pts.length > 0 ? Math.max(...pts.map(p => p.y)) : 1;
                return {
                  ...chartLayout("Popularidad vs Skip Rate (canciones)"),
                  height: 440,
                  showlegend: false,
                  xaxis: { title: { text: "Reproducciones" }, gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
                  yaxis: { title: { text: "% Skip" }, gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
                  annotations: [
                    { x: maxX * 0.95, y: medY * 0.3, text: "⭐ Favoritas de verdad", showarrow: false, font: { color: "#22c55e", size: 10 } },
                    { x: medX * 0.3, y: medY * 0.3, text: "💎 Joyas ocultas", showarrow: false, font: { color: "#3b82f6", size: 10 } },
                    { x: maxX * 0.95, y: maxY * 0.95, text: "🔥 Hype sin sustancia", showarrow: false, font: { color: "#f59e0b", size: 10 } },
                    { x: medX * 0.3, y: maxY * 0.95, text: "❌ No conectaron", showarrow: false, font: { color: "#ef4444", size: 10 } },
                  ],
                };
              })()}
              config={chartConfig}
              style={{ width: "100%" }}
            />
          </div>

          {/* 2 — Reproducciones vs Diversidad (artistas) */}
          <div className={`col-span-6 ${CARD} p-4`}>
            <PlotlyChart
              data={(() => {
                const pts = scatterPlaysTracks;
                const medX = pts.length > 0 ? [...pts].sort((a, b) => a.x - b.x)[Math.floor(pts.length / 2)].x : 0;
                const medY = pts.length > 0 ? [...pts].sort((a, b) => a.y - b.y)[Math.floor(pts.length / 2)].y : 0;
                const maxX = pts.length > 0 ? Math.max(...pts.map(p => p.x)) : 1;
                const maxY = pts.length > 0 ? Math.max(...pts.map(p => p.y)) : 1;
                return [
                  {
                    type: "scattergl" as const,
                    mode: "markers" as const,
                    x: pts.map(p => p.x),
                    y: pts.map(p => p.y),
                    text: pts.map(p => p.name),
                    hovertemplate: "<b>%{text}</b><br>%{x} plays · %{y} canciones<extra></extra>",
                    marker: {
                      size: 5,
                      color: pts.map(p => {
                        if (p.x >= medX && p.y >= medY) return "#22c55e";  // fan profundo
                        if (p.x >= medX && p.y < medY) return "#f59e0b";   // obsesión
                        if (p.x < medX && p.y >= medY) return "#3b82f6";   // exploración
                        return "#a1a1aa";                                    // de paso
                      }),
                      opacity: 0.6,
                    },
                  },
                  {
                    type: "scatter" as const,
                    mode: "lines" as const,
                    x: [medX, medX],
                    y: [0, maxY * 1.05],
                    line: { color: "#3f3f46", width: 1, dash: "dash" as const },
                    hoverinfo: "skip" as const,
                    showlegend: false,
                  },
                  {
                    type: "scatter" as const,
                    mode: "lines" as const,
                    x: [0, maxX * 1.05],
                    y: [medY, medY],
                    line: { color: "#3f3f46", width: 1, dash: "dash" as const },
                    hoverinfo: "skip" as const,
                    showlegend: false,
                  },
                ];
              })()}
              layout={(() => {
                const pts = scatterPlaysTracks;
                const medX = pts.length > 0 ? [...pts].sort((a, b) => a.x - b.x)[Math.floor(pts.length / 2)].x : 0;
                const medY = pts.length > 0 ? [...pts].sort((a, b) => a.y - b.y)[Math.floor(pts.length / 2)].y : 0;
                const maxX = pts.length > 0 ? Math.max(...pts.map(p => p.x)) : 1;
                const maxY = pts.length > 0 ? Math.max(...pts.map(p => p.y)) : 1;
                return {
                  ...chartLayout("Reproducciones vs Diversidad (artistas)"),
                  height: 440,
                  showlegend: false,
                  xaxis: { title: { text: "Reproducciones totales" }, gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
                  yaxis: { title: { text: "Canciones únicas" }, gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
                  annotations: [
                    { x: maxX * 0.95, y: maxY * 0.95, text: "🎧 Fan profundo", showarrow: false, font: { color: "#22c55e", size: 10 } },
                    { x: maxX * 0.95, y: medY * 0.3, text: "🔁 Obsesión 1-2 temas", showarrow: false, font: { color: "#f59e0b", size: 10 } },
                    { x: medX * 0.3, y: maxY * 0.95, text: "🔍 Exploración", showarrow: false, font: { color: "#3b82f6", size: 10 } },
                    { x: medX * 0.3, y: medY * 0.3, text: "👋 De paso", showarrow: false, font: { color: "#a1a1aa", size: 10 } },
                  ],
                };
              })()}
              config={chartConfig}
              style={{ width: "100%" }}
            />
          </div>

          {/* 3 — Popularidad vs Duración media (artistas) */}
          <div className={`col-span-6 ${CARD} p-4`}>
            <PlotlyChart
              data={(() => {
                const pts = scatterPlaysDuration;
                const medX = pts.length > 0 ? [...pts].sort((a, b) => a.x - b.x)[Math.floor(pts.length / 2)].x : 0;
                const medY = pts.length > 0 ? [...pts].sort((a, b) => a.y - b.y)[Math.floor(pts.length / 2)].y : 0;
                const maxX = pts.length > 0 ? Math.max(...pts.map(p => p.x)) : 1;
                const maxY = pts.length > 0 ? Math.max(...pts.map(p => p.y)) : 1;
                return [
                  {
                    type: "scattergl" as const,
                    mode: "markers" as const,
                    x: pts.map(p => p.x),
                    y: pts.map(p => p.y),
                    text: pts.map(p => p.name),
                    hovertemplate: "<b>%{text}</b><br>%{x} plays · %{y}s media<extra></extra>",
                    marker: {
                      size: 5,
                      color: pts.map(p => {
                        if (p.x >= medX && p.y >= medY) return "#22c55e";  // escucha real
                        if (p.x >= medX && p.y < medY) return "#f59e0b";   // escucha superficial
                        if (p.x < medX && p.y >= medY) return "#3b82f6";   // poco pero intenso
                        return "#a1a1aa";                                    // background
                      }),
                      opacity: 0.6,
                    },
                  },
                  {
                    type: "scatter" as const,
                    mode: "lines" as const,
                    x: [medX, medX],
                    y: [0, maxY * 1.05],
                    line: { color: "#3f3f46", width: 1, dash: "dash" as const },
                    hoverinfo: "skip" as const,
                    showlegend: false,
                  },
                  {
                    type: "scatter" as const,
                    mode: "lines" as const,
                    x: [0, maxX * 1.05],
                    y: [medY, medY],
                    line: { color: "#3f3f46", width: 1, dash: "dash" as const },
                    hoverinfo: "skip" as const,
                    showlegend: false,
                  },
                ];
              })()}
              layout={(() => {
                const pts = scatterPlaysDuration;
                const medX = pts.length > 0 ? [...pts].sort((a, b) => a.x - b.x)[Math.floor(pts.length / 2)].x : 0;
                const medY = pts.length > 0 ? [...pts].sort((a, b) => a.y - b.y)[Math.floor(pts.length / 2)].y : 0;
                const maxX = pts.length > 0 ? Math.max(...pts.map(p => p.x)) : 1;
                const maxY = pts.length > 0 ? Math.max(...pts.map(p => p.y)) : 1;
                return {
                  ...chartLayout("Popularidad vs Duración media (artistas)"),
                  height: 440,
                  showlegend: false,
                  xaxis: { title: { text: "Reproducciones totales" }, gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
                  yaxis: { title: { text: "Duración media (seg)" }, gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
                  annotations: [
                    { x: maxX * 0.95, y: maxY * 0.95, text: "🎵 Escucha comprometida", showarrow: false, font: { color: "#22c55e", size: 10 } },
                    { x: maxX * 0.95, y: medY * 0.3, text: "⏩ Escucha superficial", showarrow: false, font: { color: "#f59e0b", size: 10 } },
                    { x: medX * 0.3, y: maxY * 0.95, text: "🎶 Poco pero intenso", showarrow: false, font: { color: "#3b82f6", size: 10 } },
                    { x: medX * 0.3, y: medY * 0.3, text: "🔇 De fondo", showarrow: false, font: { color: "#a1a1aa", size: 10 } },
                  ],
                };
              })()}
              config={chartConfig}
              style={{ width: "100%" }}
            />
          </div>

          {/* 4 — Antigüedad vs Vigencia (artistas) */}
          <div className={`col-span-6 ${CARD} p-4`}>
            <PlotlyChart
              data={(() => {
                const pts = scatterAgeRecent;
                //const medX = pts.length > 0 ? [...pts].sort((a, b) => a.x - b.x)[Math.floor(pts.length / 2)].x : 0;
                const sortedX = [...pts].sort((a, b) => a.x - b.x);
                const cutX = sortedX[Math.floor(sortedX.length * 0.2)]?.x ?? 0;
                //const medY = pts.length > 0 ? [...pts].sort((a, b) => a.y - b.y)[Math.floor(pts.length / 2)].y : 0;
                const nonZeroY = pts.filter(p => p.y > 0);
                const sortedY = nonZeroY.sort((a, b) => a.y - b.y);
                const cutY = sortedY.length > 0 ? sortedY[Math.floor(sortedY.length * 0.75)]?.y ?? 1 : 1;
                const maxX = pts.length > 0 ? Math.max(...pts.map(p => p.x)) : 1;
                const maxY = pts.length > 0 ? Math.max(...pts.map(p => p.y)) : 1;
                return [
                  {
                    type: "scattergl" as const,
                    mode: "markers" as const,
                    x: pts.map(p => p.x),
                    y: pts.map(p => p.y),
                    text: pts.map(p => `${p.name} (desde ${p.firstDate})`),
                    hovertemplate: "<b>%{text}</b><br>%{x} días · %{y} plays recientes<extra></extra>",
                    marker: {
                      size: 5,
                      color: pts.map(p => {
                        if (p.x >= cutX && p.y >= cutY) return "#22c55e";  // clásico personal
                        if (p.x >= cutX && p.y < cutY) return "#a1a1aa";   // fase superada
                        if (p.x < cutX && p.y >= cutY) return "#f59e0b";   // nuevo favorito
                        return "#3b82f6";                                    // recién llegado
                      }),
                      opacity: 0.6,
                    },
                  },
                  {
                    type: "scatter" as const,
                    mode: "lines" as const,
                    x: [cutX, cutX],
                    y: [0, maxY * 1.05],
                    line: { color: "#3f3f46", width: 1, dash: "dash" as const },
                    hoverinfo: "skip" as const,
                    showlegend: false,
                  },
                  {
                    type: "scatter" as const,
                    mode: "lines" as const,
                    x: [0, maxX * 1.05],
                    y: [cutY, cutY],
                    line: { color: "#3f3f46", width: 1, dash: "dash" as const },
                    hoverinfo: "skip" as const,
                    showlegend: false,
                  },
                ];
              })()}
              layout={(() => {
                const pts = scatterAgeRecent;
                //const medX = pts.length > 0 ? [...pts].sort((a, b) => a.x - b.x)[Math.floor(pts.length / 2)].x : 0;
                const sortedX = [...pts].sort((a, b) => a.x - b.x);
                const cutX = sortedX[Math.floor(sortedX.length * 0.2)]?.x ?? 0;
                //const medY = pts.length > 0 ? [...pts].sort((a, b) => a.y - b.y)[Math.floor(pts.length / 2)].y : 0;
                const nonZeroY = pts.filter(p => p.y > 0);
                const sortedY = nonZeroY.sort((a, b) => a.y - b.y);
                const cutY = sortedY.length > 0 ? sortedY[Math.floor(sortedY.length * 0.75)]?.y ?? 1 : 1;
                const maxX = pts.length > 0 ? Math.max(...pts.map(p => p.x)) : 1;
                const maxY = pts.length > 0 ? Math.max(...pts.map(p => p.y)) : 1;
                return {
                  ...chartLayout("Antigüedad vs Vigencia (artistas)"),
                  height: 440,
                  showlegend: false,
                  xaxis: { title: { text: "Días desde primera escucha" }, gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a", autorange: "reversed" as const },
                  yaxis: { title: { text: "Plays últimos 6 meses" }, gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
                  annotations: [
                    { x: maxX * 0.95, y: maxY * 0.95, text: "🏛️ Clásico personal", showarrow: false, font: { color: "#22c55e", size: 10 } },
                    { x: maxX * 0.95, y: cutY * 0.3, text: "📦 Fase superada", showarrow: false, font: { color: "#a1a1aa", size: 10 } },
                    { x: cutX * 0.3, y: maxY * 0.95, text: "🔥 Nuevo favorito", showarrow: false, font: { color: "#f59e0b", size: 10 } },
                    { x: cutX * 0.3, y: cutY * 0.3, text: "🆕 Recién llegado", showarrow: false, font: { color: "#3b82f6", size: 10 } },
                  ],
                };
              })()}
              config={chartConfig}
              style={{ width: "100%" }}
            />
          </div>

        </div>
      </div>

      {/* ── Insights avanzados ── */}
      <div>
        <SectionLabel>Insights</SectionLabel>
        <div className="grid grid-cols-12 gap-4">

          {/* Lorenz curve */}
          <div className={`col-span-6 ${CARD} p-4`}>
            <PlotlyChart
              data={[
                {
                  type: "scatter" as const,
                  mode: "lines" as const,
                  name: "Tu distribución",
                  x: lorenz.x,
                  y: lorenz.y,
                  line: { color: "#1DB954", width: 2.5 },
                  fill: "tozeroy" as const,
                  fillcolor: "rgba(29,185,84,0.1)",
                  hovertemplate: "%{x:.0f}% de artistas → %{y:.0f}% de plays<extra></extra>",
                },
                {
                  type: "scatter" as const,
                  mode: "lines" as const,
                  name: "Igualdad perfecta",
                  x: [0, 100],
                  y: [0, 100],
                  line: { color: "#3f3f46", width: 1, dash: "dash" as const },
                  hoverinfo: "skip" as const,
                },
              ]}
              layout={{
                ...chartLayout("Curva de Lorenz — Concentración de artistas"),
                height: 400,
                showlegend: true,
                legend: { font: { color: "#a1a1aa" } },
                xaxis: { title: { text: "% de artistas (acumulado)" }, gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
                yaxis: { title: { text: "% de plays (acumulado)" }, gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
              }}
              config={chartConfig}
              style={{ width: "100%" }}
            />
          </div>

          {/* Discovery rate */}
          <div className={`col-span-6 ${CARD} p-4`}>
            <PlotlyChart
              data={[
                {
                  type: "scatter" as const,
                  mode: "lines" as const,
                  name: "Artistas nuevos",
                  x: discovery.months,
                  y: discovery.newArtists,
                  line: { color: "#1DB954", width: 2 },
                  fill: "tozeroy" as const,
                  fillcolor: "rgba(29,185,84,0.15)",
                },
                {
                  type: "scatter" as const,
                  mode: "lines" as const,
                  name: "Canciones nuevas",
                  x: discovery.months,
                  y: discovery.newSongs,
                  line: { color: "#3b82f6", width: 2 },
                  fill: "tozeroy" as const,
                  fillcolor: "rgba(59,130,246,0.1)",
                },
              ]}
              layout={{
                ...chartLayout("Ritmo de descubrimiento"),
                height: 400,
                showlegend: true,
                legend: { font: { color: "#a1a1aa" } },
                xaxis: { gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
                yaxis: { title: { text: "Nuevos por mes" }, gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
              }}
              config={chartConfig}
              style={{ width: "100%" }}
            />
          </div>

          {/* Seasonal artists heatmap */}
          <div className={`col-span-12 ${CARD} p-4`}>
            <PlotlyChart
              data={[
                {
                  type: "heatmap",
                  z: seasonal.grid,
                  x: seasonal.months,
                  y: seasonal.artists,
                  colorscale: [[0, "#09090b"], [0.5, "#166534"], [1, "#1ed760"]],
                  hovertemplate: "<b>%{y}</b><br>%{x}: %{z} plays<extra></extra>",
                },
              ]}
              layout={{
                ...chartLayout("Artistas estacionales — ¿A quién escuchas en cada mes?"),
                height: Math.max(400, seasonal.artists.length * 22 + 80),
                yaxis: { gridcolor: "#27272a", autorange: "reversed" as const, dtick: 1 },
                xaxis: { gridcolor: "#27272a", side: "top" as const },
                margin: { l: 180, t: 60, b: 20, r: 16 },
              }}
              config={chartConfig}
              style={{ width: "100%" }}
            />
          </div>

          {/* Sessions */}
          <div className="col-span-4 grid grid-cols-1 auto-rows-[90px] gap-4">
            <StatCard label="Sesiones detectadas" value={sessions.sessions.length.toLocaleString()} className="h-full" />
            <StatCard label="Duración media" value={`${sessions.avgDuration} min`} className="h-full" />
            <StatCard
              label="Sesión más larga"
              value={sessions.longestSession ? `${Math.round(sessions.longestSession.durationMin / 60)}h ${sessions.longestSession.durationMin % 60}m` : "—"}
              sub={sessions.longestSession ? `${sessions.longestSession.trackCount} canciones · ${sessions.longestSession.date}` : ""}
              accent
              className="h-full"
            />
          </div>
          <div className={`col-span-8 ${CARD} p-4`}>
            <PlotlyChart
              data={[
                {
                  type: "bar",
                  x: sessions.durationDistribution.map((d) => d.bucket),
                  y: sessions.durationDistribution.map((d) => d.count),
                  marker: { color: "#1DB954" },
                  text: sessions.durationDistribution.map((d) => d.count.toLocaleString()),
                  textposition: "outside" as const,
                  textfont: { color: "#a1a1aa", size: 11 },
                },
              ]}
              layout={chartLayout("Distribución de duración de sesiones", {
                height: 320,
                xaxis: { gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
                yaxis: { title: { text: "Nº sesiones" }, gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
              })}
              config={chartConfig}
              style={{ width: "100%" }}
            />
          </div>

          {/* One-hit wonders */}
          <div className={`col-span-6 ${CARD} p-5`}>
            <h3 className="mb-3 text-sm font-bold text-white">One-Hit Wonders personales</h3>
            <p className="mb-3 text-[11px] text-zinc-500">Artistas donde 60%+ de tus plays son de una sola canción, mínimo 50 plays</p>
            {oneHits.length === 0 ? (
              <p className="text-sm text-zinc-600">No se encontraron one-hit wonders.</p>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {oneHits.map((item, i) => (
                  <div key={item.artist} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/[0.03] transition-colors">
                    <span className="w-5 text-right text-xs font-bold text-zinc-600">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[13px] text-zinc-300">{item.artist}</p>
                      <p className="truncate text-[11px] text-zinc-600">{item.topSong}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${item.pct}%` }} />
                      </div>
                      <span className="text-[11px] font-semibold text-amber-400 w-12 text-right">{item.pct}%  {item.topCount}/{item.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Binge detector */}
          <div className={`col-span-6 ${CARD} p-5`}>
            <h3 className="mb-3 text-sm font-bold text-white">Binge Days</h3>
            <p className="mb-3 text-[11px] text-zinc-500">Días donde un artista fue 70%+ de tus escuchas, mínimo 5 plays</p>
            {binges.length === 0 ? (
              <p className="text-sm text-zinc-600">No se encontraron binge days.</p>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {binges.map((item, i) => (
                  <div key={`${item.date}-${item.artist}`} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/[0.03] transition-colors">
                    <span className="w-5 text-right text-xs font-bold text-zinc-600">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[13px] text-zinc-300">{item.artist}</p>
                      <p className="truncate text-[11px] text-zinc-600">{item.date} · {item.artistPlays}/{item.total} plays</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-red-950 px-2.5 py-0.5 text-[11px] font-semibold text-red-400">
                      {item.pct}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Platform trends */}
          <div className={`col-span-8 ${CARD} p-4`}>
            <PlotlyChart
              data={platTrends.platforms.map((p, i) => ({
                type: "scatter" as const,
                mode: "lines" as const,
                name: p.name,
                x: platTrends.months,
                y: p.counts,
                stackgroup: "one",
                line: { color: COMPARE_COLORS[i % COMPARE_COLORS.length], width: 0.5 },
                fillcolor: COMPARE_COLORS[i % COMPARE_COLORS.length] + "80",
              }))}
              layout={{
                ...chartLayout("Plataformas a lo largo del tiempo"),
                height: 360,
                showlegend: true,
                legend: { font: { color: "#a1a1aa", size: 10 } },
                xaxis: { gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
                yaxis: { title: { text: "Streams" }, gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
              }}
              config={chartConfig}
              style={{ width: "100%" }}
            />
          </div>

          {/* Offline trend */}
          <div className={`col-span-4 ${CARD} p-4`}>
            <PlotlyChart
              data={[
                {
                  type: "scatter" as const,
                  mode: "lines" as const,
                  x: offTrend.months,
                  y: offTrend.pct,
                  line: { color: "#f59e0b", width: 2 },
                  fill: "tozeroy" as const,
                  fillcolor: "rgba(245,158,11,0.1)",
                  hovertemplate: "%{x}<br>%{y}% offline<extra></extra>",
                },
              ]}
              layout={{
                ...chartLayout("% Offline por mes"),
                height: 360,
                showlegend: false,
                xaxis: { gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
                yaxis: { title: { text: "% offline" }, gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
              }}
              config={chartConfig}
              style={{ width: "100%" }}
            />
          </div>

          {/* Listening streaks */}
          <div className="col-span-4 grid grid-cols-2 auto-rows-[90px] gap-4">
            <div className="col-span-1">
              <StatCard label="Racha actual" value={`${streaks.currentStreak} días`} className="h-full" />
            </div>
            <div className="col-span-1">
              <StatCard label="Racha más larga" value={`${streaks.longestStreak} días`} accent className="h-full" />
            </div>
            <div className="col-span-2">
              <StatCard
                label="Mejor racha"
                value={`${streaks.longestStart} → ${streaks.longestEnd}`}
                sub={`${streaks.longestStreak} días consecutivos`}
                className="h-full"
              />
            </div>
          </div>
          <div className={`col-span-8 ${CARD} p-4`}>
            <PlotlyChart
              data={[
                {
                  type: "bar",
                  x: streaks.streakDistribution.map((d) => d.length === 30 ? "30+" : String(d.length)),
                  y: streaks.streakDistribution.map((d) => d.count),
                  marker: { color: "#1DB954" },
                },
              ]}
              layout={chartLayout("Distribución de rachas (días consecutivos)", {
                height: 280,
                xaxis: { title: { text: "Días de racha" }, gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
                yaxis: { title: { text: "Nº de rachas" }, gridcolor: "#1a1a1a", zerolinecolor: "#1a1a1a" },
              })}
              config={chartConfig}
              style={{ width: "100%" }}
            />
          </div>

          {/* Comeback songs */}
          <div className={`col-span-12 ${CARD} p-5`}>
            <h3 className="mb-1 text-sm font-bold text-white">Comeback Songs</h3>
            <p className="mb-3 text-[11px] text-zinc-500">Canciones que dejaste de escuchar 2+ meses y luego volvieron</p>
            {comebacks.length === 0 ? (
              <p className="text-sm text-zinc-600">No se detectaron comebacks.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {comebacks.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.06] transition-colors">
                    <span className="text-xs font-bold text-zinc-600 w-5 text-right">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-zinc-200">{item.name}</p>
                      <p className="text-[11px] text-zinc-600">
                        Pico: {item.peakMonth} ({item.peakCount}) → {item.gapMonths} meses sin escuchar → Vuelta: {item.comebackMonth} ({item.comebackCount})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Geography ── */}
      <div>
        <SectionLabel>Geografía</SectionLabel>
        <div className="grid grid-cols-12 gap-4">
          <div className={`col-span-4 ${CARD} p-4`}>
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
          <div className={`col-span-8 ${CARD} p-4`}>
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
                  landcolor: "#111",
                  showocean: true,
                  oceancolor: "#0a0a0a",
                  showcountries: true,
                  countrycolor: "#1a1a1a",
                  projection: { type: "natural earth" as const },
                },
                margin: { t: 40, b: 10, l: 10, r: 10 },
              }}
              config={chartConfig}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
