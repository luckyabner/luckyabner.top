import { readFile, writeFile, rename, mkdir, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { assertPublishedExif } from "./photo-exif.mjs";
import { PHOTO_EXIF_FIELDS } from "../../src/lib/photo-exif.mjs";

export const CATALOG_PATH = "src/data/photos.json";
export const META_PATH = "src/data/photos.meta.json";
export const IMAGE_PATH = /^\/photos\/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_\d{4,}-[a-f0-9]{8}-(?:thumb|large)\.webp$/;
const LEGACY_IMAGE_PATH = /^\/photos\/[a-f0-9]{16}-[a-f0-9]{16}-(?:w\d+|large)\.webp$/;

export function hasCurrentPhotoFiles(photo) {
  return photo.thumbnails.length === 1 && IMAGE_PATH.test(photo.large.src);
}

export async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

export async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT" && fallback !== undefined) return fallback;
    throw new Error(`Cannot read ${path}: ${error.message}`, { cause: error });
  }
}

export async function writeJsonIfChanged(path, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  if (await exists(path) && await readFile(path, "utf8") === content) return false;
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, content);
  await rename(temporary, path);
  return true;
}

export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false;
  const date = new Date(value);
  if (!Number.isFinite(+date)) return false;
  const day = value.slice(0, 10);
  return new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day;
}

export function validateOverrides(overrides) {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    throw new Error("Photo metadata must be an object keyed by the relative export filename.");
  }
  for (const [source, values] of Object.entries(overrides)) {
    if (!values || typeof values !== "object" || Array.isArray(values)) throw new Error(`Invalid metadata for ${source}`);
    for (const key of Object.keys(values)) {
      if (!["title", "description", "date", "published"].includes(key)) throw new Error(`Unknown photo metadata field: ${source}.${key}`);
    }
    for (const key of ["title", "description"]) {
      if (values[key] !== undefined && typeof values[key] !== "string") throw new Error(`${source}.${key} must be text`);
    }
    if (values.published !== undefined && typeof values.published !== "boolean") throw new Error(`${source}.published must be true or false`);
    if (values.date !== undefined && !validDate(values.date)) throw new Error(`${source}.date must be a valid ISO date (YYYY-MM-DD or a timestamp with timezone)`);
  }
}

