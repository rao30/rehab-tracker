import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

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

export async function savePhotoFile(buffer: Buffer, originalName: string) {
  await ensureUploadDir();
  const ext = path.extname(originalName) || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, "photos", filename);
  await writeFile(filepath, buffer);
  return filename;
}

export function getUploadPath(type: "contracts" | "photos", filename: string) {
  return path.join(UPLOAD_DIR, type, filename);
}
