// ==UserScript==
// @name          Stream Channeler Remote
// @namespace     https://streamchanneler.com/
// @version       0.0.2
// @author        ryn.cx
// @description   Companion for Stream Channeler that controls media playback and assists in channel creation.
// @match         https://streamchanneler.com/*
// @match         https://www.adultswim.com/videos/*
// @match         https://www.amazon.com/gp/video/*
// @match         https://www.crunchyroll.com/watch/*
// @match         https://www.disneyplus.com/*/play/*
// @match         https://play.hbomax.com/video/watch/*
// @match         https://play.hbomax.com/movie/*
// @match         https://www.hidive.com/video/*
// @match         https://www.hidive.com/stream/*
// @match         https://www.hulu.com/watch/*
// @match         https://www3.nhk.or.jp/nhkworld/en/shows/*
// @match         https://www.netflix.com/*
// @match         https://www.paramountplus.com/shows/video/*
// @match         https://www.paramountplus.com/movies/video/*
// @match         https://www.peacocktv.com/watch/*
// @match         https://pluto.tv/*/on-demand/*
// @match         https://pluto.tv/*/live-tv/*
// @match         https://therokuchannel.roku.com/watch/*
// @match         https://tubitv.com/movies/*
// @match         https://tubitv.com/tv-shows/*
// @match         https://tubitv.com/series/*
// @match         https://www.youtube.com/watch*
// @match         https://www.adultswim.com/*
// @match         https://www.primevideo.com/*
// @match         https://www.crunchyroll.com/*
// @match         https://www.disneyplus.com/*
// @match         https://play.hbomax.com/*
// @match         https://www.hbomax.com/*
// @match         https://www.hidive.com/*
// @match         https://www.hulu.com/*
// @match         https://www3.nhk.or.jp/nhkworld/*
// @match         https://www.paramountplus.com/*
// @match         https://www.peacocktv.com/*
// @match         https://pluto.tv/*
// @match         https://therokuchannel.roku.com/*
// @match         https://www.themoviedb.org/*
// @match         https://tubitv.com/*
// @match         https://www.youtube.com/*
// @source        https://github.com/ryn-cx/stream-channeler-remote
// @grant         GM_setValue
// @grant         GM_getValue
// @grant         GM_addValueChangeListener
// @grant         GM_deleteValue
// @grant         GM_registerMenuCommand
// @grant         GM_unregisterMenuCommand
// @grant         GM_xmlhttpRequest
// @connect       api.streamchanneler.com
// @connect       *
// @run-at        document-end
// ==/UserScript==

/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/dvr.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  We: () => (/* binding */ DVR_DETAIL_WIDTH_VW),
  de: () => (/* binding */ DVR_GUIDE_HEIGHT_VH),
  $S: () => (/* binding */ bridgeDvrPage),
  Vs: () => (/* binding */ isDvrGuideOpen),
  kQ: () => (/* binding */ mountDvrGuide),
  Fc: () => (/* binding */ openDvrGuide),
  $c: () => (/* binding */ storeDvrToken),
  nl: () => (/* binding */ toggleDvrGuide)
});

// UNUSED EXPORTS: setDvrGuideOpen

// EXTERNAL MODULE: ./src/dvr_api.ts
var dvr_api = __webpack_require__("./src/dvr_api.ts");
// EXTERNAL MODULE: ./src/site_cache.ts
var site_cache = __webpack_require__("./src/site_cache.ts");
;// ./src/dvr_native.ts
// TODO: Validate


const PIXELS_PER_MINUTE = 6;
const CHANNEL_SEED_KEY = "guideChannelSeed";
const CHANNEL_COLUMN_PX = 176;
const FAVORITES_ONLY_KEY = "guideFavoritesOnly";
const REFRESH_TIMEOUT_MS = 4000;
const dataUrls = new Map();
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
`;
// TODO: Validate
function el(tag, className, ...children) {
    const element = document.createElement(tag);
    if (className)
        element.className = className;
    for (const child of children) {
        if (child)
            element.append(child);
    }
    return element;
}
// TODO: Validate
function applyStyles(root) {
    try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(GUIDE_CSS);
        root.adoptedStyleSheets = [sheet];
    }
    catch {
        const style = document.createElement("style");
        style.textContent = GUIDE_CSS;
        root.prepend(style);
    }
}
// TODO: Validate
function schedule(programs) {
    const scheduled = [];
    let startMinute = 0;
    for (const program of programs) {
        const minutes = Math.max(5, Math.round((program.duration ?? 1800) / 60));
        scheduled.push({ program, startMinute, minutes });
        startMinute += minutes;
    }
    return scheduled;
}
// TODO: Validate
function shuffleRank(seed, id) {
    let hash = seed >>> 0;
    for (let index = 0; index < id.length; index++) {
        hash = Math.imul(hash ^ id.charCodeAt(index), 2654435761);
        hash ^= hash >>> 15;
    }
    return hash >>> 0;
}
// TODO: Validate
function slotTime(date) {
    return date
        .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        .replace(" ", "");
}
// TODO: Validate
function windowStartAt(time) {
    const start = new Date(time);
    start.setMinutes(start.getMinutes() < 30 ? 0 : 30, 0, 0);
    return start;
}
// TODO: Validate
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const padded = (value) => value.toString().padStart(2, "0");
    return hours > 0
        ? `${hours}:${padded(minutes)}:${padded(secs)}`
        : `${minutes}:${padded(secs)}`;
}
// TODO: Validate
function dvr_native_image(url, className) {
    if (!url || !/^https?:\/\//.test(url))
        return null;
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
            dataUrl = (0,dvr_api/* fetchDataUrl */.O6)(url);
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
function createNativeGuide(options) {
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
    orderSelect.value = GM_getValue(dvr_api/* CHANNEL_ORDER_KEY */.ht, "current");
    orderSelect.addEventListener("change", () => {
        GM_setValue(dvr_api/* CHANNEL_ORDER_KEY */.ht, orderSelect.value);
        if (orderSelect.value === "random") {
            GM_setValue(CHANNEL_SEED_KEY, Math.floor(Math.random() * 2 ** 32));
        }
        if (cache)
            renderGuide(cache);
    });
    const favorites = el("button", "action", "★ Favorites");
    favorites.type = "button";
    const styleFavorites = () => {
        const on = GM_getValue(FAVORITES_ONLY_KEY, false);
        favorites.className = on ? "action on" : "action";
        favorites.setAttribute("aria-pressed", String(on));
    };
    styleFavorites();
    favorites.addEventListener("click", () => {
        GM_setValue(FAVORITES_ONLY_KEY, !GM_getValue(FAVORITES_ONLY_KEY, false));
        styleFavorites();
        if (cache)
            renderGuide(cache);
    });
    const close = el("button", "action", "Close");
    close.type = "button";
    close.addEventListener("click", options.onClose);
    const reload = el("button", "action", "Refresh");
    reload.type = "button";
    let refreshTimer;
    const finishRefresh = () => {
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
        (0,dvr_api/* requestGuideSync */.hg)();
        clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(() => {
            finishRefresh();
            updated.textContent =
                "Couldn't refresh: open a streamchanneler.com tab to update the guide";
        }, REFRESH_TIMEOUT_MS);
    });
    GM_addValueChangeListener(dvr_api/* GUIDE_CACHE_KEY */.YE, () => {
        finishRefresh();
        if (open)
            render();
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
    const hbar = el("div", "hbar", pageLeft, hTrack, pageRight);
    hbar.hidden = true;
    let grid = null;
    // TODO: Validate
    function updateScrollbar() {
        const max = grid ? grid.scrollWidth - grid.clientWidth : 0;
        hbar.hidden = !grid || max <= 0;
        if (!grid || max <= 0)
            return;
        const trackWidth = hTrack.clientWidth;
        const thumbWidth = Math.max(40, (grid.clientWidth / grid.scrollWidth) * trackWidth);
        hThumb.style.width = `${thumbWidth}px`;
        hThumb.style.left = `${(grid.scrollLeft / max) * (trackWidth - thumbWidth)}px`;
        pageLeft.disabled = grid.scrollLeft <= 0;
        pageRight.disabled = grid.scrollLeft >= max - 1;
    }
    // TODO: Validate
    function pageBy(direction) {
        if (!grid)
            return;
        grid.scrollBy({
            left: direction * (grid.clientWidth - CHANNEL_COLUMN_PX),
            behavior: "smooth",
        });
    }
    pageLeft.addEventListener("click", () => pageBy(-1));
    pageRight.addEventListener("click", () => pageBy(1));
    hTrack.addEventListener("pointerdown", (event) => {
        if (event.target === hThumb)
            return;
        const thumb = hThumb.getBoundingClientRect();
        pageBy(event.clientX < thumb.left + thumb.width / 2 ? -1 : 1);
    });
    let drag = null;
    hThumb.addEventListener("pointerdown", (event) => {
        if (!grid)
            return;
        event.preventDefault();
        hThumb.setPointerCapture(event.pointerId);
        hThumb.classList.add("dragging");
        drag = { x: event.clientX, scrollLeft: grid.scrollLeft };
    });
    hThumb.addEventListener("pointermove", (event) => {
        if (!drag || !grid)
            return;
        const range = hTrack.clientWidth - hThumb.offsetWidth;
        if (range <= 0)
            return;
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
    const scroller = el("div", "guide", el("div", "bar", el("h1", undefined, "Stream Channeler DVR", updated), el("div", "filters", orderSelect, search), el("div", "actions", favorites, reload, close)), content, hbar);
    root.append(detail, scroller);
    for (const type of ["keydown", "keyup", "keypress"]) {
        host.addEventListener(type, (event) => {
            const target = event.composedPath()[0];
            if (target === search || target === orderSelect)
                event.stopPropagation();
        });
    }
    let open = false;
    let selection = null;
    let cache = null;
    const buttons = new Map();
    const loadingChannels = new Map();
    const failedChannels = new Map();
    search.addEventListener("input", () => {
        if (cache)
            renderGuide(cache);
    });
    // TODO: Validate
    function message(text) {
        return el("p", "message", text);
    }
    // TODO: Validate
    function renderDetail(windowStart) {
        if (!selection) {
            detail.replaceChildren(el("p", "hint", "Hover over a program to see its details."));
            return;
        }
        const { channel, scheduled } = selection;
        const { program } = scheduled;
        const start = new Date(windowStart.getTime() + scheduled.startMinute * 60000);
        const end = new Date(start.getTime() + scheduled.minutes * 60000);
        const timing = [
            `${slotTime(start)} - ${slotTime(end)}`,
            program.duration ? formatDuration(program.duration) : null,
        ]
            .filter(Boolean)
            .join(" · ");
        detail.replaceChildren(el("div", "top", dvr_native_image(program.thumbnail_url, "thumb"), el("div", "info", el("p", "channel", channel.name ?? ""), el("p", "title", program.title ?? ""), el("p", undefined, program.subtitle), el("p", undefined, timing), el("p", "source", dvr_native_image(program.favicon_url, "favicon"), program.plugin_key ?? program.source_key))), program.description && el("p", "description", program.description));
    }
    // TODO: Validate
    function styleButton(episodeId) {
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
    function select(next, windowStart) {
        const previous = selection?.scheduled.program.episode_id;
        selection = next;
        if (previous)
            styleButton(previous);
        styleButton(next.scheduled.program.episode_id);
        renderDetail(windowStart);
    }
    // TODO: Validate
    function matchesSearch(channel) {
        const query = search.value.trim().toLowerCase();
        if (!query)
            return true;
        return [channel.name ?? "", channel.number?.toString() ?? ""].some((value) => value.toLowerCase().includes(query));
    }
    // TODO: Validate
    function channelButton(channel, action) {
        const label = action === "more" ? "More" : "Refresh";
        const busy = loadingChannels.has(channel.id);
        const button = el("button", "more", loadingChannels.get(channel.id) === action
            ? "Loading…"
            : failedChannels.get(channel.id) === action
                ? `${label} failed, retry`
                : label);
        button.type = "button";
        button.disabled = busy;
        button.title =
            action === "more"
                ? "Load the rest of this channel's episodes"
                : "Reload this channel's episodes";
        button.addEventListener("click", () => {
            loadingChannels.set(channel.id, action);
            failedChannels.delete(channel.id);
            if (open)
                render();
            (0,site_cache/* loadChannelEpisodes */.cu)(channel, action === "more" || (channel.loadedAll ?? false))
                .catch((error) => {
                log.warn(`Couldn't load episodes for ${channel.id}:`, error);
                failedChannels.set(channel.id, action);
            })
                .finally(() => {
                loadingChannels.delete(channel.id);
                if (open)
                    render();
            });
        });
        return button;
    }
    // TODO: Validate
    function renderGuide({ channels, favoriteIds, fetchedAt }) {
        buttons.clear();
        updated.textContent = `Updated ${slotTime(new Date(fetchedAt))}`;
        const windowStart = windowStartAt(fetchedAt);
        const favoriteSet = new Set(favoriteIds ?? []);
        const favoritesOnly = GM_getValue(FAVORITES_ONLY_KEY, false);
        const order = GM_getValue(dvr_api/* CHANNEL_ORDER_KEY */.ht, "current");
        orderSelect.value = order;
        const seed = GM_getValue(CHANNEL_SEED_KEY, 0);
        const ordered = order === "random"
            ? [...channels].sort((a, b) => shuffleRank(seed, a.id) - shuffleRank(seed, b.id))
            : channels;
        const rows = ordered
            .filter((channel) => !favoritesOnly || favoriteSet.has(channel.id))
            .filter(matchesSearch)
            .map((channel) => ({ channel, programs: schedule(channel.programs) }))
            .filter((row) => row.programs.length > 0);
        const longest = Math.max(240, ...rows.map(({ programs }) => programs.reduce((total, program) => total + program.minutes, 0)));
        const timelineMinutes = Math.ceil(longest / 30) * 30;
        const timelineWidth = `${timelineMinutes * PIXELS_PER_MINUTE}px`;
        const slots = el("div", "row head", el("div", "label", "Channel"));
        for (let index = 0; index < timelineMinutes / 30; index++) {
            const slot = new Date(windowStart.getTime() + index * 30 * 60000);
            slots.append(el("div", "slot", `${slot.getMonth() + 1}/${slot.getDate()} ${slotTime(slot)}`));
        }
        const nowLine = el("div", "now");
        nowLine.style.left = `${CHANNEL_COLUMN_PX +
            ((Date.now() - windowStart.getTime()) / 60000) * PIXELS_PER_MINUTE}px`;
        const inner = el("div", "inner", nowLine, slots);
        let initial = null;
        // TODO: Validate
        function channelLink(channel, favorite) {
            const link = el("a", "name", favorite && el("span", "star", "★ "), channel.name ?? "Untitled channel");
            link.href = `https://streamchanneler.com/channels/${encodeURIComponent(channel.id)}`;
            link.title = "Open this channel on Stream Channeler";
            if (!location.hostname.endsWith("streamchanneler.com")) {
                link.target = "_blank";
                link.rel = "noopener";
            }
            return link;
        }
        // TODO: Validate
        function channelRow(channel, programs, current) {
            const track = el("div", "track");
            track.style.width = timelineWidth;
            for (const scheduled of programs) {
                const { program } = scheduled;
                const button = el("button", "program", dvr_native_image(program.favicon_url, "favicon"), el("div", "text", el("span", undefined, program.title ?? ""), el("span", "sub", program.subtitle)));
                button.type = "button";
                button.title = `${program.title ?? ""} — ${program.subtitle}`;
                button.dataset.watched = program.watched ? "1" : "";
                button.style.left = `${scheduled.startMinute * PIXELS_PER_MINUTE + 2}px`;
                button.style.width = `${scheduled.minutes * PIXELS_PER_MINUTE - 4}px`;
                const choice = { channel, scheduled };
                button.addEventListener("mouseenter", () => select(choice, windowStart));
                button.addEventListener("focus", () => select(choice, windowStart));
                button.addEventListener("click", () => {
                    if (program.url)
                        options.onPlay(channel, program);
                });
                buttons.set(program.episode_id, [
                    ...(buttons.get(program.episode_id) ?? []),
                    button,
                ]);
                styleButton(program.episode_id);
                track.append(button);
                if (options.playing?.episodeId === program.episode_id)
                    initial = choice;
            }
            const label = el("div", "label", channel.number != null && el("span", "number", String(channel.number)), el("div", undefined, current && el("span", "tag", "Current channel"), channelLink(channel, favoriteSet.has(channel.id)), channel.query &&
                el("div", "channel-actions", !channel.loadedAll && channelButton(channel, "more"), channelButton(channel, "refresh"))));
            return el("div", current ? "row current" : "row", label, track);
        }
        const currentRow = rows.find(({ channel }) => channel.id === options.playing?.channelId);
        if (currentRow) {
            inner.append(channelRow(currentRow.channel, currentRow.programs, true));
        }
        for (const { channel, programs } of rows) {
            inner.append(channelRow(channel, programs, false));
        }
        grid = rows.length === 0 ? null : el("div", "grid", inner);
        grid?.addEventListener("scroll", updateScrollbar, { passive: true });
        content.replaceChildren(!grid
            ? message(search.value.trim()
                ? "No channels match your search."
                : favoritesOnly
                    ? "No favorite channels in the cache. Open your favorites on streamchanneler.com to load them."
                    : "No channels with programs yet.")
            : grid);
        updateScrollbar();
        selection = null;
        if (initial) {
            select(initial, windowStart);
        }
        else {
            renderDetail(windowStart);
        }
    }
    // TODO: Validate
    function render() {
        cache = (0,dvr_api/* readGuideCache */.j_)();
        if (!cache) {
            log.warn("No guide in the cache yet");
            updated.textContent = "";
            detail.replaceChildren();
            grid = null;
            updateScrollbar();
            content.replaceChildren(message("The guide is empty. Open your channels on streamchanneler.com to fill it."));
            return;
        }
        renderGuide(cache);
    }
    return {
        setOpen(next) {
            if (!host.isConnected)
                document.body.appendChild(host);
            open = next;
            host.style.display = next ? "block" : "none";
            if (next)
                render();
        },
        isOpen() {
            return open;
        },
    };
}

// EXTERNAL MODULE: ./src/remote.ts
var remote = __webpack_require__("./src/remote.ts");
// EXTERNAL MODULE: ./src/shared.ts
var shared = __webpack_require__("./src/shared.ts");
;// ./src/dvr.ts
// TODO: Validate




const MESSAGE_SOURCE = "stream-channeler-dvr";
const REOPEN_GUIDE_KEY = "reopenGuideAt";
const REOPEN_GUIDE_MS = 60000;
const DVR_GUIDE_HEIGHT_VH = 65;
const DVR_DETAIL_WIDTH_VW = 40;
const FRAME_STYLE = `position:fixed;left:0;right:0;bottom:0;width:100vw;height:${DVR_GUIDE_HEIGHT_VH}vh;border:0;border-top:1px solid #303030;z-index:2147483647;background:#0a0a0a;color-scheme:dark;box-shadow:0 -8px 24px rgba(0,0,0,0.6);`;
const DETAIL_STYLE = `position:fixed;top:0;left:0;width:${DVR_DETAIL_WIDTH_VW}vw;height:${100 - DVR_GUIDE_HEIGHT_VH}vh;z-index:2147483647;`;
let guide = null;
let shortcutAdded = false;
// TODO: Validate
function storeDvrToken() {
    if (window.top !== window)
        return;
    if (!location.hostname.includes("streamchanneler.com"))
        return;
    const token = localStorage.getItem("access_token");
    if (token)
        GM_setValue(dvr_api/* DVR_TOKEN_KEY */.XH, token);
}
// TODO: Validate
function parseProgram(data) {
    if (typeof data !== "object" || data === null)
        return null;
    const message = data;
    if (message.source !== MESSAGE_SOURCE || message.type !== "play") {
        return null;
    }
    const { channelId, channelName, episodeId, url } = message;
    if (typeof channelId !== "string" ||
        typeof episodeId !== "string" ||
        typeof url !== "string" ||
        !/^https?:\/\//.test(url)) {
        return null;
    }
    return {
        channelId,
        channelName: typeof channelName === "string" ? channelName : "",
        episodeId,
        url,
    };
}
// TODO: Validate
function bridgeDvrPage() {
    if (window.top !== window)
        return;
    document.documentElement.dataset.streamChannelerDvr = "1";
    window.addEventListener("message", (event) => {
        if (event.origin !== location.origin)
            return;
        const program = parseProgram(event.data);
        if (program)
            void (0,remote/* send */.tN)({ type: "dvr:play", program });
    });
}
// TODO: Validate
function isTyping(target) {
    return (target instanceof HTMLElement &&
        (target.isContentEditable ||
            ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)));
}
// TODO: Validate
function ensureGuide(log) {
    if (guide)
        return guide;
    const state = (0,remote/* loadState */.C7)();
    guide = createNativeGuide({
        log,
        frameStyle: FRAME_STYLE,
        detailStyle: DETAIL_STYLE,
        playing: state.mode === "dvr" && state.dvr
            ? { channelId: state.dvr.channelId, episodeId: state.dvr.episodeId }
            : null,
        onPlay: (channel, program) => {
            if (!program.url)
                return;
            GM_setValue(REOPEN_GUIDE_KEY, Date.now());
            void (0,remote/* send */.tN)({
                type: "dvr:play",
                program: {
                    channelId: channel.id,
                    channelName: channel.name ?? "",
                    episodeId: program.episode_id,
                    url: program.url,
                },
            });
        },
        onClose: () => setDvrGuideOpen(false),
    });
    return guide;
}
// TODO: Validate
function isDvrGuideOpen() {
    return guide?.isOpen() ?? false;
}
// TODO: Validate
function setDvrGuideOpen(open) {
    if (!guide)
        return;
    guide.setOpen(open);
    (0,shared/* fitFakeFullscreen */._U)();
    if (!open)
        window.focus();
}
// TODO: Validate
function toggleDvrGuide() {
    setDvrGuideOpen(!isDvrGuideOpen());
}
// TODO: Validate
function mountDvrGuide(log) {
    ensureGuide(log);
    const reopenAt = GM_getValue(REOPEN_GUIDE_KEY, 0);
    if (reopenAt && Date.now() - reopenAt < REOPEN_GUIDE_MS) {
        GM_deleteValue(REOPEN_GUIDE_KEY);
        setDvrGuideOpen(true);
    }
    if (shortcutAdded)
        return;
    shortcutAdded = true;
    window.addEventListener("keydown", (event) => {
        if (isTyping(event.composedPath()[0] ?? event.target))
            return;
        if (event.key.toLowerCase() === "g" ||
            (isDvrGuideOpen() && event.key === "Escape")) {
            event.stopPropagation();
            toggleDvrGuide();
        }
    }, true);
    log.debug("Guide overlay ready");
}
// TODO: Validate
function openDvrGuide(log) {
    mountDvrGuide(log);
    setDvrGuideOpen(true);
}


