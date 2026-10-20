import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile, readdir, rename, rm, stat, symlink, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import sharp from "sharp";
import { readExifTags } from "../lib/photo-exif.mjs";
import { formatPhotoSettings, formatPhotoEquipment } from "../../src/lib/photo-exif.mjs";
import { preparePhotos } from "../prepare-photos.mjs";
import { CATALOG_PATH, META_PATH, checkCatalog, readJson, validateOverrides } from "../lib/photo-catalog.mjs";

const log = { info() {}, warn() {}, error() {} };
const now = () => new Date("2026-10-20T10:00:00Z");
const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "abner-photos-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, ".photos-local/inbox/trip"), { recursive: true });
  await mkdir(join(root, "src/data"), { recursive: true });
  await writeFile(join(root, META_PATH), "{}\n");
  return root;
}

function image(width, height, background = "#aa5533") {
  return sharp({ create: { width, height, channels: 3, background } });
}

test("orientation, capture date, sRGB output, source preservation and no upscaling", async (t) => {
  const root = await fixture(t);
  const source = join(root, ".photos-local/inbox/trip/portrait.JPG");
  await image(1800, 1200).withMetadata({ orientation: 6 })
    .withExifMerge({ IFD2: { DateTimeOriginal: "2023:05:06 12:30:00" } })
    .withIccProfile("p3").jpeg({ quality: 95 }).toFile(source);
  const before = sha(await readFile(source));
  await image(100, 80).png().toFile(join(root, ".photos-local/inbox/small.png"));
  const result = await preparePhotos({ root, now, log });
  assert.equal(result.added, 2);
  assert.equal(sha(await readFile(source)), before);
  const catalog = await readJson(join(root, CATALOG_PATH));
  const portrait = catalog.photos.find((p) => p.source.endsWith("portrait.JPG"));
  assert.equal(portrait.width, 1200);
  assert.equal(portrait.height, 1800);
  assert.match(portrait.capturedAt, /^2023-05-06T/);
  assert.match(portrait.large.src, /^\/photos\/2023-05-06_12-30-00_\d{4}-[a-f0-9]{8}-large\.webp$/);
  assert.equal(portrait.thumbnails.length, 1);
  assert.deepEqual([portrait.thumbnails[0].width, portrait.thumbnails[0].height], [960, 1440]);
  assert.equal(portrait.large.width, 1200);
  assert.equal(portrait.large.height, 1800);
  const metadata = await sharp(join(root, "public", portrait.large.src)).metadata();
  assert.equal(metadata.space, "srgb");
  assert.ok(metadata.exif);
  assert.equal((await readExifTags(await readFile(join(root, "public", portrait.large.src)))).DateTimeOriginal, "2023:05:06 12:30:00");
  assert.equal((await sharp(join(root, "public", portrait.thumbnails[0].src)).metadata()).exif, undefined);
  assert.equal(metadata.icc, undefined);
  assert.equal(metadata.orientation, 1);
  const expectedPixel = await sharp(source).rotate().toColourspace("srgb").resize(1, 1).raw().toBuffer();
  const actualPixel = await sharp(join(root, "public", portrait.large.src)).resize(1, 1).raw().toBuffer();
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(expectedPixel[i] - actualPixel[i]) < 12, "wide-gamut conversion should preserve the intended sRGB appearance");
  const small = catalog.photos.find((p) => p.source === "small.png");
  assert.deepEqual(small.thumbnails.map((v) => [v.width, v.height]), [[100, 80]]);
  assert.equal(small.importedAt, now().toISOString());
  assert.equal(small.capturedAt, null);
  assert.equal((await checkCatalog(root)).photos, 2);
  assert.equal((await readdir(join(root, "public/photos"))).length, 4);
});

test("repeat runs are byte-identical and do not rewrite images or the catalog", async (t) => {
  const root = await fixture(t);
  await image(1000, 600).jpeg().toFile(join(root, ".photos-local/inbox/a.jpg"));
  await preparePhotos({ root, now, log });
  const catalogPath = join(root, CATALOG_PATH);
  const content = await readFile(catalogPath, "utf8");
  const manifestMtime = (await stat(catalogPath)).mtimeMs;
  const photos = (await readJson(catalogPath)).photos;
  const imagePath = join(root, "public", photos[0].large.src);
  const imageMtime = (await stat(imagePath)).mtimeMs;
  const result = await preparePhotos({ root, now: () => new Date("2026-12-01T00:00:00Z"), log });
  assert.equal(result.unchanged, 1);
  assert.equal(await readFile(catalogPath, "utf8"), content);
  assert.equal((await stat(catalogPath)).mtimeMs, manifestMtime);
  assert.equal((await stat(imagePath)).mtimeMs, imageMtime);
});

