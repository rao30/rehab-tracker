import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { optimizePhoto } from "./image-processing";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

export async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true });
  await mkdir(path.join(UPLOAD_DIR, "contracts"), { recursive: true });
  await mkdir(path.join(UPLOAD_DIR, "photos"), { recursive: true });
}

export async function saveContractFile(buffer: Buffer, originalName: string) {
  await ensureUploadDir();
  const ext = path.extname(originalName) || ".pdf";
  const filename = `${randomUUID()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, "contracts", filename);
  await writeFile(filepath, buffer);
  return filename;
}

export interface SavedPhoto {
  filename: string;
  originalBytes: number;
  optimizedBytes: number;
}

/** Compress to WebP, resize, and store. Returns storage stats for logging. */
export async function savePhotoFile(buffer: Buffer): Promise<SavedPhoto> {
  await ensureUploadDir();
  const optimized = await optimizePhoto(buffer);
  const filename = `${randomUUID()}.webp`;
  const filepath = path.join(UPLOAD_DIR, "photos", filename);
  await writeFile(filepath, optimized.buffer);
  return {
    filename,
    originalBytes: optimized.originalBytes,
    optimizedBytes: optimized.optimizedBytes,
  };
}

export function getUploadPath(type: "contracts" | "photos", filename: string) {
  return path.join(UPLOAD_DIR, type, filename);
}
