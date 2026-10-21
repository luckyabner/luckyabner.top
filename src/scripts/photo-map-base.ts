import L from "leaflet";
// Loaded on demand: a plain CSS import would be hoisted into the page head.
import leafletStylesheet from "leaflet/dist/leaflet.css?url";

// CARTO basemaps need a (free, non-commercial) key since September 2026.
// Without one the tiles still load, but carry an "API key required" watermark.
const KEY = import.meta.env.PUBLIC_CARTO_BASEMAPS_KEY ?? "";
const tileUrl = (style: string) => `https://basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}{r}.png${KEY ? `?key=${encodeURIComponent(KEY)}` : ""}`;
const TILES = { light: tileUrl("light_all"), dark: tileUrl("dark_all") };
if (!KEY && import.meta.env.DEV) console.warn("PUBLIC_CARTO_BASEMAPS_KEY is not set; map tiles will show CARTO's API key watermark.");
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const isDark = () => document.documentElement.classList.contains("dark");

let stylesheet: Promise<void> | undefined;

export function loadMapStyles() {
  stylesheet ??= new Promise<void>((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = leafletStylesheet;
    link.onload = () => resolve();
    link.onerror = () => {
      link.remove();
      stylesheet = undefined;
      reject(new Error("Map styles could not load."));
    };
    document.head.append(link);
  });
  return stylesheet;
}

// CARTO Positron / Dark Matter tiles in WGS-84, following the site theme.
export function createBaseMap(container: HTMLElement, options: L.MapOptions = {}) {
  const map = L.map(container, { worldCopyJump: true, zoomControl: true, attributionControl: true, ...options });
  map.attributionControl.setPrefix(false);
  const tiles = L.tileLayer(isDark() ? TILES.dark : TILES.light, {
    attribution: ATTRIBUTION,
    maxZoom: 19,
    detectRetina: false,
  }).addTo(map);
  const observer = new MutationObserver(() => tiles.setUrl(isDark() ? TILES.dark : TILES.light));
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return {
    map,
    dispose() {
      observer.disconnect();
      map.remove();
    },
  };
}

export { L };
