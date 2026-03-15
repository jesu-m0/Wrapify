import { SpotifyStreamRaw, SpotifyStream } from "@/types/spotify";

export function processRawStreams(rawStreams: SpotifyStreamRaw[]): SpotifyStream[] {
  return rawStreams
    .filter((s) => s.master_metadata_track_name !== null)
    .map((s) => {
      const dt = new Date(s.ts);
      return {
        ...s,
        date: s.ts.slice(0, 10),
        year: dt.getUTCFullYear(),
        month: dt.getUTCMonth() + 1,
        day: dt.getUTCDate(),
        hour: dt.getUTCHours(),
        weekday: dt.getUTCDay(),
        minutes_played: Math.round(s.ms_played / 60000 * 100) / 100,
      };
    });
}
