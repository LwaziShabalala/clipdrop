import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getVideo, incrementViews } from "@/lib/videoStore";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;

  const video = await getVideo(videoId);
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // Don't count the uploader watching their own video. This one check
  // covers both the feed and the watch page, since they both call this
  // same endpoint.
  const viewer = await currentUser();
  const isOwner = viewer !== null && viewer.username === video.uploaderName;
  if (isOwner) {
    return NextResponse.json({ views: video.views, counted: false });
  }

  const views = await incrementViews(videoId);
  return NextResponse.json({ views, counted: true });
}