"use client";

import { useMemo, useState } from "react";
import { SpotifyStream } from "@/types/spotify";
import UploadPage from "@/components/UploadPage";
import Dashboard from "@/components/Dashboard";
import { summaryStats } from "@/lib/stats";

export default function Home() {
  const [data, setData] = useState<SpotifyStream[] | null>(null);

  const stats = useMemo(() => (data ? summaryStats(data) : null), [data]);
  const periodYears = useMemo(() => {
    if (!stats) return 0;
    const [minStr, maxStr] = stats.period.split(" - ");
    return Math.max(1, Number(maxStr) - Number(minStr));
  }, [stats]);

  if (!data || !stats) {
    return <UploadPage onDataLoaded={setData} />;
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
        <Dashboard data={data} />
      </div>
    </div>
  );
}