/***/ },

/***/ "./src/dvr_api.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FZ: () => (/* binding */ PREVIEW_LIMIT),
/* harmony export */   O6: () => (/* binding */ fetchDataUrl),
/* harmony export */   WK: () => (/* binding */ nextDvrProgram),
/* harmony export */   XH: () => (/* binding */ DVR_TOKEN_KEY),
/* harmony export */   YE: () => (/* binding */ GUIDE_CACHE_KEY),
/* harmony export */   ZG: () => (/* binding */ GUIDE_SYNC_REQUEST_KEY),
/* harmony export */   hg: () => (/* binding */ requestGuideSync),
/* harmony export */   ht: () => (/* binding */ CHANNEL_ORDER_KEY),
/* harmony export */   j_: () => (/* binding */ readGuideCache),
/* harmony export */   qZ: () => (/* binding */ writeGuideCache),
/* harmony export */   ui: () => (/* binding */ fetchChannelEpisodes),
/* harmony export */   v$: () => (/* binding */ markEpisodeWatched),
/* harmony export */   vj: () => (/* binding */ readWatched),
/* harmony export */   yT: () => (/* binding */ apiAssetUrl)
/* harmony export */ });
/* unused harmony export DVR_API_ORIGIN */
// TODO: Validate
const DVR_API_ORIGIN = "https://api.streamchanneler.com";
const DVR_TOKEN_KEY = "dvrAccessToken";
const GUIDE_CACHE_KEY = "guideCache";
const GUIDE_SYNC_REQUEST_KEY = "guideSyncRequest";
const CHANNEL_ORDER_KEY = "guideChannelOrder";
const PREVIEW_LIMIT = 20;
const WATCHED_KEY = "watchedEpisodes";
const WATCHED_LIMIT = 2000;
// TODO: Validate
function request(method, url, options = {}) {
    const headers = {};
    if (options.auth) {
        const token = GM_getValue(DVR_TOKEN_KEY, null);
        if (!token) {
            return Promise.reject(new Error("Not signed in; open streamchanneler.com to sign in"));
        }
        headers.Authorization = `Bearer ${token}`;
    }
    if (options.body !== undefined)
        headers["Content-Type"] = "application/json";
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method,
            url,
            headers,
            data: options.body === undefined ? undefined : JSON.stringify(options.body),
            timeout: 30000,
            onload: (response) => {
                if (response.status >= 200 && response.status < 300) {
                    resolve(response.responseText);
                }
                else {
                    reject(new Error(`${method} ${url} failed: ${response.status}`));
                }
            },
            onerror: () => reject(new Error(`${method} ${url} failed`)),
            ontimeout: () => reject(new Error(`${method} ${url} timed out`)),
        });
    });
}
// TODO: Validate
function apiUrl(path) {
    return new URL(`/api/v1${path}`, DVR_API_ORIGIN).href;
}
// TODO: Validate
async function fetchChannelEpisodes(channelId, query) {
    const url = new URL(apiUrl(`/channels/${encodeURIComponent(channelId)}/episodes`));
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null)
            continue;
        if (key === "sortBy" && Array.isArray(value)) {
            for (const sort of value) {
                url.searchParams.append(key, typeof sort === "string" ? sort : JSON.stringify(sort));
            }
        }
        else if (typeof value === "object") {
            url.searchParams.append(key, JSON.stringify(value));
        }
        else {
            url.searchParams.append(key, String(value));
        }
    }
    return JSON.parse(await request("GET", url.href, { auth: true }));
}
// TODO: Validate
function readWatched() {
    return GM_getValue(WATCHED_KEY, {});
}
// TODO: Validate
function rememberWatched(episodeId) {
    const watched = Object.entries({
        ...readWatched(),
        [episodeId]: Date.now(),
    })
        .sort(([, a], [, b]) => b - a)
        .slice(0, WATCHED_LIMIT);
    GM_setValue(WATCHED_KEY, Object.fromEntries(watched));
    const cache = readGuideCache();
    if (!cache)
        return;
    let changed = false;
    for (const channel of cache.channels) {
        for (const program of channel.programs) {
            if (program.episode_id !== episodeId || program.watched)
                continue;
            program.watched = true;
            changed = true;
        }
    }
    if (changed)
        writeGuideCache(cache);
}
// TODO: Validate
async function markEpisodeWatched(episodeId) {
    rememberWatched(episodeId);
    await request("POST", apiUrl(`/episodes/${encodeURIComponent(episodeId)}/watches`), {
        auth: true,
        body: { watch_date: new Date().toISOString(), completed: false },
    }).catch(() => undefined);
}
// TODO: Validate
function apiAssetUrl(url) {
    return url ? new URL(url, DVR_API_ORIGIN).href : null;
}
// TODO: Validate
function fetchDataUrl(url) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "GET",
            url,
            responseType: "blob",
            timeout: 30000,
            onload: (response) => {
                if (response.status < 200 || response.status >= 300) {
                    reject(new Error(`GET ${url} failed: ${response.status}`));
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(new Error(`Couldn't read ${url}`));
                reader.readAsDataURL(response.response);
            },
            onerror: () => reject(new Error(`GET ${url} failed`)),
            ontimeout: () => reject(new Error(`GET ${url} timed out`)),
        });
    });
}
// TODO: Validate
function nextDvrProgram(channel, afterEpisodeId) {
    const index = channel.programs.findIndex((program) => program.episode_id === afterEpisodeId);
    return (channel.programs
        .slice(index + 1)
        .find((program) => program.episode_id !== afterEpisodeId && program.url) ?? null);
}
// TODO: Validate
function readGuideCache() {
    return GM_getValue(GUIDE_CACHE_KEY, null);
}
// TODO: Validate
function writeGuideCache(cache) {
    GM_setValue(GUIDE_CACHE_KEY, cache);
}
// TODO: Validate
function requestGuideSync() {
    GM_setValue(GUIDE_SYNC_REQUEST_KEY, Date.now());
}


/***/ },

/***/ "./src/manage.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Ad: () => (/* binding */ initManage),
/* harmony export */   Bj: () => (/* binding */ getLastChannelId),
/* harmony export */   Nf: () => (/* binding */ setLastChannelId),
/* harmony export */   YG: () => (/* binding */ getChannelQueues),
/* harmony export */   k2: () => (/* binding */ setChannelQueues)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
// TODO: Validate

const log = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .createLogger */ .h)();
function getChannelQueues() {
    return GM_getValue("antennaChannels", {});
}
function setChannelQueues(channels) {
    GM_setValue("antennaChannels", channels);
}
function getLastChannelId() {
    return GM_getValue("antennaLastChannelId", null);
}
function setLastChannelId(channelId) {
    GM_setValue("antennaLastChannelId", channelId);
}
async function fetchChannelShowUrls(channelId) {
    const token = localStorage.getItem("access_token");
    if (!token)
        throw new Error(`No access_token in localStorage — log in to streamchanneler.com first`);
    const response = await fetch(`https://api.streamchanneler.com/api/v1/channels/${channelId}/shows`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok)
        throw new Error(`Failed to fetch shows for channel ${channelId}: ${response.status}`);
    const data = (await response.json());
    return data.shows.map((s) => s.url);
}
async function loadBlankChannels() {
    const existing = getChannelQueues();
    const hasExisting = Object.keys(existing).length > 0 &&
        Object.values(existing).some((ch) => ch.urls.length > 0);
    // Have a popup warning the user that loading this data will overwrite existing
    // data. Overwriting data is intentional so this allows the user to clear urls after
    // they have been imported.
    if (hasExisting) {
        const confirmed = confirm("This will replace all existing channel data (including queued URLs). Continue?");
        if (!confirmed)
            return;
    }
    // Get all of the channels from the page's html.
    const channels = {};
    const links = document.querySelectorAll('a[href*="/channels/"]');
    // Channel ids are UUIDs. Match the full UUID as a complete path segment so
    // non-channel links like /channels/browse are ignored (a loose [a-f0-9-]+
    // would partial-match "browse" as the bogus id "b").
    const channelIdRegex = /\/channels\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?=$|[/?#])/;
    for (const link of links) {
        const match = link.getAttribute("href")?.match(channelIdRegex);
        if (!match)
            continue;
        channels[match[1]] = {
            name: link.textContent.trim(),
            urls: [],
            showUrls: [],
        };
    }
    const ids = Object.keys(channels);
    if (ids.length === 0) {
        // No channel links found on the page — usually means the site's DOM changed
        // or this isn't the channels page. Surface it instead of silently saving {}.
        throw new Error(`No channels found on the page. The channels list DOM may have changed, or you may not be logged in.`);
    }
    // Fetch the shows already attached to each channel so plugins can detect when
    // the current page URL is already present on a channel. Use allSettled so one
    // failed fetch doesn't abort the whole load — channels are still worth saving.
    const showUrlResults = await Promise.allSettled(ids.map(fetchChannelShowUrls));
    let totalShows = 0;
    const failed = [];
    ids.forEach((id, i) => {
        const result = showUrlResults[i];
        if (result.status === "fulfilled") {
            channels[id].showUrls = result.value;
            totalShows += result.value.length;
        }
        else {
            log.error(`Failed to load shows for "${channels[id].name}":`, result.reason);
            failed.push(channels[id].name);
        }
    });
    setChannelQueues(channels);
    const failureNote = failed.length > 0
        ? `\n\n${failed.length} channel(s) failed to load shows (see console): ${failed.join(", ")}`
        : "";
    alert(`Loaded ${ids.length} channels (${totalShows} shows) into Stream Channeler Remote.${failureNote}`);
}
function pasteQueue(dialog) {
    const textarea = dialog.querySelector("textarea");
    if (!textarea)
        throw new Error("Textarea not found in bulk import modal");
    const channels = getChannelQueues();
    const output = {};
    for (const [id, channel] of Object.entries(channels)) {
        if (channel.urls.length > 0) {
            output[id] = channel.urls;
        }
    }
    textarea.value = JSON.stringify(output, null, 2);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    log.log(`Inserted URLs for ${Object.keys(output).length} channels`);
}
function addButtonsToModal(dialog) {
    const modalFooter = dialog.querySelector('[data-slot="dialog-footer"]');
    if (!modalFooter)
        return;
    if (modalFooter.querySelector("#manage-load-btn"))
        return;
    const existingBtn = modalFooter.querySelector("button");
    if (!existingBtn)
        throw new Error("No button found in dialog footer");
    const btnClass = existingBtn.className;
    const loadBtn = document.createElement("button");
    loadBtn.id = "manage-load-btn";
    loadBtn.className = btnClass;
    loadBtn.setAttribute("data-slot", "button");
    // https://lucide.dev/icons/antenna
    loadBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-antenna-icon lucide-antenna"><path d="M2 12 7 2"/><path d="m7 12 5-10"/><path d="m12 12 5-10"/><path d="m17 12 5-10"/><path d="M4.5 7h15"/><path d="M12 16v6"/></svg>Load Channels`;
    loadBtn.addEventListener("click", (e) => {
        e.preventDefault();
        loadBlankChannels().catch((err) => {
            log.error("Load Channels failed:", err);
            alert(err instanceof Error ? err.message : String(err));
        });
    });
    const insertBtn = document.createElement("button");
    insertBtn.id = "manage-insert-btn";
    insertBtn.className = btnClass;
    insertBtn.setAttribute("data-slot", "button");
    // https://lucide.dev/icons/radio-tower
    insertBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-radio-tower"><path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><path d="M16.2 4.7a6.14 6.14 0 0 1 .8 7.5"/><path d="M19.1 1.9a10.14 10.14 0 0 1 0 14.2"/><path d="M9.56 14l-2.35 8.68"/><path d="M14.44 14l2.35 8.68"/><circle cx="12" cy="12" r="2"/></svg>Insert URLs`;
    insertBtn.addEventListener("click", (e) => {
        e.preventDefault();
        pasteQueue(dialog);
    });
    modalFooter.insertBefore(insertBtn, modalFooter.firstChild);
    modalFooter.insertBefore(loadBtn, modalFooter.firstChild);
}
function initManage() {
    if (location.pathname !== "/channels")
        return;
    log.debug("Watching for the bulk import modal");
    // The bulk import dialog is rendered inside a WinBox window, so locate it by its
    // title and use the enclosing window as the dialog root.
    new MutationObserver(() => {
        for (const title of document.querySelectorAll('.winbox [data-slot="dialog-title"]')) {
            if (title.textContent?.trim() !== "Bulk Import")
                continue;
            const dialog = title.closest(".winbox");
            if (dialog)
                addButtonsToModal(dialog);
        }
    }).observe(document.body, { childList: true, subtree: true });
}


/***/ },

/***/ "./src/manage/Adult Swim/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/Adult Swim/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// Show pages look like /videos/metalocalypse; episode pages add the episode slug
// (/videos/toonami/the-return-episode-1), so require the show slug to end the
// path. Shows can also be linked as /rick-and-morty, so stored URLs of either
// form are matched by the show slug.
const SHOW_PATH_RE = /^\/videos\/[a-z0-9-]+\/?$/;
function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "Adult Swim",
        buttonColor: "#000000",
        urlRegex: SHOW_PATH_RE,
        waitSelector: "body",
        getCurrentUrl: () => `${location.origin}${location.pathname}`,
        getMatchKey: (url) => url.match(/adultswim\.com\/(?:videos\/)?([a-z0-9-]+)\/?(?:[?#]|$)/)?.[1] ?? null,
    });
}


/***/ },

/***/ "./src/manage/Amazon/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/Amazon/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// Title pages, optionally with a region prefix, a decorative name segment and a
// trailing ref, e.g.
//   https://www.primevideo.com/detail/0GTKUFQSFLP1YVFDMW9IR56I90
//   https://www.primevideo.com/region/eu/detail/The-Boys/0KRGHGZCHKS920ZQGY5LBRF7MA/ref=atv_sr
//   https://www.amazon.com/gp/video/detail/B0D9MYVLNM
// Amazon's generic /dp/<id> product pages aren't included, since every product
// on amazon.com uses them, not just videos.
const TITLE_ID_RE = /\/detail\/(?:[^/?#]+\/)?([A-Z0-9]{10,})(?:[/?#]|$)/;
function currentTitleUrl() {
    const id = location.pathname.match(TITLE_ID_RE)?.[1];
    if (!id)
        return null;
    // Queue the plain title URL the importer recognises, without the decorative
    // name, region or ref segments.
    return location.hostname.includes("amazon.com")
        ? `https://www.amazon.com/gp/video/detail/${id}`
        : `https://www.primevideo.com/detail/${id}`;
}
function isPlaybackActive() {
    // Amazon plays over the title page without changing the URL. The web
    // player covers the window while it's open.
    return document.querySelector("#dv-web-player.dv-player-fullscreen") !== null;
}
function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "Amazon",
        buttonColor: "#00a8e1",
        isValidPage: () => currentTitleUrl() !== null,
        waitSelector: "body",
        getCurrentUrl: () => currentTitleUrl() ?? location.href,
        getMatchKey: (url) => url.match(TITLE_ID_RE)?.[1] ?? null,
        isPlaybackActive,
    });
}


/***/ },

/***/ "./src/manage/Crunchyroll/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/Crunchyroll/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "Crunchyroll",
        buttonColor: "#000000",
        urlRegex: /\/series\/[A-Z0-9]+/,
        waitSelector: "h1",
        getCurrentUrl: () => location.href,
        // Crunchyroll series URLs look like /series/GT00375170/the-food-diary-of-miss-maid.
        // Match by series ID so the highlight survives slug or trailing-slash differences
        // between the page URL and the URL stored against a channel.
        getMatchKey: (url) => url.match(/\/series\/([A-Z0-9]+)/)?.[1] ?? null,
    });
}


/***/ },

/***/ "./src/manage/Disney+/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/Disney+/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
// Series and movies share one page format, with an optional locale segment, e.g.
//   https://www.disneyplus.com/browse/entity-cac75c8f-a9e2-4d95-ac73-1cf1cc7b9568
//   https://www.disneyplus.com/en-gb/browse/entity-3135b0cb-a002-438d-a9fd-60d86284c93f
const TITLE_PATH_RE = new RegExp(`^(?:/[a-z]{2}(?:-[a-z]{2})?)?/browse/entity-${UUID}/?$`);
const TITLE_ID_RE = new RegExp(`/browse/entity-(${UUID})`);
function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "Disney+",
        buttonColor: "#0063e5",
        urlRegex: TITLE_PATH_RE,
        waitSelector: "body",
        getCurrentUrl: () => `${location.origin}${location.pathname}`,
        getMatchKey: (url) => url.match(TITLE_ID_RE)?.[1] ?? null,
    });
}


/***/ },

/***/ "./src/manage/HBO Max/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/HBO Max/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
// Title pages put a media type in front of the id, optionally followed by a
// decorative slug and season, e.g.
//   https://play.hbomax.com/show/ab553cdc-e15d-4597-b65f-bec9201fd2dd
//   https://play.hbomax.com/mini-series/396999a6-3fff-4af3-802b-10c46d10deff
//   https://play.hbomax.com/movie/4ee4f57e-19bd-493f-96f9-ad3e753af981
//   https://www.hbomax.com/shows/rick-and-morty/s2/ab553cdc-e15d-4597-b65f-bec9201fd2dd
// Watch pages (/video/watch/<id>/<id>) are episodes, not titles.
const TITLE_PATH_RE = new RegExp(`^/(?!video/)[a-z-]+/(?:[a-z0-9-]+/)?(?:s\\d+/)?${UUID}/?$`);
const TITLE_ID_RE = new RegExp(`/(${UUID})/?(?:[?#]|$)`);
function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "HBO Max",
        buttonColor: "#002be7",
        urlRegex: TITLE_PATH_RE,
        waitSelector: "body",
        getCurrentUrl: () => `${location.origin}${location.pathname}`,
        getMatchKey: (url) => url.match(TITLE_ID_RE)?.[1] ?? null,
    });
}


/***/ },

/***/ "./src/manage/HiDive/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/HiDive/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// Series, seasons and movies are keyed by number, e.g.
//   https://www.hidive.com/series/1286
//   https://www.hidive.com/season/20022
//   https://www.hidive.com/video/586784
// HiDive also uses /video/<id> for individual episodes, which the importer
// can't import yet, but there's no telling them apart from the URL.
const TITLE_PATH_RE = /^\/(?:series|season|video)\/\d+\/?$/;
// A season page names its series (/season/36178?seriesId=4083), and the series
// is what the importer reads it as, so match it by the series.
function extractTitleKey(url) {
    const seriesId = url.match(/[?&]seriesId=(\d+)/)?.[1];
    if (seriesId)
        return `series/${seriesId}`;
    const match = url.match(/\/(series|season|video)\/(\d+)/);
    return match ? `${match[1]}/${match[2]}` : null;
}
function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "HiDive",
        buttonColor: "#00aeef",
        urlRegex: TITLE_PATH_RE,
        waitSelector: "body",
        // Keep the query string so a season's seriesId is queued with it.
        getCurrentUrl: () => `${location.origin}${location.pathname}${location.search}`,
        getMatchKey: extractTitleKey,
    });
}


