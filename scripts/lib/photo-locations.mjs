import { dirname, join, relative } from "node:path";
import { mkdir, rename } from "node:fs/promises";
import { CATALOG_PATH, META_PATH, applyMetadata, assertCatalog, assertLocation, exists, readJson, roundCoordinate, validateOverrides, writeJsonIfChanged } from "./photo-catalog.mjs";

export const INBOX_DIR = ".photos-local/inbox";
export const DELETED_DIR = ".photos-local/deleted";

// Used by the development-only location editor. Updates the hand-edited
// metadata file, then refreshes the catalog without touching any image.
export async function setPhotoLocations(root, updates) {
  if (!Array.isArray(updates) || !updates.length) throw new Error("Expected a non-empty list of location updates.");
  const catalog = await readJson(join(root, CATALOG_PATH));
  const overrides = await readJson(join(root, META_PATH), {});
  assertCatalog(catalog);
  validateOverrides(overrides);
  const sources = new Set(catalog.photos.map((photo) => photo.source));

  for (const update of updates) {
    const source = update?.source;
    if (typeof source !== "string" || !sources.has(source)) throw new Error(`Unknown photo: ${source}`);
    const { location: _previous, ...meta } = overrides[source] ?? {};
    if (update.location === null) {
      if (Object.keys(meta).length) overrides[source] = meta;
      else delete overrides[source];
      continue;
    }
    const { lat, lng, name } = update.location ?? {};
    const location = { lat: roundCoordinate(Number(lat)), lng: roundCoordinate(Number(lng)) };
    if (typeof name === "string" && name.trim()) location.name = name.trim();
    assertLocation(location, `${source}.location`);
    overrides[source] = { ...meta, location };
  }

  validateOverrides(overrides);
  const nextCatalog = { ...catalog, photos: catalog.photos.map((photo) => applyMetadata(photo, overrides)) };
  assertCatalog(nextCatalog);
  await writeJsonIfChanged(join(root, META_PATH), overrides);
  await writeJsonIfChanged(join(root, CATALOG_PATH), nextCatalog);
  return nextCatalog;
}

// Deleting a photo means removing it from the catalog, the metadata file, the
// inbox and the published directory. Everything that still exists is moved to
// .photos-local/deleted/<timestamp>/ instead of being removed, so a mistake is
// recoverable; leaving the export in the inbox would make the next
// `pnpm photos:prepare` publish the photo again.
export async function deletePhotos(root, sources) {
  if (!Array.isArray(sources) || !sources.length) throw new Error("Expected a non-empty list of photos to delete.");
  const catalog = await readJson(join(root, CATALOG_PATH));
  const overrides = await readJson(join(root, META_PATH), {});
  assertCatalog(catalog);
  validateOverrides(overrides);
  const bySource = new Map(catalog.photos.map((photo) => [photo.source, photo]));
  const targets = [...new Set(sources)];

  // Validate every source before touching a single file.
  for (const source of targets) {
    if (typeof source !== "string" || !bySource.has(source)) throw new Error(`Unknown photo: ${source}`);
  }

  const backup = join(root, DELETED_DIR, new Date().toISOString().replace(/[:.]/g, "-"));
  const moved = [];
  const exportMissing = [];
  const imagesMissing = [];
  async function stash(from, to) {
    await mkdir(dirname(to), { recursive: true });
    await rename(from, to);
    moved.push(relative(root, to));
  }

  for (const source of targets) {
    const photo = bySource.get(source);
    const original = join(root, INBOX_DIR, source);
    if (await exists(original)) await stash(original, join(backup, "inbox", source));
    else exportMissing.push(source);
    for (const variant of [...photo.thumbnails, photo.large]) {
      const published = join(root, "public", variant.src.slice(1));
      if (await exists(published)) await stash(published, join(backup, "public", variant.src.slice(1)));
      else imagesMissing.push(variant.src);
    }
    delete overrides[source];
    catalog.photos = catalog.photos.filter((candidate) => candidate !== photo);
  }

  const nextCatalog = { ...catalog, photos: catalog.photos.map((photo) => applyMetadata(photo, overrides)) };
  assertCatalog(nextCatalog);
  validateOverrides(overrides);
  await writeJsonIfChanged(join(root, CATALOG_PATH), nextCatalog);
  await writeJsonIfChanged(join(root, META_PATH), overrides);
  return {
    catalog: nextCatalog,
    removed: targets,
    moved,
    exportMissing,
    imagesMissing,
    backup: moved.length ? relative(root, backup) : null,
  };
}
