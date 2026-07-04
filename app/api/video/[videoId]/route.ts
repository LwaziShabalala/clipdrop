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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;

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