/***/ },

/***/ "./src/manage/Hulu/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/Hulu/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
// The slug in front of the id is optional, e.g.
//   https://www.hulu.com/series/7117a15d-128c-4c2b-a5b9-98adfa0f4505
//   https://www.hulu.com/series/chad-powers-7117a15d-128c-4c2b-a5b9-98adfa0f4505
//   https://www.hulu.com/movie/the-devil-wears-prada-2-34bc6b99-813f-4d5d-bbe7-f3099b45879b
const TITLE_PATH_RE = new RegExp(`^/(?:series|movie)/(?:[a-z0-9-]+-)?${UUID}/?$`);
const TITLE_ID_RE = new RegExp(`/(?:series|movie)/(?:[a-z0-9-]+-)?(${UUID})`);
function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "Hulu",
        buttonColor: "#1ce783",
        textColor: "#000000",
        urlRegex: TITLE_PATH_RE,
        waitSelector: "body",
        getCurrentUrl: () => `${location.origin}${location.pathname}`,
        getMatchKey: (url) => url.match(TITLE_ID_RE)?.[1] ?? null,
    });
}


/***/ },

/***/ "./src/manage/NHK World/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/NHK World/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// NHK World show pages look like /nhkworld/en/shows/100years-midosuji/ where the
// trailing segment is a slug, while individual episode/video pages use an
// all-numeric id (e.g. /nhkworld/en/shows/2019439/). Only show pages should get
// the "Add to Channel" button, so require a non-numeric trailing segment.
const SHOW_PATH_RE = /^\/nhkworld\/en\/shows\/(?!\d+\/?$)[^/]+\/?$/;
function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "NHK World",
        buttonColor: "#00a0c6",
        urlRegex: SHOW_PATH_RE,
        waitSelector: ".pProgramHero__main",
        getCurrentUrl: () => location.href,
        // Match by the show slug so the highlight survives trailing-slash differences
        // between the page URL and the URL stored against a channel.
        getMatchKey: (url) => url.match(/\/shows\/([^/]+)\/?$/)?.[1] ?? null,
    });
}


/***/ },

/***/ "./src/manage/Netflix/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/Netflix/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// Titles have their own page at /title/80240027, but browsing usually opens the
// title as a modal over /browse with its id in the query string
// (/browse?jbv=80240027), so both are recognised and queued as /title/<id>.
const TITLE_PATH_RE = /^\/title\/(\d+)\/?$/;
const TITLE_ID_RE = /\/title\/(\d+)/;
function currentTitleId() {
    return (location.pathname.match(TITLE_PATH_RE)?.[1] ??
        new URLSearchParams(location.search).get("jbv"));
}
function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "Netflix",
        buttonColor: "#e50914",
        isValidPage: () => currentTitleId() !== null,
        waitSelector: "body",
        getCurrentUrl: () => {
            const id = currentTitleId();
            return id ? `https://www.netflix.com/title/${id}` : location.href;
        },
        getMatchKey: (url) => url.match(TITLE_ID_RE)?.[1] ?? null,
    });
}


/***/ },

/***/ "./src/manage/Paramount+/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/Paramount+/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// Series are keyed by slug and movies by content id, e.g.
//   https://www.paramountplus.com/shows/south-park/
//   https://www.paramountplus.com/movies/video/ALVE01KT235XQDEK58R7H2012VNZMK/
// Episode pages live under /shows/video/, which isn't a series slug.
const TITLE_PATH_RE = /^\/(?:shows\/(?!video\/?$)[a-z0-9_-]+|movies\/video\/[A-Za-z0-9_]+)\/?$/;
const TITLE_KEY_RE = /\/(shows\/(?!video\/)[a-z0-9_-]+|movies\/video\/[A-Za-z0-9_]+)(?:[/?#]|$)/;
function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "Paramount+",
        buttonColor: "#0064ff",
        urlRegex: TITLE_PATH_RE,
        waitSelector: "body",
        getCurrentUrl: () => `${location.origin}${location.pathname}`,
        getMatchKey: (url) => url.match(TITLE_KEY_RE)?.[1] ?? null,
    });
}


/***/ },

/***/ "./src/manage/Peacock/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/Peacock/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
// A series is keyed by a long number, a movie (and a few series) by a UUID.
const TITLE_KEY = `(?:${UUID}|\\d+)`;
// The section, genre and name segments in front of the id are decorative, e.g.
//   https://www.peacocktv.com/watch/asset/tv/the-office/4902514835143843112
//   https://www.peacocktv.com/watch/asset/movies/romance/renegade/06145283-20dc-3916-a072-e0c00daaa8e6
// Episode pages continue with /seasons/<n>/episodes/..., so require the id to
// end the path.
const TITLE_PATH_RE = new RegExp(`^/watch/asset(?:/[^/]+){2,3}/${TITLE_KEY}/?$`);
const TITLE_KEY_RE = new RegExp(`/watch/asset(?:/[^/?#]+){2,3}/(${TITLE_KEY})(?:[/?#]|$)`);
function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "Peacock",
        buttonColor: "#000000",
        urlRegex: TITLE_PATH_RE,
        waitSelector: "body",
        getCurrentUrl: () => `${location.origin}${location.pathname}`,
        getMatchKey: (url) => url.match(TITLE_KEY_RE)?.[1] ?? null,
    });
}


/***/ },

/***/ "./src/manage/Pluto TV/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/Pluto TV/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


const ITEM_ID = "[0-9a-f]{24}";
// Every page sits under a locale segment, e.g.
//   https://pluto.tv/en/on-demand/series/5ef05c6acdce3c001a779a79/details
//   https://pluto.tv/us/on-demand/series/5ef05c6acdce3c001a779a79/season/1
//   https://pluto.tv/en/on-demand/movies/68a54f49df1220b53566f16e/details
//   https://pluto.tv/us/movies/68a54f49df1220b53566f16e/
//   https://pluto.tv/us/shows/washed/
// Season and episode pages are read as their series.
const TITLE_PATH_RE = new RegExp(`^(?:/[a-z]{2}(?:-[a-z]{2})?)?(?:` +
    `/on-demand/series/${ITEM_ID}(?:/season/\\d+(?:/episode/${ITEM_ID})?)?(?:/details)?` +
    `|(?:/on-demand)?/movies/${ITEM_ID}(?:/details)?` +
    `|/shows/[a-z0-9-]+` +
    `)/?$`);
const TITLE_KEY_RE = new RegExp(`/(?:(?:on-demand/)?(?:series|movies)/(${ITEM_ID})|shows/([a-z0-9-]+))`);
function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "Pluto TV",
        buttonColor: "#fff200",
        textColor: "#000000",
        urlRegex: TITLE_PATH_RE,
        waitSelector: "body",
        getCurrentUrl: () => `${location.origin}${location.pathname}`,
        getMatchKey: (url) => {
            const match = url.match(TITLE_KEY_RE);
            return match?.[1] ?? match?.[2] ?? null;
        },
    });
}


/***/ },

/***/ "./src/manage/Roku/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/Roku/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// Series and movies share one page format; the slug after the id is decorative,
// and a season appends its number to the id, e.g.
//   https://therokuchannel.roku.com/details/db1607f1cff2522bb795382bb4b5bcae/fawlty-towers
const TITLE_PATH_RE = /^\/details\/[0-9a-f]{32}(?:-\d+)?(?:\/[^/]+)?\/?$/;
const TITLE_ID_RE = /\/(?:details|watch)\/([0-9a-f]{32}(?:-\d+)?)/;
function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "Roku",
        buttonColor: "#6c3c97",
        urlRegex: TITLE_PATH_RE,
        waitSelector: "body",
        getCurrentUrl: () => `${location.origin}${location.pathname}`,
        getMatchKey: (url) => url.match(TITLE_ID_RE)?.[1] ?? null,
    });
}


/***/ },

/***/ "./src/manage/TMDB/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/TMDB/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// TMDB title pages look like /tv/1396-breaking-bad or /movie/550-fight-club, and
// the slug is optional (/tv/1396 resolves to the same page). Subpages such as
// /tv/1396-breaking-bad/season/1 or /movie/550-fight-club/cast shouldn't get the
// "Add to Channel" button, so require the id segment to end the path.
const TITLE_PATH_RE = /^\/(tv|movie)\/\d+(-[^/]*)?\/?$/;
// Match by media type + numeric id so the highlight survives slug, language
// query string and trailing-slash differences between the page URL and the URL
// stored against a channel.
const TITLE_ID_RE = /\/(tv|movie)\/(\d+)/;
function extractTitleKey(url) {
    const match = url.match(TITLE_ID_RE);
    return match ? `${match[1]}/${match[2]}` : null;
}
function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "TMDB",
        buttonColor: "#01b4e4",
        textColor: "#0d253f",
        urlRegex: TITLE_PATH_RE,
        // TMDB is server-rendered, so the page body is enough of an anchor and this
        // avoids depending on the detail page's markup.
        waitSelector: "body",
        // Drop the query string (TMDB appends ?language=…) so the queued URL is the
        // plain canonical title URL.
        getCurrentUrl: () => `${location.origin}${location.pathname}`,
        getMatchKey: extractTitleKey,
    });
}


/***/ },

/***/ "./src/manage/Tubi/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/Tubi/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// Series and movies are keyed by number, followed by an optional slug, e.g.
//   https://tubitv.com/series/300006854/scooby-doo-where-are-you
//   https://tubitv.com/movies/100029837/megamind
const TITLE_PATH_RE = /^\/(?:series|movies)\/\d+(?:\/[^/]*)?\/?$/;
const TITLE_KEY_RE = /\/(series|movies)\/(\d+)/;
function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "Tubi",
        buttonColor: "#7408ff",
        urlRegex: TITLE_PATH_RE,
        waitSelector: "body",
        getCurrentUrl: () => `${location.origin}${location.pathname}`,
        getMatchKey: (url) => {
            const match = url.match(TITLE_KEY_RE);
            return match ? `${match[1]}/${match[2]}` : null;
        },
    });
}


/***/ },

/***/ "./src/manage/YouTube/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/YouTube/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


function extractChannelId(url) {
    // YouTube channels are reachable via several URL forms (/@handle, /channel/UC…,
    // /c/…, /user/…) but the Stream Channeler API stores them as /channel/UC…, so
    // match by the channel's UC… id pulled from page metadata.
    return url.match(/\/channel\/(UC[\w-]+)/)?.[1] ?? null;
}
function getCurrentChannelId() {
    // The /@handle URL doesn't contain the UC… id. YouTube renders a canonical
    // <link> and several meta tags pointing at the /channel/UC… form — read those.
    const canonical = document.querySelector('link[rel="canonical"]');
    const fromCanonical = canonical ? extractChannelId(canonical.href) : null;
    if (fromCanonical)
        return fromCanonical;
    const meta = document.querySelector('meta[itemprop="identifier"], meta[itemprop="channelId"]');
    if (meta?.content?.startsWith("UC"))
        return meta.content;
    return extractChannelId(location.href);
}
function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "YouTube",
        buttonColor: "#ff0000",
        urlRegex: /^\/(@|channel\/|c\/|user\/)/,
        // YouTube's channel-page DOM rotates between Polymer rebuilds, so don't
        // depend on a specific anchor — the footer floats over the page anyway.
        waitSelector: "body",
        getCurrentUrl: () => {
            const id = getCurrentChannelId();
            return id ? `https://www.youtube.com/channel/${id}` : location.href;
        },
        getMatchKey: extractChannelId,
    });
}


/***/ },

/***/ "./src/manage_plugin.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   v: () => (/* binding */ initManagePlugin)
/* harmony export */ });
/* harmony import */ var _manage__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage.ts");
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/shared.ts");
// TODO: Validate


// TODO: Validate
function initManagePlugin(config) {
    const log = (0,_shared__WEBPACK_IMPORTED_MODULE_1__/* .createLogger */ .h)(config.website_name);
    const containerId = `manage-${config.website_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-container`;
    const textColor = config.textColor ?? "#fff";
    // Tracks the user dismissing the footer. Intentionally not persisted — the
    // footer reappears on the next page load and whenever the page changes.
    let closed = false;
    // The resolved URL the footer was last built for. Survives a manual close so
    // that dismissing the footer keeps it hidden on the *same* page but navigating
    // to a new page brings it back. Comparing the *resolved* URL (not
    // location.href) lets derived metadata like YouTube's canonical <link> update
    // before rebuilding, avoiding a flash of stale highlight state.
    let lastSeenUrl = null;
    function createUI() {
        if (document.getElementById(containerId))
            return;
        const channelEntries = Object.entries((0,_manage__WEBPACK_IMPORTED_MODULE_0__/* .getChannelQueues */ .YG)());
        const initialUrl = config.getCurrentUrl();
        lastSeenUrl = initialUrl;
        const currentKey = config.getMatchKey(initialUrl);
        log.debug("Current URL:", initialUrl, "match key:", currentKey);
        if (!currentKey) {
            log.warn("Could not extract a match key from the current page; channels won't be highlighted");
        }
        const isOnChannel = (channelName, showUrls) => {
            if (!currentKey)
                return false;
            const urls = showUrls ?? [];
            if (urls.length === 0) {
                log.debug(`Channel "${channelName}" has no shows loaded (run "Load Channels" on /channels to load them)`);
                return false;
            }
            const showKeys = urls.map(config.getMatchKey);
            const match = showKeys.includes(currentKey);
            log.debug(`Channel "${channelName}": ${urls.length} shows, match: ${match}, keys:`, showKeys);
            return match;
        };
        const optionTextFor = (channel) => {
            const marker = isOnChannel(channel.name, channel.showUrls) ? "★ " : "";
            return `${marker}${channel.name} (${channel.urls.length} queued)`;
        };
        const container = document.createElement("div");
        container.id = containerId;
        // Every site renders the same compact widget pinned to the bottom-right corner
        // so the UI looks consistent regardless of the host page's layout.
        container.style.cssText =
            "position:fixed;bottom:16px;right:16px;z-index:2147483647;display:flex;gap:8px;align-items:center;padding:8px 10px;background:rgba(15,15,15,0.92);border:1px solid #303030;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.5);font-family:system-ui,sans-serif;font-size:13px;" +
                _shared__WEBPACK_IMPORTED_MODULE_1__/* .FADE_HIDDEN_STYLE */ .oU;
        const title = document.createElement("span");
        title.id = "manage-title";
        title.textContent = "Stream Channeler Remote";
        title.style.cssText = "color:#fff;font-weight:600;white-space:nowrap;";
        const select = document.createElement("select");
        select.id = "manage-channel-select";
        select.style.cssText =
            "min-width:180px;padding:6px 10px;border-radius:4px;border:1px solid #3a4a5c;background:#1c252f;color:#fff;font-size:13px;";
        for (const [id, channel] of channelEntries) {
            const option = document.createElement("option");
            option.value = id;
            option.textContent = optionTextFor(channel);
            if (isOnChannel(channel.name, channel.showUrls))
                option.style.color = config.buttonColor;
            select.appendChild(option);
        }
        // Restore the channel the user last selected (on any site) so the choice
        // persists across pages, then keep it up to date as they change it.
        const lastChannelId = (0,_manage__WEBPACK_IMPORTED_MODULE_0__/* .getLastChannelId */ .Bj)();
        if (lastChannelId && channelEntries.some(([id]) => id === lastChannelId)) {
            select.value = lastChannelId;
        }
        select.addEventListener("change", () => {
            if (select.value)
                (0,_manage__WEBPACK_IMPORTED_MODULE_0__/* .setLastChannelId */ .Nf)(select.value);
        });
        let sourceInput = null;
        if (config.showSourceInput) {
            sourceInput = document.createElement("input");
            sourceInput.id = "manage-source-input";
            sourceInput.type = "text";
            sourceInput.placeholder = "Source (optional)";
            sourceInput.style.cssText =
                "width:130px;padding:6px 10px;border-radius:4px;border:1px solid #3a4a5c;background:#1c252f;color:#fff;font-size:13px;";
        }
        const btn = document.createElement("button");
        btn.id = "manage-add-btn";
        btn.textContent = "Add to Channel";
        btn.style.cssText = `padding:6px 16px;border-radius:4px;border:1px solid #3a4a5c;background:${config.buttonColor};color:${textColor};font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;`;
        btn.addEventListener("click", () => {
            const channelId = select.value;
            if (!channelId)
                return;
            (0,_manage__WEBPACK_IMPORTED_MODULE_0__/* .setLastChannelId */ .Nf)(channelId);
            // Re-read the URL on every click in case the SPA navigated without
            // tearing down the UI.
            const urlToQueue = config.getCurrentUrl();
            const source = sourceInput?.value.trim() ?? "";
            const fullUrl = source ? `${source} ${urlToQueue}` : urlToQueue;
            const allChannels = (0,_manage__WEBPACK_IMPORTED_MODULE_0__/* .getChannelQueues */ .YG)();
            const channel = allChannels[channelId];
            if (!channel)
                return;
            if (channel.urls.includes(fullUrl)) {
                log.log(`URL already queued for channel "${channel.name}"`);
                btn.textContent = "Already Added";
                setTimeout(() => {
                    btn.textContent = "Add to Channel";
                }, 2000);
                return;
            }
            channel.urls.push(fullUrl);
            (0,_manage__WEBPACK_IMPORTED_MODULE_0__/* .setChannelQueues */ .k2)(allChannels);
            log.log(`Added "${fullUrl}" to channel "${channel.name}" (${channel.urls.length} total)`);
            const option = select.querySelector(`option[value="${channelId}"]`);
            if (option)
                option.textContent = optionTextFor(channel);
            btn.textContent = "Added!";
            setTimeout(() => {
                btn.textContent = "Add to Channel";
            }, 2000);
        });
        const closeBtn = document.createElement("button");
        closeBtn.id = "manage-close-btn";
        closeBtn.textContent = "×";
        closeBtn.title = "Hide";
        closeBtn.setAttribute("aria-label", "Hide");
        closeBtn.style.cssText =
            "background:transparent;border:none;color:#aaa;font-size:18px;line-height:1;cursor:pointer;padding:0 2px;";
        closeBtn.addEventListener("click", () => {
            closed = true;
            removeUI();
        });
        container.appendChild(title);
        container.appendChild(select);
        if (sourceInput)
            container.appendChild(sourceInput);
        container.appendChild(btn);
        container.appendChild(closeBtn);
        document.body.appendChild(container);
        log.debug(`UI inserted with ${channelEntries.length} channels`);
    }
    function removeUI() {
        document.getElementById(containerId)?.remove();
    }
    function isValidPage() {
        if (config.isValidPage)
            return config.isValidPage();
        return !config.urlRegex || config.urlRegex.test(location.pathname);
    }
    // TODO: Validate
    function ensureUI() {
        if (closed)
            return;
        if (!isValidPage() || config.isPlaybackActive?.()) {
            removeUI();
            return;
        }
        if (document.getElementById(containerId))
            return;
        if (!document.querySelector(config.waitSelector))
            return;
        createUI();
    }
    function onMutation() {
        // SPA sites (e.g. YouTube) navigate by pushing a new URL without reloading,
        // which would otherwise leave a stale footer in place. When the resolved
        // URL changes, re-show a dismissed footer and rebuild it for the new page.
        if (lastSeenUrl !== null && config.getCurrentUrl() !== lastSeenUrl) {
            lastSeenUrl = config.getCurrentUrl();
            closed = false;
            removeUI();
        }
        ensureUI();
    }
    log.debug("Initializing on", location.href);
    ensureUI();
    (0,_shared__WEBPACK_IMPORTED_MODULE_1__/* .fadeWhenIdle */ .Bc)(() => document.getElementById(containerId));
    new MutationObserver(onMutation).observe(document.body, {
        childList: true,
        subtree: true,
    });
}


/***/ },

/***/ "./src/playback/Adult Swim/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/Adult Swim/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);


function init() {
    (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
        name: "Adult Swim",
        playerToFullscreen: [":has(> .top-container)", ".top-container"],
        // A small delay is required to avoid cutting off the end of the video. This will
        // trigger before Adult Swim is able to change the URL after the video ends.
        watchForVideoForCompletion: true,
    });
}


/***/ },

/***/ "./src/playback/Amazon/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/Amazon/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);


