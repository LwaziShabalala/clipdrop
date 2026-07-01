import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { uploadToR2 } from "@/lib/r2";

const execFileAsync = promisify(execFile);

const UPLOAD_DIR = path.join(os.tmpdir(), "clipdrop-uploads");
const WORK_DIR = path.join(os.tmpdir(), "clipdrop-work");
const WATERMARK_PATH = path.join(process.cwd(), "public", "logo", "watermark.png");

const MAX_CLIP_SECONDS = 15;

function safeName(name: string) {
  return path.basename(name);
}

export async function POST(req: NextRequest) {
  let mp4Out = "";
  let gifOut = "";
  let thumbOut = "";
  let paletteOut = "";

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
    await mkdir(WORK_DIR, { recursive: true });

    const clipId = randomUUID();
    mp4Out = path.join(WORK_DIR, `${clipId}.mp4`);
    gifOut = path.join(WORK_DIR, `${clipId}.gif`);
    thumbOut = path.join(WORK_DIR, `${clipId}.jpg`);
    paletteOut = path.join(WORK_DIR, `${clipId}_palette.png`);

    // Watermark position: bottom-right, with small margin. Overlay scaled relative to clip width.
    const watermarkFilter =
      "[1:v]scale=iw*0.28:-1[wm];[0:v][wm]overlay=16:16:format=auto";

    console.time(`[${clipId}] 1-trim-watermark`);
    // 1) Trimmed + watermarked MP4
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
    console.timeEnd(`[${clipId}] 1-trim-watermark`);

    console.time(`[${clipId}] 2-gif-palette`);
    // 2) Watermarked GIF — reduced fps/scale so Reddit animates it in the feed
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", mp4Out,
      "-vf", "fps=12,scale=480:-1:flags=lanczos,palettegen=max_colors=256:stats_mode=diff",
      paletteOut,
    ]);
    console.timeEnd(`[${clipId}] 2-gif-palette`);

    console.time(`[${clipId}] 3-gif-encode`);
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", mp4Out,
      "-i", paletteOut,
      "-lavfi", "fps=12,scale=480:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=floyd_steinberg",
      "-loop", "0",
      gifOut,
    ]);
    console.timeEnd(`[${clipId}] 3-gif-encode`);

    console.time(`[${clipId}] 4-thumbnail`);
    // 3) Watermarked static thumbnail
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", mp4Out,
      "-frames:v", "1",
      "-q:v", "2",
      thumbOut,
    ]);
    console.timeEnd(`[${clipId}] 4-thumbnail`);

    // Downscale if GIF too large
    const fs = await import("fs/promises");
    let gifStat = await fs.stat(gifOut);
    const MAX_GIF_BYTES = 15 * 1024 * 1024;
    console.log(`[${clipId}] GIF size: ${(gifStat.size / 1024 / 1024).toFixed(2)}MB`);

    if (gifStat.size > MAX_GIF_BYTES) {
      console.time(`[${clipId}] 5-gif-fallback-downscale`);
      await execFileAsync("ffmpeg", [
        "-y",
        "-i", mp4Out,
        "-vf", "fps=10,scale=360:-1:flags=lanczos,palettegen=max_colors=256:stats_mode=diff",
        paletteOut,
      ]);
      await execFileAsync("ffmpeg", [
        "-y",
        "-i", mp4Out,
        "-i", paletteOut,
        "-lavfi", "fps=10,scale=360:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=floyd_steinberg",
        "-loop", "0",
        gifOut,
      ]);
      gifStat = await fs.stat(gifOut);
      console.timeEnd(`[${clipId}] 5-gif-fallback-downscale`);
    }

    console.time(`[${clipId}] 6-probe`);
    // Get final dimensions for OG tags
    const { stdout: probeOut } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "json",
      mp4Out,
    ]);
    console.timeEnd(`[${clipId}] 6-probe`);
    const probe = JSON.parse(probeOut);
    const width = probe.streams?.[0]?.width ?? 480;
    const height = probe.streams?.[0]?.height ?? 270;

    console.time(`[${clipId}] 7-read-local-files`);
    // Upload all three outputs to R2
    const [mp4Buf, gifBuf, thumbBuf] = await Promise.all([
      readFile(mp4Out),
      readFile(gifOut),
      readFile(thumbOut),
    ]);
    console.timeEnd(`[${clipId}] 7-read-local-files`);
    console.log(`[${clipId}] mp4: ${(mp4Buf.length / 1024 / 1024).toFixed(2)}MB, gif: ${(gifBuf.length / 1024 / 1024).toFixed(2)}MB`);

    console.time(`[${clipId}] 8-r2-upload`);
    const [mp4Url, gifUrl, thumbUrl] = await Promise.all([
      uploadToR2(`clips/${clipId}.mp4`, mp4Buf, "video/mp4"),
      uploadToR2(`clips/${clipId}.gif`, gifBuf, "image/gif"),
      uploadToR2(`clips/${clipId}.jpg`, thumbBuf, "image/jpeg"),
    ]);
    console.timeEnd(`[${clipId}] 8-r2-upload`);

    // Clean up local work files
    await Promise.all([
      unlink(mp4Out).catch(() => {}),
      unlink(gifOut).catch(() => {}),
      unlink(thumbOut).catch(() => {}),
      unlink(paletteOut).catch(() => {}),
    ]);

    const { saveClip } = await import("@/lib/clipStore");
    await saveClip({
      clipId,
      caption: caption ?? "",
      mp4Url,
      gifUrl,
      thumbUrl,
      width,
      height,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      clipId,
      mp4Url,
      gifUrl,
      thumbUrl,
      pageUrl: `/c/${clipId}`,
      caption: caption ?? "",
    });
  } catch (err) {
    console.error("Clip generation error:", err);
    // Best-effort cleanup of any local files left behind on failure
    await Promise.all(
      [mp4Out, gifOut, thumbOut, paletteOut]
        .filter(Boolean)
        .map((f) => unlink(f).catch(() => {}))
    );
    return NextResponse.json({ error: "Clip generation failed" }, { status: 500 });
  }
}