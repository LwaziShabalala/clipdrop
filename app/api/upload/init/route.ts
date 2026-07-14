import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getPresignedUploadUrl } from "@/lib/r2";

export async function POST(req: NextRequest) {
  const reqId = randomUUID().slice(0, 8);
  const providedSecret = req.headers.get("x-upload-secret");
  const isAuthorized = Boolean(providedSecret) && providedSecret === process.env.UPLOAD_SECRET;
  console.log(`[init:${reqId}] isAuthorized: ${isAuthorized}`);

  if (!isAuthorized) {
    return NextResponse.json({ error: "You need to be signed in to upload" }, { status: 401 });
  }

  const body = await req.json();
  const { filename, contentType, size } = body as {
    filename?: string;
    contentType?: string;
    size?: number;
  };

  if (!contentType || !contentType.startsWith("video/")) {
    return NextResponse.json({ error: "File must be a video" }, { status: 400 });
  }

  const MAX_SIZE = 500 * 1024 * 1024; // 500MB
  if (typeof size === "number" && size > MAX_SIZE) {
    return NextResponse.json({ error: "Video too large (max 500MB)" }, { status: 400 });
  }

  const videoId = randomUUID();
  const ext = filename && filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : ".mp4";
  const key = `videos/${videoId}${ext}`;

  const uploadUrl = await getPresignedUploadUrl(key, contentType);

  return NextResponse.json({ videoId, uploadUrl, key });
}