import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
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

  const { isAuthenticated } = await auth({ treatPendingAsSignedOut: false });
  if (!isAuthenticated) {
    return NextResponse.json({ error: "You need to be signed in to delete a video" }, { status: 401 });
  }

  const video = await getVideo(videoId);
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // The actual ownership check — only the person who uploaded this video
  // (matched by username) can delete it. Being signed in isn't enough on
  // its own; it has to be signed in as *this* video's uploader.
  const user = await currentUser();
  if (!user?.username || user.username !== video.uploaderName) {
    return NextResponse.json({ error: "You can only delete your own videos" }, { status: 403 });
  }

  await Promise.all([
    deleteFromR2(video.videoUrl.replace(`${R2_PUBLIC_URL}/`, "")),
    deleteFromR2(video.thumbUrl.replace(`${R2_PUBLIC_URL}/`, "")),
  ]);

  await deleteVideo(videoId);

  return NextResponse.json({ success: true });
}