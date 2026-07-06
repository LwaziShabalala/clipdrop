import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { auth, currentUser } from "@clerk/nextjs/server";
import { uploadToR2 } from "@/lib/r2";
import { saveVideo } from "@/lib/videoStore";

const execFileAsync = promisify(execFile);

// Use the OS temp dir — works on local dev and Railway (a real Linux box with
// ffmpeg). This app's API routes are NOT meant to run on Vercel, which has no
// ffmpeg and a read-only filesystem outside /tmp — see SETUP.md.
const UPLOAD_DIR = path.join(os.tmpdir(), "clipdrop-uploads");

export async function POST(req: NextRequest) {
  try {
    // treatPendingAsSignedOut: false — same fix as proxy.ts. This route has
    // its own independent auth check (proxy.ts only controls whether the
    // /upload PAGE loads, not whether this API call succeeds), so it needed
    // the same fix applied here too.
    const { isAuthenticated } = await auth({ treatPendingAsSignedOut: false });
    if (!isAuthenticated) {
      return NextResponse.json({ error: "You need to be signed in to upload" }, { status: 401 });
    }

    const user = await currentUser();
    const uploaderName = user?.username ?? "Anonymous";
    const uploaderImageUrl = user?.imageUrl;

    const formData = await req.formData();
    const file = formData.get("video") as File | null;
    const titleInput = (formData.get("title") as string | null)?.trim();

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("video/")) {
      return NextResponse.json({ error: "File must be a video" }, { status: 400 });
    }

    const MAX_SIZE = 500 * 1024 * 1024; // 500MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Video too large (max 500MB)" }, { status: 400 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const id = randomUUID();
    const ext = path.extname(file.name) || ".mp4";
    const filename = `${id}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, bytes);

    // Probe video duration + dimensions with ffprobe
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height,duration",
      "-show_entries", "format=duration",
      "-of", "json",
      filepath,
    ]);

    const probe = JSON.parse(stdout);
    const stream = probe.streams?.[0] ?? {};
    const duration = parseFloat(probe.format?.duration ?? stream.duration ?? "0");
    const width = stream.width ?? 0;
    const height = stream.height ?? 0;

    if (!duration || duration <= 0) {
      return NextResponse.json({ error: "Could not read video duration" }, { status: 400 });
    }

    // Grab a poster frame for the watch page / gallery thumbnail
    const thumbPath = path.join(UPLOAD_DIR, `${id}.jpg`);
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", filepath,
      "-ss", String(Math.min(1, duration / 2)),
      "-frames:v", "1",
      "-q:v", "2",
      thumbPath,
    ]);
    const thumbBuf = await readFile(thumbPath);

    // Persist the full video + poster to R2 so it's actually watchable — the
    // local copy in UPLOAD_DIR is ephemeral (os.tmpdir()) and not something
    // any other request or a later visit can rely on still being there.
    const videoId = randomUUID();
    const title =
      titleInput || path.basename(file.name, path.extname(file.name)).trim() || "Untitled video";

    const [videoUrl, thumbUrl] = await Promise.all([
      uploadToR2(`videos/${videoId}${ext}`, bytes, file.type || "video/mp4"),
      uploadToR2(`videos/${videoId}.jpg`, thumbBuf, "image/jpeg"),
    ]);

    await saveVideo({
      videoId,
      title,
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

    return NextResponse.json({
      videoId,
      duration,
      width,
      height,
      previewUrl: videoUrl,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}