const videoSelector = "#dv-web-player video";
const hideNextUpButton = ".atvwebplayersdk-nextupcard-show .atvwebplayersdk-nextupcardhide-button";
const stopAutoplayButton = 'button[aria-label="Stop autoplay"]';
const hideNextUp = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .clickWhenShown */ .IP)(hideNextUpButton);
const stopAutoplay = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .clickWhenShown */ .IP)(stopAutoplayButton);
const skipIntro = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .clickWhenShown */ .IP)('button[aria-label="Skip Intro"]');
const player = {
    name: "Amazon",
    videoSelector,
};
// TODO: Validate
function init() {
    const introButtons = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipIntros */ ._3)() ? [skipIntro] : [];
    if ((0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipCredits */ .Xd)()) {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
            ...player,
            // hideNextUpButton is shown at the end of a series or movie.
            // stopAutoplayButton is shown at the end of an episode that has an episode
            // following it.
            endSelector: [hideNextUpButton, stopAutoplayButton],
            clickButtons: introButtons,
        });
    }
    else {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
            ...player,
            // hideNextUpButton is shown at the end of a series or movie.
            // stopAutoplayButton is shown at the end of an episode that has an episode
            // following it.
            clickButtons: [...introButtons, hideNextUp, stopAutoplay],
            watchForVideoForCompletion: true,
        });
    }
}


/***/ },

/***/ "./src/playback/Crunchyroll/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/Crunchyroll/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);


// TODO: Validate
const skipIntro = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .clickWhenShown */ .IP)('button[aria-label="Skip Intro"]:not([aria-hidden="true"])');
// TODO: Validate
const skipCredits = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .clickWhenShown */ .IP)('button[aria-label="Skip Credits"]:not([aria-hidden="true"])');
// TODO: Validate
function fitPlayerToWrapper() {
    (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .waitForElement */ .xk)(".video-player-wrapper", 60000)
        .then((wrapper) => wrapper.style.setProperty("grid-template-rows", "minmax(0, 1fr)", "important"))
        .catch(() => { });
}
// TODO: Validate
function init() {
    fitPlayerToWrapper();
    const introButtons = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipIntros */ ._3)() ? [skipIntro] : [];
    if ((0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipCredits */ .Xd)()) {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
            name: "Crunchyroll",
            playerToFullscreen: [".video-player-wrapper"],
            // Episodes in the middle of a series automatically navigate to the next one.
            // watchUrl: true,
            // The last episode of a series opens a recommendations dialog instead of changing
            // the URL.
            // endSelector: "dialog.erc-end-slate-recommendations-carousel[open]",
            watchForVideoForCompletion: true,
            clickButtons: [...introButtons, skipCredits],
        });
    }
    else {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
            name: "Crunchyroll",
            playerToFullscreen: [".video-player-wrapper"],
            // Episodes in the middle of a series automatically navigate to the next one.
            // watchUrl: true,
            // The last episode of a series opens a recommendations dialog instead of changing
            // the URL.
            // endSelector: "dialog.erc-end-slate-recommendations-carousel[open]",
            watchForVideoForCompletion: true,
            clickButtons: introButtons,
        });
    }
}


/***/ },

/***/ "./src/playback/Disney+/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/Disney+/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);


// TODO: Validate
const deepButtons = (root) => [
    ...Array.from(root.querySelectorAll("button")),
    ...Array.from(root.querySelectorAll("*")).flatMap((el) => el.shadowRoot ? deepButtons(el.shadowRoot) : []),
];
// TODO: Validate
const findButton = (overlay, label) => {
    const shadowRoot = document.querySelector(overlay)?.shadowRoot;
    if (!shadowRoot)
        return undefined;
    return deepButtons(shadowRoot).find((button) => label.test(button.getAttribute("aria-label") ?? "") ||
        label.test(button.textContent?.trim() ?? ""));
};
// TODO: Validate
const click = (button) => {
    button?.click();
    return button !== undefined;
};
// TODO: Validate
const isEndCardCloseShown = () => findButton("end-card-overlay", /^Close$/) !== undefined;
// TODO: Validate
const closeEndCard = () => click(findButton("end-card-overlay", /^Close$/));
// TODO: Validate
const clickSkipButton = (label) => () => {
    const skip = findButton("skip-overlay", label);
    return click(skip?.checkVisibility({ opacityProperty: true, visibilityProperty: true })
        ? skip
        : undefined);
};
// TODO: Validate
const clickSkipCredits = clickSkipButton(/skip credits/i);
// TODO: Validate
const skipIntro = clickSkipButton(/skip intro/i);
// TODO: Validate
function init() {
    const introButtons = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipIntros */ ._3)() ? [skipIntro] : [];
    if ((0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipCredits */ .Xd)()) {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
            name: "Disney+",
            playerToFullscreen: [".btm-media-player"],
            // Detect the end of a series or the end of a movie.
            endSelector: '[data-testid="explore-post-play-view"]',
            isEnded: isEndCardCloseShown,
            // Sometimes there is a skip credits button sometimes there is not, it just
            // depends on the media.
            clickButtons: [...introButtons, clickSkipCredits],
        });
    }
    else {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
            name: "Disney+",
            playerToFullscreen: [".btm-media-player"],
            clickButtons: [...introButtons, closeEndCard],
            // The URL eventually changes, but there may be a small delay and some credits are
            // actually skipped.
            watcForhUrlChange: true,
        });
    }
}


/***/ },

/***/ "./src/playback/HBO Max/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/HBO Max/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


function waitForWatchPage() {
    return new Promise((resolve) => {
        const poll = window.setInterval(() => {
            if (location.pathname.startsWith("/video/watch/")) {
                clearInterval(poll);
                resolve();
            }
        }, 250);
    });
}
// TODO: Validate
// Movies link to their title page (/movie/<id>) rather than the player, so
// click Watch Now and wait for HBO Max to navigate to /video/watch/.
async function startMovie(log) {
    if (location.pathname.startsWith("/movie/")) {
        // The movie page's "Watch Now" button. The Trailer button shares its
        // data-testid, but only Watch Now has the LOUD (primary) appearance.
        const watchNow = await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .waitForElement */ .xk)('button[data-testid="play_button"][data-appearance="LOUD"]');
        log.log("Clicking Watch Now");
        watchNow.click();
        await waitForWatchPage();
    }
}
// TODO: Validate
const skipIntro = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .clickWhenShown */ .IP)('[data-testid="skip"]:not([style*="hidden"]) button[aria-label="Skip Intro"]');
// TODO: Validate
const cancelAutoplay = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .clickWhenShown */ .IP)('button[data-testid="player-ux-up-next-dismiss"]');
// TODO: Validate
const player = {
    name: "HBO Max",
    playerToFullscreen: ['[data-testid="playerContainer"]'],
    start: startMovie,
};
// TODO: Validate
function init() {
    const introButtons = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipIntros */ ._3)() ? [skipIntro] : [];
    if ((0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipCredits */ .Xd)()) {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
            ...player,
            // Middle episode of a series.
            endSelector: 'button[data-testid="player-ux-up-next-button"]',
            clickButtons: introButtons,
            // Last episode of a series/movies.
            watchForVideoForCompletion: true,
        });
    }
    else {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
            ...player,
            clickButtons: [...introButtons, cancelAutoplay],
            watchForVideoForCompletion: true,
        });
    }
}


/***/ },

/***/ "./src/playback/HiDive/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/HiDive/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// TODO: Validate
function init() {
    (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
        name: "HiDive",
        watchForVideoForCompletion: true,
    });
}


/***/ },

/***/ "./src/playback/Hulu/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/Hulu/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// TODO: Validate
const skipIntro = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .clickWhenShown */ .IP)('button[data-testid="player-skip-button"]', /skip intro/i);
// TODO: Validate
const player = {
    name: "Hulu",
    watchForVideoForCompletion: true,
    debug: true,
};
// TODO: Validate
function init() {
    const introButtons = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipIntros */ ._3)() ? [skipIntro] : [];
    if ((0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipCredits */ .Xd)()) {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({ ...player, clickButtons: introButtons });
    }
    else {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({ ...player, clickButtons: introButtons });
    }
}


/***/ },

/***/ "./src/playback/NHK World/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/NHK World/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// TODO: Validate
async function startVideo() {
    const watchNow = await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .waitForElement */ .xk)(".tVideoEpisodePlayer__watchNowBtn");
    watchNow.click();
    const iframe = await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .waitForElement */ .xk)(".world-player-iframe");
    iframe.classList.add("world-player-fullscreen");
    for (let attempt = 0; attempt < 30; attempt++) {
        await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .sleep */ .yy)(1000);
        if (document.querySelector(".tVideoEpisodePlayer.is-show"))
            return;
        watchNow.click();
    }
}
// TODO: Validate
const player = {
    name: "NHKWorld",
    start: startVideo,
    watchForVideoForCompletion: 1,
};
// TODO: Validate
function init() {
    if ((0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipCredits */ .Xd)()) {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)(player);
    }
    else {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)(player);
    }
}


/***/ },

/***/ "./src/playback/Netflix/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/Netflix/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


const log = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .createLogger */ .h)("Netflix");
// The profile to pick on Netflix's "Who's watching?" screen, and its PIN if the
// profile is locked.
const PROFILE_NAME_KEY = "netflixProfileName";
const PROFILE_PIN_KEY = "netflixProfilePin";
// From Netflix's stylesheet: the "Who's watching?" gate lists profiles as
// .profiles-gate-container li a > .profile-name, and a locked profile asks for
// its PIN in .profile-pin-prompt .pin-number-input (one box per digit).
const PROFILE_LINK_SELECTOR = [
    ".profiles-gate-container li a",
    ".list-profiles li a",
    "a.profile-link",
    '[data-uia="profile-link"]',
    '[data-uia^="action-select-profile"]',
    '[data-uia^="profile-selector+tile"]',
].join(", ");
const PIN_INPUT_SELECTOR = [
    ".profile-pin-prompt .pin-number-input",
    ".pin-input-container input",
    'input[data-uia*="pin" i]',
    'input[class*="pin" i]',
    'input[inputmode="numeric"]',
    'input[type="tel"]',
    'input[maxlength="1"]',
].join(", ");
// Type a value into a React-controlled input: set it through the native setter
// (so React notices the change) and fire the events Netflix listens for.
function typeInto(input, value) {
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: value, bubbles: true }));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keyup", { key: value, bubbles: true }));
}
function isWatchPage() {
    return location.pathname.startsWith("/watch/");
}
// TODO: Validate
function isProfileGateShown() {
    return (document.querySelector(PROFILE_LINK_SELECTOR) !== null ||
        document.querySelector(PIN_INPUT_SELECTOR) !== null);
}
// TODO: Validate
async function enterPin(pin) {
    await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .waitForElement */ .xk)(PIN_INPUT_SELECTOR, 5000);
    // Let the prompt finish rendering before typing.
    await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .sleep */ .yy)(500);
    const inputs = Array.from(document.querySelectorAll(PIN_INPUT_SELECTOR));
    // One box per digit. Pause between digits so the prompt can move focus.
    for (const [i, digit] of pin.split("").entries()) {
        if (inputs[i])
            typeInto(inputs[i], digit);
        await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .sleep */ .yy)(150);
    }
    log.log("Entered profile PIN");
}
// TODO: Validate
async function chooseProfile() {
    const name = GM_getValue(PROFILE_NAME_KEY, "");
    if (!name) {
        log.warn("No Netflix profile set; waiting for one to be picked");
        return;
    }
    // Clicking as soon as the picker renders does nothing, so give it a moment.
    await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .sleep */ .yy)(1000);
    const profile = Array.from(document.querySelectorAll(PROFILE_LINK_SELECTOR)).find((link) => (link.querySelector('.profile-name, [data-uia="profile-name"]') ?? link).textContent
        ?.trim()
        .toLowerCase() === name.toLowerCase());
    if (!profile) {
        log.warn(`Profile "${name}" not found; waiting for one to be picked`);
        return;
    }
    log.log(`Selecting profile "${name}"`);
    profile.click();
    const pin = GM_getValue(PROFILE_PIN_KEY, "");
    if (pin)
        await enterPin(pin).catch(() => log.warn("No PIN prompt found"));
}
// TODO: Validate
// Netflix may answer the episode URL with its "Who's watching?" picker,
// redirecting to /browse first. Get past it, then make sure the tab ends up on
// the episode so playback can start unattended.
async function getPastProfileGate() {
    const deadline = Date.now() + 15000;
    while (!isProfileGateShown()) {
        if (Date.now() > deadline ||
            (isWatchPage() && document.querySelector("video")))
            return;
        await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .sleep */ .yy)(250);
    }
    await chooseProfile();
    // Wait for the picker (and any PIN prompt) to go away, however the profile
    // was picked. Give the user plenty of time when picking by hand.
    while (isProfileGateShown())
        await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .sleep */ .yy)(250);
    // Let Netflix finish switching profiles before navigating.
    await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .sleep */ .yy)(1000);
    if (isWatchPage())
        return;
    const target = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .currentTabStatus */ .J9)()?.url;
    if (!target)
        return;
    log.log("Returning to", target, "after choosing the profile");
    location.assign(target);
    // Never resolve, so the URL watcher doesn't start on the way out.
    await new Promise(() => { });
}
// TODO: Validate
// TODO: Validate
const skipIntro = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .clickWhenShown */ .IP)('button[data-uia="player-skip-intro"]');
// TODO: Validate
const watchCreditsButton = 'button[data-uia="watch-credits-seamless-button"]';
// TODO: Validate
const watchCredits = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .clickWhenShown */ .IP)(watchCreditsButton);
const player = {
    name: "Netflix",
    playerToFullscreen: [".watch-video--player-view", '[data-uia="watch-video"]'],
    start: getPastProfileGate,
    // Required for playing credits and for playing the last episode of a series and
    // movies without the credits.
    watchForVideoForCompletion: true,
};
// TODO: Validate
function init() {
    if (!isWatchPage()) {
        void (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .isControlledTab */ .OR)().then((controlled) => {
            if (controlled)
                void getPastProfileGate();
        });
        return;
    }
    const introButtons = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipIntros */ ._3)() ? [skipIntro] : [];
    if ((0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipCredits */ .Xd)()) {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
            ...player,
            endSelector: watchCreditsButton,
            clickButtons: introButtons,
        });
    }
    else {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
            ...player,
            clickButtons: [...introButtons, watchCredits],
        });
    }
}


/***/ },

/***/ "./src/playback/Paramount+/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/Paramount+/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// TODO: Validate
const findInEndcard = (selector) => document
    .querySelector("endcard-web-component")
    ?.shadowRoot?.querySelector(selector) ?? null;
// TODO: Validate
const isEndcardShown = () => findInEndcard(".endcard") !== null;
// TODO: Validate
const closeEndcard = () => {
    const close = findInEndcard(".endcard-close-button");
    close?.click();
    return close !== null;
};
// TODO: Validate
const skipIntro = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .clickWhenShown */ .IP)('button.skip-button.button_visible[data-skip="skip"]');
// TODO: Validate
const player = {
    name: "Paramount+",
    watchForVideoForCompletion: true,
};
// TODO: Validate
function init() {
    const introButtons = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipIntros */ ._3)() ? [skipIntro] : [];
    if ((0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipCredits */ .Xd)()) {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
            ...player,
            isEnded: isEndcardShown,
            clickButtons: introButtons,
        });
    }
    else {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
            ...player,
            clickButtons: [...introButtons, closeEndcard],
        });
    }
}


/***/ },

/***/ "./src/playback/Peacock/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/Peacock/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// TODO: Validate
const skipIntro = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .clickWhenShown */ .IP)('button[data-testid="skip-button"][aria-label="Skip Intro"]');
// TODO: Validate
const cancelWatchNext = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .clickWhenShown */ .IP)('button[data-testid="binge-dismiss-button"]');
// TODO: Validate
const player = {
    name: "Peacock",
    watchForVideoForCompletion: true,
};
// TODO: Validate
function init() {
    const introButtons = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipIntros */ ._3)() ? [skipIntro] : [];
    if ((0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipCredits */ .Xd)()) {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
            ...player,
            endSelector: '[data-testid="vod-binge-container"]',
            clickButtons: introButtons,
        });
    }
    else {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
            ...player,
            clickButtons: [...introButtons, cancelWatchNext],
        });
    }
}


/***/ },

/***/ "./src/playback/Pluto TV/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/Pluto TV/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// TODO: Validate
const endcard = ".base-container.show endcard-web-component";
// TODO: Validate
const enterTheatreMode = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .clickWhenShown */ .IP)('button[data-controls="theatreScreen"][aria-pressed="false"]');
// TODO: Validate
const skipIntro = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .clickWhenShown */ .IP)('button.skip-button.button_visible[data-skip="skip"]', /skip intro/i);
// TODO: Validate
const closeEndcard = () => {
    const close = document
        .querySelector(endcard)
        ?.shadowRoot?.querySelector(".endcard-close-button");
    close?.click();
    return Boolean(close);
};
// TODO: Validate
const isInEndcard = (selector) => Array.from(document.querySelectorAll("endcard-web-component")).some((component) => component.shadowRoot?.querySelector(selector));
// TODO: Validate
const isUpNextShown = () => isInEndcard('.endcard-timer[aria-label^="Up Next" i]');
// TODO: Validate
const isRecommendationShown = () => isInEndcard(".endcard-footer .watch-button-text");
// TODO: Validate
const restoreCredits = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .clickWhenShown */ .IP)(".player-wrapper.uec-credits-box .tween-down-thumbnail.show");
// TODO: Validate
const player = {
    name: "Pluto TV",
    watcForhUrlChange: true,
    watchForVideoForCompletion: true,
};
// TODO: Validate
function init() {
    const introButtons = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipIntros */ ._3)() ? [skipIntro] : [];
    if ((0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipCredits */ .Xd)()) {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
            ...player,
            endSelector: endcard,
            isEnded: isUpNextShown,
            clickButtons: [enterTheatreMode, ...introButtons],
        });
    }
    else {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
            ...player,
            isEnded: isRecommendationShown,
            clickButtons: [
                enterTheatreMode,
                ...introButtons,
                closeEndcard,
                restoreCredits,
            ],
        });
    }
}


/***/ },

/***/ "./src/playback/Roku/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/Roku/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// TODO: Validate
const skipIntro = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .clickWhenShown */ .IP)("button.MuiButton-root", /skip introduction/i);
// TODO: Validate
const isWatchNextShown = () => Array.from(document.querySelectorAll("button.MuiButton-root")).some((button) => /watch next/i.test(button.textContent ?? ""));
// TODO: Validate
const player = {
    name: "Roku",
    watchForVideoForCompletion: true,
};
// TODO: Validate
function init() {
    const introButtons = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipIntros */ ._3)() ? [skipIntro] : [];
    if ((0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipCredits */ .Xd)()) {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
            ...player,
            isEnded: isWatchNextShown,
            clickButtons: introButtons,
        });
    }
    else {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({ ...player, clickButtons: introButtons });
    }
}


/***/ },

/***/ "./src/playback/Tubi/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/Tubi/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// TODO: Validate
const enterTheatreMode = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .clickWhenShown */ .IP)("button", /^(?!.*exit).*theat(er|re) mode/i);
// TODO: Validate
const hideUpNext = (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .clickWhenShown */ .IP)("div", /^hide$/i);
// TODO: Validate
const player = {
    name: "Tubi",
    watchForVideoForCompletion: true,
};
// TODO: Validate
function init() {
    if ((0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .shouldSkipCredits */ .Xd)()) {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
            ...player,
            endSelector: 'a[href*="autoplay=true"]',
            clickButtons: [enterTheatreMode],
        });
    }
    else {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
            ...player,
            clickButtons: [enterTheatreMode, hideUpNext],
        });
    }
}


/***/ },

/***/ "./src/playback/YouTube/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/YouTube/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// TODO: Validate
function init() {
    (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initVideoPlugin */ .TD)({
        name: "YouTube",
        videoSelector: "#movie_player video",
        playerToFullscreen: ["#movie_player"],
        endSelector: "#movie_player.ended-mode",
    });
}


/***/ },

/***/ "./src/remote.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   C7: () => (/* binding */ loadState),
/* harmony export */   HA: () => (/* binding */ SKIP_CREDITS_KEY),
/* harmony export */   Mq: () => (/* binding */ STATE_KEY),
/* harmony export */   W_: () => (/* binding */ isRunning),
/* harmony export */   j8: () => (/* binding */ ALWAYS_SHOW_GUIDE_KEY),
/* harmony export */   o1: () => (/* binding */ SKIP_INTROS_KEY),
/* harmony export */   tN: () => (/* binding */ send),
/* harmony export */   tc: () => (/* binding */ CUSTOM_URLS_KEY),
/* harmony export */   vp: () => (/* binding */ listenForPlayRequests)
/* harmony export */ });
/* unused harmony exports emptyState, readSession, writeSession */
/* harmony import */ var _dvr_api__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/dvr_api.ts");
// TODO: Validate

