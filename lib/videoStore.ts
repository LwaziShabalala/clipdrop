import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "videos.json");

export interface VideoRecord {
  videoId: string;
  title: string;
  videoUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  duration: number;
  createdAt: string;
}

async function readDb(): Promise<VideoRecord[]> {
  try {
    const raw = await readFile(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeDb(records: VideoRecord[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(records, null, 2));
}

export async function saveVideo(record: VideoRecord) {
  const db = await readDb();
  db.unshift(record);
  await writeDb(db);
}

export async function getVideo(videoId: string): Promise<VideoRecord | null> {
  const db = await readDb();
  return db.find((v) => v.videoId === videoId) ?? null;
}

export async function listVideos(): Promise<VideoRecord[]> {
  return readDb();
}

export async function deleteVideo(videoId: string) {
  const db = await readDb();
  const filtered = db.filter((v) => v.videoId !== videoId);
  await writeDb(filtered);
}