import { CATALOG_PATH, readJson } from "../../scripts/lib/photo-catalog.mjs";
import { setPhotoLocations } from "../../scripts/lib/photo-locations.mjs";
/* global fetch, AbortSignal */
import { Buffer } from "node:buffer";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { URL, URLSearchParams, fileURLToPath } from "node:url";

const ENDPOINT = "/__photos/location";
const GEOCODE_ENDPOINT = "/__photos/geocode";
// Nominatim usage policy: identify the app, at most one request per second,
// no autocomplete. Searches run only on submit and are cached per session.
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "luckyabner.top-photo-locator/1.0 (+https://luckyabner.top)";
const geocodeCache = new Map();
let nextGeocodeAt = 0;

async function geocode(query) {
	if (geocodeCache.has(query)) return geocodeCache.get(query);
	const wait = nextGeocodeAt - Date.now();
	nextGeocodeAt = Math.max(Date.now(), nextGeocodeAt) + 1100;
	if (wait > 0) await sleep(wait);
	const url = new URL(NOMINATIM);
	url.search = new URLSearchParams({ q: query, format: "jsonv2", limit: "8", "accept-language": "en,zh-CN" }).toString();
	const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(10_000) });
	if (!response.ok) throw new Error(`Place search failed (${response.status}).`);
	const results = (await response.json()).map((place) => ({
		lat: Number(place.lat),
		lng: Number(place.lon),
		name: place.name || place.display_name.split(",")[0].trim(),
		address: place.display_name,
	})).filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng));
	geocodeCache.set(query, results);
	return results;
}

const MAX_BODY = 256 * 1024;

function send(response, status, body) {
	response.statusCode = status;
	response.setHeader("Content-Type", "application/json; charset=utf-8");
	response.setHeader("Cache-Control", "no-store");
	response.end(JSON.stringify(body));
}

async function readBody(request) {
	let size = 0;
	const chunks = [];
	for await (const chunk of request) {
		size += chunk.length;
		if (size > MAX_BODY) throw new Error("Request body is too large.");
		chunks.push(chunk);
	}
	return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function summarize(catalog) {
	return catalog.photos.map(({ source, title, alt, takenAt, published, placeholder, thumbnails, large, location }) => ({
		source, title, alt, takenAt, published, placeholder,
		thumbnail: thumbnails[0].src,
		large: large?.src ?? thumbnails[thumbnails.length - 1].src,
		location: location ?? null,
	}));
}

// Development-only photo location editor. Neither the page nor the write
// endpoint exists in production builds.
export default function photoLocator() {
	let root;
	return {
		name: "photo-locator",
		hooks: {
			"astro:config:setup": ({ command, config, injectRoute }) => {
				root = fileURLToPath(config.root);
				if (command !== "dev") return;
				injectRoute({ pattern: "/photos/locate", entrypoint: new URL("../dev/photo-locate.astro", import.meta.url), prerender: true });
			},
			"astro:server:setup": ({ server }) => {
				server.middlewares.use(GEOCODE_ENDPOINT, async (request, response) => {
					try {
						const query = new URL(request.url ?? "", "http://localhost").searchParams.get("q")?.trim() ?? "";
						if (request.method !== "GET" || !query || query.length > 200) {
							send(response, 400, { error: "Enter a place to search for." });
							return;
						}
						send(response, 200, { results: await geocode(query) });
					} catch (error) {
						send(response, 502, { error: error.message });
					}
				});
				server.middlewares.use(ENDPOINT, async (request, response) => {
					try {
						if (request.method === "GET") {
							send(response, 200, { photos: summarize(await readJson(join(root, CATALOG_PATH))) });
							return;
						}
						if (request.method !== "POST") {
							send(response, 405, { error: "Method not allowed." });
							return;
						}
						// Only the editor page on this dev server may write; a JSON content
						// type also forces a CORS preflight that is never answered.
						const origin = request.headers.origin;
						if (!origin || new URL(origin).host !== request.headers.host || !request.headers["content-type"]?.startsWith("application/json")) {
							send(response, 403, { error: "Forbidden." });
							return;
						}
						const { updates } = await readBody(request);
						const catalog = await setPhotoLocations(root, updates);
						send(response, 200, { photos: summarize(catalog) });
					} catch (error) {
						send(response, 400, { error: error.message });
					}
				});
			},
		},
	};
}
