import { prisma } from "./prisma";

export interface VideoRecord {
  videoId: string;
  title: string;
  videoUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  duration: number;
  views: number;
  uploaderName?: string;
  uploaderImageUrl?: string;
  createdAt: string;
}

type VideoRow = {
  videoId: string;
  title: string;
  videoUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  duration: number;
  views: number;
  uploaderName: string | null;
  uploaderImageUrl: string | null;
  createdAt: Date;
};

function toVideoRecord(row: VideoRow): VideoRecord {
  return {
    videoId: row.videoId,
    title: row.title,
    videoUrl: row.videoUrl,
    thumbUrl: row.thumbUrl,
    width: row.width,
    height: row.height,
    duration: row.duration,
    views: row.views,
    uploaderName: row.uploaderName ?? undefined,
    uploaderImageUrl: row.uploaderImageUrl ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function saveVideo(record: VideoRecord) {
  await prisma.video.create({
    data: {
      videoId: record.videoId,
      title: record.title,
      videoUrl: record.videoUrl,
      thumbUrl: record.thumbUrl,
      width: record.width,
      height: record.height,
      duration: record.duration,
      views: record.views,
      uploaderName: record.uploaderName,
      uploaderImageUrl: record.uploaderImageUrl,
      createdAt: new Date(record.createdAt),
    },
  });
}

export async function getVideo(videoId: string): Promise<VideoRecord | null> {
  const row = await prisma.video.findUnique({ where: { videoId } });
  return row ? toVideoRecord(row) : null;
}

export async function listVideos(): Promise<VideoRecord[]> {
  const rows = await prisma.video.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toVideoRecord);
}

export async function getVideosByUploader(uploaderName: string): Promise<VideoRecord[]> {
  const rows = await prisma.video.findMany({
    where: { uploaderName },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toVideoRecord);
}

export async function deleteVideo(videoId: string) {
  await prisma.video.delete({ where: { videoId } }).catch(() => {});
}

export async function incrementViews(videoId: string): Promise<number> {
  const updated = await prisma.video
    .update({
      where: { videoId },
      data: { views: { increment: 1 } },
    })
    .catch(() => null);
  return updated?.views ?? 0;
}