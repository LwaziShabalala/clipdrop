import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, unlink } from "fs/promises";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { currentUser } from "@clerk/nextjs/server";
import { uploadToR2, r2PublicUrl } from "@/lib/r2";
import { saveVideo } from "@/lib/videoStore";

const execFileAsync = promisify(execFile);
const WORK_DIR = path.join(os.tmpdir(), "clipdrop-uploads");

export async function POST(req: NextRequest) {
  const reqId = randomUUID();
  let filepath = "";
  let thumbPath = "";

  try {
    const providedSecret = req.headers.get("x-upload-secret");
    const isAuthorized = Boolean(providedSecret) && providedSecret === process.env.UPLOAD_SECRET;
    if (!isAuthorized) {
      return NextResponse.json({ error: "You need to be signed in to upload" }, { status: 401 });
    }

    // Best-effort only — used purely for display name/photo, never as the
    // access check (that's the passcode above). If Clerk's session happens
    // to be valid too, great, use it; if not, fall back gracefully.
    let uploaderName = "Anonymous";
    let uploaderImageUrl: string | undefined;
    try {
      const user = await currentUser();
      uploaderName = user?.username ?? "Anonymous";
      uploaderImageUrl = user?.imageUrl;
    } catch (err) {
      console.log(`[${reqId}] currentUser() failed, continuing as Anonymous:`, err);
    }

    const body = await req.json();
    const { videoId, key, hashtags } = body as {
      videoId?: string;
      key?: string;
      hashtags?: string[];
    };

    if (!videoId || !key) {
      return NextResponse.json({ error: "Missing videoId or key" }, { status: 400 });
    }

    const videoUrl = r2PublicUrl(key);

    await mkdir(WORK_DIR, { recursive: true });
    filepath = path.join(WORK_DIR, `${videoId}${path.extname(key)}`);

    console.time(`[${reqId}] download-from-r2`);
    const res = await fetch(videoUrl);
    if (!res.ok || !res.body) {
      throw new Error(`Failed to fetch uploaded file (${res.status})`);
    }
    await pipeline(Readable.fromWeb(res.body as any), createWriteStream(filepath));
    console.timeEnd(`[${reqId}] download-from-r2`);

    console.time(`[${reqId}] ffprobe`);
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height,duration",
      "-show_entries", "format=duration",
      "-of", "json",
      filepath,
    ]);
    console.timeEnd(`[${reqId}] ffprobe`);

    const probe = JSON.parse(stdout);
    const stream = probe.streams?.[0] ?? {};
    const duration = parseFloat(probe.format?.duration ?? stream.duration ?? "0");
    const width = stream.width ?? 0;
    const height = stream.height ?? 0;

    if (!duration || duration <= 0) {
      return NextResponse.json({ error: "Could not read video duration" }, { status: 400 });
    }

    console.time(`[${reqId}] thumbnail`);
    thumbPath = path.join(WORK_DIR, `${videoId}.jpg`);
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", filepath,
      "-ss", String(Math.min(1, duration / 2)),
      "-frames:v", "1",
      "-q:v", "2",
      thumbPath,
    ]);
    console.timeEnd(`[${reqId}] thumbnail`);

    const thumbBuf = await readFile(thumbPath);
    const thumbUrl = await uploadToR2(`videos/${videoId}.jpg`, thumbBuf, "image/jpeg");

    const tags = Array.isArray(hashtags) ? hashtags.filter(Boolean) : [];
    const title = tags.length > 0 ? tags.map((t) => `#${t}`).join(" ") : "Untitled video";

    await saveVideo({
      videoId,
      title,
      hashtags: tags,
      videoUrl,
      thumbUrl,
      width,
      height,
      duration,
      views: 0,
      uploaderName,
      uploaderImageUrl,
      createdAt: new Date().toISOString(),
    });

    await Promise.all([
      unlink(filepath).catch(() => {}),
      unlink(thumbPath).catch(() => {}),
    ]);

    return NextResponse.json({ videoId, duration, width, height, previewUrl: videoUrl });
  } catch (err) {
    console.error(`[${reqId}] Finalize error:`, err);
    await Promise.all(
      [filepath, thumbPath].filter(Boolean).map((f) => unlink(f).catch(() => {}))
    );
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}