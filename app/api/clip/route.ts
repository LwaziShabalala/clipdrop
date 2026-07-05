import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, unlink, stat, writeFile } from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { uploadToR2 } from "@/lib/r2";
import { getVideo } from "@/lib/videoStore";
import { saveClip } from "@/lib/clipStore";

const execFileAsync = promisify(execFile);

const WORK_DIR = path.join(os.tmpdir(), "clipdrop-work");
const WATERMARK_PATH = path.join(process.cwd(), "public", "logo", "watermark.png");

const MAX_CLIP_SECONDS = 15;

// Reddit only reliably rehosts + auto-plays a direct-linked GIF when it's
// comfortably under its ~20MB practical image cap.
const MAX_GIF_BYTES = 8 * 1024 * 1024; // 8MB hard ceiling

const GIF_TIERS = [
  { width: 640, fps: 12 },
  { width: 540, fps: 12 },
  { width: 480, fps: 10 },
  { width: 400, fps: 8 },
];

async function encodeGif(
  mp4Path: string,
  paletteOut: string,
  gifOut: string,
  width: number,
  fps: number
) {
  await execFileAsync("ffmpeg", [
    "-y",
    "-i", mp4Path,
    "-vf", `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen=max_colors=256:stats_mode=diff`,
    paletteOut,
  ]);
  await execFileAsync("ffmpeg", [
    "-y",
    "-i", mp4Path,
    "-i", paletteOut,
    "-lavfi", `fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=floyd_steinberg`,
    "-loop", "0",
    gifOut,
  ]);
}

export async function POST(req: NextRequest) {
  let sourcePath = "";
  let mp4Out = "";
  let gifOut = "";
  let thumbOut = "";
  let paletteOut = "";

  try {
    const body = await req.json();
    const { videoId, start, end, caption } = body as {
      videoId: string;
      start: number;
      end: number;
      caption?: string;
    };

    if (!videoId || start == null || end == null) {
      return NextResponse.json({ error: "Missing videoId, start, or end" }, { status: 400 });
    }

    const video = await getVideo(videoId);
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
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

    await mkdir(WORK_DIR, { recursive: true });

    const clipId = randomUUID();
    sourcePath = path.join(WORK_DIR, `${clipId}_source.mp4`);
    mp4Out = path.join(WORK_DIR, `${clipId}.mp4`);
    gifOut = path.join(WORK_DIR, `${clipId}.gif`);
    thumbOut = path.join(WORK_DIR, `${clipId}.jpg`);
    paletteOut = path.join(WORK_DIR, `${clipId}_palette.png`);

    // Download the source video locally before running ffmpeg on it.
    // Feeding ffmpeg the remote R2 URL directly can hang indefinitely — MP4s
    // that aren't "faststart" encoded (common for phone recordings and
    // Twitter-downloaded clips) store their index at the END of the file,
    // so ffmpeg has to fetch that over the network before it can decode
    // anything. That's what was getting the process killed after running
    // for a while producing zero frames.
    console.time(`[${clipId}] 1-download-source`);
    const sourceRes = await fetch(video.videoUrl);
    if (!sourceRes.ok) {
      throw new Error(`Failed to download source video (${sourceRes.status})`);
    }
    await writeFile(sourcePath, Buffer.from(await sourceRes.arrayBuffer()));
    console.timeEnd(`[${clipId}] 1-download-source`);

    // Video's real dimensions are already stored on its VideoRecord — no
    // need to re-probe. Trimming/watermarking don't change frame size.
    const width = video.width;
    const height = video.height;

    const watermarkWidth = Math.round(width * 0.22);
    const margin = Math.max(12, Math.round(width * 0.025));
    const watermarkFilter =
      `[1:v]scale=${watermarkWidth}:-1[wm];[0:v][wm]overlay=W-w-${margin}:H-h-${margin}:format=auto`;

    console.time(`[${clipId}] 2-trim-watermark`);
    await execFileAsync("ffmpeg", [
      "-y",
      "-ss", String(startTime),
      "-i", sourcePath,
      "-i", WATERMARK_PATH,
      "-t", String(duration),
      "-filter_complex", watermarkFilter,
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "20",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      mp4Out,
    ]);
    console.timeEnd(`[${clipId}] 2-trim-watermark`);

    // GIF: step down through quality tiers until the file is safely under
    // Reddit's practical size ceiling.
    console.time(`[${clipId}] 3-gif-encode`);
    let gifSize = Infinity;
    for (let i = 0; i < GIF_TIERS.length; i++) {
      const tier = GIF_TIERS[i];
      await encodeGif(mp4Out, paletteOut, gifOut, tier.width, tier.fps);
      gifSize = (await stat(gifOut)).size;
      console.log(
        `[${clipId}] tier ${i} (${tier.width}px@${tier.fps}fps): ${(gifSize / 1024 / 1024).toFixed(2)}MB`
      );
      if (gifSize <= MAX_GIF_BYTES) break;
    }
    console.timeEnd(`[${clipId}] 3-gif-encode`);

    console.time(`[${clipId}] 4-thumbnail`);
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", mp4Out,
      "-frames:v", "1",
      "-q:v", "2",
      thumbOut,
    ]);
    console.timeEnd(`[${clipId}] 4-thumbnail`);

    const [mp4Buf, gifBuf, thumbBuf] = await Promise.all([
      readFile(mp4Out),
      readFile(gifOut),
      readFile(thumbOut),
    ]);

    console.time(`[${clipId}] 5-r2-upload`);
    const [mp4Url, gifUrl, thumbUrl] = await Promise.all([
      uploadToR2(`clips/${clipId}.mp4`, mp4Buf, "video/mp4"),
      uploadToR2(`clips/${clipId}.gif`, gifBuf, "image/gif"),
      uploadToR2(`clips/${clipId}.jpg`, thumbBuf, "image/jpeg"),
    ]);
    console.timeEnd(`[${clipId}] 5-r2-upload`);

    // Clean up local work files, including the downloaded source
    await Promise.all([
      unlink(sourcePath).catch(() => {}),
      unlink(mp4Out).catch(() => {}),
      unlink(gifOut).catch(() => {}),
      unlink(thumbOut).catch(() => {}),
      unlink(paletteOut).catch(() => {}),
    ]);

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
    await Promise.all(
      [sourcePath, mp4Out, gifOut, thumbOut, paletteOut]
        .filter(Boolean)
        .map((f) => unlink(f).catch(() => {}))
    );
    return NextResponse.json({ error: "Clip generation failed" }, { status: 500 });
  }
}