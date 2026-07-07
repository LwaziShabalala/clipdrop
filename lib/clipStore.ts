import { prisma } from "./prisma";

export interface ClipRecord {
  clipId: string;
  caption: string;
  mp4Url: string;
  gifUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  createdAt: string;
}

type ClipRow = {
  clipId: string;
  caption: string;
  mp4Url: string;
  gifUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  createdAt: Date;
};

function toClipRecord(row: ClipRow): ClipRecord {
  return {
    clipId: row.clipId,
    caption: row.caption,
    mp4Url: row.mp4Url,
    gifUrl: row.gifUrl,
    thumbUrl: row.thumbUrl,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function saveClip(record: ClipRecord) {
  await prisma.clip.create({
    data: {
      clipId: record.clipId,
      caption: record.caption,
      mp4Url: record.mp4Url,
      gifUrl: record.gifUrl,
      thumbUrl: record.thumbUrl,
      width: record.width,
      height: record.height,
      createdAt: new Date(record.createdAt),
    },
  });
}

export async function getClip(clipId: string): Promise<ClipRecord | null> {
  const row = await prisma.clip.findUnique({ where: { clipId } });
  return row ? toClipRecord(row) : null;
}

export async function listClips(): Promise<ClipRecord[]> {
  const rows = await prisma.clip.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toClipRecord);
}