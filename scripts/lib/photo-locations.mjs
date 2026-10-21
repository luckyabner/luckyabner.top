import { join } from "node:path";
import { CATALOG_PATH, META_PATH, applyMetadata, assertCatalog, assertLocation, readJson, roundCoordinate, validateOverrides, writeJsonIfChanged } from "./photo-catalog.mjs";

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