const STATE_KEY = "remoteState";
const SKIP_INTROS_KEY = "skipIntros";
const SKIP_CREDITS_KEY = "skipCredits";
const ALWAYS_SHOW_GUIDE_KEY = "alwaysShowGuide";
const CUSTOM_URLS_KEY = "customChannelUrls";
const HANDOFF_KEY = "tabHandoff";
const PLAYER_TAB_KEY = "playerTab";
const PLAY_REQUEST_KEY = "playRequest";
const PLAY_ACCEPTED_KEY = "playRequestAccepted";
const TAB_ID_KEY = "streamChannelerRemoteTabId";
const HISTORY_LIMIT = 50;
const HANDOFF_MS = 60000;
const PLAYER_ALIVE_MS = 10000;
const PLAYER_RESPONSE_MS = 3000;
const LOG_PREFIX = "[Stream Channeler Remote]";
let tabId = null;
let afterSave = [];
// TODO: Validate
function emptyState() {
    return {
        mode: null,
        stopped: true,
        playerTabId: null,
        queue: [],
        index: 0,
        channelPath: null,
        dvr: null,
        history: [],
        openPending: false,
        navigatedAt: 0,
    };
}
// TODO: Validate
function loadState() {
    return {
        ...emptyState(),
        ...GM_getValue(STATE_KEY, null),
    };
}
// TODO: Validate
function saveState(state) {
    GM_setValue(STATE_KEY, state);
}
// TODO: Validate
function readSession(key) {
    try {
        const raw = sessionStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
// TODO: Validate
function writeSession(key, value) {
    try {
        if (value === null) {
            sessionStorage.removeItem(key);
        }
        else {
            sessionStorage.setItem(key, JSON.stringify(value));
        }
    }
    catch {
        return;
    }
}
// TODO: Validate
function currentTabId() {
    tabId ?? (tabId = readSession(TAB_ID_KEY));
    if (!tabId) {
        tabId = crypto.randomUUID();
        writeSession(TAB_ID_KEY, tabId);
    }
    return tabId;
}
// TODO: Validate
function claimHandoff() {
    if (window.top !== window)
        return;
    const handoff = GM_getValue(HANDOFF_KEY, null);
    if (!handoff || Date.now() - handoff.at > HANDOFF_MS)
        return;
    GM_deleteValue(HANDOFF_KEY);
    tabId = handoff.id;
    writeSession(TAB_ID_KEY, tabId);
}
// TODO: Validate
function goHere(id, url) {
    const handoff = { id, at: Date.now() };
    GM_setValue(HANDOFF_KEY, handoff);
    console.log(LOG_PREFIX, "Playing in this tab:", url);
    location.assign(url);
}
// TODO: Validate
function openPlayerTab(id, url) {
    const handoff = { id, at: Date.now() };
    GM_setValue(HANDOFF_KEY, handoff);
    console.log(LOG_PREFIX, "Opening a player tab:", url);
    window.open(url, "_blank");
}
// TODO: Validate
function isPlayerAlive(state) {
    const player = GM_getValue(PLAYER_TAB_KEY, null);
    return (player !== null &&
        player.id === state.playerTabId &&
        Date.now() - player.seen < PLAYER_ALIVE_MS);
}
// TODO: Validate
function isRunning(state) {
    return (state.mode !== null &&
        !state.stopped &&
        (isPlayerAlive(state) || Date.now() - state.navigatedAt < HANDOFF_MS));
}
// TODO: Validate
function requestPlayerTab(url) {
    const request = { url, at: Date.now() };
    GM_setValue(PLAY_REQUEST_KEY, request);
    window.setTimeout(() => {
        if (GM_getValue(PLAY_ACCEPTED_KEY, 0) === request.at)
            return;
        console.warn(LOG_PREFIX, "The player tab didn't respond; opening a new one");
        const state = loadState();
        const id = crypto.randomUUID();
        state.playerTabId = id;
        state.navigatedAt = Date.now();
        saveState(state);
        openPlayerTab(id, url);
    }, PLAYER_RESPONSE_MS);
}
// TODO: Validate
function navigate(state, url) {
    state.openPending = true;
    state.navigatedAt = Date.now();
    if (state.playerTabId === currentTabId()) {
        const id = state.playerTabId;
        afterSave.push(() => goHere(id, url));
        return;
    }
    if (isPlayerAlive(state)) {
        afterSave.push(() => requestPlayerTab(url));
        return;
    }
    const id = crypto.randomUUID();
    state.playerTabId = id;
    afterSave.push(() => openPlayerTab(id, url));
}
// TODO: Validate
function listenForPlayRequests() {
    const beat = () => {
        if (loadState().playerTabId !== currentTabId())
            return;
        const player = { id: currentTabId(), seen: Date.now() };
        GM_setValue(PLAYER_TAB_KEY, player);
    };
    beat();
    window.setInterval(beat, PLAYER_ALIVE_MS / 2);
    GM_addValueChangeListener(PLAY_REQUEST_KEY, (_name, _old, value) => {
        const request = value;
        if (!request)
            return;
        if (GM_getValue(PLAYER_TAB_KEY, null)?.id !== currentTabId()) {
            return;
        }
        if (loadState().playerTabId !== currentTabId())
            return;
        GM_setValue(PLAY_ACCEPTED_KEY, request.at);
        goHere(currentTabId(), request.url);
    });
}
// TODO: Validate
async function playCurrent(state) {
    const item = state.queue[state.index];
    if (!item) {
        state.stopped = true;
        return;
    }
    state.stopped = false;
    if (item.episodeId) {
        const marking = (0,_dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .markEpisodeWatched */ .v$)(item.episodeId);
        if (state.playerTabId === currentTabId())
            await marking;
    }
    navigate(state, item.url);
}
// TODO: Validate
function toDvrProgram(channel, program) {
    if (!program.url)
        return null;
    return {
        channelId: channel.id,
        channelName: channel.name ?? "",
        episodeId: program.episode_id,
        url: program.url,
    };
}
// TODO: Validate
function playDvr(state, program, history) {
    state.mode = "dvr";
    state.stopped = false;
    state.dvr = program;
    state.history = history.slice(-HISTORY_LIMIT);
    navigate(state, program.url);
}
// TODO: Validate
async function playNextDvr(state) {
    const playing = state.dvr;
    if (!playing)
        return;
    const channel = (0,_dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .readGuideCache */ .j_)()?.channels.find((candidate) => candidate.id === playing.channelId);
    const next = channel ? (0,_dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .nextDvrProgram */ .WK)(channel, playing.episodeId) : null;
    const program = channel && next ? toDvrProgram(channel, next) : null;
    if (!program || !next) {
        state.stopped = true;
        return;
    }
    await (0,_dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .markEpisodeWatched */ .v$)(next.episode_id);
    playDvr(state, program, [...state.history, program]);
}
// TODO: Validate
function playPreviousDvr(state) {
    if (state.history.length < 2)
        return;
    const earlier = state.history.slice(0, -1);
    playDvr(state, earlier[earlier.length - 1], earlier);
}
// TODO: Validate
function statusFor(state) {
    const controlled = state.playerTabId === currentTabId() && state.mode !== null;
    return {
        controlled,
        stopped: controlled ? state.stopped : true,
        mode: state.mode,
        url: state.mode === "dvr"
            ? (state.dvr?.url ?? null)
            : (state.queue[state.index]?.url ?? null),
        dvr: state.dvr,
    };
}
// TODO: Validate
async function handle(request) {
    if (request.type === "tab:hello")
        claimHandoff();
    const state = loadState();
    const isPlayer = state.playerTabId === currentTabId();
    switch (request.type) {
        case "tab:hello":
            return statusFor(state);
        case "tab:opened":
            if (!isPlayer || state.stopped || !state.openPending)
                return false;
            state.openPending = false;
            saveState(state);
            return true;
        case "tab:ended":
            if (!isPlayer || state.stopped || state.mode === null)
                return null;
            if (state.mode === "dvr") {
                await playNextDvr(state);
            }
            else {
                state.index += 1;
                await playCurrent(state);
            }
            break;
        case "tab:previous":
            if (!isPlayer || state.stopped || state.mode === null)
                return null;
            if (state.mode === "dvr") {
                playPreviousDvr(state);
            }
            else {
                state.index = Math.max(0, state.index - 1);
                await playCurrent(state);
            }
            break;
        case "tab:stop":
            if (!isPlayer)
                return null;
            state.stopped = true;
            break;
        case "tab:resume":
            state.playerTabId = currentTabId();
            state.stopped = false;
            break;
        case "remote:start":
            state.mode = "remote";
            state.queue = request.queue;
            state.index = request.index;
            state.channelPath = request.channelPath;
            await playCurrent(state);
            break;
        case "remote:stop":
            state.stopped = true;
            break;
        case "remote:setIndex":
            state.index = Math.max(0, Math.min(request.index, state.queue.length));
            break;
        case "remote:sync": {
            if (state.mode !== "remote" || state.channelPath !== request.channelPath)
                return null;
            const current = state.queue[state.index];
            const matched = current
                ? request.queue.findIndex((item) => current.episodeId
                    ? item.episodeId === current.episodeId
                    : item.url === current.url)
                : -1;
            state.queue = request.queue;
            state.index =
                matched >= 0 ? matched : Math.min(state.index, request.queue.length);
            break;
        }
        case "custom:start":
            state.mode = "custom";
            state.queue = request.urls.map((url) => ({ url }));
            state.index = 0;
            state.channelPath = null;
            await playCurrent(state);
            break;
        case "dvr:play":
            state.playerTabId = currentTabId();
            await (0,_dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .markEpisodeWatched */ .v$)(request.program.episodeId);
            playDvr(state, request.program, [
                ...(state.mode === "dvr" ? state.history : []),
                request.program,
            ]);
            break;
    }
    saveState(state);
    const pending = afterSave;
    afterSave = [];
    pending.forEach((run) => run());
    return statusFor(state);
}
let queue = Promise.resolve();
// TODO: Validate
function send(request) {
    const run = queue
        .then(() => handle(request))
        .catch((error) => {
        afterSave = [];
        console.error(LOG_PREFIX, error);
        return null;
    });
    queue = run;
    return run;
}


/***/ },

/***/ "./src/shared.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Bc: () => (/* binding */ fadeWhenIdle),
/* harmony export */   IP: () => (/* binding */ clickWhenShown),
/* harmony export */   J9: () => (/* binding */ currentTabStatus),
/* harmony export */   OR: () => (/* binding */ isControlledTab),
/* harmony export */   TD: () => (/* binding */ initVideoPlugin),
/* harmony export */   Xd: () => (/* binding */ shouldSkipCredits),
/* harmony export */   _3: () => (/* binding */ shouldSkipIntros),
/* harmony export */   _U: () => (/* binding */ fitFakeFullscreen),
/* harmony export */   h: () => (/* binding */ createLogger),
/* harmony export */   iq: () => (/* binding */ addMenuCommand),
/* harmony export */   oU: () => (/* binding */ FADE_HIDDEN_STYLE),
/* harmony export */   xk: () => (/* binding */ waitForElement),
/* harmony export */   yy: () => (/* binding */ sleep)
/* harmony export */ });
/* unused harmony exports waitForQuiet, stopAutoControl, resumeAutoControl, setFakeFullscreen, mountPlayerControls, mountGuideControls, enableDebug, signalPreviousEpisode, signalEpisodeEnded, watchUrlChange, expandPlayer */
/* harmony import */ var _dvr__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/dvr.ts");
/* harmony import */ var _remote__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/remote.ts");
// TODO: Validate


const REMOTE_LOG = "[Stream Channeler Remote]";
/**
 * Console logging tagged "[Stream Channeler Remote]" (plus the site, when
 * given), so the script's messages can be filtered out of the page's own.
 */
