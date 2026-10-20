import exifr from "exifr";
import sharp from "sharp";
import { PHOTO_EXIF_FIELDS, selectPhotoExif } from "../../src/lib/photo-exif.mjs";

// exifr does not read WebP containers. Sharp exposes the EXIF block for all
// supported input formats; skip its six-byte EXIF header to parse TIFF data.
export async function readExifTags(buffer, options = {}) {
  const { exif } = await sharp(buffer).metadata();
  if (!exif) return undefined;
  const tiff = exif.subarray(0, 6).equals(Buffer.from("Exif\0\0")) ? exif.subarray(6) : exif;
  return exifr.parse(tiff, { reviveValues: false, ...options });
}

export async function readPhotoExif(buffer, stamp) {
  const raw = await readExifTags(buffer, { pick: Object.values(PHOTO_EXIF_FIELDS) });
  return selectPhotoExif(raw || {}, stamp);
}

export function writablePhotoExif(exif = {}) {
  const IFD0 = {};
  const IFD2 = {};
  for (const [key, tag] of [["make", "Make"], ["model", "Model"]]) if (exif[key]) IFD0[tag] = exif[key];
  for (const [key, tag] of [["lensMake", "LensMake"], ["lensModel", "LensModel"], ["dateTimeOriginal", "DateTimeOriginal"]]) if (exif[key]) IFD2[tag] = exif[key];
  for (const [key, tag] of [["aperture", "FNumber"], ["exposureTime", "ExposureTime"], ["focalLength", "FocalLength"]]) {
    if (exif[key]) IFD2[tag] = `${Math.round(exif[key] * 1000000)}/1000000`;
  }
  if (exif.iso) IFD2.ISOSpeedRatings = String(Math.round(exif.iso));
  if (exif.focalLength35mm) IFD2.FocalLengthIn35mmFilm = String(Math.round(exif.focalLength35mm));
  return Object.keys(IFD0).length || Object.keys(IFD2).length ? { IFD0, IFD2 } : null;
}

// libvips emits these structural fields when constructing a fresh EXIF block.
const PUBLISHED_TAGS = new Set([
  ...Object.values(PHOTO_EXIF_FIELDS), "DateTimeOriginal", "ExifVersion",
  "ComponentsConfiguration", "FlashpixVersion", "ColorSpace", "ExifImageWidth",
  "ExifImageHeight", "PixelXDimension", "PixelYDimension", "XResolution",
  "YResolution", "ResolutionUnit", "YCbCrPositioning", "Orientation",
]);

export async function assertPublishedExif(buffer) {
  const tags = await readExifTags(buffer);
  for (const key of Object.keys(tags || {})) {
    if (!PUBLISHED_TAGS.has(key)) throw new Error(`Unexpected EXIF field in published image: ${key}`);
  }
  if (tags?.Orientation !== undefined && ![1, "Horizontal (normal)"].includes(tags.Orientation)) throw new Error("Published image contains stale EXIF rotation");
}
