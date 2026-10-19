import "server-only";

import sharp from "sharp";

const MAX_WIDTH = 2000;
const JPEG_QUALITY = 82;

/** Store product photos as smaller JPEGs. Pixel size stays the same unless the file is over 2000px wide. */
export async function compressStoredImage(bytes: Uint8Array, mime: string) {
  if (mime === "image/gif") {
    return { bytes: Buffer.from(bytes), mime, ext: "gif" };
  }

  const image = sharp(bytes, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const resized =
    (meta.width ?? 0) > MAX_WIDTH
      ? image.resize({ width: MAX_WIDTH, withoutEnlargement: true })
      : image;
  const compressed = await resized
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  if (mime === "image/jpeg" && compressed.length >= bytes.byteLength) {
    return { bytes: Buffer.from(bytes), mime: "image/jpeg", ext: "jpg" };
  }

  return { bytes: compressed, mime: "image/jpeg", ext: "jpg" };
}
