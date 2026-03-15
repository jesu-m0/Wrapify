"use client";

import { useState } from "react";
import { SpotifyStream } from "@/types/spotify";
import UploadPage from "@/components/UploadPage";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const [data, setData] = useState<SpotifyStream[] | null>(null);

  if (!data) {
    return <UploadPage onDataLoaded={setData} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-100">Wrapify</h1>
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
