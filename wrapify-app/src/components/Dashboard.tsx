"use client";

import { useMemo, useState } from "react";
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
              z: countriesAll.map((c) => c.count),
              text: countriesAll.map(
                (c) => `${c.name}: ${c.count.toLocaleString()} streams`
              ),
              hoverinfo: "text" as const,
              colorscale: [[0, "#09090b"], [0.3, "#166534"], [1, "#1ed760"]],
              colorbar: {
                title: { text: "Streams", font: { color: "#a1a1aa" } },
                tickfont: { color: "#a1a1aa" },
              },
              marker: { line: { color: "#27272a", width: 0.5 } },
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
