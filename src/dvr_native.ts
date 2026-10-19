// TODO: Validate
import {
  type DvrApiChannel,
  type DvrApiProgram,
  CHANNEL_ORDER_KEY,
  fetchDataUrl,
  GUIDE_CACHE_KEY,
  type GuideCache,
  readGuideCache,
  requestGuideSync,
} from "./dvr_api";
import type { Logger } from "./shared";
import {
  loadChannelEpisodes,
  loadFavoriteChannels,
  loadMorePublicChannels,
} from "./site_cache";

const PIXELS_PER_MINUTE = 6;
const CHANNEL_SEED_KEY = "guideChannelSeed";
const CHANNEL_COLUMN_PX = 176;
const FAVORITES_ONLY_KEY = "guideFavoritesOnly";
const REFRESH_TIMEOUT_MS = 4000;
const dataUrls = new Map<string, Promise<string>>();
const GUIDE_CSS = `
:host { all: initial; }
.guide {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #0a0a0a;
  color: #fafafa;
  font: 14px/1.4 system-ui, sans-serif;
}
.guide * { box-sizing: border-box; }
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
  padding: 12px 16px 8px;
  border-bottom: 1px solid #303030;
}
.bar h1 { margin: 0; font-size: 18px; font-weight: 600; }
.bar small { color: #a3a3a3; font-size: 12px; margin-left: 8px; }
.actions { display: flex; gap: 8px; }
.action {
  height: 32px;
  padding: 0 12px;
  border: 1px solid #303030;
  border-radius: 6px;
  background: #171717;
  color: #fafafa;
  font: inherit;
  cursor: pointer;
}
.action:hover { border-color: #14b8a6; }
.content { flex: 1; min-height: 0; overflow: auto; padding: 8px 16px 16px; }
.filters { display: flex; flex: 1; gap: 8px; }
.search, .order {
  height: 32px;
  padding: 0 10px;
  border: 1px solid #303030;
  border-radius: 6px;
  background: #171717;
  color: #fafafa;
  font: inherit;
}
.search { flex: 1; max-width: 320px; }
.order { cursor: pointer; }
.search:focus, .order:focus { outline: none; border-color: #14b8a6; }
.channel-actions { display: flex; gap: 4px; margin-top: 4px; }
.more {
  padding: 2px 8px;
  border: 1px dashed #14b8a6;
  border-radius: 4px;
  background: transparent;
  color: #14b8a6;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.more:hover:not(:disabled), .more:focus-visible { background: #14b8a6; color: #042f2e; outline: none; }
.more:disabled { cursor: default; opacity: 0.7; }

.action.on { border-color: #14b8a6; background: #14b8a6; color: #042f2e; }
.star { color: #facc15; }
.detail {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  overflow: auto;
  background: #0a0a0a;
  color: #fafafa;
  font: 14px/1.4 system-ui, sans-serif;
  border-right: 1px solid #303030;
}
.detail * { box-sizing: border-box; }
.detail p { margin: 0; color: #a3a3a3; }
.detail .channel { color: #14b8a6; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.detail .title { color: #fafafa; font-size: 18px; font-weight: 600; }
.detail .hint { margin: auto; }
.detail .description { color: #d4d4d4; }
.detail .top { display: flex; gap: 12px; flex-shrink: 0; }
.detail .info { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.detail .thumb { width: 50%; flex-shrink: 0; align-self: flex-start; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 4px; }
.grid {
  overflow-x: auto;
  scrollbar-width: none;
  border: 1px solid #303030;
  border-radius: 6px;
  background: #171717;
}
.grid::-webkit-scrollbar { display: none; }
.hbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 8px 16px 12px;
  border-top: 1px solid #303030;
}
.hbar[hidden] { display: none; }
.page { min-width: 56px; font-size: 16px; }
.page:disabled { cursor: default; opacity: 0.4; }
.page:disabled:hover { border-color: #303030; }
.hbar-track {
  position: relative;
  flex: 1;
  height: 20px;
  border: 1px solid #303030;
  border-radius: 10px;
  background: #171717;
  cursor: pointer;
}
.hbar-thumb {
  position: absolute;
  top: 2px;
  bottom: 2px;
  border-radius: 8px;
  background: #525252;
  cursor: grab;
  touch-action: none;
}
.hbar-thumb:hover, .hbar-thumb.dragging { background: #14b8a6; }
.hbar-thumb.dragging { cursor: grabbing; }
.inner { position: relative; min-width: max-content; }
.row { display: flex; border-bottom: 1px solid #303030; }
.row:last-child { border-bottom: 0; }
.row.current { background: rgba(20, 184, 166, 0.1); border-bottom: 2px solid #14b8a6; }
.head { background: #1f1f1f; }
.label {
  position: sticky;
  left: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  width: ${CHANNEL_COLUMN_PX}px;
  flex-shrink: 0;
  padding: 8px 12px;
  border-right: 1px solid #303030;
  background: #171717;
}
.head .label { background: #262626; font-weight: 600; }
.number { color: #a3a3a3; font-variant-numeric: tabular-nums; }
.name { font-weight: 600; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
a.name { color: inherit; text-decoration: none; }
a.name:hover, a.name:focus-visible { color: #14b8a6; text-decoration: underline; outline: none; }
.tag { display: block; font-size: 12px; color: #14b8a6; }
.slot {
  flex-shrink: 0;
  width: ${30 * PIXELS_PER_MINUTE}px;
  padding: 8px;
  border-left: 1px solid #303030;
  color: #a3a3a3;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.track { position: relative; height: 64px; }
.program {
  position: absolute;
  top: 6px;
  bottom: 6px;
  overflow: hidden;
  padding: 4px 8px;
  border: 1px solid #303030;
  border-radius: 4px;
  background: #222;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.program:hover, .program:focus-visible { background: #14b8a6; color: #042f2e; outline: none; }
.program.playing { border-color: #14b8a6; background: rgba(20, 184, 166, 0.8); color: #042f2e; }
.program.selected { border-color: #14b8a6; background: #14b8a6; color: #042f2e; box-shadow: 0 0 0 2px #14b8a6; }
.program.watched { opacity: 0.6; }
.program { display: flex; align-items: center; gap: 6px; }
.program .text { min-width: 0; }
.program span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.favicon { width: 20px; height: 20px; flex-shrink: 0; object-fit: contain; border-radius: 3px; }
.detail .source { display: flex; align-items: center; gap: 8px; }
.detail .source .favicon { width: 20px; height: 20px; max-height: none; margin: 0; object-fit: contain; border-radius: 3px; }
.program .sub { font-size: 12px; opacity: 0.7; }
.now {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 10;
  width: 1px;
  background: #ef4444;
  pointer-events: none;
}
.message { padding: 48px 16px; text-align: center; color: #a3a3a3; }
.load-more { display: block; width: 100%; height: 44px; margin-top: 8px; font-size: 15px; }
.load-more:disabled { cursor: default; opacity: 0.6; }
`;

