import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, mkdtemp, copyFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import { CATALOG_PATH, META_PATH, applyMetadata, assertCatalog, exists, hasCurrentPhotoFiles, readJson, validateOverrides, writeJsonIfChanged } from "./lib/photo-catalog.mjs";
import { readExifTags, readPhotoExif, writablePhotoExif } from "./lib/photo-exif.mjs";

const RECIPE = JSON.stringify({ version: 3, sharp: sharp.versions.sharp, thumbnailWidth: 960, maxEdge: 2560, thumbnailQuality: 80, largeQuality: 88, colourspace: "srgb", largeExif: "selected-camera-settings" });
const SUPPORTED = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const hash = (value) => createHash("sha256").update(value).digest("hex");

async function collectImages(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectImages(path));
    else if (entry.isFile() && SUPPORTED.has(extname(entry.name).toLowerCase())) files.push(path);
    // Symlinks are deliberately not followed outside the export directory.
  }
  return files.sort();
}

function filenameStamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function photoFileBase(photo, stamp) {
  return `${stamp}_${String(photo.sequence).padStart(4, "0")}-${photo.fingerprint.slice(0, 8)}`;
}

async function capturedDate(buffer, log, source) {
  try {
    const metadata = await readExifTags(buffer, { pick: ["DateTimeOriginal", "CreateDate"] });
    for (const value of [metadata?.DateTimeOriginal, metadata?.CreateDate]) {
      // Use the camera's wall-clock time for the filename, before converting
      // the catalog timestamp to UTC (which can fall on a different date).
      const match = typeof value === "string" && value.match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
      if (!match) continue;
      const [, year, month, day, hour, minute, second] = match;
      const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
      if (Number.isFinite(+date) && filenameStamp(date) === `${year}-${month}-${day}_${hour}-${minute}-${second}`) {
        return { capturedAt: date.toISOString(), stamp: `${year}-${month}-${day}_${hour}-${minute}-${second}` };
      }
    }
  } catch (error) {
    log.warn(`${source}: EXIF date could not be read (${error.message}).`);
  }
  return { capturedAt: null, stamp: null };
}

