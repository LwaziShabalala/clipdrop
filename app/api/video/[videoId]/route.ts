import { NextRequest, NextResponse } from "next/server";
import { getVideo, deleteVideo } from "@/lib/videoStore";
import { deleteFromR2, R2_PUBLIC_URL } from "@/lib/r2";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;
  const video = await getVideo(videoId);

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  return NextResponse.json(video);
}

// Stopgap auth: a shared passphrase, not real per-user ownership. Once
// accounts exist, swap this for "only the uploader (or the clipdrop admin
// account) can delete." Set DELETE_SECRET in .env.local to enable this.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;

  const body = await req.json().catch(() => ({ secret: "" }));
  const secret = body?.secret ?? "";

  if (!process.env.DELETE_SECRET || secret !== process.env.DELETE_SECRET) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const video = await getVideo(videoId);
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  await Promise.all([
    deleteFromR2(video.videoUrl.replace(`${R2_PUBLIC_URL}/`, "")),
    deleteFromR2(video.thumbUrl.replace(`${R2_PUBLIC_URL}/`, "")),
  ]);

  await deleteVideo(videoId);

  return NextResponse.json({ success: true });
}