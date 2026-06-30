import { NextRequest, NextResponse } from "next/server";
import { mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const CLIPS_DIR = path.join(process.cwd(), "public", "clips");
const WATERMARK_PATH = path.join(process.cwd(), "public", "logo", "watermark.png");

const MAX_CLIP_SECONDS = 15;

function safeName(name: string) {
  return path.basename(name);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, start, end, caption } = body as {
      filename: string;
      start: number;
      end: number;
      caption?: string;
    };

    if (!filename || start == null || end == null) {
      return NextResponse.json({ error: "Missing filename, start, or end" }, { status: 400 });
    }

    const startTime = parseFloat(String(start));
    const endTime = parseFloat(String(end));
    const duration = endTime - startTime;

    if (isNaN(startTime) || isNaN(endTime) || duration <= 0) {
      return NextResponse.json({ error: "Invalid start/end range" }, { status: 400 });
    }

    if (duration > MAX_CLIP_SECONDS) {
      return NextResponse.json(
        { error: `Clip too long. Max ${MAX_CLIP_SECONDS} seconds.` },
        { status: 400 }
      );
    }

    const sourcePath = path.join(UPLOAD_DIR, safeName(filename));
    await mkdir(CLIPS_DIR, { recursive: true });

    const clipId = randomUUID();
    const mp4Out = path.join(CLIPS_DIR, `${clipId}.mp4`);
    const gifOut = path.join(CLIPS_DIR, `${clipId}.gif`);
    const thumbOut = path.join(CLIPS_DIR, `${clipId}.jpg`);
    const paletteOut = path.join(CLIPS_DIR, `${clipId}_palette.png`);

    // Watermark position: bottom-right, with small margin. Overlay scaled relative to clip width.
    const watermarkFilter =
      "[1:v]scale=iw*0.38:-1[wm];[0:v][wm]overlay=W-w-20:H-h-20:format=auto";

    // 1) Trimmed + watermarked MP4 (this is what plays on the gallery page)
    await execFileAsync("ffmpeg", [
      "-y",
      "-ss", String(startTime),
      "-i", sourcePath,
      "-i", WATERMARK_PATH,
      "-t", String(duration),
      "-filter_complex", watermarkFilter,
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      mp4Out,
    ]);

    // 2) Watermarked GIF (this is what shows as the Reddit link preview)
    //    Two-pass palette approach: larger palette + diff-weighted stats + Floyd-Steinberg
    //    dithering to avoid the banding/graininess a naive palette produces.
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", mp4Out,
      "-vf", "fps=18,scale=640:-1:flags=lanczos,palettegen=max_colors=256:stats_mode=diff",
      paletteOut,
    ]);

    await execFileAsync("ffmpeg", [
      "-y",
      "-i", mp4Out,
      "-i", paletteOut,
      "-lavfi", "fps=18,scale=640:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=floyd_steinberg",
      "-loop", "0",
      gifOut,
    ]);

    // 3) Watermarked static thumbnail (first frame) for og:image fallback / card thumbnail
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", mp4Out,
      "-frames:v", "1",
      "-q:v", "2",
      thumbOut,
    ]);

    // Check GIF size; if too large for Reddit-friendly preview, downscale further
    const fs = await import("fs/promises");
    const gifStat = await fs.stat(gifOut);
    const MAX_GIF_BYTES = 15 * 1024 * 1024; // 15MB safety ceiling

    if (gifStat.size > MAX_GIF_BYTES) {
      await execFileAsync("ffmpeg", [
        "-y",
        "-i", mp4Out,
        "-vf", "fps=14,scale=480:-1:flags=lanczos,palettegen=max_colors=256:stats_mode=diff",
        paletteOut,
      ]);
      await execFileAsync("ffmpeg", [
        "-y",
        "-i", mp4Out,
        "-i", paletteOut,
        "-lavfi", "fps=14,scale=480:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=floyd_steinberg",
        "-loop", "0",
        gifOut,
      ]);
    }

    await fs.unlink(paletteOut).catch(() => {});

    // Get final dimensions for OG tags
    const { stdout: probeOut } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "json",
      mp4Out,
    ]);
    const probe = JSON.parse(probeOut);
    const width = probe.streams?.[0]?.width ?? 480;
    const height = probe.streams?.[0]?.height ?? 270;

    const { saveClip } = await import("@/lib/clipStore");
    await saveClip({
      clipId,
      caption: caption ?? "",
      mp4Url: `/clips/${clipId}.mp4`,
      gifUrl: `/clips/${clipId}.gif`,
      thumbUrl: `/clips/${clipId}.jpg`,
      width,
      height,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      clipId,
      mp4Url: `/clips/${clipId}.mp4`,
      gifUrl: `/clips/${clipId}.gif`,
      thumbUrl: `/clips/${clipId}.jpg`,
      pageUrl: `/c/${clipId}`,
      caption: caption ?? "",
    });
  } catch (err) {
    console.error("Clip generation error:", err);
    return NextResponse.json({ error: "Clip generation failed" }, { status: 500 });
  }
}