interface Program {
  program: DvrApiProgram;
  startMinute: number;
  minutes: number;
}

interface Selection {
  channel: DvrApiChannel;
  scheduled: Program;
}

export interface NativeGuideOptions {
  log: Logger;
  frameStyle: string;
  detailStyle: string;
  playing: { channelId: string; episodeId: string } | null;
  onPlay: (channel: DvrApiChannel, program: DvrApiProgram) => void;
  onClose: () => void;
}

export interface NativeGuide {
  setOpen(open: boolean): void;
  isOpen(): boolean;
}

type Child = Node | string | null | undefined | false;

// TODO: Validate
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  for (const child of children) {
    if (child) element.append(child);
  }
  return element;
}

// TODO: Validate
function applyStyles(root: ShadowRoot): void {
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(GUIDE_CSS);
    root.adoptedStyleSheets = [sheet];
  } catch {
    const style = document.createElement("style");
    style.textContent = GUIDE_CSS;
    root.prepend(style);
  }
}

// TODO: Validate
function schedule(programs: DvrApiProgram[]): Program[] {
  const scheduled: Program[] = [];
  let startMinute = 0;
  for (const program of programs) {
    const minutes = Math.max(5, Math.round((program.duration ?? 1800) / 60));
    scheduled.push({ program, startMinute, minutes });
    startMinute += minutes;
  }
  return scheduled;
}