test("re-export keeps identity and first import date while changing hashed URLs", async (t) => {
  const root = await fixture(t);
  const source = join(root, ".photos-local/inbox/a.jpg");
  await image(800, 1200).jpeg().toFile(source);
  await preparePhotos({ root, now, log });
  const before = (await readJson(join(root, CATALOG_PATH))).photos[0];
  await image(800, 1200, "#224488").jpeg().toFile(source);
  const result = await preparePhotos({ root, now: () => new Date("2026-11-01T00:00:00Z"), log });
  const after = (await readJson(join(root, CATALOG_PATH))).photos[0];
  assert.equal(result.updated, 1);
  assert.equal(after.id, before.id);
  assert.equal(after.importedAt, before.importedAt);
  assert.notEqual(after.large.src, before.large.src);
  assert.equal((await readdir(join(root, "public/photos"))).length, 2);
  assert.equal(result.archived, 2);
  const [archive] = await readdir(join(root, ".photos-local/previous-exports"));
  assert.ok(await readFile(join(root, ".photos-local/previous-exports", archive, before.large.src.split("/").pop())));
  await checkCatalog(root);
});

test("EXIF wall-clock filenames stay on the camera date across midnight and same-second shots do not collide", async (t) => {
  const root = await fixture(t);
  const buffer = await image(1200, 900).withExif({ IFD2: { DateTimeOriginal: "2025:06:01 00:15:30" } }).jpeg().toBuffer();
  await writeFile(join(root, ".photos-local/inbox/a.jpg"), buffer);
  await writeFile(join(root, ".photos-local/inbox/trip/a.jpg"), buffer);
  await preparePhotos({ root, now, log });
  const catalog = await readJson(join(root, CATALOG_PATH));
  for (const photo of catalog.photos) {
    assert.match(photo.thumbnails[0].src, /^\/photos\/2025-06-01_00-15-30_\d{4}-[a-f0-9]{8}-thumb\.webp$/);
    assert.match(photo.large.src, /^\/photos\/2025-06-01_00-15-30_/);
  }
  assert.notEqual(catalog.photos[0].large.src, catalog.photos[1].large.src);
  assert.equal((await readdir(join(root, "public/photos"))).length, 4);
  await checkCatalog(root);
});

test("legacy four-file photos migrate to a readable pair even when originals have been archived", async (t) => {
  const root = await fixture(t);
  const source = join(root, ".photos-local/inbox/a.jpg");
  await image(1800, 1200).withExif({ IFD2: { DateTimeOriginal: "2025:06:01 12:30:00" } }).jpeg().toFile(source);
  await preparePhotos({ root, now, log });
  const catalog = await readJson(join(root, CATALOG_PATH));
  const current = catalog.photos[0];
  const legacy = { ...current, thumbnails: [] };
  const base = `${current.id}-${current.fingerprint.slice(0, 16)}`;
  for (const width of [480, 960, 1440]) {
    const name = `${base}-w${width}.webp`;
    const info = await sharp(source).resize(width).webp({ quality: 80 }).toFile(join(root, "public/photos", name));
    legacy.thumbnails.push({ src: `/photos/${name}`, width: info.width, height: info.height, bytes: info.size });
  }
  legacy.large = { ...current.large, src: `/photos/${base}-large.webp` };
  await copyFile(join(root, "public", current.large.src), join(root, "public", legacy.large.src));
  for (const variant of [...current.thumbnails, current.large]) await rm(join(root, "public", variant.src));
  await writeFile(join(root, CATALOG_PATH), JSON.stringify({ version: 1, photos: [legacy] }));
  await rename(join(root, ".photos-local/inbox"), join(root, ".photos-local/archived"));
  const result = await preparePhotos({ root, now, log });
  assert.equal(result.migrated, 1);
  assert.equal(result.archived, 4);
  assert.equal(result.failed, 0);
  const migrated = (await readJson(join(root, CATALOG_PATH))).photos[0];
  assert.equal(migrated.id, legacy.id);
  assert.equal(migrated.importedAt, legacy.importedAt);
  assert.equal(migrated.thumbnails.length, 1);
  assert.equal(migrated.thumbnails[0].bytes, legacy.thumbnails[1].bytes);
  assert.match(migrated.large.src, /^\/photos\/2025-06-01_12-30-00_/);
  assert.equal((await readdir(join(root, "public/photos"))).length, 2);
  const before = await readFile(join(root, CATALOG_PATH), "utf8");
  await preparePhotos({ root, now, log });
  assert.equal(await readFile(join(root, CATALOG_PATH), "utf8"), before);
  await checkCatalog(root);
});

