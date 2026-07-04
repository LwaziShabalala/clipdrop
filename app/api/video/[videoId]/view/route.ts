import { NextRequest, NextResponse } from "next/server";
import { incrementViews } from "@/lib/videoStore";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;
  const views = await incrementViews(videoId);
  return NextResponse.json({ views });
}