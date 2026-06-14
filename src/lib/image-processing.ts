import sharp from "sharp";

/** Max edge length — enough for review, keeps files small */
const MAX_DIMENSION = 1600;

/** WebP quality balances size vs clarity for construction photos */
const WEBP_QUALITY = 75;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
]);

/** 15 MB raw upload cap before compression */
export const MAX_PHOTO_UPLOAD_BYTES = 15 * 1024 * 1024;

export const MAX_PHOTOS_PER_DRAW = 12;

export function isAllowedPhotoMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType.toLowerCase());
}

export interface OptimizedPhoto {
  buffer: Buffer;
  width: number;
  height: number;
  originalBytes: number;
  optimizedBytes: number;
}

/**
 * Resize, auto-orient, strip metadata, and encode as WebP.
 * Typical phone photos (3–8 MB) end up around 80–250 KB.
 */
export async function optimizePhoto(buffer: Buffer): Promise<OptimizedPhoto> {
  const originalBytes = buffer.length;

  const optimized = await sharp(buffer, { failOn: "none" })
    .rotate()
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: optimized.data,
    width: optimized.info.width,
    height: optimized.info.height,
    originalBytes,
    optimizedBytes: optimized.data.length,
  };
}
