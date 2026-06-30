import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "clips.json");

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

async function readDb(): Promise<ClipRecord[]> {
  try {
    const raw = await readFile(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeDb(records: ClipRecord[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(records, null, 2));
}

export async function saveClip(record: ClipRecord) {
  const db = await readDb();
  db.unshift(record);
  await writeDb(db);
}

export async function getClip(clipId: string): Promise<ClipRecord | null> {
  const db = await readDb();
  return db.find((c) => c.clipId === clipId) ?? null;
}

export async function listClips(): Promise<ClipRecord[]> {
  return readDb();
}