export function applyMetadata(photo, overrides) {
  const meta = overrides[photo.source] ?? {};
  const takenAt = meta.date ? new Date(meta.date).toISOString() : photo.capturedAt || photo.importedAt;
  return {
    ...photo,
    takenAt,
    title: (meta.title ?? "").trim(),
    alt: (meta.description || meta.title || "").trim() || `Photo ${photo.sequence}, ${takenAt.slice(0, 10)}`,
    published: meta.published ?? true,
  };
}

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function assertCatalog(catalog) {
  if (catalog?.version !== 1 || !Array.isArray(catalog.photos)) throw new Error("Unsupported photo catalog; expected version 1 and a photos array.");
  const ids = new Set();
  const sources = new Set();
  const sequences = new Set();
  for (const photo of catalog.photos) {
    const label = photo?.source || photo?.id || "unknown photo";
    if (!/^[a-f0-9]{16}$/.test(photo.id) || ids.has(photo.id)) throw new Error(`Invalid or duplicate photo ID: ${label}`);
    if (typeof photo.source !== "string" || !photo.source || sources.has(photo.source)) throw new Error(`Invalid or duplicate photo source: ${label}`);
    if (!positiveInteger(photo.sequence) || sequences.has(photo.sequence)) throw new Error(`Invalid or duplicate photo sequence: ${label}`);
    if (!/^[a-f0-9]{64}$/.test(photo.fingerprint)) throw new Error(`Invalid fingerprint: ${label}`);
    if (![photo.importedAt, photo.takenAt].every(validDate) || photo.capturedAt !== null && !validDate(photo.capturedAt)) throw new Error(`Invalid date: ${label}`);
    if (typeof photo.title !== "string" || typeof photo.alt !== "string" || !photo.alt.trim() || typeof photo.published !== "boolean") throw new Error(`Missing photo text or publication state: ${label}`);
    if (photo.exif !== undefined) {
      if (!photo.exif || typeof photo.exif !== "object" || Array.isArray(photo.exif)) throw new Error(`Invalid camera settings: ${label}`);
      for (const [key, value] of Object.entries(photo.exif)) {
        if (![...Object.keys(PHOTO_EXIF_FIELDS), "dateTimeOriginal"].includes(key)) throw new Error(`Unexpected camera settings field: ${key}`);
        const text = ["make", "model", "lensMake", "lensModel", "dateTimeOriginal"].includes(key);
        if (text ? typeof value !== "string" || value.length > 160 : typeof value !== "number" || !Number.isFinite(value) || value <= 0) throw new Error(`Invalid camera setting: ${key}`);
      }
    }
    if (!/^#[a-f0-9]{6}$/.test(photo.placeholder)) throw new Error(`Invalid placeholder color: ${label}`);
    if (![photo.width, photo.height, photo.sourceBytes].every(positiveInteger)) throw new Error(`Invalid source dimensions or size: ${label}`);
    if (!Array.isArray(photo.thumbnails) || !photo.thumbnails.length || photo.thumbnails.length > 3) throw new Error(`Missing thumbnails: ${label}`);
    const legacy = LEGACY_IMAGE_PATH.test(photo.large?.src);
    if (!legacy && photo.thumbnails.length !== 1) throw new Error(`Expected exactly one thumbnail: ${label}`);
    const variants = [...photo.thumbnails, photo.large];
    for (const variant of variants) {
      const validPath = variant && (legacy
        ? LEGACY_IMAGE_PATH.test(variant.src) && variant.src.startsWith(`/photos/${photo.id}-${photo.fingerprint.slice(0, 16)}-`)
        : IMAGE_PATH.test(variant.src) && variant.src.includes(`_${String(photo.sequence).padStart(4, "0")}-${photo.fingerprint.slice(0, 8)}-`));
      if (!validPath || ![variant.width, variant.height, variant.bytes].every(positiveInteger)) throw new Error(`Invalid image variant: ${label}`);
    }
    if (!legacy && (photo.thumbnails[0].width > 960 || !photo.thumbnails[0].src.endsWith("-thumb.webp") || !photo.large.src.endsWith("-large.webp") || photo.thumbnails[0].src.replace(/-thumb\.webp$/, "") !== photo.large.src.replace(/-large\.webp$/, ""))) throw new Error(`Invalid thumbnail/large pair: ${label}`);
    if (photo.large.width > 2560 || photo.large.height > 2560) throw new Error(`Large image exceeds 2560px: ${label}`);
    if (photo.thumbnails.some((v, i, list) => i > 0 && v.width <= list[i - 1].width)) throw new Error(`Thumbnail widths must be unique and ascending: ${label}`);
    ids.add(photo.id);
    sources.add(photo.source);
    sequences.add(photo.sequence);
  }
}

export async function checkCatalog(root) {
  const catalog = await readJson(join(root, CATALOG_PATH));
  const overrides = await readJson(join(root, META_PATH), {});
  assertCatalog(catalog);
  validateOverrides(overrides);
  let bytes = 0;
  const checked = new Set();
  for (const photo of catalog.photos) {
    if (JSON.stringify(applyMetadata(photo, overrides)) !== JSON.stringify(photo)) {
      throw new Error(`Metadata changed for ${photo.source}; run pnpm photos:prepare before building.`);
    }
    for (const variant of [...photo.thumbnails, photo.large]) {
      if (checked.has(variant.src)) continue;
      const path = join(root, "public", variant.src.slice(1));
      const buffer = await readFile(path);
      const metadata = await sharp(buffer).metadata();
      if (buffer.length !== variant.bytes || metadata.width !== variant.width || metadata.height !== variant.height || metadata.format !== "webp") throw new Error(`Image does not match the catalog: ${variant.src}`);
      if (metadata.xmp || metadata.iptc) throw new Error(`Private metadata found in published image: ${variant.src}`);
      if (metadata.exif) {
        if (variant !== photo.large) throw new Error(`Thumbnail must not contain EXIF: ${variant.src}`);
        await assertPublishedExif(buffer);
      }
      bytes += buffer.length;
      checked.add(variant.src);
    }
  }
  return { photos: catalog.photos.length, published: catalog.photos.filter((p) => p.published).length, files: checked.size, bytes };
}
