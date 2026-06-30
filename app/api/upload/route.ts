import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("video") as File | null;

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

    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

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

    return NextResponse.json({
      id,
      filename,
      duration,
      width,
      height,
      previewUrl: `/api/source/${filename}`,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
