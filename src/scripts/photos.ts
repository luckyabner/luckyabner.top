import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";

const PREFERENCE_KEY = "photos-full-frame";
let dispose: (() => void) | undefined;
let coreModule: Promise<typeof import("photoswipe")> | undefined;

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
    const trigger = lightbox.pswp?.currSlide?.data.element;
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
        const settings = document.createElement("p");
        settings.className = "pswp__photo-settings";
        const equipment = document.createElement("p");
        equipment.className = "pswp__photo-equipment";
        element.append(title, settings, equipment);
        element.setAttribute("aria-live", "polite");
        const update = () => {
          const data = pswp.currSlide?.data.element?.dataset;
          title.textContent = data?.photoTitle || "";
          settings.textContent = data?.photoSettings || "";
          equipment.textContent = data?.photoEquipment || "";
          for (const line of [title, settings, equipment]) line.hidden = !line.textContent;
          equipment.title = equipment.textContent;
          element.hidden = !title.textContent && !settings.textContent && !equipment.textContent;
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
    const grid = gallery.querySelector<HTMLElement>("#photo-grid");
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

  dispose = () => {
    controller.abort();
    lightbox.destroy();
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
