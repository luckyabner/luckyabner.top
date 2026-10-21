// Parses pasted "lat, lng" text for the location editor. Many Chinese map
// tools (Amap, Baidu) copy "lng, lat" instead, so a reversed pair is detected
// and swapped: unambiguously when one value is outside ±90, otherwise by
// whichever reading lies closer to `near` (the area being viewed), if given.

export const roundCoordinate = (value) => Math.round(value * 1e4) / 1e4;

const valid = (lat, lng) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

function distance(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (((b.lng - a.lng + 540) % 360) - 180) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * @param {string} text
 * @param {{ lat: number, lng: number } | null} [near]
 * @returns {{ lat: number, lng: number, swapped: boolean } | null}
 */
export function parseCoordinates(text, near = null) {
  const parts = text.trim().split(/[\s,，;；]+/).filter(Boolean).map(Number);
  if (parts.length !== 2 || !parts.every(Number.isFinite)) return null;
  const [a, b] = parts;
  const asTyped = valid(a, b);
  const reversed = valid(b, a);
  if (!asTyped && !reversed) return null;
  let swapped = !asTyped;
  if (asTyped && reversed && near && a !== b) {
    swapped = distance(near, { lat: b, lng: a }) < distance(near, { lat: a, lng: b });
  }
  const [lat, lng] = swapped ? [b, a] : [a, b];
  return { lat: roundCoordinate(lat), lng: roundCoordinate(lng), swapped };
}