test("archived originals remain published; metadata works without originals and stale edits fail checks", async (t) => {
  const root = await fixture(t);
  await image(800, 600).jpeg().toFile(join(root, ".photos-local/inbox/a.jpg"));
  await preparePhotos({ root, now, log });
  await rename(join(root, ".photos-local/inbox"), join(root, ".photos-local/archived"));
  assert.equal((await checkCatalog(root)).published, 1);
  await writeFile(join(root, META_PATH), JSON.stringify({ "a.jpg": { title: "Sea", description: "Blue waves along a rocky shore.", date: "2024-03-04", published: false } }));
  await assert.rejects(checkCatalog(root), /Metadata changed/);
  await preparePhotos({ root, now, log });
  const photo = (await readJson(join(root, CATALOG_PATH))).photos[0];
  assert.equal(photo.title, "Sea");
  assert.equal(photo.alt, "Blue waves along a rocky shore.");
  assert.equal(photo.takenAt, "2024-03-04T00:00:00.000Z");
  assert.equal((await checkCatalog(root)).published, 0);
});

test("a failed re-export preserves the published version and leaves no partial temporary files", async (t) => {
  const root = await fixture(t);
  const source = join(root, ".photos-local/inbox/a.jpg");
  await image(600, 800).jpeg().toFile(source);
  await preparePhotos({ root, now, log });
  const before = await readFile(join(root, CATALOG_PATH), "utf8");
  await writeFile(source, "broken export");
  const result = await preparePhotos({ root, now, log });
  assert.equal(result.failed, 1);
  assert.equal(await readFile(join(root, CATALOG_PATH), "utf8"), before);
  assert.deepEqual(await readdir(join(root, ".photos-local/cache")), []);
  assert.equal(await readFile(source, "utf8"), "broken export");
  await checkCatalog(root);
});

test("duplicate basenames in different directories stay distinct; unsupported files and symlinks are skipped", async (t) => {
  const root = await fixture(t);
  await image(600, 400).jpeg().toFile(join(root, ".photos-local/inbox/a.jpg"));
  await image(400, 600).jpeg().toFile(join(root, ".photos-local/inbox/trip/a.jpg"));
  await writeFile(join(root, ".photos-local/inbox/camera.raw"), "raw data");
  await symlink(join(root, ".photos-local/inbox/trip"), join(root, ".photos-local/inbox/linked"), "dir");
  const result = await preparePhotos({ root, now, log });
  assert.equal(result.added, 2);
  const photos = (await readJson(join(root, CATALOG_PATH))).photos;
  assert.notEqual(photos[0].id, photos[1].id);
  await checkCatalog(root);
});

test("hundreds of imports retain deterministic ordering and incremental output", async (t) => {
  const root = await fixture(t);
  const buffer = await image(32, 48).jpeg().toBuffer();
  for (let i = 0; i < 300; i++) {
    await writeFile(join(root, ".photos-local/inbox", `photo-${i}.jpg`), buffer);
  }
  const result = await preparePhotos({ root, now, log });
  assert.equal(result.added, 300);
  assert.equal((await checkCatalog(root)).published, 300);
  const before = await readFile(join(root, CATALOG_PATH), "utf8");
  const repeated = await preparePhotos({ root, now, log });
  assert.equal(repeated.unchanged, 300);
  assert.equal(await readFile(join(root, CATALOG_PATH), "utf8"), before);
});

test("clean build validation catches missing assets and rejects unsafe or malformed metadata", async (t) => {
  const root = await fixture(t);
  await image(900, 600).webp().toFile(join(root, ".photos-local/inbox/a.webp"));
  await preparePhotos({ root, now, log });
  const photo = (await readJson(join(root, CATALOG_PATH))).photos[0];
  await rm(join(root, "public", photo.large.src));
  await assert.rejects(checkCatalog(root), /ENOENT/);
  for (const values of [{ date: "2024-02-30" }, { published: "false" }, { description: 12 }, { gps: "hidden" }]) {
    assert.throws(() => validateOverrides({ "a.webp": values }));
  }
  const result = await preparePhotos({ root, now, log });
  assert.equal(result.updated, 1);
  await checkCatalog(root);
});

