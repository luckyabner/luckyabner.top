import { parseCoordinates, roundCoordinate as round } from "../lib/photo-coordinates.mjs";
import { createBaseMap, L, loadMapStyles } from "./photo-map-base";

interface LocatePhoto {
  source: string;
  title: string;
  alt: string;
  takenAt: string;
  published: boolean;
  placeholder: string;
  thumbnail: string;
  large: string;
  location: { lat: number; lng: number; name?: string } | null;
}

const ENDPOINT = "/__photos/location";
const GEOCODE_ENDPOINT = "/__photos/geocode";

interface Place {
  lat: number;
  lng: number;
  name: string;
  address: string;
}
const key = (location: { lat: number; lng: number }) => `${location.lat},${location.lng}`;

async function initialize() {
  const root = document.querySelector<HTMLElement>("[data-locate]");
  if (!root) return;
  const $ = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const list = $<HTMLUListElement>("[data-locate-list]");
  const progress = $<HTMLElement>("[data-locate-progress]");
  const selectionText = $<HTMLElement>("[data-locate-selection]");
  const status = $<HTMLElement>("[data-locate-status]");
  const form = $<HTMLFormElement>("[data-locate-form]");
  const coordinatesInput = form.elements.namedItem("coordinates") as HTMLInputElement;
  const nameInput = form.elements.namedItem("name") as HTMLInputElement;
  const unlocatedOnly = $<HTMLInputElement>("[data-locate-unlocated]");
  const saveButton = $<HTMLButtonElement>("[data-locate-save]");
  const reuseButton = $<HTMLButtonElement>("[data-locate-reuse]");
  const clearButton = $<HTMLButtonElement>("[data-locate-clear]");
  const deleteButton = $<HTMLButtonElement>("[data-locate-delete]");
  const items = new Map<string, HTMLLIElement>();

  await loadMapStyles();
  let photos: LocatePhoto[] = [];
  const selected = new Set<string>();
  let pending: { lat: number; lng: number } | null = null;
  let lastSaved: { lat: number; lng: number; name?: string } | null = null;

  const { map } = createBaseMap($<HTMLElement>("[data-locate-map]"), { center: [30, 110], zoom: 3 });
  const savedLayer = L.layerGroup().addTo(map);
  const pendingMarker = L.marker([0, 0], {
    draggable: true,
    keyboard: false,
    icon: L.divIcon({ className: "locate-pending", html: "<span></span>", iconSize: [22, 22] }),
  });
  pendingMarker.on("dragend", () => setPending(pendingMarker.getLatLng(), false));

  function setPending(point: { lat: number; lng: number } | null, pan = false) {
    pending = point && { lat: round(point.lat), lng: round(point.lng) };
    if (pending) {
      pendingMarker.setLatLng(pending).addTo(map);
      coordinatesInput.value = `${pending.lat}, ${pending.lng}`;
      if (pan) map.setView(pending, Math.max(map.getZoom(), 12));
    } else {
      pendingMarker.remove();
      coordinatesInput.value = "";
    }
    updateControls();
  }

  function updateControls() {
    const count = selected.size;
    const located = photos.filter((photo) => photo.location).length;
    progress.textContent = `${located} / ${photos.length} located`;
    selectionText.textContent = count
      ? `${count} photo${count > 1 ? "s" : ""} selected${pending ? "" : " — click the map or paste coordinates."}`
      : "Select photos on the left, then click the map or paste coordinates.";
    saveButton.disabled = !count || !pending;
    deleteButton.disabled = !count;
    clearButton.disabled = ![...selected].some((source) => photos.find((photo) => photo.source === source)?.location);
    reuseButton.disabled = !lastSaved;
  }

  const isVisible = (photo: LocatePhoto) => !unlocatedOnly.checked || !photo.location || selected.has(photo.source);

  function updateItem(item: HTMLLIElement, photo: LocatePhoto) {
    item.dataset.located = String(Boolean(photo.location));
    item.hidden = !isVisible(photo);
    const checkbox = item.querySelector<HTMLInputElement>("input[type=checkbox]");
    if (checkbox) checkbox.checked = selected.has(photo.source);
    const meta = item.querySelector<HTMLElement>(".locate-item-meta");
    if (meta) {
      meta.textContent = `${photo.takenAt.slice(0, 10)} · ${photo.location ? photo.location.name || key(photo.location) : "no location"}${photo.published ? "" : " · unpublished"}`;
    }
  }

  // Rows are built once and then patched in place, so saving never reloads the
  // thumbnails or resets the list's scroll position.
  function createItem(photo: LocatePhoto) {
    const item = document.createElement("li");
    item.className = "locate-item";
    item.dataset.source = photo.source;
    const label = document.createElement("label");
    label.className = "locate-item-label";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selected.add(photo.source);
      else selected.delete(photo.source);
      onSelectionChange();
    });
    const text = document.createElement("span");
    text.className = "locate-item-text";
    const name = document.createElement("span");
    name.textContent = photo.title || photo.source;
    name.title = photo.source;
    const meta = document.createElement("span");
    meta.className = "locate-item-meta";
    text.append(name, meta);
    label.append(checkbox, text);
    // The thumbnail stays outside the label so clicking it opens the large
    // preview instead of toggling the checkbox.
    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = "locate-item-thumb";
    thumb.title = "View large";
    thumb.addEventListener("click", () => openViewer(photo));
    const image = document.createElement("img");
    image.src = photo.thumbnail;
    image.alt = "";
    image.loading = "lazy";
    image.style.background = photo.placeholder;
    thumb.append(image);
    item.append(label, thumb);
    updateItem(item, photo);
    items.set(photo.source, item);
    return item;
  }

  function renderList() {
    items.clear();
    list.replaceChildren(...photos.map(createItem));
  }

  function updateItems(sources: Iterable<string> = items.keys()) {
    for (const source of sources) {
      const item = items.get(source);
      const photo = photos.find((candidate) => candidate.source === source);
      if (item && photo) updateItem(item, photo);
    }
  }

  function renderSaved() {
    savedLayer.clearLayers();
    const groups = new Map<string, LocatePhoto[]>();
    for (const photo of photos) {
      if (!photo.location) continue;
      groups.set(key(photo.location), [...(groups.get(key(photo.location)) ?? []), photo]);
    }
    for (const group of groups.values()) {
      const location = group[0].location!;
      const isSelected = group.some((photo) => selected.has(photo.source));
      const marker = L.marker(location, {
        title: `${location.name || key(location)} (${group.length})`,
        icon: L.divIcon({ className: "locate-dot", html: isSelected ? '<span data-selected></span>' : "<span></span>", iconSize: [14, 14] }),
      });
      // Clicking a saved point selects the photos tagged there.
      marker.on("click", () => {
        selected.clear();
        for (const photo of group) selected.add(photo.source);
        onSelectionChange();
      });
      savedLayer.addLayer(marker);
    }
  }

  function onSelectionChange() {
    const chosen = photos.filter((photo) => selected.has(photo.source));
    const locations = new Set(chosen.map((photo) => photo.location && key(photo.location)));
    const shared = chosen.length && locations.size === 1 ? chosen[0].location : null;
    if (shared) {
      setPending(shared, true);
      nameInput.value = shared.name ?? "";
    }
    updateItems();
    renderSaved();
    updateControls();
  }

  function setPhotos(next: LocatePhoto[]) {
    photos = next;
    for (const source of selected) if (!photos.some((photo) => photo.source === source)) selected.delete(source);
    renderList();
    renderSaved();
    updateControls();
  }

  // Dropping deleted photos keeps the remaining rows (and their thumbnails)
  // untouched instead of rebuilding the whole list.
  function forgetPhotos(removed: Iterable<string>) {
    const gone = new Set(removed);
    for (const source of gone) {
      items.get(source)?.remove();
      items.delete(source);
      selected.delete(source);
    }
    photos = photos.filter((photo) => !gone.has(photo.source));
    renderSaved();
    updateControls();
  }

  async function send(updates: { source: string; location: { lat: number; lng: number; name?: string } | null }[]) {
    status.textContent = "Saving…";
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || response.statusText);
      const locations = new Map<string, LocatePhoto["location"]>(
        (body.photos as LocatePhoto[]).map((photo) => [photo.source, photo.location]),
      );
      const touched = new Set(updates.map((update) => update.source));
      for (const photo of photos) if (locations.has(photo.source)) photo.location = locations.get(photo.source) ?? null;
      selected.clear();
      updateItems(touched);
      renderSaved();
      updateControls();
      status.textContent = `Saved ${updates.length} photo${updates.length > 1 ? "s" : ""} to src/data/photos.meta.json.`;
    } catch (error) {
      status.textContent = `Not saved: ${(error as Error).message}`;
    }
  }

  async function remove(sources: string[]) {
    status.textContent = `Deleting ${sources.length} photo${sources.length > 1 ? "s" : ""}…`;
    try {
      const response = await fetch(ENDPOINT, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources }),
      });
      const body = await response.json();
      // A dev server started before this endpoint existed only knows GET/POST.
      if (response.status === 405) throw new Error("this dev server still runs the old code — restart pnpm dev.");
      if (!response.ok) throw new Error(body.error || response.statusText);
      forgetPhotos(sources);
      const missing = (body.imagesMissing as string[] | undefined)?.length ?? 0;
      const notes = [];
      if (body.backup) notes.push(`files moved to ${body.backup}`);
      if (missing) notes.push(`${missing} image file${missing > 1 ? "s were" : " was"} already missing`);
      if ((body.exportMissing as string[] | undefined)?.length) notes.push("the original export was already gone");
      status.textContent = `Deleted ${sources.length} photo${sources.length > 1 ? "s" : ""} from the catalog${notes.length ? `; ${notes.join("; ")}` : ""}.`;
    } catch (error) {
      status.textContent = `Not deleted: ${(error as Error).message}`;
    }
  }

  // When both values fit within ±90 the order is ambiguous; prefer the
  // reading nearer the area being viewed once the map is zoomed in.
  const readCoordinates = () => parseCoordinates(coordinatesInput.value, map.getZoom() >= 5 ? map.getCenter() : null);

  function reportSwap(point: { lat: number; lng: number; swapped: boolean }) {
    if (point.swapped) status.textContent = `Looked like “lng, lat”; swapped to ${point.lat}, ${point.lng}.`;
  }

  map.on("click", (event: L.LeafletMouseEvent) => setPending(event.latlng));

  // Place search (OpenStreetMap Nominatim via the dev server). Choosing a
  // result moves the pending point and fills the place name; saving still
  // needs a click.
  const searchForm = $<HTMLFormElement>("[data-locate-search]");
  const searchInput = searchForm.elements.namedItem("query") as HTMLInputElement;
  const searchButton = searchForm.querySelector<HTMLButtonElement>("button")!;
  const results = $<HTMLUListElement>("[data-locate-results]");

  function showResults(places: Place[], query: string) {
    results.hidden = false;
    if (!places.length) {
      const empty = document.createElement("li");
      empty.className = "locate-results-empty";
      empty.textContent = `No places found for “${query}”. Try “place, city”, other wording, or click the map.`;
      results.replaceChildren(empty);
      return;
    }
    results.replaceChildren(...places.map((place) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      const name = document.createElement("span");
      name.textContent = place.name;
      const address = document.createElement("span");
      address.className = "locate-result-address";
      address.textContent = place.address;
      address.title = place.address;
      button.append(name, address);
      button.addEventListener("click", () => {
        setPending(place, true);
        nameInput.value = place.name;
        status.textContent = `Moved to ${place.name}. Check the point, then save.`;
        results.hidden = true;
      });
      item.append(button);
      return item;
    }));
  }

  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;
    searchButton.disabled = true;
    status.textContent = "Searching…";
    try {
      const response = await fetch(`${GEOCODE_ENDPOINT}?${new URLSearchParams({ q: query })}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || response.statusText);
      showResults((body.results as Place[]).map((place) => ({ ...place, lat: round(place.lat), lng: round(place.lng) })), query);
      status.textContent = "";
    } catch (error) {
      status.textContent = `Search failed: ${(error as Error).message}`;
    } finally {
      searchButton.disabled = false;
    }
  });
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") results.hidden = true;
  });
  // Large preview: click a thumbnail to inspect the frame before deciding
  // where it was taken. ← / → walk through the list, Esc or Close returns.
  const viewer = document.createElement("dialog");
  viewer.className = "locate-viewer";
  viewer.setAttribute("aria-label", "Photo preview");
  const viewerScroller = document.createElement("div");
  viewerScroller.className = "locate-viewer-scroller";
  const viewerImage = document.createElement("img");
  viewerImage.alt = "";
  viewerScroller.append(viewerImage);
  const viewerBar = document.createElement("div");
  viewerBar.className = "locate-viewer-bar";
  const viewerCaption = document.createElement("p");
  viewerCaption.className = "locate-viewer-caption";
  const viewerNav = document.createElement("span");
  viewerNav.className = "locate-viewer-nav";
  const viewerPrev = document.createElement("button");
  viewerPrev.type = "button";
  viewerPrev.textContent = "← Prev";
  const viewerNext = document.createElement("button");
  viewerNext.type = "button";
  viewerNext.textContent = "Next →";
  const viewerClose = document.createElement("button");
  viewerClose.type = "button";
  viewerClose.textContent = "Close";
  viewerNav.append(viewerPrev, viewerNext, viewerClose);
  viewerBar.append(viewerCaption, viewerNav);
  viewer.append(viewerScroller, viewerBar);
  document.body.append(viewer);

  let viewing: LocatePhoto | null = null;

  function openViewer(photo: LocatePhoto) {
    viewing = photo;
    viewerImage.src = photo.large || photo.thumbnail;
    viewerImage.alt = photo.alt || photo.title;
    delete viewer.dataset.zoom;
    viewerScroller.scrollTo(0, 0);
    viewerCaption.textContent = `${photo.title || photo.source} · ${photo.takenAt.slice(0, 10)}${photo.location ? ` · ${photo.location.name || key(photo.location)}` : ""}`;
    if (!viewer.open) viewer.showModal();
  }

  function stepViewer(delta: number) {
    const order = photos.filter(isVisible);
    if (!order.length) return;
    const index = viewing ? order.indexOf(viewing) : -1;
    openViewer(order[(index + delta + order.length) % order.length]);
  }

  viewerImage.addEventListener("click", () => {
    if (viewer.dataset.zoom) delete viewer.dataset.zoom;
    else viewer.dataset.zoom = "actual";
  });
  viewerScroller.addEventListener("click", (event) => {
    if (event.target === viewerScroller) viewer.close();
  });
  viewerPrev.addEventListener("click", () => stepViewer(-1));
  viewerNext.addEventListener("click", () => stepViewer(1));
  viewerClose.addEventListener("click", () => viewer.close());
  viewer.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepViewer(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      stepViewer(1);
    }
  });
  viewer.addEventListener("close", () => {
    viewing = null;
    viewerImage.removeAttribute("src");
  });

  coordinatesInput.addEventListener("input", (event) => {
    const point = readCoordinates();
    if (point && (event as InputEvent).inputType === "insertFromPaste") {
      setPending(point, true);
      reportSwap(point);
      return;
    }
    pending = point && { lat: point.lat, lng: point.lng };
    if (point) pendingMarker.setLatLng(point).addTo(map);
    updateControls();
  });
  coordinatesInput.addEventListener("change", () => {
    const point = readCoordinates();
    if (point) {
      setPending(point, true);
      reportSwap(point);
    } else if (coordinatesInput.value.trim()) status.textContent = "Coordinates must be “lat, lng”, for example 30.2431, 120.15.";
  });
  unlocatedOnly.addEventListener("change", () => updateItems());
  $<HTMLButtonElement>("[data-locate-select-none]").addEventListener("click", () => {
    selected.clear();
    onSelectionChange();
  });
  reuseButton.addEventListener("click", () => {
    if (!lastSaved) return;
    setPending(lastSaved, true);
    nameInput.value = lastSaved.name ?? "";
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!pending || !selected.size) return;
    const name = nameInput.value.trim();
    const location = { ...pending, ...(name ? { name } : {}) };
    lastSaved = location;
    void send([...selected].map((source) => ({ source, location })));
  });
  clearButton.addEventListener("click", () => {
    const sources = [...selected].filter((source) => photos.find((photo) => photo.source === source)?.location);
    if (sources.length) void send(sources.map((source) => ({ source, location: null })));
  });
  deleteButton.addEventListener("click", () => {
    const sources = [...selected];
    if (!sources.length) return;
    const labels = sources.map((source) => photos.find((photo) => photo.source === source)?.title || source);
    const confirmed = confirm(
      `Delete ${sources.length} photo${sources.length > 1 ? "s" : ""}?\n\n${labels.join("\n")}\n\n` +
        "The catalog entry and metadata are removed; the original export and the generated images are moved to .photos-local/deleted/.",
    );
    if (!confirmed) return;
    void remove(sources);
  });

  try {
    const response = await fetch(ENDPOINT);
    setPhotos((await response.json()).photos);
    const points = photos.flatMap((photo) => (photo.location ? [[photo.location.lat, photo.location.lng] as [number, number]] : []));
    if (points.length) map.fitBounds(points, { padding: [40, 40], maxZoom: 12 });
  } catch (error) {
    status.textContent = `Could not load photos: ${(error as Error).message}`;
  }
}

void initialize();
