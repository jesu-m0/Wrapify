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
    <div className="min-h-screen bg-zinc-950 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-zinc-100">Wrapify</h1>
            <span className="rounded-full bg-green-900/50 border border-green-700/40 px-3 py-1 text-sm font-medium text-green-300">
              {stats.period} · {periodYears} {periodYears === 1 ? "año" : "años"} de música
            </span>
          </div>
          <button
            onClick={() => setData(null)}
            className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
          >
            Cambiar datos
          </button>
        </div>
        <Dashboard data={data} />
      </div>
    </div>
  );
}
