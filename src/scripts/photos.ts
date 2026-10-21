import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";

const PREFERENCE_KEY = "photos-full-frame";
let dispose: (() => void) | undefined;
let coreModule: Promise<typeof import("photoswipe")> | undefined;
let mapModule: Promise<typeof import("./photo-map")> | undefined;

function loadPhotoSwipe() {
  coreModule ??= import("photoswipe").catch((error) => {
    coreModule = undefined;
    throw error;
  });
  return coreModule;
}

function initializePhotos() {
  dispose?.();
  dispose = undefined;
  const gallery = document.querySelector<HTMLElement>("[data-photos]");
  const toggle = gallery?.querySelector<HTMLButtonElement>("[data-photo-toggle]");
  if (!gallery || !toggle) return;

  let fullFrame = false;
  try {
    fullFrame = localStorage.getItem(PREFERENCE_KEY) === "true";
  } catch {
    // Browsing still works when local storage is unavailable.
  }

  function applyView() {
    if (!gallery || !toggle) return;
    gallery.dataset.view = fullFrame ? "contain" : "cover";
    toggle.setAttribute("aria-pressed", String(fullFrame));
    toggle.title = fullFrame ? "Crop photos to fill the grid" : "Show each photo's full composition";
    gallery.querySelectorAll<HTMLElement>(".photo-link").forEach((link) => {
      if (fullFrame) delete link.dataset.cropped;
      else link.dataset.cropped = "true";
    });
  }

  applyView();
  toggle.hidden = false;
  const controller = new AbortController();

  // Map view: Leaflet and tiles load only the first time the map is shown.
  const mapToggle = gallery.querySelector<HTMLButtonElement>("[data-photo-map-toggle]");
  const mapContainer = gallery.querySelector<HTMLElement>("[data-photo-map]");
  const grid = gallery.querySelector<HTMLElement>("#photo-grid");
  let mapView = false;
  let photoMap: { resize: () => void; dispose: () => void } | undefined;

  async function showMap(show: boolean) {
    if (!mapToggle || !mapContainer || !grid || !toggle) return;
    mapView = show;
    mapToggle.setAttribute("aria-pressed", String(show));
    mapToggle.title = show ? "Show the photo grid" : "Show where the photos were taken";
    mapContainer.hidden = !show;
    grid.hidden = show;
    toggle.hidden = show;
    history.replaceState(history.state, "", show ? "#map" : location.pathname + location.search);
    if (!show || photoMap) {
      photoMap?.resize();
      return;
    }
    const status = mapContainer.querySelector<HTMLElement>("[data-photo-map-status]");
    try {
      mapModule ??= import("./photo-map").catch((error) => {
        mapModule = undefined;
        throw error;
      });
      const { mountPhotoMap, loadMapStyles } = await mapModule;
      await loadMapStyles();
      if (controller.signal.aborted || !mapView || photoMap) return;
      status?.remove();
      photoMap = mountPhotoMap(mapContainer, [...grid.querySelectorAll<HTMLAnchorElement>(".photo-link")], openGroup);
    } catch {
      if (status) status.textContent = "The map could not load. Try again later.";
    }
  }

  if (mapToggle) {
    mapToggle.hidden = false;
    mapToggle.addEventListener("click", () => void showMap(!mapView), { signal: controller.signal });
    if (location.hash === "#map") void showMap(true);
    window.addEventListener("hashchange", () => {
      if ((location.hash === "#map") !== mapView) void showMap(!mapView);
    }, { signal: controller.signal });
  }
  toggle.addEventListener("click", () => {
    fullFrame = !fullFrame;
    applyView();
    try {
      localStorage.setItem(PREFERENCE_KEY, String(fullFrame));
    } catch {
      // Keep the selected view for this visit.
    }
  }, { signal: controller.signal });

  function markFailedImage(image: HTMLImageElement) {
    const link = image.closest<HTMLElement>(".photo-link");
    if (!link) return;
    link.dataset.failed = "true";
    image.hidden = true;
    const message = link.querySelector<HTMLElement>(".photo-error");
    if (message) message.hidden = false;
  }

  gallery.addEventListener("error", (event) => {
    if (event.target instanceof HTMLImageElement) markFailedImage(event.target);
  }, { capture: true, signal: controller.signal });
  gallery.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    if (image.complete && image.naturalWidth === 0) markFailedImage(image);
  });

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lightbox = new PhotoSwipeLightbox({
    gallery: "#photo-grid",
    children: "a",
    pswpModule: loadPhotoSwipe,
    preload: [1, 1],
    bgOpacity: 1,
    showHideAnimationType: reduceMotion ? "none" : "zoom",
    showAnimationDuration: 220,
    hideAnimationDuration: 180,
    wheelToZoom: false,
    returnFocus: true,
    paddingFn: (viewport) => ({ top: 56, bottom: viewport.x < 640 ? 128 : 104, left: 16, right: 16 }),
    errorMsg: "This photo could not load. Close and reopen it to try again.",
  });

  // object-fit: contain leaves space inside the square <img> box. Animate from
  // the visible photograph, rather than from that larger box.
  lightbox.addFilter("thumbBounds", (bounds, item) => {
    // Grid thumbnails are hidden in map view; fade in instead of zooming.
    if (mapView) return undefined as unknown as typeof bounds & object;
    const fallback = bounds ?? { x: 0, y: 0, w: 0 };
    if (!fullFrame || !item.width || !item.height) return fallback;
    const thumbnail = item.element?.querySelector("img");
    if (!thumbnail || thumbnail.hidden) return fallback;
    const rect = thumbnail.getBoundingClientRect();
    const scale = Math.min(rect.width / item.width, rect.height / item.height);
    return {
      x: rect.left + (rect.width - item.width * scale) / 2,
      y: rect.top + (rect.height - item.height * scale) / 2,
      w: item.width * scale,
    };
  });

  lightbox.on("afterInit", () => {
    const trigger = mapView && document.activeElement instanceof HTMLElement ? document.activeElement : lightbox.pswp?.currSlide?.data.element;
    lightbox.pswp?.on("destroy", () => {
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    });
  });

  lightbox.on("uiRegister", () => {
    lightbox.pswp?.ui?.registerElement({
      name: "photo-caption",
      order: 9,
      isButton: false,
      appendTo: "root",
      onInit: (element, pswp) => {
        const title = document.createElement("p");
        title.className = "pswp__photo-title";
        const place = document.createElement("p");
        place.className = "pswp__photo-location";
        const settings = document.createElement("p");
        settings.className = "pswp__photo-settings";
        const equipment = document.createElement("p");
        equipment.className = "pswp__photo-equipment";
        element.append(title, place, settings, equipment);
        element.setAttribute("aria-live", "polite");
        const update = () => {
          const data = pswp.currSlide?.data.element?.dataset;
          title.textContent = data?.photoTitle || "";
          place.textContent = data?.photoLocation || "";
          settings.textContent = data?.photoSettings || "";
          equipment.textContent = data?.photoEquipment || "";
          for (const line of [title, place, settings, equipment]) line.hidden = !line.textContent;
          equipment.title = equipment.textContent;
          element.hidden = [title, place, settings, equipment].every((line) => !line.textContent);
        };
        pswp.on("change", update);
        update();
      },
    });
  });
  // Await the lazy module ourselves so a failed download can follow the image
  // link instead of PhotoSwipe swallowing the click with an unhandled promise.
  let openingRequest = 0;
  gallery.addEventListener("click", async (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(".photo-link") : null;
    if (!link || !grid?.contains(link)) return;
    event.preventDefault();
    const request = ++openingRequest;
    try {
      await loadPhotoSwipe();
      if (controller.signal.aborted || request !== openingRequest) return;
      const index = [...grid.querySelectorAll(".photo-link")].indexOf(link);
      const point = event.detail ? { x: event.clientX, y: event.clientY } : undefined;
      if (!lightbox.loadAndOpen(index, { gallery: grid }, point)) window.location.assign(link.href);
    } catch {
      if (!controller.signal.aborted && request === openingRequest) window.location.assign(link.href);
    }
  }, { signal: controller.signal });

  async function openGroup(links: HTMLAnchorElement[]) {
    if (!grid || !links.length) return;
    try {
      await loadPhotoSwipe();
      if (controller.signal.aborted) return;
      if (!lightbox.loadAndOpen(0, { gallery: grid, items: links })) window.location.assign(links[0].href);
    } catch {
      if (!controller.signal.aborted) window.location.assign(links[0].href);
    }
  }

  dispose = () => {
    controller.abort();
    lightbox.destroy();
    photoMap?.dispose();
  };
}

const lifecycle = new AbortController();
document.addEventListener("astro:page-load", initializePhotos, { signal: lifecycle.signal });
document.addEventListener("astro:before-swap", () => {
  dispose?.();
  dispose = undefined;
}, { signal: lifecycle.signal });
initializePhotos();

if (import.meta.hot) import.meta.hot.dispose(() => {
  lifecycle.abort();
  dispose?.();
});
