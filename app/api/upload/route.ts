import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "fs/promises";
import { createReadStream } from "fs";
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
  const reqId = randomUUID().slice(0, 8);
  console.time(`[${reqId}] TOTAL`);

  try {
    console.time(`[${reqId}] 1-auth-check`);
    const { isAuthenticated } = await auth({ treatPendingAsSignedOut: false });
    console.timeEnd(`[${reqId}] 1-auth-check`);
    if (!isAuthenticated) {
      return NextResponse.json({ error: "You need to be signed in to upload" }, { status: 401 });
    }

    console.time(`[${reqId}] 2-current-user`);
    const user = await currentUser();
    console.timeEnd(`[${reqId}] 2-current-user`);
    const uploaderName = user?.username ?? "Anonymous";
    const uploaderImageUrl = user?.imageUrl;

    console.time(`[${reqId}] 3-parse-formdata`);
    const formData = await req.formData();
    const file = formData.get("video") as File | null;
    const titleInput = (formData.get("title") as string | null)?.trim();
    console.timeEnd(`[${reqId}] 3-parse-formdata`);

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }
    console.log(`[${reqId}] file size: ${(file.size / 1024 / 1024).toFixed(1)}MB`);

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

    console.time(`[${reqId}] 4-write-local-file`);
    // This block is the only place the full file sits in memory at once —
    // as soon as it's written to disk, nothing below holds onto `bytes`
    // anymore, so it's free to be garbage collected instead of staying
    // alive through ffprobe/ffmpeg/upload like it did before.
    {
      const bytes = Buffer.from(await file.arrayBuffer());
      await writeFile(filepath, bytes);
    }
    console.timeEnd(`[${reqId}] 4-write-local-file`);

    const videoId = randomUUID();
    const title = titleInput || path.basename(file.name, path.extname(file.name)).trim() || "Untitled video";

    // Streams straight from the file already on disk instead of reusing an
    // in-memory buffer — keeps peak memory lower, especially noticeable
    // when several uploads happen back-to-back in a bulk batch.
    console.time(`[${reqId}] 5-r2-video-upload`);
    const videoUploadPromise = uploadToR2(
      `videos/${videoId}${ext}`,
      createReadStream(filepath),
      file.type || "video/mp4"
    ).then((url) => {
      console.timeEnd(`[${reqId}] 5-r2-video-upload`);
      return url;
    });

    console.time(`[${reqId}] 6-ffprobe`);
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height,duration",
      "-show_entries", "format=duration",
      "-of", "json",
      filepath,
    ]);
    console.timeEnd(`[${reqId}] 6-ffprobe`);

    const probe = JSON.parse(stdout);
    const stream = probe.streams?.[0] ?? {};
    const duration = parseFloat(probe.format?.duration ?? stream.duration ?? "0");
    const width = stream.width ?? 0;
    const height = stream.height ?? 0;

    if (!duration || duration <= 0) {
      return NextResponse.json({ error: "Could not read video duration" }, { status: 400 });
    }

    console.time(`[${reqId}] 7-thumbnail-generate`);
    const thumbPath = path.join(UPLOAD_DIR, `${id}.jpg`);
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", filepath,
      "-ss", String(Math.min(1, duration / 2)),
      "-frames:v", "1",
      "-q:v", "2",
      thumbPath,
    ]);
    console.timeEnd(`[${reqId}] 7-thumbnail-generate`);

    const thumbBuf = await readFile(thumbPath);

    console.time(`[${reqId}] 8-r2-thumb-upload`);
    const thumbUploadPromise = uploadToR2(`videos/${videoId}.jpg`, thumbBuf, "image/jpeg")
      .then((url) => {
        console.timeEnd(`[${reqId}] 8-r2-thumb-upload`);
        return url;
      });

    console.time(`[${reqId}] 9-wait-both-uploads`);
    const [videoUrl, thumbUrl] = await Promise.all([videoUploadPromise, thumbUploadPromise]);
    console.timeEnd(`[${reqId}] 9-wait-both-uploads`);

    console.time(`[${reqId}] 10-db-save`);
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
    console.timeEnd(`[${reqId}] 10-db-save`);

    console.timeEnd(`[${reqId}] TOTAL`);

    return NextResponse.json({
      videoId,
      duration,
      width,
      height,
      previewUrl: videoUrl,
    });
  } catch (err) {
    console.timeEnd(`[${reqId}] TOTAL`);
    console.error(`[${reqId}] Upload error:`, err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}