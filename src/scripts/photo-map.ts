import { createBaseMap, L } from "./photo-map-base";

export { loadMapStyles } from "./photo-map-base";

interface Point {
  link: HTMLAnchorElement;
  latlng: L.LatLng;
}

const CLUSTER_RADIUS = 56;

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

// Photo markers: the newest photo in each group is the cover. Nearby photos
// merge by screen distance; clicking zooms in until they separate, then opens
// the group in the lightbox.
export function mountPhotoMap(container: HTMLElement, links: HTMLAnchorElement[], open: (group: HTMLAnchorElement[]) => void) {
  const points: Point[] = links.flatMap((link) => {
    const lat = Number(link.dataset.photoLat);
    const lng = Number(link.dataset.photoLng);
    return link.dataset.photoLat && Number.isFinite(lat) && Number.isFinite(lng) ? [{ link, latlng: L.latLng(lat, lng) }] : [];
  });
  const { map, dispose } = createBaseMap(container, { minZoom: 2 });
  const layer = L.layerGroup().addTo(map);
  if (points.length) map.fitBounds(L.latLngBounds(points.map((point) => point.latlng)), { padding: [56, 56], maxZoom: 13 });
  else map.setView([30, 110], 3);

  function render() {
    layer.clearLayers();
    const zoom = map.getZoom();
    const clusters: { origin: L.Point; points: Point[] }[] = [];
    for (const point of points) {
      const projected = map.project(point.latlng, zoom);
      const cluster = clusters.find((candidate) => candidate.origin.distanceTo(projected) < CLUSTER_RADIUS);
      if (cluster) cluster.points.push(point);
      else clusters.push({ origin: projected, points: [point] });
    }

    for (const cluster of clusters) {
      const cover = cluster.points[0].link;
      const count = cluster.points.length;
      const thumbnail = cover.querySelector("img");
      const bounds = L.latLngBounds(cluster.points.map((point) => point.latlng));
      const names = [...new Set(cluster.points.map((point) => point.link.dataset.photoLocation).filter(Boolean))];
      const label = `${count} photo${count > 1 ? "s" : ""}${names.length ? ` — ${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""}` : ""}`;
      const marker = L.marker(bounds.getCenter(), {
        title: label,
        riseOnHover: true,
        icon: L.divIcon({
          className: "photo-pin",
          iconSize: [52, 52],
          html: `<span class="photo-pin-image" style="--photo-color:${escapeHtml(cover.style.getPropertyValue("--photo-color"))}"><img src="${escapeHtml(thumbnail?.currentSrc || thumbnail?.src || "")}" alt="" decoding="async" /></span>${count > 1 ? `<span class="photo-pin-count">${count}</span>` : ""}`,
        }),
      });
      marker.on("add", () => {
        const element = marker.getElement();
        element?.setAttribute("aria-label", label);
        element?.setAttribute("role", "button");
      });
      marker.on("click", () => {
        const spread = !bounds.getNorthEast().equals(bounds.getSouthWest());
        if (spread && map.getBoundsZoom(bounds, false, L.point(96, 96)) > zoom) {
          map.flyToBounds(bounds, { padding: [96, 96], duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.6 });
        } else {
          open(cluster.points.map((point) => point.link));
        }
      });
      layer.addLayer(marker);
    }
  }

  map.on("zoomend", render);
  render();
  return {
    resize: () => map.invalidateSize(),
    dispose,
  };
}