function createLogger(site) {
    const prefix = site ? `${REMOTE_LOG} [${site}]` : REMOTE_LOG;
    return {
        debug: (...args) => console.debug(prefix, ...args),
        log: (...args) => console.log(prefix, ...args),
        warn: (...args) => console.warn(prefix, ...args),
        error: (...args) => console.error(prefix, ...args),
    };
}
let tabStatus = null;
// TODO: Validate
function currentTabStatus() {
    return tabStatus;
}
// TODO: Validate
async function isControlledTab() {
    tabStatus ?? (tabStatus = await (0,_remote__WEBPACK_IMPORTED_MODULE_1__/* .send */ .tN)({ type: "tab:hello" }));
    return tabStatus?.controlled ?? false;
}
// TODO: Validate
function shouldSkipIntros() {
    return GM_getValue(_remote__WEBPACK_IMPORTED_MODULE_1__/* .SKIP_INTROS_KEY */ .o1, true);
}
// TODO: Validate
function shouldSkipCredits() {
    return GM_getValue(_remote__WEBPACK_IMPORTED_MODULE_1__/* .SKIP_CREDITS_KEY */ .HA, true);
}
const menuSections = ["start", "settings", "builder"];
const menuCommands = [];
let menuIds = [];
// TODO: Validate
function renderMenu() {
    menuIds.forEach(GM_unregisterMenuCommand);
    menuIds = menuSections.flatMap((section) => menuCommands
        .filter((command) => command.section === section)
        .map(({ label, run }) => GM_registerMenuCommand(typeof label === "string" ? label : label(), run)));
}
// TODO: Validate
function addMenuCommand(section, label, run) {
    menuCommands.push({ section, label, run });
    renderMenu();
}
// TODO: Validate
function clickWhenShown(selector, text) {
    return () => {
        const button = Array.from(document.querySelectorAll(selector)).find((element) => !text || text.test(element.textContent ?? ""));
        if (!button?.checkVisibility({}))
            return false;
        button.click();
        return true;
    };
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function waitForElement(selector, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(selector);
        if (existing) {
            resolve(existing);
            return;
        }
        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                observer.disconnect();
                clearTimeout(timeout);
                resolve(el);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        const timeout = setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Timed out waiting for "${selector}"`));
        }, timeoutMs);
    });
}
/**
 * Resolve once `element`'s own `style` attribute has been quiet (no changes) for
 * `quietMs`, or after `maxMs` as a hard stop. Used to wait for a busy SPA player
 * to finish laying itself out before we restyle it — adaptive, unlike a fixed
 * delay. Only the element's own attributes are watched (not the subtree) so
 * normal playback (progress bar, etc.) doesn't keep it from going quiet.
 */
function waitForQuiet(element, quietMs = 1200, maxMs = 10000) {
    return new Promise((resolve) => {
        let quietTimer = window.setTimeout(finish, quietMs);
        const hardTimer = window.setTimeout(finish, maxMs);
        const observer = new MutationObserver(() => {
            clearTimeout(quietTimer);
            quietTimer = window.setTimeout(finish, quietMs);
        });
        observer.observe(element, { attributes: true, attributeFilter: ["style"] });
        function finish() {
            clearTimeout(quietTimer);
            clearTimeout(hardTimer);
            observer.disconnect();
            resolve();
        }
    });
}
// When the user stops automatic control on a video tab, the page should stay
// open and never advance the channel. Gating signalEpisodeEnded() is enough
// because it is the single choke point that signals completion and closes the
// tab, regardless of which plugin detected the end.
let autoControlStopped = false;
// Mark automatic control as stopped so signalEpisodeEnded() stops advancing the
// channel and the current tab stays open. Exposed so plugins can wire it up to
// their own stop control (e.g. NHK embeds one in the player's control bar).
// TODO: Validate
function stopAutoControl(log) {
    autoControlStopped = true;
    log.log("Automatic control stopped by user");
    void (0,_remote__WEBPACK_IMPORTED_MODULE_1__/* .send */ .tN)({ type: "tab:stop" });
}
// TODO: Validate
function resumeAutoControl(log) {
    autoControlStopped = false;
    log.log("Automatic control resumed by user");
    void (0,_remote__WEBPACK_IMPORTED_MODULE_1__/* .send */ .tN)({ type: "tab:resume" });
}
// Icons as structured data (root svg attrs + child shapes). Built via
// createElementNS rather than from a markup string because YouTube's strict CSP
// (Trusted Types) blocks both innerHTML and DOMParser string sinks.
const SVG_NS = "http://www.w3.org/2000/svg";
// Build an icon's SVG element with DOM APIs (no string parsing — CSP-safe).
function buildIcon(doc, spec) {
    const svg = doc.createElementNS(SVG_NS, "svg");
    for (const [k, v] of Object.entries(spec.attrs))
        svg.setAttribute(k, v);
    for (const shape of spec.shapes) {
        const el = doc.createElementNS(SVG_NS, shape.tag);
        for (const [k, v] of Object.entries(shape.attrs))
            el.setAttribute(k, v);
        svg.appendChild(el);
    }
    return svg;
}
// Set a button's content to an icon + visible label without using innerHTML.
function setButtonContent(doc, button, icon, label) {
    button.replaceChildren();
    button.appendChild(buildIcon(doc, icon));
    const span = doc.createElement("span");
    span.textContent = label;
    button.appendChild(span);
}
// Build a labelled overlay button (icon + visible title).
function createOverlayButton(doc, id, label, icon, onClick) {
    const button = doc.createElement("button");
    button.id = id;
    button.type = "button";
    button.title = label;
    button.style.cssText =
        "display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid rgba(255,255,255,0.35);border-radius:4px;background:rgba(0,0,0,0.6);color:#fff;font-family:system-ui,sans-serif;font-size:13px;font-weight:600;line-height:1;cursor:pointer;white-space:nowrap;";
    setButtonContent(doc, button, icon, label);
    button.addEventListener("click", (event) => {
        // Don't let the click reach the player (which toggles play/pause).
        event.stopPropagation();
        onClick();
    });
    return button;
}
let fakeFullscreen = null;
let guidePlayer = null;
// TODO: Validate
function fakeFullscreenBox() {
    return (0,_dvr__WEBPACK_IMPORTED_MODULE_0__/* .isDvrGuideOpen */ .Vs)()
        ? {
            left: `${_dvr__WEBPACK_IMPORTED_MODULE_0__/* .DVR_DETAIL_WIDTH_VW */ .We}vw`,
            width: `${100 - _dvr__WEBPACK_IMPORTED_MODULE_0__/* .DVR_DETAIL_WIDTH_VW */ .We}vw`,
            height: `${100 - _dvr__WEBPACK_IMPORTED_MODULE_0__/* .DVR_GUIDE_HEIGHT_VH */ .de}vh`,
        }
        : { left: "0", width: "100vw", height: "100vh" };
}
// TODO: Validate
function setFakeFullscreenStyle(state, el, prop, value) {
    let props = state.original.get(el);
    if (!props) {
        props = new Map();
        state.original.set(el, props);
    }
    if (!props.has(prop)) {
        props.set(prop, [
            el.style.getPropertyValue(prop),
            el.style.getPropertyPriority(prop),
        ]);
    }
    el.style.setProperty(prop, value, "important");
}
// TODO: Validate
function fitFakeFullscreen() {
    if ((0,_dvr__WEBPACK_IMPORTED_MODULE_0__/* .isDvrGuideOpen */ .Vs)() && !fakeFullscreen && guidePlayer) {
        const video = findVideo(guidePlayer.videoSelector);
        if (video) {
            setFakeFullscreen(findPlayer(video, guidePlayer.playerSelectors), true);
        }
    }
    else if (!(0,_dvr__WEBPACK_IMPORTED_MODULE_0__/* .isDvrGuideOpen */ .Vs)() && fakeFullscreen?.forGuide) {
        exitFakeFullscreen(fakeFullscreen);
    }
    if (fakeFullscreen) {
        for (const [prop, value] of Object.entries(fakeFullscreenBox())) {
            setFakeFullscreenStyle(fakeFullscreen, fakeFullscreen.target, prop, value);
        }
    }
    window.dispatchEvent(new Event("resize"));
}
// TODO: Validate
function applyFakeFullscreenStyles(state) {
    const { target } = state;
    for (const [prop, value] of Object.entries({
        position: "fixed",
        top: "0",
        ...fakeFullscreenBox(),
        "z-index": "2147483646",
        background: "#000",
    })) {
        setFakeFullscreenStyle(state, target, prop, value);
    }
    // A fixed player can be trapped inside a transformed ancestor's stacking
    // context, so other page elements paint over it. Lift every ancestor to the
    // top of its parent's stacking order so the whole chain (and the player)
    // floats above the page. z-index only changes paint order (no reflow); any
    // shift from positioning a static ancestor is hidden behind the player.
    for (let el = target.parentElement; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
        setFakeFullscreenStyle(state, el, "z-index", "2147483646");
        if (getComputedStyle(el).position === "static") {
            setFakeFullscreenStyle(state, el, "position", "relative");
        }
    }
}
// TODO: Validate
function setFakeFullscreen(target, forGuide = false) {
    if (fakeFullscreen) {
        if (!forGuide)
            fakeFullscreen.forGuide = false;
        return;
    }
    let parent = target.parentElement;
    const state = {
        target,
        original: new Map(),
        forGuide,
        observer: new MutationObserver(() => {
            if (target.parentElement === parent &&
                target.style.getPropertyValue("position") === "fixed") {
                return;
            }
            parent = target.parentElement;
            applyFakeFullscreenStyles(state);
        }),
    };
    fakeFullscreen = state;
    applyFakeFullscreenStyles(state);
    setFakeFullscreenStyle(state, document.documentElement, "overflow", "hidden");
    state.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style"],
    });
}
// TODO: Validate
function exitFakeFullscreen(state) {
    state.observer.disconnect();
    for (const [el, props] of state.original) {
        for (const [prop, [value, priority]] of props) {
            if (value) {
                el.style.setProperty(prop, value, priority);
            }
            else {
                el.style.removeProperty(prop);
            }
        }
    }
    fakeFullscreen = null;
}
/**
 * Call `handler` on every pointer move over the page, including over same-origin
 * iframes (e.g. NHK World's player), whose events never reach the top window.
 * `frame` is the iframe element the event came from, or null for the top page.
 * Listens in the capture phase so a page handler can't stop the event first.
 */
function onPointerMoveInAnyFrame(handler) {
    const options = { capture: true, passive: true };
    window.addEventListener("pointermove", (event) => handler(event, null), options);
    // An iframe gets a new window each time it navigates, so re-attach on load.
    const attached = new WeakSet();
    const attachToFrame = (frame) => {
        try {
            const frameWindow = frame.contentWindow;
            // Throws for cross-origin frames, which can't be listened to.
            if (!frameWindow || attached.has(frameWindow) || !frameWindow.document)
                return;
            attached.add(frameWindow);
            frameWindow.addEventListener("pointermove", (event) => handler(event, frame), options);
        }
        catch {
            // Cross-origin frame.
        }
    };
    const watchFrame = (frame) => {
        if (frame.dataset.scrPointerWatched)
            return;
        frame.dataset.scrPointerWatched = "1";
        frame.addEventListener("load", () => attachToFrame(frame));
        attachToFrame(frame);
    };
    document.querySelectorAll("iframe").forEach(watchFrame);
    new MutationObserver(() => {
        document.querySelectorAll("iframe").forEach(watchFrame);
    }).observe(document.body, { childList: true, subtree: true });
}
const FADE_HIDDEN_STYLE = "opacity:0;pointer-events:none;transition:opacity 0.3s ease;";
// TODO: Validate
// Visibility is driven by a window capture-phase pointermove listener (which
// runs before any page handler can stop it) rather than mouseenter/mouseleave,
// because some players (e.g. Adult Swim) swallow pointer events.
function fadeWhenIdle(getElement) {
    let hideTimer;
    const setVisible = (visible) => {
        const element = getElement();
        if (!element)
            return;
        element.style.opacity = visible ? "1" : "0";
        // Not clickable while hidden, so a stray click can't hit an invisible button.
        element.style.pointerEvents = visible ? "auto" : "none";
    };
    const hide = () => {
        clearTimeout(hideTimer);
        if (getElement()?.contains(document.activeElement))
            return;
        setVisible(false);
    };
    const initial = getElement();
    if (initial)
        initial.style.cssText += FADE_HIDDEN_STYLE;
    onPointerMoveInAnyFrame((event, frame) => {
        setVisible(true);
        clearTimeout(hideTimer);
        const element = getElement();
        if (!element)
            return;
        // Events from a player iframe are in its coordinates; shift them into the
        // top page's to compare against the element.
        const offset = frame?.getBoundingClientRect() ?? { left: 0, top: 0 };
        const x = event.clientX + offset.left;
        const y = event.clientY + offset.top;
        const rect = element.getBoundingClientRect();
        const hovered = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        if (!hovered)
            hideTimer = window.setTimeout(hide, 2500);
    });
    // Pointer left the page entirely (no element it moved to).
    document.addEventListener("pointerout", (event) => {
        if (!event.relatedTarget)
            hide();
    }, { capture: true, passive: true });
    window.addEventListener("blur", hide);
}
// Add the Stop Auto Control overlay to every controller-opened tab. It's always
// pinned to the same spot — fixed in the top-right of the top page, above any
// fake-fullscreen player — independent of the site's own player. Like a video player's own controls, it's hidden until
// the cursor moves, then fades out again once the cursor is idle (but stays while
// hovered).
// TODO: Validate
function mountPlayerControls(log) {
    if (document.getElementById("stream-channeler-controls"))
        return;
    const container = createControlsContainer();
    const stopIcon = {
        attrs: {
            viewBox: "0 0 24 24",
            width: "16",
            height: "16",
            fill: "currentColor",
            "aria-hidden": "true",
        },
        shapes: [
            {
                tag: "rect",
                attrs: { x: "6", y: "6", width: "12", height: "12", rx: "1" },
            },
        ],
    };
    const resumeIcon = {
        attrs: {
            viewBox: "0 0 24 24",
            width: "16",
            height: "16",
            fill: "currentColor",
            "aria-hidden": "true",
        },
        shapes: [{ tag: "polygon", attrs: { points: "7 4 19 12 7 20 7 4" } }],
    };
    const stopButton = createOverlayButton(document, "stream-channeler-stop-btn", autoControlStopped ? "Resume Auto Control" : "Stop Auto Control", autoControlStopped ? resumeIcon : stopIcon, () => {
        const [icon, label] = autoControlStopped
            ? [stopIcon, "Stop Auto Control"]
            : [resumeIcon, "Resume Auto Control"];
        if (autoControlStopped) {
            resumeAutoControl(log);
        }
        else {
            stopAutoControl(log);
        }
        stopButton.title = label;
        setButtonContent(document, stopButton, icon, label);
    });
    const nextButton = createOverlayButton(document, "stream-channeler-next-btn", "Play Next Episode", {
        attrs: {
            viewBox: "0 0 24 24",
            width: "16",
            height: "16",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            "aria-hidden": "true",
        },
        shapes: [
            { tag: "polygon", attrs: { points: "5 4 15 12 5 20 5 4" } },
            { tag: "line", attrs: { x1: "19", y1: "5", x2: "19", y2: "19" } },
        ],
    }, () => {
        signalEpisodeEnded(log, "Play Next Episode was clicked");
    });
    const previousButton = createOverlayButton(document, "stream-channeler-previous-btn", "Play Previous Episode", {
        attrs: {
            viewBox: "0 0 24 24",
            width: "16",
            height: "16",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            "aria-hidden": "true",
        },
        shapes: [
            { tag: "polygon", attrs: { points: "19 20 9 12 19 4 19 20" } },
            { tag: "line", attrs: { x1: "5", y1: "19", x2: "5", y2: "5" } },
        ],
    }, () => {
        signalPreviousEpisode(log, "Play Previous Episode was clicked");
    });
    container.append(previousButton, nextButton, stopButton);
    container.prepend(createGuideButton(log));
    attachControls(log, container);
}
// TODO: Validate
function mountGuideControls(log) {
    if (document.getElementById("stream-channeler-controls"))
        return;
    const container = createControlsContainer();
    container.append(createGuideButton(log));
    attachControls(log, container);
}
// TODO: Validate
function createControlsContainer() {
    const container = document.createElement("div");
    container.id = "stream-channeler-controls";
    container.style.cssText =
        "position:fixed;top:12px;right:12px;z-index:2147483647;display:flex;gap:8px;";
    fadeWhenIdle(() => container);
    return container;
}
// TODO: Validate
function createGuideButton(log) {
    (0,_dvr__WEBPACK_IMPORTED_MODULE_0__/* .mountDvrGuide */ .kQ)(log);
    return createOverlayButton(document, "stream-channeler-guide-btn", "Guide", {
        attrs: {
            viewBox: "0 0 24 24",
            width: "16",
            height: "16",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            "aria-hidden": "true",
        },
        shapes: [
            {
                tag: "rect",
                attrs: { x: "2", y: "3", width: "20", height: "14", rx: "2" },
            },
            { tag: "path", attrs: { d: "M2 9h20" } },
            { tag: "path", attrs: { d: "M9 9v8" } },
            { tag: "path", attrs: { d: "M12 17v4" } },
            { tag: "path", attrs: { d: "M8 21h8" } },
        ],
    }, _dvr__WEBPACK_IMPORTED_MODULE_0__/* .toggleDvrGuide */ .nl);
}
// TODO: Validate
function attachControls(log, container) {
    document.body.appendChild(container);
    log.debug("Player controls overlay added");
    new MutationObserver(() => {
        if (container.isConnected)
            return;
        document.body.appendChild(container);
        log.debug("Player controls overlay re-added after the page removed it");
    }).observe(document.body, { childList: true });
}
// Several detectors (URL change, video end) can fire for the same episode; only
// the first one may advance the channel.
let episodeEndSignaled = false;
let debugEnabled = false;
// TODO: Validate
function enableDebug() {
    debugEnabled = true;
}
// TODO: Validate
function confirmLeave(reason, leave) {
    const overlay = document.createElement("div");
    overlay.style.cssText =
        "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);font-family:system-ui,sans-serif;";
    const panel = document.createElement("div");
    panel.style.cssText =
        "display:flex;flex-direction:column;gap:12px;max-width:min(560px,90vw);padding:16px;border-radius:8px;background:#1c252f;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,0.5);font-size:14px;";
    const message = document.createElement("div");
    message.textContent = `Stream Channeler Remote wants to leave this page: ${reason}`;
    const buttons = document.createElement("div");
    buttons.style.cssText = "display:flex;justify-content:flex-end;gap:8px;";
    const button = (text, onClick) => {
        const el = document.createElement("button");
        el.type = "button";
        el.textContent = text;
        el.style.cssText =
            "padding:6px 16px;border-radius:4px;border:1px solid #3a4a5c;background:#2a3846;color:#fff;font-size:14px;cursor:pointer;";
        el.addEventListener("click", (event) => {
            event.stopPropagation();
            overlay.remove();
            onClick();
        });
        return el;
    };
    buttons.append(button("Block", () => {
        episodeEndSignaled = false;
    }), button("Allow", leave));
    panel.append(message, buttons);
    overlay.append(panel);
    document.body.append(overlay);
}
// TODO: Validate
function leaveEpisode(log, reason, leave) {
    episodeEndSignaled = true;
    log.log(`Leaving the episode: ${reason}`);
    if (debugEnabled) {
        confirmLeave(reason, leave);
    }
    else {
        leave();
    }
}
// TODO: Validate
function signalPreviousEpisode(log, reason) {
    if (episodeEndSignaled)
        return;
    if (autoControlStopped) {
        log.log("Automatic control is stopped, staying on tab");
        return;
    }
    leaveEpisode(log, reason, () => {
        log.log("Going back to the previous episode");
        void (0,_remote__WEBPACK_IMPORTED_MODULE_1__/* .send */ .tN)({ type: "tab:previous", reason }).finally(() => {
            episodeEndSignaled = false;
        });
    });
}
// TODO: Validate
function signalEpisodeEnded(log, reason) {
    if (episodeEndSignaled)
        return;
    if (autoControlStopped) {
        log.log("Episode ended but automatic control is stopped, staying on tab");
        return;
    }
    leaveEpisode(log, reason, () => {
        log.log("Episode ended, waiting for the next one");
        void (0,_remote__WEBPACK_IMPORTED_MODULE_1__/* .send */ .tN)({ type: "tab:ended", reason }).finally(() => {
            episodeEndSignaled = false;
        });
    });
}
/**
 * Detect episode end via URL change: watch for the page URL to change and signal
 * completion, starting after `delayMs`. Used by sites whose player auto-advances
 * by navigating.
 */
// TODO: Validate
function watchUrlChange(log, delayMs = 0) {
    if (delayMs > 0) {
        log.debug(`Waiting ${delayMs}ms before watching the URL`);
    }
    setTimeout(() => {
        const initialUrl = location.href;
        log.debug("Watching for the URL to change from", initialUrl);
        function onEpisodeEnded() {
            log.log("URL changed to", location.href);
            observer.disconnect();
            clearInterval(poll);
            window.removeEventListener("popstate", checkUrlChanged);
            signalEpisodeEnded(log, `the URL changed from ${initialUrl} to ${location.href}`);
        }
        function checkUrlChanged() {
            if (location.href !== initialUrl) {
                onEpisodeEnded();
            }
        }
        // Watch for URL changes via History API pushState/replaceState (SPA navigation)
        const observeTarget = document.querySelector("title") ?? document.head;
        const observer = new MutationObserver(checkUrlChanged);
        observer.observe(observeTarget, {
            childList: true,
            subtree: true,
            characterData: true,
        });
        // Fallback polling in case MutationObserver misses the navigation
        const poll = window.setInterval(checkUrlChanged, 2000);
        // Also catch popstate events
        window.addEventListener("popstate", checkUrlChanged);
    }, delayMs);
}
// TODO: Validate
async function initTab(log, debug) {
    if (!(await isControlledTab())) {
        log.debug("Tab not opened by the remote, leaving it alone");
        if (GM_getValue(_remote__WEBPACK_IMPORTED_MODULE_1__/* .ALWAYS_SHOW_GUIDE_KEY */ .j8, true))
            mountGuideControls(log);
        return false;
    }
    autoControlStopped = tabStatus?.stopped ?? false;
    log.log("Tab controlled by Stream Channeler Remote");
    if (debug)
        enableDebug();
    mountPlayerControls(log);
    (0,_remote__WEBPACK_IMPORTED_MODULE_1__/* .listenForPlayRequests */ .vp)();
    return true;
}
// Climb from the <video> while each parent is still the same size as the video.
// Sites usually overlay their controls on a wrapper exactly the video's size, so
// the outermost such wrapper takes the controls into fullscreen with it.
function findSameSizeWrapper(video) {
    const SIZE_TOLERANCE_PX = 4;
    const rect = video.getBoundingClientRect();
    let wrapper = video;
    for (let el = video.parentElement; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
        const elRect = el.getBoundingClientRect();
        if (Math.abs(elRect.width - rect.width) > SIZE_TOLERANCE_PX ||
            Math.abs(elRect.height - rect.height) > SIZE_TOLERANCE_PX) {
            break;
        }
        wrapper = el;
    }
    return wrapper === video ? (video.parentElement ?? video) : wrapper;
}
// TODO: Validate
function findPlayer(video, playerSelectors) {
    for (const selector of playerSelectors) {
        const player = video.closest(selector);
        if (player)
            return player;
    }
    return findSameSizeWrapper(video);
}
/**
 * Fake-fullscreen the wrapper that holds the site's own controls (not the bare
 * <video>, or the controls are left behind on the page) and mount the overlay
 * controls. `playerSelectors` are tried in order via `video.closest()`; when none
 * match, the outermost wrapper the same size as the video is used.
 */
async function expandPlayer(log, video, playerSelectors = []) {
    const target = findPlayer(video, playerSelectors);
    log.debug("Fullscreen target:", target);
    try {
        // These players keep restyling themselves while they lay out after load, so
        // wait for that to stop or our fullscreen styles get overwritten.
        await waitForQuiet(target);
        setFakeFullscreen(target);
        log.debug("Fullscreen applied");
    }
    catch (error) {
        log.error("Fullscreen setup failed:", error);
    }
}
const VIDEO_POLL_MS = 1000;
// TODO: Validate
function findVideo(selector) {
    const documents = [document];
    for (const frame of Array.from(document.querySelectorAll("iframe"))) {
        try {
            if (frame.contentDocument)
                documents.push(frame.contentDocument);
        }
        catch {
            continue;
        }
    }
    const videos = documents.flatMap((doc) => Array.from(doc.querySelectorAll(selector)));
    return (videos.find((video) => video.getBoundingClientRect().width > 0) ??
        videos[0] ??
        null);
}
// TODO: Validate
async function waitForVideo(selector, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const video = findVideo(selector);
        if (video)
            return video;
        await sleep(250);
    }
    throw new Error(`Timed out waiting for "${selector}"`);
}
/**
 * Generic plugin for the many streaming sites that play a plain <video> in an
 * SPA: fake-fullscreen the player, mount the overlay controls, and signal the
 * end of the episode when the video finishes (or, optionally, when the site
 * auto-advances by navigating).
 *
 * The <video> is re-read on every poll rather than captured once, because these
 * players routinely tear down and recreate the element (ad breaks, quality
 * switches, next-episode transitions).
 */
// TODO: Validate
async function initVideoPlugin(config) {
    const log = createLogger(config.name);
    const videoSelector = config.videoSelector ?? "video";
    guidePlayer = {
        videoSelector,
        playerSelectors: config.playerToFullscreen ?? [],
    };
    if (!(await initTab(log, config.debug ?? false)))
        return;
    const navigation = performance.getEntriesByType("navigation")[0];
    const opened = (await (0,_remote__WEBPACK_IMPORTED_MODULE_1__/* .send */ .tN)({ type: "tab:opened" })) ||
        (!autoControlStopped && navigation?.type === "reload");
    if (opened && config.start) {
        try {
            await config.start(log);
        }
        catch (error) {
            log.error("Could not start playback:", error);
            return;
        }
    }
    watchEpisode(log, config, videoSelector);
    if (!opened)
        return;
    let video;
    try {
        video = await waitForVideo(videoSelector);
    }
    catch (error) {
        log.warn("No video found to make fullscreen or start:", error);
        return;
    }
    await expandPlayer(log, video, config.playerToFullscreen);
    if (config.manualAutoplay ?? true) {
        log.log("Starting playback of the episode the remote opened");
        startPlayback(log, videoSelector);
    }
}
// TODO: Validate
function watchEpisode(log, config, videoSelector) {
    const { endSelector, isEnded } = config;
    for (const selector of [endSelector ?? []].flat()) {
        watchEndCheck(log, `element shown (${selector})`, () => document.querySelector(selector) !== null);
    }
    if (isEnded)
        watchEndCheck(log, "check passed", isEnded);
    for (const clickButton of config.clickButtons ?? []) {
        keepTrying(log, `Clicked ${clickButton.name}`, clickButton);
    }
    if (config.watchForVideoForCompletion !== undefined &&
        config.watchForVideoForCompletion !== false) {
        watchVideoCompletion(log, videoSelector, config.watchForVideoForCompletion);
    }
    if (config.watcForhUrlChange) {
        watchUrlChange(log, config.urlChangeDelayMs);
    }
    else {
        waitForVideo(videoSelector).catch((error) => {
            log.warn("No video found; falling back to URL watching:", error);
            watchUrlChange(log, config.urlChangeDelayMs);
        });
    }
    log.debug("Watching for the end of the episode");
}
function keepTrying(log, message, attempt) {
    const poll = window.setInterval(() => {
        if (!attempt())
            return;
        clearInterval(poll);
        log.log(message);
    }, VIDEO_POLL_MS);
}
// Call play() on the video once it has loaded enough to play, retrying until
// playback starts. A single attempt right after the <video> appears fails when
// the stream is still loading (play() is interrupted by the load), and the
// element is looked up fresh each tick in case the player replaces it.
// TODO: Validate
function startPlayback(log, videoSelector) {
    const poll = window.setInterval(() => {
        const video = findVideo(videoSelector);
        if (!video)
            return;
        if (!video.paused) {
            clearInterval(poll);
            log.debug("Playback started");
            return;
        }
        if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA)
            return;
        video.play().catch((error) => {
            // The browser's autoplay policy won't change by retrying.
            if (error instanceof DOMException && error.name === "NotAllowedError") {
                clearInterval(poll);
                log.warn("Autoplay was blocked by the browser:", error);
                window.alert(`Stream Channeler Remote couldn't start the video because your browser blocked autoplay on ${location.hostname}.\n\n` +
                    "Allow audio and video autoplay for this site, then reload the page:\n" +
                    "• Firefox: click the permissions icon in the address bar and set Autoplay to Allow Audio and Video.\n" +
                    "• Chrome: open Site settings for this site and set Sound to Allow.");
                return;
            }
            log.debug("play() failed, retrying:", error);
        });
    }, VIDEO_POLL_MS);
}
// TODO: Validate
// Signal completion once `isEnded` returns true.
function watchEndCheck(log, reason, isEnded) {
    const poll = window.setInterval(() => {
        if (!isEnded())
            return;
        clearInterval(poll);
        log.log(`End-of-episode ${reason}`);
        signalEpisodeEnded(log, reason);
    }, VIDEO_POLL_MS);
}
// Signal completion once the current <video> ends or reaches its duration, or
// is torn down during the credits (some players swap to an end screen instead
// of finishing). The element is looked up fresh each tick so a recreated player
// is picked up.
// TODO: Validate
function watchVideoCompletion(log, videoSelector, setting) {
    let done = false;
    let seenPlaying = false;
    let lastTime = 0;
    let lastDuration = 0;
    // Tracked here rather than marked on the element, so the site's player never
    // sees its <video> change.
    const watchedVideos = new WeakSet();
    function finish(reason) {
        if (done)
            return;
        done = true;
        clearInterval(poll);
        log.log(`Video finished (${reason})`);
        const delaySeconds = setting === true ? 0 : setting;
        if (delaySeconds > 0) {
            log.log(`Waiting ${delaySeconds}s before moving on`);
            window.setTimeout(() => signalEpisodeEnded(log, `the video finished (${reason})`), delaySeconds * 1000);
        }
        else {
            signalEpisodeEnded(log, `the video finished (${reason})`);
        }
    }
    const poll = window.setInterval(() => {
        const video = findVideo(videoSelector);
        if (!video) {
            if (seenPlaying && lastDuration > 0 && lastDuration - lastTime <= 120) {
                finish(`video removed at ${lastTime.toFixed(1)}s of ${lastDuration.toFixed(1)}s`);
            }
            return;
        }
        // Attach `ended` once per element; recreated players get their own listener.
        if (!watchedVideos.has(video)) {
            watchedVideos.add(video);
            video.addEventListener("ended", () => finish("ended event"));
        }
        // Only trust the near-end check after playback has actually started, so a
        // player reporting a stale currentTime/duration on load can't end the
        // episode before it begins.
        if (video.currentTime > 0 && !video.paused)
            seenPlaying = true;
        if (!seenPlaying)
            return;
        const { currentTime, duration } = video;
        if (Number.isFinite(duration) && duration > 0) {
            lastTime = currentTime;
            lastDuration = duration;
        }
        if (Number.isFinite(duration) &&
            duration > 0 &&
            // How close to the end counts as finished. Sites that cut to a "next episode"
            // promo often never fire `ended`, but the video does reach its duration.
            currentTime >= duration - 1) {
            finish(`reached ${currentTime.toFixed(1)}s of ${duration.toFixed(1)}s`);
        }
    }, VIDEO_POLL_MS);
}


