import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const dir = path.resolve(
    process.cwd(),
    "..",
    "Spotify_stats",
    "Spotify_Extended_Streaming_History"
  );

  if (!fs.existsSync(dir)) {
    return NextResponse.json(
      { error: "Dev data folder not found" },
      { status: 404 }
    );
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("Streaming_History_Audio_") && f.endsWith(".json"));

  const allStreams = files.flatMap((f) => {
    const content = fs.readFileSync(path.join(dir, f), "utf-8");
    return JSON.parse(content);
  });

  return NextResponse.json(allStreams);
}