test("only selected camera settings survive in large images; JPEG and WebP imports keep capture metadata", async (t) => {
  const root = await fixture(t);
  const exif = {
    IFD0: { Make: "Panasonic", Model: "DC-GX9", Artist: "Private author" },
    IFD2: {
      DateTimeOriginal: "2025:06:01 16:43:15", FNumber: "9/1", ExposureTime: "1/400",
      ISOSpeedRatings: "200", FocalLength: "32/1", FocalLengthIn35mmFilm: "64",
      LensModel: "LUMIX G VARIO 12-32/F3.5-5.6", BodySerialNumber: "PRIVATE-SERIAL",
      LensSerialNumber: "PRIVATE-LENS", UserComment: "Private note",
    },
    IFD3: { GPSLatitudeRef: "N", GPSLatitude: "31/1 12/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "121/1 30/1 0/1" },
  };
  for (const extension of ["jpeg", "webp"]) {
    await image(1200, 800).withExif(exif).toFormat(extension).toFile(join(root, `.photos-local/inbox/settings.${extension}`));
  }
  const sources = await Promise.all(["jpeg", "webp"].map((ext) => readFile(join(root, `.photos-local/inbox/settings.${ext}`))));
  const originalTags = await readExifTags(sources[0]);
  assert.equal(originalTags.SerialNumber, "PRIVATE-SERIAL");
  assert.ok(originalTags.GPSLatitude);
  const result = await preparePhotos({ root, now, log });
  assert.equal(result.added, 2);
  const catalog = await readJson(join(root, CATALOG_PATH));
  for (const photo of catalog.photos) {
    assert.match(photo.large.src, /^\/photos\/2025-06-01_16-43-15_/);
    assert.deepEqual(photo.exif, {
      make: "Panasonic", model: "DC-GX9", lensModel: "LUMIX G VARIO 12-32/F3.5-5.6",
      aperture: 9, exposureTime: 0.0025, iso: 200, focalLength: 32, focalLength35mm: 64,
      dateTimeOriginal: "2025:06:01 16:43:15",
    });
    const published = await readExifTags(await readFile(join(root, "public", photo.large.src)));
    assert.equal(published.FNumber, 9);
    assert.equal(published.ExposureTime, 0.0025);
    assert.equal(published.ISO, 200);
    assert.equal(published.FocalLength, 32);
    assert.equal(published.FocalLengthIn35mmFormat, 64);
    assert.equal(published.Model, "DC-GX9");
    assert.equal(published.DateTimeOriginal, "2025:06:01 16:43:15");
    for (const tag of ["GPSLatitude", "GPSLongitude", "SerialNumber", "BodySerialNumber", "LensSerialNumber", "Artist", "UserComment", "MakerNote"]) assert.equal(published[tag], undefined);
    assert.equal((await sharp(join(root, "public", photo.thumbnails[0].src)).metadata()).exif, undefined);
  }
  assert.equal((await checkCatalog(root)).photos, 2);
  for (const [index, ext] of ["jpeg", "webp"].entries()) assert.equal(sha(await readFile(join(root, `.photos-local/inbox/settings.${ext}`))), sha(sources[index]));
  const photo = catalog.photos[0];
  const path = join(root, "public", photo.large.src);
  const unsafe = await sharp(path).withExif(exif).webp().toBuffer();
  await writeFile(path, unsafe);
  photo.large.bytes = unsafe.length;
  await writeFile(join(root, CATALOG_PATH), JSON.stringify(catalog));
  await assert.rejects(checkCatalog(root), /Unexpected EXIF field/);
});

test("photo captions format available settings and omit absent values", () => {
  assert.equal(formatPhotoSettings({ focalLength: 32, focalLength35mm: 64, aperture: 9, exposureTime: 0.0025, iso: 200 }), "32mm (64mm equiv.) · f/9 · 1/400s · ISO 200");
  assert.equal(formatPhotoSettings({ focalLength35mm: 50, exposureTime: 2.5 }), "50mm equiv. · 2.5s");
  assert.equal(formatPhotoSettings({ exposureTime: 0.3 }), "0.3s");
  assert.equal(formatPhotoSettings(), "");
  assert.equal(formatPhotoEquipment({ make: "FUJIFILM", model: "FUJIFILM X-T5", lensModel: "XF 35mm" }), "FUJIFILM X-T5 · XF 35mm");
  assert.equal(formatPhotoEquipment({ make: "Panasonic", model: "DC-GX9" }), "Panasonic DC-GX9");
  assert.equal(formatPhotoEquipment(), "");
});