/***/ },

/***/ "./src/site_cache.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   YE: () => (/* binding */ startGuideSync),
/* harmony export */   cu: () => (/* binding */ loadChannelEpisodes),
/* harmony export */   lX: () => (/* binding */ readChannelQueue)
/* harmony export */ });
/* harmony import */ var _dvr_api__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/dvr_api.ts");
// TODO: Validate

const SYNC_MS = 2000;
const SEARCH_KEYS = [
    "sortBy",
    "filter",
    "order",
    "orderPresetId",
    "totalTitlesCount",
    "startedTitlesCount",
    "newTitlesCount",
    "limit",
    "randomSeed",
];
let lastRaw;
let lastClient = null;
// TODO: Validate
function readPersistedCache() {
    return new Promise((resolve, reject) => {
        const open = indexedDB.open("keyval-store");
        open.onupgradeneeded = () => open.result.createObjectStore("keyval");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
            const db = open.result;
            const request = db
                .transaction("keyval", "readonly")
                .objectStore("keyval")
                .get("REACT_QUERY_OFFLINE_CACHE");
            request.onsuccess = () => {
                db.close();
                resolve(request.result);
            };
            request.onerror = () => {
                db.close();
                reject(request.error);
            };
        };
    });
}
// TODO: Validate
function patchPersistedCache(patch) {
    return new Promise((resolve, reject) => {
        const open = indexedDB.open("keyval-store");
        open.onupgradeneeded = () => open.result.createObjectStore("keyval");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
            const db = open.result;
            const transaction = db.transaction("keyval", "readwrite");
            const store = transaction.objectStore("keyval");
            const request = store.get("REACT_QUERY_OFFLINE_CACHE");
            request.onsuccess = () => {
                const raw = request.result;
                if (!raw)
                    return;
                const client = JSON.parse(raw);
                if (patch(client)) {
                    store.put(JSON.stringify(client), "REACT_QUERY_OFFLINE_CACHE");
                }
            };
            transaction.oncomplete = () => {
                db.close();
                resolve();
            };
            transaction.onerror = () => {
                db.close();
                reject(transaction.error);
            };
        };
    });
}
// TODO: Validate
function hashKey(queryKey) {
    return JSON.stringify(queryKey, (_, value) => value !== null && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(Object.keys(value)
            .sort()
            .map((key) => [key, value[key]]))
        : value);
}
// TODO: Validate
function parseSearchValue(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return value;
    }
}
// TODO: Validate
function episodesQueryHash(channelId) {
    const search = new URLSearchParams(location.search);
    const params = {};
    for (const key of SEARCH_KEYS) {
        const value = search.get(key);
        if (value !== null)
            params[key] = parseSearchValue(value);
    }
    if (params.randomSeed === undefined) {
        const seed = localStorage.getItem(`episode-seed-${channelId}`);
        if (seed === null)
            return null;
        params.randomSeed = Number(seed);
    }
    return hashKey(["episodes", channelId, params]);
}
// TODO: Validate
async function loadClient() {
    const raw = await readPersistedCache();
    if (!raw)
        return null;
    if (raw !== lastRaw) {
        lastRaw = raw;
        lastClient = JSON.parse(raw);
    }
    return lastClient;
}
// TODO: Validate
function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
// TODO: Validate
function episodesOf(data) {
    if (!isObject(data) || !Array.isArray(data.episodes))
        return [];
    return data.episodes.filter(isObject);
}
// TODO: Validate
async function readChannelQueue(channelId) {
    const hash = episodesQueryHash(channelId);
    if (!hash)
        return null;
    const client = await loadClient();
    const query = client?.clientState.queries.find((candidate) => candidate.queryHash === hash);
    if (!query?.state.data)
        return null;
    return episodesOf(query.state.data).flatMap((episode) => typeof episode.url === "string" && typeof episode.id === "string"
        ? [{ url: episode.url, episodeId: episode.id }]
        : []);
}
// TODO: Validate
function text(source, ...keys) {
    for (const key of keys) {
        const value = source[key];
        if (typeof value === "string" && value.length > 0)
            return value;
    }
    return null;
}
// TODO: Validate
function count(source, ...keys) {
    for (const key of keys) {
        const value = source[key];
        if (typeof value === "number" && Number.isFinite(value))
            return value;
    }
    return null;
}
// TODO: Validate
function queryKeyOf(query) {
    if (Array.isArray(query.queryKey))
        return query.queryKey;
    try {
        const parsed = JSON.parse(query.queryHash);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
// TODO: Validate
function lookup(data, table, id) {
    const entries = data[table];
    if (!isObject(entries) || typeof id !== "string")
        return {};
    const entry = entries[id];
    return isObject(entry) ? entry : {};
}
// TODO: Validate
function cardSubtitle(episode, season, title) {
    if (title.media_type === "Movie")
        return "Movie";
    const linked = typeof episode.tmdb_episode_id === "string" &&
        episode.tmdb_episode_id !== episode.id;
    const seasonNumber = linked
        ? count(episode, "tmdb_season_number")
        : count(season, "season_number");
    const number = linked
        ? count(episode, "tmdb_episode_number")
        : count(episode, "episode_number");
    const numbering = seasonNumber !== null && number !== null
        ? `S${seasonNumber} Ep${number}`
        : number !== null
            ? `Ep${number}`
            : null;
    return [numbering, text(episode, "name")].filter(Boolean).join(" · ");
}
// TODO: Validate
function cardThumbnail(episode) {
    const images = Array.isArray(episode.images)
        ? episode.images.filter(isObject)
        : [];
    for (const kind of ["still", "backdrop", "poster"]) {
        const image = images.find((candidate) => candidate.kind === kind);
        if (image && isObject(image.urls)) {
            return (0,_dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .apiAssetUrl */ .yT)(text(image.urls, "w300", "w780", "original"));
        }
    }
    return null;
}
// TODO: Validate
function programsFromCards(data) {
    if (!isObject(data))
        return [];
    return episodesOf(data).flatMap((episode) => {
        const id = text(episode, "id");
        if (!id)
            return [];
        const season = lookup(data, "seasons", episode.season_id);
        const title = lookup(data, "titles", season.title_id);
        const source = lookup(data, "sources", title.source_id);
        const plugin = lookup(data, "plugins", source.plugin_id);
        return [
            {
                episode_id: id,
                title: text(title, "name"),
                subtitle: cardSubtitle(episode, season, title),
                url: text(episode, "url"),
                duration: count(episode, "duration"),
                thumbnail_url: cardThumbnail(episode),
                favicon_url: (0,_dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .apiAssetUrl */ .yT)(text(source, "favicon_url")),
                source_key: text(source, "key") ?? "",
                plugin_key: text(plugin, "key"),
                watched: episode.watch_date !== null && episode.watch_date !== undefined,
                description: text(episode, "description"),
            },
        ];
    });
}
// TODO: Validate
function isGuideChannel(value) {
    return (isObject(value) &&
        typeof value.id === "string" &&
        Array.isArray(value.programs));
}
// TODO: Validate
function collectChannelInfo(value, info, depth = 0) {
    if (depth > 6)
        return;
    if (Array.isArray(value)) {
        value.forEach((item) => collectChannelInfo(item, info, depth + 1));
        return;
    }
    if (!isObject(value))
        return;
    if (typeof value.id === "string" &&
        (typeof value.name === "string" || typeof value.custom_name === "string")) {
        info.set(value.id, { ...value, ...info.get(value.id) });
    }
    for (const child of Object.values(value)) {
        if (typeof child === "object")
            collectChannelInfo(child, info, depth + 1);
    }
}
// TODO: Validate
function markWatched(value, watched, depth = 0) {
    if (depth > 8)
        return false;
    if (Array.isArray(value)) {
        return value
            .map((item) => markWatched(item, watched, depth + 1))
            .some(Boolean);
    }
    if (!isObject(value))
        return false;
    let changed = false;
    const id = text(value, "episode_id", "id");
    if (id && id in watched) {
        if (value.watched === false) {
            value.watched = true;
            changed = true;
        }
        if ("watch_date" in value && value.watch_date === null) {
            value.watch_date = new Date(watched[id]).toISOString();
            changed = true;
        }
    }
    for (const child of Object.values(value)) {
        if (typeof child === "object" && markWatched(child, watched, depth + 1)) {
            changed = true;
        }
    }
    return changed;
}
// TODO: Validate
async function markWatchedInSiteCache(watched) {
    if (Object.keys(watched).length === 0)
        return;
    await patchPersistedCache((client) => client.clientState.queries
        .map((query) => markWatched(query.state.data, watched))
        .some(Boolean));
}
// TODO: Validate
function favoriteChannelIds(client) {
    for (const query of client.clientState.queries) {
        const [kind, scope] = queryKeyOf(query);
        const data = query.state.data;
        if (kind !== "channels" || scope !== "favorite-ids")
            continue;
        if (!Array.isArray(data))
            continue;
        return {
            ids: data.filter((id) => typeof id === "string"),
            updatedAt: query.state.dataUpdatedAt ?? 0,
        };
    }
    return null;
}
// TODO: Validate
function newerChannels(built, previous) {
    const previousById = new Map(previous.map((channel) => [channel.id, channel]));
    return built.map((channel) => {
        const older = previousById.get(channel.id);
        if (!older)
            return channel;
        const chosen = (older.updatedAt ?? 0) > (channel.updatedAt ?? 0) ? older : channel;
        return { ...chosen, query: channel.query ?? older.query };
    });
}
// TODO: Validate
function defaultQuery(details) {
    const order = text(details, "default_order");
    if (!order)
        return null;
    try {
        const parsed = JSON.parse(order);
        return isObject(parsed) ? parsed : null;
    }
    catch {
        return null;
    }
}
// TODO: Validate
function buildGuide(client) {
    const queries = [...client.clientState.queries].sort((a, b) => (b.state.dataUpdatedAt ?? 0) - (a.state.dataUpdatedAt ?? 0));
    const channels = new Map();
    const info = new Map();
    for (const query of queries) {
        const data = query.state.data;
        collectChannelInfo(data, info);
        const listed = isObject(data) && Array.isArray(data.channels) ? data.channels : [data];
        for (const channel of listed) {
            if (isGuideChannel(channel) && !channels.has(channel.id)) {
                const raw = channel;
                channels.set(channel.id, {
                    ...channel,
                    query: defaultQuery(info.get(channel.id) ?? raw),
                    name: text(raw, "custom_name", "name"),
                    number: count(raw, "custom_channel_number", "number", "channel_number"),
                    updatedAt: query.state.dataUpdatedAt ?? 0,
                    programs: channel.programs.map((program) => ({
                        ...program,
                        thumbnail_url: (0,_dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .apiAssetUrl */ .yT)(program.thumbnail_url),
                        favicon_url: (0,_dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .apiAssetUrl */ .yT)(program.favicon_url),
                    })),
                });
            }
        }
    }
    const episodeQueries = queries.filter((query) => ["episodes", "episodes-preview"].includes(String(queryKeyOf(query)[0])));
    for (const query of episodeQueries) {
        const [kind, channelId, params, seed] = queryKeyOf(query);
        if (typeof channelId !== "string")
            continue;
        if (channels.has(channelId))
            continue;
        const programs = programsFromCards(query.state.data);
        if (programs.length === 0)
            continue;
        const details = info.get(channelId) ?? {};
        const preview = kind === "episodes-preview";
        channels.set(channelId, {
            query: isObject(params)
                ? preview && typeof seed === "number"
                    ? { ...params, randomSeed: seed }
                    : params
                : defaultQuery(details),
            loadedAll: !preview || programs.length < _dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .PREVIEW_LIMIT */ .FZ,
            id: channelId,
            name: text(details, "custom_name", "name"),
            number: count(details, "custom_channel_number", "number", "channel_number"),
            programs,
            updatedAt: query.state.dataUpdatedAt ?? 0,
        });
    }
    return Array.from(channels.values()).sort((a, b) => (a.number ?? Number.MAX_SAFE_INTEGER) -
        (b.number ?? Number.MAX_SAFE_INTEGER) ||
        (a.name ?? "").localeCompare(b.name ?? ""));
}
// TODO: Validate
function withWatched(programs, watched) {
    return programs.map((program) => program.episode_id in watched ? { ...program, watched: true } : program);
}
// TODO: Validate
async function loadChannelEpisodes(channel, all) {
    if (!channel.query) {
        throw new Error(`No episode order known for ${channel.id}`);
    }
    const data = await (0,_dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .fetchChannelEpisodes */ .ui)(channel.id, all ? channel.query : { ...channel.query, limit: _dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .PREVIEW_LIMIT */ .FZ });
    const programs = withWatched(programsFromCards(data), (0,_dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .readWatched */ .vj)());
    const loadedAll = all || programs.length < _dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .PREVIEW_LIMIT */ .FZ;
    const cache = (0,_dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .readGuideCache */ .j_)();
    if (!cache)
        return;
    const updatedAt = Date.now();
    (0,_dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .writeGuideCache */ .qZ)({
        ...cache,
        channels: cache.channels.map((candidate) => candidate.id === channel.id
            ? { ...candidate, programs, loadedAll, updatedAt }
            : candidate),
    });
}
// TODO: Validate
async function syncGuideCache(force = false) {
    const watched = (0,_dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .readWatched */ .vj)();
    await markWatchedInSiteCache(watched);
    const client = await loadClient();
    if (!client)
        return;
    const previous = (0,_dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .readGuideCache */ .j_)();
    const channels = newerChannels(buildGuide(client), previous?.channels ?? []).map((channel) => ({
        ...channel,
        programs: withWatched(channel.programs, watched),
    }));
    const favorites = favoriteChannelIds(client);
    const keepFavorites = previous?.favoriteIds !== undefined &&
        (favorites === null ||
            (previous.favoritesUpdatedAt ?? 0) > favorites.updatedAt);
    const favoriteIds = keepFavorites
        ? (previous?.favoriteIds ?? [])
        : (favorites?.ids ?? []);
    const favoritesUpdatedAt = keepFavorites
        ? previous?.favoritesUpdatedAt
        : favorites?.updatedAt;
    if (!force &&
        previous &&
        JSON.stringify([previous.channels, previous.favoriteIds ?? []]) ===
            JSON.stringify([channels, favoriteIds]))
        return;
    (0,_dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .writeGuideCache */ .qZ)({
        channels,
        favoriteIds,
        favoritesUpdatedAt,
        fetchedAt: Date.now(),
    });
}
// TODO: Validate
function startGuideSync() {
    if (window.top !== window)
        return;
    const sync = (force = false) => {
        syncGuideCache(force).catch((error) => console.warn("[Stream Channeler Remote] Couldn't read the site cache:", error));
    };
    sync();
    window.setInterval(() => sync(), SYNC_MS);
    GM_addValueChangeListener(_dvr_api__WEBPACK_IMPORTED_MODULE_0__/* .GUIDE_SYNC_REQUEST_KEY */ .ZG, () => sync(true));
}


/***/ },

/***/ "./src/manage sync recursive \\/index\\.ts$"
(module, __unused_webpack_exports, __webpack_require__) {

var map = {
	"./Adult Swim/index.ts": "./src/manage/Adult Swim/index.ts",
	"./Amazon/index.ts": "./src/manage/Amazon/index.ts",
	"./Crunchyroll/index.ts": "./src/manage/Crunchyroll/index.ts",
	"./Disney+/index.ts": "./src/manage/Disney+/index.ts",
	"./HBO Max/index.ts": "./src/manage/HBO Max/index.ts",
	"./HiDive/index.ts": "./src/manage/HiDive/index.ts",
	"./Hulu/index.ts": "./src/manage/Hulu/index.ts",
	"./NHK World/index.ts": "./src/manage/NHK World/index.ts",
	"./Netflix/index.ts": "./src/manage/Netflix/index.ts",
	"./Paramount+/index.ts": "./src/manage/Paramount+/index.ts",
	"./Peacock/index.ts": "./src/manage/Peacock/index.ts",
	"./Pluto TV/index.ts": "./src/manage/Pluto TV/index.ts",
	"./Roku/index.ts": "./src/manage/Roku/index.ts",
	"./TMDB/index.ts": "./src/manage/TMDB/index.ts",
	"./Tubi/index.ts": "./src/manage/Tubi/index.ts",
	"./YouTube/index.ts": "./src/manage/YouTube/index.ts"
};


function webpackContext(req) {
	var id = webpackContextResolve(req);
	return __webpack_require__(id);
}
function webpackContextResolve(req) {
	if(!__webpack_require__.o(map, req)) {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	return map[req];
}
webpackContext.keys = function webpackContextKeys() {
	return Object.keys(map);
};
webpackContext.resolve = webpackContextResolve;
module.exports = webpackContext;
webpackContext.id = "./src/manage sync recursive \\/index\\.ts$";

/***/ },

/***/ "./src/playback sync recursive \\/index\\.ts$"
(module, __unused_webpack_exports, __webpack_require__) {

var map = {
	"./Adult Swim/index.ts": "./src/playback/Adult Swim/index.ts",
	"./Amazon/index.ts": "./src/playback/Amazon/index.ts",
	"./Crunchyroll/index.ts": "./src/playback/Crunchyroll/index.ts",
	"./Disney+/index.ts": "./src/playback/Disney+/index.ts",
	"./HBO Max/index.ts": "./src/playback/HBO Max/index.ts",
	"./HiDive/index.ts": "./src/playback/HiDive/index.ts",
	"./Hulu/index.ts": "./src/playback/Hulu/index.ts",
	"./NHK World/index.ts": "./src/playback/NHK World/index.ts",
	"./Netflix/index.ts": "./src/playback/Netflix/index.ts",
	"./Paramount+/index.ts": "./src/playback/Paramount+/index.ts",
	"./Peacock/index.ts": "./src/playback/Peacock/index.ts",
	"./Pluto TV/index.ts": "./src/playback/Pluto TV/index.ts",
	"./Roku/index.ts": "./src/playback/Roku/index.ts",
	"./Tubi/index.ts": "./src/playback/Tubi/index.ts",
	"./YouTube/index.ts": "./src/playback/YouTube/index.ts"
};


function webpackContext(req) {
	var id = webpackContextResolve(req);
	return __webpack_require__(id);
}
function webpackContextResolve(req) {
	if(!__webpack_require__.o(map, req)) {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	return map[req];
}
webpackContext.keys = function webpackContextKeys() {
	return Object.keys(map);
};
webpackContext.resolve = webpackContextResolve;
module.exports = webpackContext;
webpackContext.id = "./src/playback sync recursive \\/index\\.ts$";

/***/ },

/***/ "./src/manage/Adult Swim/matches.cjs"
(module) {

module.exports = {
  hostnames: ["adultswim.com"],
  matches: ["https://www.adultswim.com/*"],
};


/***/ },

/***/ "./src/manage/Amazon/matches.cjs"
(module) {

module.exports = {
  hostnames: ["primevideo.com", "amazon.com"],
  matches: [
    "https://www.primevideo.com/*",
    "https://www.amazon.com/gp/video/*",
  ],
};


/***/ },

/***/ "./src/manage/Crunchyroll/matches.cjs"
(module) {

module.exports = {
  hostnames: ["crunchyroll.com"],
  matches: ["https://www.crunchyroll.com/*"],
};


/***/ },

/***/ "./src/manage/Disney+/matches.cjs"
(module) {

module.exports = {
  hostnames: ["disneyplus.com"],
  matches: ["https://www.disneyplus.com/*"],
};


/***/ },

/***/ "./src/manage/HBO Max/matches.cjs"
(module) {

module.exports = {
  hostnames: ["hbomax.com"],
  matches: ["https://play.hbomax.com/*", "https://www.hbomax.com/*"],
};


/***/ },

/***/ "./src/manage/HiDive/matches.cjs"
(module) {

module.exports = {
  hostnames: ["hidive.com"],
  matches: ["https://www.hidive.com/*"],
};


/***/ },

/***/ "./src/manage/Hulu/matches.cjs"
(module) {

module.exports = {
  hostnames: ["hulu.com"],
  matches: ["https://www.hulu.com/*"],
};


/***/ },

/***/ "./src/manage/NHK World/matches.cjs"
(module) {

module.exports = {
  hostnames: ["nhk.or.jp"],
  matches: ["https://www3.nhk.or.jp/nhkworld/*"],
};


/***/ },

/***/ "./src/manage/Netflix/matches.cjs"
(module) {

module.exports = {
  hostnames: ["netflix.com"],
  matches: ["https://www.netflix.com/*"],
};


/***/ },

/***/ "./src/manage/Paramount+/matches.cjs"
(module) {

module.exports = {
  hostnames: ["paramountplus.com"],
  matches: ["https://www.paramountplus.com/*"],
};


/***/ },

/***/ "./src/manage/Peacock/matches.cjs"
(module) {

module.exports = {
  hostnames: ["peacocktv.com"],
  matches: ["https://www.peacocktv.com/*"],
};


/***/ },

/***/ "./src/manage/Pluto TV/matches.cjs"
(module) {

module.exports = {
  hostnames: ["pluto.tv"],
  matches: ["https://pluto.tv/*"],
};


/***/ },

/***/ "./src/manage/Roku/matches.cjs"
(module) {

module.exports = {
  hostnames: ["therokuchannel.roku.com"],
  matches: ["https://therokuchannel.roku.com/*"],
};


/***/ },

/***/ "./src/manage/TMDB/matches.cjs"
(module) {

module.exports = {
  hostnames: ["themoviedb.org"],
  matches: ["https://www.themoviedb.org/*"],
};


/***/ },

/***/ "./src/manage/Tubi/matches.cjs"
(module) {

module.exports = {
  hostnames: ["tubitv.com"],
  matches: ["https://tubitv.com/*"],
};


/***/ },

/***/ "./src/manage/YouTube/matches.cjs"
(module) {

module.exports = {
  hostnames: ["youtube.com"],
  matches: ["https://www.youtube.com/*"],
};


/***/ },

/***/ "./src/playback/Adult Swim/matches.cjs"
(module) {

module.exports = {
  hostnames: ["adultswim.com"],
  matches: ["https://www.adultswim.com/videos/*"],
};


/***/ },

/***/ "./src/playback/Amazon/matches.cjs"
(module) {

module.exports = {
  hostnames: ["primevideo.com", "amazon.com"],
  matches: ["https://www.amazon.com/gp/video/*"],
};


/***/ },

/***/ "./src/playback/Crunchyroll/matches.cjs"
(module) {

module.exports = {
  hostnames: ["crunchyroll.com"],
  matches: ["https://www.crunchyroll.com/watch/*"],
};


/***/ },

/***/ "./src/playback/Disney+/matches.cjs"
(module) {

module.exports = {
  hostnames: ["disneyplus.com"],
  matches: ["https://www.disneyplus.com/*/play/*"],
};


/***/ },

/***/ "./src/playback/HBO Max/matches.cjs"
(module) {

module.exports = {
  hostnames: ["hbomax.com"],
  matches: [
    "https://play.hbomax.com/video/watch/*",
    "https://play.hbomax.com/movie/*",
  ],
};


/***/ },

/***/ "./src/playback/HiDive/matches.cjs"
(module) {

module.exports = {
  hostnames: ["hidive.com"],
  matches: [
    "https://www.hidive.com/video/*",
    "https://www.hidive.com/stream/*",
  ],
};


/***/ },

/***/ "./src/playback/Hulu/matches.cjs"
(module) {

module.exports = {
  hostnames: ["hulu.com"],
  matches: ["https://www.hulu.com/watch/*"],
};


/***/ },

/***/ "./src/playback/NHK World/matches.cjs"
(module) {

module.exports = {
  hostnames: ["nhk.or.jp"],
  matches: ["https://www3.nhk.or.jp/nhkworld/en/shows/*"],
};


/***/ },

/***/ "./src/playback/Netflix/matches.cjs"
(module) {

module.exports = {
  hostnames: ["netflix.com"],
  // Not just /watch/*: Netflix can bounce a new tab to its "Who's watching?"
  // profile picker on another page first.
  matches: ["https://www.netflix.com/*"],
};


/***/ },

/***/ "./src/playback/Paramount+/matches.cjs"
(module) {

module.exports = {
  hostnames: ["paramountplus.com"],
  matches: [
    "https://www.paramountplus.com/shows/video/*",
    "https://www.paramountplus.com/movies/video/*",
  ],
};


/***/ },

/***/ "./src/playback/Peacock/matches.cjs"
(module) {

module.exports = {
  hostnames: ["peacocktv.com"],
  // Episodes and movies live under /watch/asset/..., and playback under /watch/playback/...
  matches: ["https://www.peacocktv.com/watch/*"],
};


/***/ },

/***/ "./src/playback/Pluto TV/matches.cjs"
(module) {

module.exports = {
  hostnames: ["pluto.tv"],
  matches: ["https://pluto.tv/*/on-demand/*", "https://pluto.tv/*/live-tv/*"],
};


/***/ },

/***/ "./src/playback/Roku/matches.cjs"
(module) {

module.exports = {
  hostnames: ["therokuchannel.roku.com"],
  matches: ["https://therokuchannel.roku.com/watch/*"],
};


/***/ },

/***/ "./src/playback/Tubi/matches.cjs"
(module) {

module.exports = {
  hostnames: ["tubitv.com"],
  matches: [
    "https://tubitv.com/movies/*",
    "https://tubitv.com/tv-shows/*",
    "https://tubitv.com/series/*",
  ],
};


/***/ },

/***/ "./src/playback/YouTube/matches.cjs"
(module) {

module.exports = {
  hostnames: ["youtube.com"],
  matches: ["https://www.youtube.com/watch*"],
};


/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
(() => {
"use strict";

// EXTERNAL MODULE: ./src/manage.ts
var manage = __webpack_require__("./src/manage.ts");
// EXTERNAL MODULE: ./src/dvr.ts + 1 modules
var dvr = __webpack_require__("./src/dvr.ts");
// EXTERNAL MODULE: ./src/remote.ts
var remote = __webpack_require__("./src/remote.ts");
// EXTERNAL MODULE: ./src/shared.ts
var shared = __webpack_require__("./src/shared.ts");
// EXTERNAL MODULE: ./src/site_cache.ts
var site_cache = __webpack_require__("./src/site_cache.ts");
;// ./src/remote_button.ts
// TODO: Validate



const log = (0,shared/* createLogger */.h)();
const CHANNEL_PATH = /^\/channels\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;
const CACHE_POLL_MS = 1000;
const STOP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-monitor-x-icon lucide-monitor-x"><path d="m14.5 12.5-5-5"/><path d="m9.5 12.5 5-5"/><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M12 17v4"/><path d="M8 21h8"/></svg>`;
const PLAY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-monitor-play-icon lucide-monitor-play"><path d="M15.033 9.44a.647.647 0 0 1 0 1.12l-4.065 2.352a.645.645 0 0 1-.968-.56V7.648a.645.645 0 0 1 .967-.56z"/><path d="M12 17v4"/><path d="M8 21h8"/><rect x="2" y="3" width="20" height="14" rx="2"/></svg>`;
let startIndex = 0;
let pageQueue = [];
let pageSignature = null;
// TODO: Validate
function parseIcon(markup) {
    return document.importNode(new DOMParser().parseFromString(markup, "image/svg+xml").documentElement, true);
}
// TODO: Validate
function isThisChannel(state) {
    return state.mode === "remote" && state.channelPath === location.pathname;
}
// TODO: Validate
function isRunningHere(state) {
    return isThisChannel(state) && (0,remote/* isRunning */.W_)(state);
}
// TODO: Validate
function promptSetIndex() {
    const state = (0,remote/* loadState */.C7)();
    const total = isThisChannel(state) ? state.queue.length : pageQueue.length;
    const current = isThisChannel(state) ? state.index : startIndex;
    const input = window.prompt(`Set current episode (1-${total}):`, String(current + 1));
    if (input === null)
        return;
    const parsed = parseInt(input, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > total)
        return;
    if (isThisChannel(state)) {
        void (0,remote/* send */.tN)({ type: "remote:setIndex", index: parsed - 1 });
    }
    else {
        startIndex = parsed - 1;
        updateButton();
    }
}
// TODO: Validate
function toggleRemote() {
    const state = (0,remote/* loadState */.C7)();
    if (isRunningHere(state)) {
        void (0,remote/* send */.tN)({ type: "remote:stop" });
        return;
    }
    const queue = isThisChannel(state) ? state.queue : pageQueue;
    const index = isThisChannel(state) ? state.index : startIndex;
    if (queue.length === 0) {
        log.error("The full episode list isn't loaded; click Refresh Episodes on the page");
        return;
    }
    log.log(`Starting at ${index + 1}/${queue.length}`);
    void (0,remote/* send */.tN)({
        type: "remote:start",
        channelPath: location.pathname,
        queue,
        index,
    });
}
// TODO: Validate
function handleButtonClick(event) {
    const target = event.target;
    if (target.closest("#remote-control-counter")) {
        event.preventDefault();
        promptSetIndex();
        return;
    }
    toggleRemote();
}
// TODO: Validate
function updateButton() {
    let button = document.getElementById("remote-control-btn");
    if (!CHANNEL_PATH.test(location.pathname)) {
        button?.remove();
        return;
    }
    if (!button) {
        const commentsButton = Array.from(document.querySelectorAll("button")).find((candidate) => candidate.querySelector("svg.lucide-message-square") &&
            candidate.textContent?.trim() === "Comments");
        if (!commentsButton?.parentElement)
            return;
        button = document.createElement("button");
        button.id = "remote-control-btn";
        button.className = commentsButton.className;
        button.setAttribute("data-slot", "button");
        button.addEventListener("click", handleButtonClick);
        commentsButton.after(button);
    }
    const state = (0,remote/* loadState */.C7)();
    const running = isRunningHere(state);
    const total = isThisChannel(state) ? state.queue.length : pageQueue.length;
    const index = isThisChannel(state) ? state.index : startIndex;
    const displayed = Math.min(index + 1, total);
    const signature = `${running}:${displayed}/${total}`;
    if (button.dataset.signature === signature)
        return;
    button.dataset.signature = signature;
    const counter = document.createElement("span");
    counter.id = "remote-control-counter";
    counter.style.cssText = "cursor:pointer;text-decoration:underline";
    counter.textContent = `${displayed}/${total}`;
    button.replaceChildren(parseIcon(running ? STOP_ICON : PLAY_ICON), `${running ? "Stop Remote" : "Start Remote"} (`, counter, ")");
}
// TODO: Validate
async function refreshPageQueue() {
    const channelId = location.pathname.match(CHANNEL_PATH)?.[1];
    const queue = channelId ? ((await (0,site_cache/* readChannelQueue */.lX)(channelId)) ?? []) : [];
    const signature = JSON.stringify([location.pathname, queue]);
    if (signature === pageSignature)
        return;
    pageSignature = signature;
    pageQueue = queue;
    syncQueue();
    updateButton();
}
// TODO: Validate
function syncQueue() {
    const state = (0,remote/* loadState */.C7)();
    if (pageQueue.length === 0 || !isThisChannel(state))
        return;
    const unchanged = pageQueue.length === state.queue.length &&
        pageQueue.every((item, i) => item.url === state.queue[i].url &&
            item.episodeId === state.queue[i].episodeId);
    if (unchanged)
        return;
    log.log("Episode order on the page changed; updating the remote's queue");
    void (0,remote/* send */.tN)({
        type: "remote:sync",
        channelPath: location.pathname,
        queue: pageQueue,
    });
}
// TODO: Validate
function initRemoteButton() {
    GM_addValueChangeListener(remote/* STATE_KEY */.Mq, updateButton);
    let debounceTimer;
    new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(updateButton, 200);
    }).observe(document.body, { childList: true, subtree: true });
    window.setInterval(() => {
        if (document.visibilityState !== "visible")
            return;
        void refreshPageQueue();
        updateButton();
    }, CACHE_POLL_MS);
    void refreshPageQueue();
    updateButton();
}

;// ./src/settings_panel.ts
// TODO: Validate



const settings_panel_log = (0,shared/* createLogger */.h)();
const NETFLIX_NAME_KEY = "netflixProfileName";
const NETFLIX_PIN_KEY = "netflixProfilePin";
const PANEL_ID = "stream-channeler-remote-settings";
const PANEL_CSS = `
:host {
  all: initial;
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  background: rgba(0, 0, 0, 0.4);
  color-scheme: dark;
  --background: #0a0a0a;
  --card: #171717;
  --border: #303030;
  --foreground: #fafafa;
  --muted: #a3a3a3;
  --primary: #14b8a6;
}
main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
  width: min(360px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  margin: 16px;
  padding: 16px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--background);
  color: var(--foreground);
  font: 14px system-ui, sans-serif;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
h1 {
  margin: 0;
  font-size: 16px;
}
h2 {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
}
label {
  display: flex;
  align-items: center;
  gap: 8px;
}
input[type="text"],
textarea {
  flex: 1;
  box-sizing: border-box;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--background);
  color: var(--foreground);
  font: inherit;
}
textarea {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  resize: vertical;
}
.row {
  display: flex;
  gap: 8px;
}
button {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #262626;
  color: var(--foreground);
  font: inherit;
  cursor: pointer;
}
header button {
  flex: none;
}
button:hover {
  border-color: var(--primary);
}
.status {
  margin: 0;
  color: var(--muted);
}
`;
// TODO: Validate
function el(tag, className, ...children) {
    const element = document.createElement(tag);
    if (className)
        element.className = className;
    element.append(...children);
    return element;
}
// TODO: Validate
function settings_panel_button(text, onClick) {
    const element = el("button", undefined, text);
    element.type = "button";
    element.addEventListener("click", onClick);
    return element;
}
// TODO: Validate
function describe(state) {
    if (state.mode === null)
        return "Nothing is playing.";
    const status = (0,remote/* isRunning */.W_)(state) ? "Playing" : "Stopped";
    if (state.mode === "dvr") {
        return `${status}: ${state.dvr?.channelName || "DVR"}`;
    }
    const source = state.mode === "remote" ? "Channel" : "Custom channel";
    return `${status}: ${source}, episode ${Math.min(state.index + 1, state.queue.length)} of ${state.queue.length}`;
}
// TODO: Validate
function settings_panel_checkbox(text, key) {
    const input = el("input");
    input.type = "checkbox";
    input.checked = GM_getValue(key, true);
    input.addEventListener("change", () => GM_setValue(key, input.checked));
    return el("label", undefined, input, text);
}
// TODO: Validate
function textField(text, key, numeric = false) {
    const input = el("input");
    input.type = "text";
    if (numeric)
        input.inputMode = "numeric";
    input.value = GM_getValue(key, "");
    input.addEventListener("change", () => GM_setValue(key, input.value.trim()));
    return el("label", undefined, text, input);
}
// TODO: Validate
function applyStyles(root) {
    try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(PANEL_CSS);
        root.adoptedStyleSheets = [sheet];
    }
    catch {
        const style = document.createElement("style");
        style.textContent = PANEL_CSS;
        root.prepend(style);
    }
}
// TODO: Validate
function openSettingsPanel() {
    if (document.getElementById(PANEL_ID))
        return;
    const host = document.createElement("div");
    host.id = PANEL_ID;
    const root = host.attachShadow({ mode: "open" });
    applyStyles(root);
    const closeOnEscape = (event) => {
        if (event.key !== "Escape")
            return;
        event.stopPropagation();
        close();
    };
    const close = () => {
        host.remove();
        clearInterval(statusPoll);
        window.removeEventListener("keydown", closeOnEscape, true);
    };
    const status = el("p", "status");
    const renderStatus = () => {
        status.textContent = describe((0,remote/* loadState */.C7)());
    };
    renderStatus();
    const statusPoll = window.setInterval(() => {
        if (!host.isConnected) {
            clearInterval(statusPoll);
            return;
        }
        renderStatus();
    }, 1000);
    const textarea = el("textarea");
    textarea.id = "custom-urls";
    textarea.rows = 6;
    textarea.spellcheck = false;
    textarea.value = GM_getValue(remote/* CUSTOM_URLS_KEY */.tc, []).join("\n");
    const customUrls = () => textarea.value
        .split("\n")
        .map((url) => url.trim())
        .filter((url) => url.length > 0);
    textarea.addEventListener("change", () => GM_setValue(remote/* CUSTOM_URLS_KEY */.tc, customUrls()));
    const customLabel = el("label", undefined, "URLs to play in order, one per line");
    customLabel.htmlFor = "custom-urls";
    const panel = el("main", undefined, el("header", undefined, el("h1", undefined, "Stream Channeler Remote"), settings_panel_button("Close", close)), el("section", undefined, status, el("div", "row", settings_panel_button("Open guide", () => {
        close();
        (0,dvr/* openDvrGuide */.Fc)(settings_panel_log);
    }), settings_panel_button("Stop", () => void (0,remote/* send */.tN)({ type: "remote:stop" })))), el("section", undefined, el("h2", undefined, "Playback"), settings_panel_checkbox("Skip intros", remote/* SKIP_INTROS_KEY */.o1), settings_panel_checkbox("Skip credits", remote/* SKIP_CREDITS_KEY */.HA), settings_panel_checkbox("Always show guide button", remote/* ALWAYS_SHOW_GUIDE_KEY */.j8)), el("section", undefined, el("h2", undefined, "Netflix profile"), textField("Profile name", NETFLIX_NAME_KEY), textField("PIN", NETFLIX_PIN_KEY, true)), el("section", undefined, el("h2", undefined, "Custom channel"), customLabel, textarea, el("div", "row", settings_panel_button("Play custom channel", () => {
        const urls = customUrls();
        GM_setValue(remote/* CUSTOM_URLS_KEY */.tc, urls);
        if (urls.length === 0)
            return;
        close();
        void (0,remote/* send */.tN)({ type: "custom:start", urls });
    }))));
    host.addEventListener("click", (event) => {
        if (event.composedPath()[0] === host)
            close();
    });
    host.addEventListener("keydown", (event) => event.stopPropagation());
    window.addEventListener("keydown", closeOnEscape, true);
    root.append(panel);
    document.body.append(host);
}

;// ./src/index.ts
// TODO: Validate






function loadPlugins(ctx) {
    return ctx.keys().map((key) => ctx(key));
}
// TODO: Validate
function matchesPage(patterns) {
    return patterns.some((pattern) => new RegExp(`^${pattern
        .split("*")
        .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*")}$`).test(location.href));
}
// TODO: Validate
function findPlugin(plugins) {
    return plugins.find((p) => p.hostnames.some((h) => location.hostname.includes(h)) &&
        matchesPage(p.matches));
}
const playbackPlugin = findPlugin(loadPlugins(__webpack_require__("./src/playback sync recursive \\/index\\.ts$")));
const managePlugin = findPlugin(loadPlugins(__webpack_require__("./src/manage sync recursive \\/index\\.ts$")));
if (window.top === window) {
    (0,shared/* addMenuCommand */.iq)("start", "Open guide", () => {
        (0,dvr/* openDvrGuide */.Fc)((0,shared/* createLogger */.h)("Guide"));
    });
    (0,shared/* addMenuCommand */.iq)("settings", "Settings", openSettingsPanel);
}
if (playbackPlugin)
    playbackPlugin.init();
if (managePlugin)
    managePlugin.init();
if (location.hostname.includes("streamchanneler.com")) {
    (0,dvr/* storeDvrToken */.$c)();
    (0,dvr/* bridgeDvrPage */.$S)();
    (0,site_cache/* startGuideSync */.YE)();
    initRemoteButton();
    (0,manage/* initManage */.Ad)();
}

})();

/******/ })()
;