async function makeVariants(buffer, base, temporary, exif) {
  const sourceMetadata = await sharp(buffer).metadata();
  if (sourceMetadata.pages > 1) throw new Error("Animated or multi-page images are not supported; export a single JPEG.");
  const rotated = sourceMetadata.orientation >= 5 && sourceMetadata.orientation <= 8;
  const width = rotated ? sourceMetadata.height : sourceMetadata.width;
  const height = rotated ? sourceMetadata.width : sourceMetadata.height;
  if (!width || !height) throw new Error("Image dimensions could not be read.");

  const thumbnailName = `${base}-thumb.webp`;
  const thumbnailInfo = await sharp(buffer).rotate().toColourspace("srgb")
    .resize({ width: 960, height: 2560, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 }).toFile(join(temporary, thumbnailName));
  const thumbnail = { src: `/photos/${thumbnailName}`, width: thumbnailInfo.width, height: thumbnailInfo.height, bytes: thumbnailInfo.size };

  const filename = `${base}-large.webp`;
  const largeImage = sharp(buffer).rotate().toColourspace("srgb")
    .resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true });
  const selectedExif = writablePhotoExif(exif);
  if (selectedExif) largeImage.withExif(selectedExif);
  const info = await largeImage.webp({ quality: 88 }).toFile(join(temporary, filename));
  const sample = await sharp(buffer).rotate().toColourspace("srgb").resize(32, 32, { fit: "inside" }).png().toBuffer();
  const { dominant } = await sharp(sample).stats();
  const placeholder = `#${[dominant.r, dominant.g, dominant.b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  return {
    width, height, placeholder, thumbnails: [thumbnail],
    large: { src: `/photos/${filename}`, width: info.width, height: info.height, bytes: info.size },
  };
}

export async function preparePhotos({ root = fileURLToPath(new URL("../", import.meta.url)), now = () => new Date(), log = console } = {}) {
  const input = join(root, ".photos-local/inbox");
  const cache = join(root, ".photos-local/cache");
  const output = join(root, "public/photos");
  const catalog = await readJson(join(root, CATALOG_PATH), { version: 1, photos: [] });
  const overrides = await readJson(join(root, META_PATH), {});
  assertCatalog(catalog);
  validateOverrides(overrides);
  await mkdir(input, { recursive: true });
  await mkdir(cache, { recursive: true });
  await mkdir(output, { recursive: true });
  const photos = new Map(catalog.photos.map((photo) => [photo.source, photo]));
  let nextSequence = Math.max(0, ...catalog.photos.map((photo) => photo.sequence)) + 1;
  const result = { added: 0, updated: 0, migrated: 0, archived: 0, unchanged: 0, failed: 0, inputBytes: 0, outputBytes: 0, totalBytes: 0 };
  const inputSources = new Set();

  for (const path of await collectImages(input)) {
    const source = relative(input, path).split("\\").join("/");
    inputSources.add(source);
    const previous = photos.get(source);
    let temporary;
    try {
      const buffer = await readFile(path);
      const fingerprint = hash(Buffer.concat([buffer, Buffer.from(RECIPE)]));
      if (previous?.fingerprint === fingerprint && hasCurrentPhotoFiles(previous) && (await Promise.all([...previous.thumbnails, previous.large].map((v) => exists(join(root, "public", v.src.slice(1)))))).every(Boolean)) {
        result.unchanged++;
        continue;
      }

      const id = previous?.id || hash(source).slice(0, 16);
      const { capturedAt, stamp } = await capturedDate(buffer, log, source);
      let exif = {};
      try { exif = await readPhotoExif(buffer, stamp); }
      catch (error) { log.warn(`${source}: camera settings could not be read (${error.message}).`); }
      const importedAt = previous?.importedAt || now().toISOString();
      const sequence = previous?.sequence || nextSequence;
      temporary = await mkdtemp(join(cache, "prepare-"));
      const base = photoFileBase({ sequence, fingerprint }, stamp || filenameStamp(new Date(importedAt)));
      const variants = await makeVariants(buffer, base, temporary, exif);
      const photo = applyMetadata({
        id, source, fingerprint, sequence,
        importedAt, capturedAt, exif, sourceBytes: buffer.length, ...variants,
      }, overrides);
      assertCatalog({ version: 1, photos: [photo] });

      // All variants are complete before replacing any published reference.
      for (const variant of [...variants.thumbnails, variants.large]) {
        await rename(join(temporary, basename(variant.src)), join(output, basename(variant.src)));
      }
      photos.set(source, photo);
      if (previous) result.updated++;
      else { result.added++; nextSequence++; }
      result.inputBytes += buffer.length;
      result.outputBytes += variants.thumbnails.reduce((sum, v) => sum + v.bytes, variants.large.bytes);
      log.info(`${previous ? "Updated" : "Added"}: ${source}`);
    } catch (error) {
      result.failed++;
      log.error(`${source}: ${error.message} (previous published version preserved)`);
    } finally {
      if (temporary) await rm(temporary, { recursive: true, force: true });
    }
  }

  // Archived originals need no re-encoding: retain the existing 960px variant
  // and large image, copying both to readable names before retiring old files.
  for (const previous of catalog.photos) {
    if (inputSources.has(previous.source) || hasCurrentPhotoFiles(previous)) continue;
    let temporary;
    try {
      temporary = await mkdtemp(join(cache, "migrate-"));
      const thumbnail = previous.thumbnails.filter((v) => v.width <= 960).at(-1) || previous.thumbnails[0];
      const base = photoFileBase(previous, filenameStamp(new Date(previous.capturedAt || previous.importedAt)));
      const migrated = { ...previous, thumbnails: [{ ...thumbnail, src: `/photos/${base}-thumb.webp` }], large: { ...previous.large, src: `/photos/${base}-large.webp` } };
      assertCatalog({ version: 1, photos: [migrated] });
      for (const [from, to] of [[thumbnail, migrated.thumbnails[0]], [previous.large, migrated.large]]) {
        await copyFile(join(root, "public", from.src.slice(1)), join(temporary, basename(to.src)));
      }
      for (const variant of [...migrated.thumbnails, migrated.large]) await rename(join(temporary, basename(variant.src)), join(output, basename(variant.src)));
      photos.set(previous.source, migrated);
      result.migrated++;
    } catch (error) {
      result.failed++;
      log.error(`${previous.source}: migration failed (${error.message}); previous published version preserved.`);
    } finally {
      if (temporary) await rm(temporary, { recursive: true, force: true });
    }
  }

  // Missing local exports are archived originals, not deletion instructions.
  const prepared = [...photos.values()].map((photo) => applyMetadata(photo, overrides))
    .sort((a, b) => b.takenAt.localeCompare(a.takenAt) || a.id.localeCompare(b.id));
  const nextCatalog = { version: 1, photos: prepared };
  assertCatalog(nextCatalog);
  await writeJsonIfChanged(join(root, CATALOG_PATH), nextCatalog);

  // Only retire known generated files after the complete catalog is committed.
  // Move them to a recoverable local backup, never remove source exports.
  const referenced = new Set(prepared.flatMap((photo) => [...photo.thumbnails, photo.large].map((v) => v.src)));
  const superseded = [...new Set(catalog.photos.flatMap((photo) => [...photo.thumbnails, photo.large].map((v) => v.src)))].filter((src) => !referenced.has(src));
  const existingSuperseded = [];
  for (const src of superseded) if (await exists(join(root, "public", src.slice(1)))) existingSuperseded.push(src);
  if (existingSuperseded.length) {
    const archiveRoot = join(root, ".photos-local/previous-exports");
    await mkdir(archiveRoot, { recursive: true });
    const archive = await mkdtemp(join(archiveRoot, `${new Date().toISOString().replace(/[:.]/g, "-")}-`));
    for (const src of existingSuperseded) {
      await rename(join(root, "public", src.slice(1)), join(archive, basename(src)));
      result.archived++;
    }
    log.info(`Moved ${result.archived} superseded generated images to ${archive}`);
  }
  for (const photo of prepared) {
    if (!photo.capturedAt && !overrides[photo.source]?.date) log.warn(`${photo.source}: no capture date; using first import date. Override it in ${META_PATH}.`);
    if (!overrides[photo.source]?.description && !overrides[photo.source]?.title) log.warn(`${photo.source}: add a description in ${META_PATH} for meaningful alternative text.`);
  }
  for (const source of Object.keys(overrides)) {
    if (!photos.has(source)) log.warn(`Metadata has no matching imported photo: ${source}`);
  }
  for (const file of await readdir(output)) {
    if (file.endsWith(".webp")) result.totalBytes += (await stat(join(output, file))).size;
  }
  const mib = (value) => `${(value / 1024 / 1024).toFixed(2)} MiB`;
  log.info(`Photos: ${result.added} added, ${result.updated} updated, ${result.migrated} migrated, ${result.unchanged} unchanged, ${result.failed} failed.`);
  log.info(`Processed exports: ${mib(result.inputBytes)} → ${mib(result.outputBytes)} across all generated sizes. Publishing directory: ${mib(result.totalBytes)}.`);
  log.info(`Local exports are untouched. Each photo has one thumbnail and one large image; superseded outputs are backed up locally.`);
  return result;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await preparePhotos();
    if (result.failed) process.exitCode = 1;
  } catch (error) {
    console.error(`Photo preparation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
