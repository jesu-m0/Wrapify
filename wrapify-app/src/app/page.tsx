"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { SpotifyStream } from "@/types/spotify";
import UploadPage from "@/components/UploadPage";
import Dashboard from "@/components/Dashboard";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import DateRangeSlider from "@/components/DateRangeSlider";
import { summaryStats, generateMonthRange } from "@/lib/stats";

export default function Home() {
  const [data, setData] = useState<SpotifyStream[] | null>(null);
  const [range, setRange] = useState<[number, number] | null>(null);
  const [isPending, startTransition] = useTransition();

  // All months in the full dataset
  const allMonths = useMemo(() => (data ? generateMonthRange(data) : []), [data]);

  // Applied range (default = full dataset)
  const appliedRange: [number, number] = range ?? [0, Math.max(0, allMonths.length - 1)];

  // Filtered data based on the applied month range
  const filteredData = useMemo(() => {
    if (!data || allMonths.length === 0) return data;
    const [lo, hi] = appliedRange;
    if (lo === 0 && hi === allMonths.length - 1) return data;
    const startMonth = allMonths[lo]; // "YYYY-MM"
    const endMonth = allMonths[hi];
    return data.filter((s) => {
      const ym = `${s.year}-${String(s.month).padStart(2, "0")}`;
      return ym >= startMonth && ym <= endMonth;
    });
  }, [data, allMonths, appliedRange]);

  const stats = useMemo(() => (filteredData ? summaryStats(filteredData) : null), [filteredData]);
  const periodYears = useMemo(() => {
    if (!stats) return 0;
    const [minStr, maxStr] = stats.period.split(" - ");
    return Math.max(1, Number(maxStr) - Number(minStr));
  }, [stats]);

  // Initialize range when data is loaded
  const handleDataLoaded = useCallback(
    (d: SpotifyStream[]) => {
      setData(d);
      setRange(null); // will default to full range
    },
    []
  );

  const handleRangeApply = useCallback(
    (newRange: [number, number]) => {
      startTransition(() => {
        setRange(newRange);
      });
    },
    []
  );

  if (!data || !stats || !filteredData) {
    return <UploadPage onDataLoaded={handleDataLoaded} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-5">
      <div className="mx-auto max-w-[1800px]">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Wrapify</h1>
            <span className="rounded-full bg-green-950/60 border border-green-800/30 px-3 py-0.5 text-xs font-medium text-green-400/80">
              {stats.period} · {periodYears} {periodYears === 1 ? "año" : "años"} de música
            </span>
          </div>
          <button
            onClick={() => setData(null)}
            className="rounded-lg bg-zinc-800/60 border border-zinc-700/40 px-4 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-zinc-200"
          >
            Cambiar datos
          </button>
        </div>

        {/* Date range slider */}
        <div className="mb-5">
          <DateRangeSlider
            months={allMonths}
            appliedRange={appliedRange}
            onApply={handleRangeApply}
            loading={isPending}
          />
        </div>

        {/* Dashboard or skeleton */}
        {isPending ? <DashboardSkeleton /> : <Dashboard data={filteredData} />}
      </div>
    </div>
  );
}
