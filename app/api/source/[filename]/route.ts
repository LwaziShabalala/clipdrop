import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import os from "os";

const UPLOAD_DIR = path.join(os.tmpdir(), "clipdrop-uploads");

function safeName(name: string) {
  return path.basename(name);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const safe = safeName(filename);
  const filepath = path.join(UPLOAD_DIR, safe);

  try {
    const fileStat = await stat(filepath);
    const data = await readFile(filepath);
    const ext = path.extname(safe).toLowerCase();
    const contentType =
      ext === ".mov" ? "video/quicktime" :
      ext === ".webm" ? "video/webm" :
      "video/mp4";

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStat.size.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}