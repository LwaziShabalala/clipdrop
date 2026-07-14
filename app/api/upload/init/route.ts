import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { getPresignedUploadUrl } from "@/lib/r2";

export async function POST(req: NextRequest) {
  const reqId = randomUUID().slice(0, 8);
  const cookieHeader = req.headers.get("cookie") ?? "";
  const hasClerkSessionCookie = cookieHeader.includes("__session");
  const hasClerkClientCookie = cookieHeader.includes("__client");
  console.log(
    `[init:${reqId}] cookie header length: ${cookieHeader.length}, has __session: ${hasClerkSessionCookie}, has __client: ${hasClerkClientCookie}`
  );

  const { isAuthenticated, userId } = await auth({ treatPendingAsSignedOut: false });
  console.log(`[init:${reqId}] isAuthenticated: ${isAuthenticated}, userId: ${userId}`);

  if (!isAuthenticated) {
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