// TODO: Validate
function shuffleRank(seed: number, id: string): number {
  let hash = seed >>> 0;
  for (let index = 0; index < id.length; index++) {
    hash = Math.imul(hash ^ id.charCodeAt(index), 2654435761);
    hash ^= hash >>> 15;
  }
  return hash >>> 0;
}

// TODO: Validate
function slotTime(date: Date): string {
  return date
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    .replace(" ", "");
}

// TODO: Validate
function windowStartAt(time: number): Date {
  const start = new Date(time);
  start.setMinutes(start.getMinutes() < 30 ? 0 : 30, 0, 0);
  return start;
}

// TODO: Validate
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const padded = (value: number): string => value.toString().padStart(2, "0");
  return hours > 0
    ? `${hours}:${padded(minutes)}:${padded(secs)}`
    : `${minutes}:${padded(secs)}`;
}

// TODO: Validate
function image(
  url: string | null,
  className?: string,
): HTMLImageElement | null {
  if (!url || !/^https?:\/\//.test(url)) return null;
  const img = el("img", className);
  img.alt = "";
  img.referrerPolicy = "no-referrer";
  img.loading = "lazy";
  let retried = false;
  img.addEventListener("error", () => {
    if (retried) {
      img.remove();
      return;
    }
    retried = true;
    let dataUrl = dataUrls.get(url);
    if (!dataUrl) {
      dataUrl = fetchDataUrl(url);
      dataUrls.set(url, dataUrl);
    }
    dataUrl
      .then((loaded) => {
        img.src = loaded;
      })
      .catch(() => img.remove());
  });
  img.src = url;
  return img;
}

// TODO: Validate
export function createNativeGuide(options: NativeGuideOptions): NativeGuide {
  const { log } = options;
  const host = el("div");
  host.id = "stream-channeler-dvr-native";
  host.style.cssText = options.frameStyle + "display:none;";
  const root = host.attachShadow({ mode: "open" });
  applyStyles(root);

  const detail = el("aside", "detail");
  detail.style.cssText = options.detailStyle;
  const updated = el("small");
  const search = el("input", "search");
  search.type = "search";
  search.placeholder = "Search channels";
  search.spellcheck = false;
  const orderSelect = el("select", "order");
  orderSelect.title = "Channel order";
  for (const [value, label] of [
    ["current", "Current sort"],
    ["random", "Random"],
  ]) {
    const option = el("option", undefined, label);
    option.value = value;
    orderSelect.append(option);
  }
  orderSelect.value = GM_getValue<string>(CHANNEL_ORDER_KEY, "current");
  orderSelect.addEventListener("change", () => {
    GM_setValue(CHANNEL_ORDER_KEY, orderSelect.value);
    if (orderSelect.value === "random") {
      GM_setValue(CHANNEL_SEED_KEY, Math.floor(Math.random() * 2 ** 32));
    }
    if (cache) renderGuide(cache);
  });
  const favorites = el("button", "action", "★ Favorites");
  favorites.type = "button";
  let favoritesStatus: "idle" | "loading" | "failed" = "idle";
  const styleFavorites = (): void => {
    const on = GM_getValue(FAVORITES_ONLY_KEY, false);
    favorites.className = on ? "action on" : "action";
    favorites.setAttribute("aria-pressed", String(on));
    favorites.textContent =
      favoritesStatus === "loading"
        ? "★ Loading…"
        : favoritesStatus === "failed"
          ? "★ Favorites (couldn't load)"
          : "★ Favorites";
  };
  styleFavorites();
  favorites.addEventListener("click", () => {
    const on = !GM_getValue(FAVORITES_ONLY_KEY, false);
    GM_setValue(FAVORITES_ONLY_KEY, on);
    favoritesStatus = on ? "loading" : "idle";
    styleFavorites();
    if (cache) renderGuide(cache);
    if (!on) return;
    loadFavoriteChannels()
      .then(() => {
        favoritesStatus = "idle";
      })
      .catch((error: unknown) => {
        log.warn("Couldn't load favorite channels:", error);
        favoritesStatus = "failed";
      })
      .finally(styleFavorites);
  });
  const close = el("button", "action", "Close");
  close.type = "button";
  close.addEventListener("click", options.onClose);
  const reload = el("button", "action", "Refresh");
  reload.type = "button";
  let refreshTimer: number | undefined;
  const finishRefresh = (): void => {
    clearTimeout(refreshTimer);
    reload.disabled = false;
    reload.textContent = "Refresh";
  };
  reload.addEventListener("click", () => {
    reload.disabled = true;
    reload.textContent = "Refreshing…";
    if (location.hostname.includes("streamchanneler.com")) {
      updated.textContent = "Reading the cache…";
    }
    requestGuideSync();
    clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      finishRefresh();
      updated.textContent =
        "Couldn't refresh: open a streamchanneler.com tab to update the guide";
    }, REFRESH_TIMEOUT_MS);
  });
  GM_addValueChangeListener(GUIDE_CACHE_KEY, () => {
    finishRefresh();
    if (open) render();
  });
  const content = el("div", "content");
  const pageLeft = el("button", "action page", "◀");
  pageLeft.type = "button";
  pageLeft.title = "Earlier";
  const pageRight = el("button", "action page", "▶");
  pageRight.type = "button";
  pageRight.title = "Later";
  const hThumb = el("div", "hbar-thumb");
  const hTrack = el("div", "hbar-track", hThumb);
  const pageUp = el("button", "action page", "▲");
  pageUp.type = "button";
  pageUp.title = "Previous channels";
  const pageDown = el("button", "action page", "▼");
  pageDown.type = "button";
  pageDown.title = "Next channels";
  const loadMore = el("button", "action load-more", "Load more channels");
  loadMore.type = "button";
  let moreStatus: "idle" | "loading" | "failed" | "done" = "idle";

  // TODO: Validate
  function styleLoadMore(): void {
    loadMore.disabled = moreStatus === "loading" || moreStatus === "done";
    loadMore.textContent = {
      idle: "Load more channels",
      loading: "Loading more channels…",
      failed: "Couldn't load more channels, retry",
      done: "No more channels",
    }[moreStatus];
  }

  // TODO: Validate
  function loadMoreChannels(): void {
    if (moreStatus === "loading" || moreStatus === "done") return;
    moreStatus = "loading";
    styleLoadMore();
    updateScrollbar();
    loadMorePublicChannels()
      .then((added) => {
        moreStatus = added === null ? "done" : "idle";
      })
      .catch((error: unknown) => {
        log.warn("Couldn't load more channels:", error);
        moreStatus = "failed";
      })
      .finally(() => {
        styleLoadMore();
        updateScrollbar();
      });
  }

  loadMore.addEventListener("click", loadMoreChannels);
  const hbar = el("div", "hbar", pageLeft, hTrack, pageRight, pageUp, pageDown);
  hbar.hidden = true;
  let grid: HTMLElement | null = null;

  // TODO: Validate
  function updateScrollbar(): void {
    const max = grid ? grid.scrollWidth - grid.clientWidth : 0;
    const maxTop = content.scrollHeight - content.clientHeight;
    hbar.hidden = !grid;
    const atBottom = content.scrollTop >= maxTop - 1;
    pageUp.disabled = content.scrollTop <= 0;
    pageDown.disabled =
      atBottom &&
      (GM_getValue(FAVORITES_ONLY_KEY, false) ||
        moreStatus === "loading" ||
        moreStatus === "done");
    hTrack.style.visibility = max > 0 ? "visible" : "hidden";
    pageLeft.disabled = max <= 0;
    pageRight.disabled = max <= 0;
    if (!grid || max <= 0) return;
    const trackWidth = hTrack.clientWidth;
    const thumbWidth = Math.max(
      40,
      (grid.clientWidth / grid.scrollWidth) * trackWidth,
    );
    hThumb.style.width = `${thumbWidth}px`;
    hThumb.style.left = `${(grid.scrollLeft / max) * (trackWidth - thumbWidth)}px`;
    pageLeft.disabled = grid.scrollLeft <= 0;
    pageRight.disabled = grid.scrollLeft >= max - 1;
  }

  // TODO: Validate
  function pageBy(direction: number): void {
    if (!grid) return;
    grid.scrollBy({
      left: direction * (grid.clientWidth - CHANNEL_COLUMN_PX),
      behavior: "smooth",
    });
  }

  // TODO: Validate
  function pageVertically(direction: number): void {
    const maxTop = content.scrollHeight - content.clientHeight;
    if (
      direction > 0 &&
      content.scrollTop >= maxTop - 1 &&
      !GM_getValue(FAVORITES_ONLY_KEY, false)
    ) {
      loadMoreChannels();
      return;
    }
    content.scrollBy({
      top: direction * content.clientHeight * 0.8,
      behavior: "smooth",
    });
  }

  pageUp.addEventListener("click", () => pageVertically(-1));
  pageDown.addEventListener("click", () => pageVertically(1));
  content.addEventListener("scroll", updateScrollbar, { passive: true });
  pageLeft.addEventListener("click", () => pageBy(-1));
  pageRight.addEventListener("click", () => pageBy(1));
  hTrack.addEventListener("pointerdown", (event) => {
    if (event.target === hThumb) return;
    const thumb = hThumb.getBoundingClientRect();
    pageBy(event.clientX < thumb.left + thumb.width / 2 ? -1 : 1);
  });
  let drag: { x: number; scrollLeft: number } | null = null;
  hThumb.addEventListener("pointerdown", (event) => {
    if (!grid) return;
    event.preventDefault();
    hThumb.setPointerCapture(event.pointerId);
    hThumb.classList.add("dragging");
    drag = { x: event.clientX, scrollLeft: grid.scrollLeft };
  });
  hThumb.addEventListener("pointermove", (event) => {
    if (!drag || !grid) return;
    const range = hTrack.clientWidth - hThumb.offsetWidth;
    if (range <= 0) return;
    const max = grid.scrollWidth - grid.clientWidth;
    grid.scrollLeft =
      drag.scrollLeft + ((event.clientX - drag.x) / range) * max;
  });
  for (const type of ["pointerup", "pointercancel"]) {
    hThumb.addEventListener(type, () => {
      drag = null;
      hThumb.classList.remove("dragging");
    });
  }
  new ResizeObserver(updateScrollbar).observe(content);
  const scroller = el(
    "div",
    "guide",
    el(
      "div",
      "bar",
      el("h1", undefined, "Stream Channeler DVR", updated),
      el("div", "filters", orderSelect, search),
      el("div", "actions", favorites, reload, close),
    ),
    content,
    hbar,
  );
  root.append(detail, scroller);

  for (const type of ["keydown", "keyup", "keypress"]) {
    host.addEventListener(type, (event) => {
      const target = event.composedPath()[0];
      if (target === search || target === orderSelect) event.stopPropagation();
    });
  }

  let open = false;
  let selection: Selection | null = null;
  let cache: GuideCache | null = null;
  const buttons = new Map<string, HTMLButtonElement[]>();
  const loadingChannels = new Map<string, "more" | "refresh">();
  const failedChannels = new Map<string, "more" | "refresh">();

  search.addEventListener("input", () => {
    if (cache) renderGuide(cache);
  });

  // TODO: Validate
  function message(text: string): HTMLElement {
    return el("p", "message", text);
  }

  // TODO: Validate
  function renderDetail(windowStart: Date): void {
    if (!selection) {
      detail.replaceChildren(
        el("p", "hint", "Hover over a program to see its details."),
      );
      return;
    }
    const { channel, scheduled } = selection;
    const { program } = scheduled;
    const start = new Date(
      windowStart.getTime() + scheduled.startMinute * 60_000,
    );
    const end = new Date(start.getTime() + scheduled.minutes * 60_000);
    const timing = [
      `${slotTime(start)} - ${slotTime(end)}`,
      program.duration ? formatDuration(program.duration) : null,
    ]
      .filter(Boolean)
      .join(" · ");
    detail.replaceChildren(
      el(
        "div",
        "top",
        image(program.thumbnail_url, "thumb"),
        el(
          "div",
          "info",
          el("p", "channel", channel.name ?? ""),
          el("p", "title", program.title ?? ""),
          el("p", undefined, program.subtitle),
          el("p", undefined, timing),
          el(
            "p",
            "source",
            image(program.favicon_url, "favicon"),
            program.plugin_key ?? program.source_key,
          ),
        ),
      ),
      program.description && el("p", "description", program.description),
    );
  }

  // TODO: Validate
  function styleButton(episodeId: string): void {
    const playing = options.playing?.episodeId === episodeId;
    const selected = selection?.scheduled.program.episode_id === episodeId;
    for (const button of buttons.get(episodeId) ?? []) {
      button.className = [
        "program",
        playing && "playing",
        selected && "selected",
        button.dataset.watched === "1" && "watched",
      ]
        .filter(Boolean)
        .join(" ");
    }
  }

  // TODO: Validate
  function select(next: Selection, windowStart: Date): void {
    const previous = selection?.scheduled.program.episode_id;
    selection = next;
    if (previous) styleButton(previous);
    styleButton(next.scheduled.program.episode_id);
    renderDetail(windowStart);
  }

  // TODO: Validate
  function matchesSearch(channel: DvrApiChannel): boolean {
    const query = search.value.trim().toLowerCase();
    if (!query) return true;
    return [channel.name ?? "", channel.number?.toString() ?? ""].some(
      (value) => value.toLowerCase().includes(query),
    );
  }

  // TODO: Validate
  function channelButton(
    channel: DvrApiChannel,
    action: "more" | "refresh",
  ): HTMLElement {
    const label = action === "more" ? "More" : "Refresh";
    const busy = loadingChannels.has(channel.id);
    const button = el(
      "button",
      "more",
      loadingChannels.get(channel.id) === action
        ? "Loading…"
        : failedChannels.get(channel.id) === action
          ? `${label} failed, retry`
          : label,
    );
    button.type = "button";
    button.disabled = busy;
    button.title =
      action === "more"
        ? "Load the rest of this channel's episodes"
        : "Reload this channel's episodes";
    button.addEventListener("click", () => {
      loadingChannels.set(channel.id, action);
      failedChannels.delete(channel.id);
      if (open) render();
      loadChannelEpisodes(
        channel,
        action === "more" || (channel.loadedAll ?? false),
      )
        .catch((error: unknown) => {
          log.warn(`Couldn't load episodes for ${channel.id}:`, error);
          failedChannels.set(channel.id, action);
        })
        .finally(() => {
          loadingChannels.delete(channel.id);
          if (open) render();
        });
    });
    return button;
  }

  // TODO: Validate
  function renderGuide({ channels, favoriteIds, fetchedAt }: GuideCache): void {
    buttons.clear();
    updated.textContent = `Updated ${slotTime(new Date(fetchedAt))}`;
    const windowStart = windowStartAt(fetchedAt);
    const favoriteSet = new Set(favoriteIds ?? []);
    const favoritesOnly = GM_getValue(FAVORITES_ONLY_KEY, false);
    const order = GM_getValue<string>(CHANNEL_ORDER_KEY, "current");
    orderSelect.value = order;
    const seed = GM_getValue(CHANNEL_SEED_KEY, 0);
    const ordered =
      order === "random"
        ? [...channels].sort(
            (a, b) => shuffleRank(seed, a.id) - shuffleRank(seed, b.id),
          )
        : channels;
    const rows = ordered
      .filter((channel) => !favoritesOnly || favoriteSet.has(channel.id))
      .filter(matchesSearch)
      .map((channel) => ({ channel, programs: schedule(channel.programs) }))
      .filter((row) => row.programs.length > 0);
    const longest = Math.max(
      240,
      ...rows.map(({ programs }) =>
        programs.reduce((total, program) => total + program.minutes, 0),
      ),
    );
    const timelineMinutes = Math.ceil(longest / 30) * 30;
    const timelineWidth = `${timelineMinutes * PIXELS_PER_MINUTE}px`;

    const slots = el("div", "row head", el("div", "label", "Channel"));
    for (let index = 0; index < timelineMinutes / 30; index++) {
      const slot = new Date(windowStart.getTime() + index * 30 * 60_000);
      slots.append(
        el(
          "div",
          "slot",
          `${slot.getMonth() + 1}/${slot.getDate()} ${slotTime(slot)}`,
        ),
      );
    }

    const nowLine = el("div", "now");
    nowLine.style.left = `${
      CHANNEL_COLUMN_PX +
      ((Date.now() - windowStart.getTime()) / 60_000) * PIXELS_PER_MINUTE
    }px`;
    const inner = el("div", "inner", nowLine, slots);

    let initial: Selection | null = null;

    // TODO: Validate
    function channelLink(
      channel: DvrApiChannel,
      favorite: boolean,
    ): HTMLAnchorElement {
      const link = el(
        "a",
        "name",
        favorite && el("span", "star", "★ "),
        channel.name ?? "Untitled channel",
      );
      link.href = `https://streamchanneler.com/channels/${encodeURIComponent(channel.id)}`;
      link.title = "Open this channel on Stream Channeler";
      if (!location.hostname.endsWith("streamchanneler.com")) {
        link.target = "_blank";
        link.rel = "noopener";
      }
      return link;
    }

    // TODO: Validate
    function channelRow(
      channel: DvrApiChannel,
      programs: Program[],
      current: boolean,
    ): HTMLElement {
      const track = el("div", "track");
      track.style.width = timelineWidth;
      for (const scheduled of programs) {
        const { program } = scheduled;
        const button = el(
          "button",
          "program",
          image(program.favicon_url, "favicon"),
          el(
            "div",
            "text",
            el("span", undefined, program.title ?? ""),
            el("span", "sub", program.subtitle),
          ),
        );
        button.type = "button";
        button.title = `${program.title ?? ""} — ${program.subtitle}`;
        button.dataset.watched = program.watched ? "1" : "";
        button.style.left = `${scheduled.startMinute * PIXELS_PER_MINUTE + 2}px`;
        button.style.width = `${scheduled.minutes * PIXELS_PER_MINUTE - 4}px`;
        const choice: Selection = { channel, scheduled };
        button.addEventListener("mouseenter", () =>
          select(choice, windowStart),
        );
        button.addEventListener("focus", () => select(choice, windowStart));
        button.addEventListener("click", () => {
          if (program.url) options.onPlay(channel, program);
        });
        buttons.set(program.episode_id, [
          ...(buttons.get(program.episode_id) ?? []),
          button,
        ]);
        styleButton(program.episode_id);
        track.append(button);
        if (options.playing?.episodeId === program.episode_id) initial = choice;
      }

      const label = el(
        "div",
        "label",
        channel.number != null && el("span", "number", String(channel.number)),
        el(
          "div",
          undefined,
          current && el("span", "tag", "Current channel"),
          channelLink(channel, favoriteSet.has(channel.id)),
          channel.query &&
            el(
              "div",
              "channel-actions",
              !channel.loadedAll && channelButton(channel, "more"),
              channelButton(channel, "refresh"),
            ),
        ),
      );
      return el("div", current ? "row current" : "row", label, track);
    }

    const currentRow = rows.find(
      ({ channel }) => channel.id === options.playing?.channelId,
    );
    if (currentRow) {
      inner.append(channelRow(currentRow.channel, currentRow.programs, true));
    }
    for (const { channel, programs } of rows) {
      inner.append(channelRow(channel, programs, false));
    }

    grid = rows.length === 0 ? null : el("div", "grid", inner);
    grid?.addEventListener("scroll", updateScrollbar, { passive: true });
    content.replaceChildren(
      !grid
        ? message(
            search.value.trim()
              ? "No channels match your search."
              : favoritesOnly
                ? "No favorite channels. Sign in on streamchanneler.com to load your favorites."
                : "No channels with programs yet.",
          )
        : grid,
      !favoritesOnly && loadMore,
    );
    updateScrollbar();

    selection = null;
    if (initial) {
      select(initial, windowStart);
    } else {
      renderDetail(windowStart);
    }
  }

  // TODO: Validate
  function render(): void {
    cache = readGuideCache();
    if (!cache) {
      log.warn("No guide in the cache yet");
      updated.textContent = "";
      detail.replaceChildren();
      grid = null;
      updateScrollbar();
      content.replaceChildren(
        message(
          "The guide is empty. Open your channels on streamchanneler.com to fill it.",
        ),
      );
      return;
    }
    renderGuide(cache);
  }

  return {
    setOpen(next: boolean): void {
      if (!host.isConnected) document.body.appendChild(host);
      open = next;
      host.style.display = next ? "block" : "none";
      if (next) render();
    },
    isOpen(): boolean {
      return open;
    },
  };
}
