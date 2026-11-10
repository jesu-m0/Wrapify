"use client";

import { useEffect, useMemo, useState } from "react";
import { SpotifyStream } from "@/types/spotify";
import { AreaChart, BarList } from "@/lab/charts";
import { artistDetail, fmtDateLong, fmtInt, Insights, monthSeries } from "@/lab/insights";
import { cssVars, hueFor, HUES, Icon, Label, Sticker } from "./ui";

export default function ArtistDrawer({ data, ins, name, onClose }: { data: SpotifyStream[]; ins: Insights; name: string | null; onClose: () => void }) {
  // keep showing the last artist while the panel slides out
  const [shownName, setShownName] = useState<string | null>(name);
  if (name && name !== shownName) setShownName(name);

  const detail = useMemo(() => (shownName ? artistDetail(data, shownName) : null), [data, shownName]);
  const rank = shownName ? ins.allArtists.findIndex((a) => a.name === shownName) + 1 : 0;
  const open = name !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[#1e1728]/45 backdrop-blur-[3px] transition-opacity duration-500"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label={shownName ? `Ficha de ${shownName}` : "Ficha de artista"}
        aria-hidden={!open}
        className="lab-world fixed top-3 right-3 bottom-3 z-50 w-[min(480px,calc(100vw-1.5rem))] overflow-y-auto rounded-[36px] p-7 shadow-2xl transition-[transform,background-color] duration-500"
        style={{
          ...cssVars({ "--bg": HUES[hueFor(shownName ?? "")] }),
          transform: open ? "none" : "translateX(calc(100% + 2rem))",
          transitionTimingFunction: "cubic-bezier(0.2, 0.9, 0.25, 1)",
        }}
      >
        {detail && detail.plays > 0 && (
          <div key={detail.name}>
            <div className="flex items-start justify-between gap-4">
              <Sticker size={88}>
                <span className="block text-[10px] tracking-[0.18em] uppercase">Nº</span>
                <span className={`block ${rank > 999 ? "text-lg" : "text-2xl"}`}>{fmtInt(rank)}</span>
              </Sticker>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-transform duration-300 hover:scale-110 hover:rotate-90"
                style={{ background: "var(--ink)", color: "var(--g-bg)" }}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <h2 className="lab-pop mt-4 text-5xl leading-[0.95] font-extrabold tracking-[-0.035em] text-balance" style={{ animationDelay: "80ms" }}>
              {detail.name}
            </h2>
            <div className="lab-rise mt-6 grid grid-cols-3 gap-3" style={{ animationDelay: "140ms" }}>
              {[
                { l: "Reproducciones", v: fmtInt(detail.plays) },
                { l: "Horas", v: fmtInt(detail.hours) },
                { l: "Canciones", v: fmtInt(detail.songCount) },
              ].map((s) => (
                <div key={s.l} className="rounded-3xl p-4" style={{ background: "rgba(255,255,255,0.3)" }}>
                  <p className="text-2xl font-extrabold tracking-tight tabular-nums">{s.v}</p>
                  <p className="mt-0.5 text-xs font-semibold" style={{ color: "var(--muted)" }}>
                    {s.l}
                  </p>
                </div>
              ))}
            </div>
            <p className="lab-rise mt-5 text-sm leading-relaxed font-medium" style={{ animationDelay: "200ms", color: "var(--muted)" }}>
              Primera vez: <b className="font-bold" style={{ color: "var(--ink)" }}>{fmtDateLong(detail.first)}</b>
              <br />
              Última vez: <b className="font-bold" style={{ color: "var(--ink)" }}>{fmtDateLong(detail.last)}</b>
            </p>
            <div className="lab-rise mt-7" style={{ animationDelay: "260ms" }}>
              <Label>Reproducciones por mes</Label>
              <div className="mt-4">
                <AreaChart data={monthSeries(detail.monthly, (i) => detail.monthly[i].plays)} height={170} />
              </div>
            </div>
            <div className="lab-rise mt-7" style={{ animationDelay: "320ms" }}>
              <Label>Sus canciones que más escuchas</Label>
              <div className="mt-3 -mx-2">
                <BarList items={detail.songs.map((s) => ({ key: s.track, label: s.track, value: s.plays }))} />
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
