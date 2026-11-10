"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SpotifyStream } from "@/types/spotify";
import { Insights } from "@/lab/insights";

/*
 * The "time machine": one clock for the whole Studio. While a cursor is set,
 * every tab only sees the plays up to that month, so pressing play makes each
 * chart replay the history from the first month to the last.
 */

/** Milliseconds per month at 1×. */
const BASE_STEP_MS = 520;
const SPEEDS = [1, 2, 4];

export interface Timeline {
  /** every month of the selected range, "YYYY-MM" */
  months: string[];
  /** month on screen; null = time machine off (everything is visible) */
  cursor: number | null;
  playing: boolean;
  speed: number;
  /** time between two months while playing */
  stepMs: number;
  toggle: () => void;
  seek: (i: number) => void;
  cycleSpeed: () => void;
  exit: () => void;
}

export function useTimeline(months: string[]): Timeline {
  const [cursor, setCursor] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const last = months.length - 1;
  const stepMs = BASE_STEP_MS / speed;

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setCursor((c) => (c === null ? 0 : Math.min(last, c + 1))), stepMs);
    return () => clearInterval(t);
  }, [playing, stepMs, last]);

  // the song is over: stop on the last month (which shows everything)
  if (playing && cursor !== null && cursor >= last) setPlaying(false);

  const toggle = useCallback(() => {
    if (playing) return setPlaying(false);
    // from "off" or from the end, start over
    setCursor((c) => (c === null || c >= last ? 0 : c));
    setPlaying(true);
  }, [playing, last]);

  const seek = useCallback((i: number) => setCursor(Math.max(0, Math.min(last, Math.round(i)))), [last]);
  const cycleSpeed = useCallback(() => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]), []);
  const exit = useCallback(() => {
    setPlaying(false);
    setCursor(null);
  }, []);

  return useMemo(
    () => ({ months, cursor: cursor === null ? null : Math.min(cursor, last), playing, speed, stepMs, toggle, seek, cycleSpeed, exit }),
    [months, cursor, last, playing, speed, stepMs, toggle, seek, cycleSpeed, exit]
  );
}

/** For each month, how many plays (of a list sorted by ts) happened up to the end of it. */
export function monthEnds(sorted: SpotifyStream[], months: string[]): number[] {
  const ends = new Array<number>(months.length).fill(0);
  let m = 0;
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const ym = `${s.year}-${s.month < 10 ? "0" : ""}${s.month}`;
    while (m < months.length - 1 && months[m] < ym) m++;
    ends[m] = i + 1;
  }
  // months without plays inherit the previous count
  for (let i = 1; i < ends.length; i++) if (ends[i] < ends[i - 1]) ends[i] = ends[i - 1];
  return ends;
}

/** What every tab receives. */
export interface TabProps {
  /** insights of what is on screen (year filter + playback cursor) */
  ins: Insights;
  /** insights of the selected range ignoring the cursor: stable axes while playing */
  full: Insights;
  /** insights of the entire history: the reference to compare a year against */
  all: Insights;
  /** plays on screen, sorted by ts */
  data: SpotifyStream[];
  /** the selected range ignoring the cursor */
  base: SpotifyStream[];
  /** the entire history */
  history: SpotifyStream[];
  year: number | null;
  tl: Timeline;
  openArtist: (name: string) => void;
}
