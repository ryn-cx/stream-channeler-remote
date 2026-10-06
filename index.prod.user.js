// ==UserScript==
// @name          Stream Channeler Remote
// @namespace     https://streamchanneler.com/
// @version       0.0.2
// @author        ryn.cx
// @description   Companion for Stream Channeler that controls media playback and assists in channel creation.
// @match         https://streamchanneler.com/channels
// @match         https://streamchanneler.com/channels/*
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
// @match         https://www.primevideo.com/*
// @match         https://www.amazon.com/gp/video/detail/*
// @match         https://www.crunchyroll.com/series/*
// @match         https://www.disneyplus.com/browse/*
// @match         https://www.disneyplus.com/*/browse/*
// @match         https://play.hbomax.com/*
// @match         https://www.hbomax.com/shows/*
// @match         https://www.hbomax.com/movies/*
// @match         https://www.hidive.com/series/*
// @match         https://www.hidive.com/season/*
// @match         https://www.hulu.com/series/*
// @match         https://www.hulu.com/movie/*
// @match         https://www.netflix.com/title/*
// @match         https://www.netflix.com/browse*
// @match         https://www.paramountplus.com/shows/*
// @match         https://www.peacocktv.com/watch/asset/*
// @match         https://pluto.tv/*/on-demand/series/*
// @match         https://pluto.tv/*/on-demand/movies/*
// @match         https://pluto.tv/*/shows/*
// @match         https://pluto.tv/*/movies/*
// @match         https://therokuchannel.roku.com/details/*
// @match         https://www.themoviedb.org/tv/*
// @match         https://www.themoviedb.org/movie/*
// @match         https://www.youtube.com/@*
// @match         https://www.youtube.com/channel/*
// @match         https://www.youtube.com/c/*
// @match         https://www.youtube.com/user/*
// @source        https://github.com/ryn-cx/stream-channeler-remote
// @grant         GM_setValue
// @grant         GM_getValue
// @grant         GM_addValueChangeListener
// @grant         GM_deleteValue
// @grant         GM_registerMenuCommand
// @grant         GM_unregisterMenuCommand
// @grant         unsafeWindow
// @run-at        document-end
// ==/UserScript==

/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

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
    function ensureUI() {
        if (closed)
            return;
        if (!isValidPage() || config.isPlaybackActive?.()) {
            removeUI();
            return;
        }
        if (document.getElementById(containerId))
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
    (0,_shared__WEBPACK_IMPORTED_MODULE_1__/* .waitForElement */ .xk)(config.waitSelector)
        .then(() => {
        ensureUI();
        (0,_shared__WEBPACK_IMPORTED_MODULE_1__/* .fadeWhenIdle */ .Bc)(() => document.getElementById(containerId));
        new MutationObserver(onMutation).observe(document.body, {
            childList: true,
            subtree: true,
        });
    })
        .catch(() => {
        log.warn(`Could not find "${config.waitSelector}" to insert the UI`);
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
function init() {
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
// profile is locked. Set from the userscript manager's menu.
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
// TODO: Validate
function registerSettingsMenu() {
    (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .addMenuCommand */ .iq)("settings", "Set Netflix profile", () => {
        const name = window.prompt("Netflix profile to select automatically (leave empty to disable):", GM_getValue(PROFILE_NAME_KEY, ""));
        if (name === null)
            return;
        GM_setValue(PROFILE_NAME_KEY, name.trim());
        const pin = window.prompt("4-digit PIN for that profile (leave empty if it has no PIN):", GM_getValue(PROFILE_PIN_KEY, ""));
        if (pin === null)
            return;
        GM_setValue(PROFILE_PIN_KEY, pin.trim());
    });
}
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
    const target = GM_getValue("loadingUrl", null);
    if (!target)
        return;
    log.log("Returning to", target, "after choosing the profile");
    // The reload runs the plugin again, so let it claim the tab.
    GM_setValue("loadingTab", true);
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
    registerSettingsMenu();
    if (!isWatchPage()) {
        if (GM_getValue("loadingTab", false))
            void getPastProfileGate();
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

/***/ "./src/shared.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Bc: () => (/* binding */ fadeWhenIdle),
/* harmony export */   IP: () => (/* binding */ clickWhenShown),
/* harmony export */   TD: () => (/* binding */ initVideoPlugin),
/* harmony export */   V_: () => (/* binding */ registerSkipMenus),
/* harmony export */   Xd: () => (/* binding */ shouldSkipCredits),
/* harmony export */   _3: () => (/* binding */ shouldSkipIntros),
/* harmony export */   h: () => (/* binding */ createLogger),
/* harmony export */   iq: () => (/* binding */ addMenuCommand),
/* harmony export */   oU: () => (/* binding */ FADE_HIDDEN_STYLE),
/* harmony export */   xk: () => (/* binding */ waitForElement),
/* harmony export */   yy: () => (/* binding */ sleep)
/* harmony export */ });
/* unused harmony exports claimTab, waitForQuiet, stopAutoControl, resumeAutoControl, setFakeFullscreen, mountPlayerControls, enableDebug, signalPreviousEpisode, signalEpisodeEnded, watchUrlChange, initUrlChangePlugin, expandPlayer */
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
/**
 * Whether this tab was opened by Stream Channeler Remote. The first call in a
 * claimed tab consumes the marker, so a tab the user opens later isn't taken
 * over; call it once, at the start of a playback plugin.
 */
function claimTab() {
    if (!GM_getValue("loadingTab", false))
        return false;
    GM_setValue("loadingTab", false);
    return true;
}
// TODO: Validate
function shouldSkipIntros() {
    return GM_getValue("skipIntros", true);
}
// TODO: Validate
function shouldSkipCredits() {
    return GM_getValue("skipCredits", true);
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
const skipSettings = [
    { key: "skipIntros", noun: "intros" },
    { key: "skipCredits", noun: "credits" },
];
// TODO: Validate
function registerSkipMenus() {
    for (const { key, noun } of skipSettings) {
        addMenuCommand("settings", () => GM_getValue(key, true)
            ? `Skipping ${noun} (click to play ${noun})`
            : `Playing ${noun} (click to skip ${noun})`, () => GM_setValue(key, !GM_getValue(key, true)));
        GM_addValueChangeListener(key, renderMenu);
    }
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
function stopAutoControl(log) {
    autoControlStopped = true;
    log.log("Automatic control stopped by user");
    // Tell the controller on the channels page to stop too, so its Start/Stop
    // Remote button updates. A fresh timestamp guarantees a value change.
    GM_setValue("remoteStopRequested", Date.now());
}
// TODO: Validate
function resumeAutoControl(log) {
    autoControlStopped = false;
    log.log("Automatic control resumed by user");
    GM_setValue("remoteResumeRequested", Date.now());
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
// Fake fullscreen by covering the viewport with fixed inline styles, applied in
// place (the element never moves, so there's no reload). Styles are inline via
// CSSOM (not an injected <style>) so a strict CSP can't block them. Pass the
// player *wrapper* that contains the site's own controls so they come along into
// fullscreen. There's no undo: stopping auto control and refreshing the page
// restores the original layout.
const FAKE_FULLSCREEN_CLASS = "scr-fake-fullscreen";
function setFakeFullscreen(target) {
    if (target.classList.contains(FAKE_FULLSCREEN_CLASS))
        return;
    for (const [prop, value] of Object.entries({
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        "z-index": "2147483646",
        background: "#000",
    })) {
        target.style.setProperty(prop, value, "important");
    }
    // A fixed player can be trapped inside a transformed ancestor's stacking
    // context, so other page elements paint over it. Lift every ancestor to the
    // top of its parent's stacking order so the whole chain (and the player)
    // floats above the page. z-index only changes paint order (no reflow); any
    // shift from positioning a static ancestor is hidden behind the player.
    for (let el = target.parentElement; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
        el.style.setProperty("z-index", "2147483646", "important");
        if (getComputedStyle(el).position === "static") {
            el.style.setProperty("position", "relative", "important");
        }
    }
    document.documentElement.style.overflow = "hidden";
    target.classList.add(FAKE_FULLSCREEN_CLASS);
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
    const container = document.createElement("div");
    container.id = "stream-channeler-controls";
    container.style.cssText =
        "position:fixed;top:12px;right:12px;z-index:2147483647;display:flex;gap:8px;";
    fadeWhenIdle(() => container);
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
    const stopButton = createOverlayButton(document, "stream-channeler-stop-btn", "Stop Auto Control", stopIcon, () => {
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
    const refreshButton = createOverlayButton(document, "stream-channeler-refresh-btn", "Refresh", {
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
                tag: "path",
                attrs: { d: "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" },
            },
            { tag: "path", attrs: { d: "M21 3v5h-5" } },
        ],
    }, () => {
        if (!autoControlStopped)
            GM_setValue("loadingTab", true);
        log.log("Refreshing the page");
        location.reload();
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
    container.append(refreshButton, previousButton, nextButton, stopButton);
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
        log.log("Going back to the previous episode, closing tab");
        GM_setValue("previousEpisodeRequested", Date.now());
        window.close();
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
        log.log("Episode ended, closing tab");
        const now = Date.now();
        const current = GM_getValue("videoEnded", 0);
        log.debug("videoEnded:", current, "now:", now);
        // Only signal if the current value is older (stop sets it to far future)
        if (now > current) {
            log.debug("Setting videoEnded to", now);
            GM_setValue("videoEnded", now);
        }
        else {
            log.warn("Not signaling: videoEnded is newer than now (was the remote stopped?)");
        }
        window.close();
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
/**
 * Generic plugin for sites where episode end is detected by URL change. When
 * `playerSelectors` is given, the player is also fake-fullscreened with the
 * overlay controls; otherwise only the floating stop button is shown. `start`
 * runs first, for pages that need a click to begin playback (it should resolve
 * once the site has navigated to the player, so that navigation isn't mistaken
 * for the end of the episode). With `watchVideo`, the end of the <video> also
 * counts, for sites that only sometimes navigate when an episode finishes; a
 * number waits that many seconds after the video finishes before moving on.
 */
async function initUrlChangePlugin(name, playerSelectors, start, { watchVideo = false, debug = false, } = {}) {
    const log = createLogger(name);
    if (!claimTab()) {
        log.debug("Tab not opened by the remote, skipping");
        return;
    }
    if (debug)
        enableDebug();
    if (start) {
        try {
            await start(log);
        }
        catch (error) {
            log.error("Could not start playback:", error);
            mountPlayerControls(log);
            return;
        }
    }
    watchUrlChange(log);
    if (watchVideo !== false)
        watchVideoCompletion(log, "video", watchVideo);
    if (!playerSelectors) {
        mountPlayerControls(log);
        return;
    }
    waitForElement("video")
        .then((video) => expandPlayer(log, video, playerSelectors))
        .catch((error) => {
        log.warn("No video found; showing stop button only:", error);
        mountPlayerControls(log);
    });
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
/**
 * Fake-fullscreen the wrapper that holds the site's own controls (not the bare
 * <video>, or the controls are left behind on the page) and mount the overlay
 * controls. `playerSelectors` are tried in order via `video.closest()`; when none
 * match, the outermost wrapper the same size as the video is used.
 */
async function expandPlayer(log, video, playerSelectors = []) {
    let player = null;
    for (const selector of playerSelectors) {
        player = video.closest(selector);
        if (player)
            break;
    }
    player ?? (player = findSameSizeWrapper(video));
    const target = player;
    log.debug("Fullscreen target:", target);
    try {
        mountPlayerControls(log);
        // These players keep restyling themselves while they lay out after load, so
        // wait for that to stop or our fullscreen styles get overwritten.
        await waitForQuiet(target);
        setFakeFullscreen(target);
        log.debug("Fullscreen applied");
    }
    catch (error) {
        log.error("Controls/fullscreen setup failed:", error);
    }
}
const VIDEO_POLL_MS = 1000;
// TODO: Validate
function findVideo(selector) {
    const video = document.querySelector(selector);
    if (video)
        return video;
    for (const frame of Array.from(document.querySelectorAll("iframe"))) {
        try {
            const framed = frame.contentDocument?.querySelector(selector);
            if (framed)
                return framed;
        }
        catch {
            continue;
        }
    }
    return null;
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
    if (!claimTab())
        return;
    if (config.debug)
        enableDebug();
    const videoSelector = config.videoSelector ?? "video";
    log.log("Tab opened by Stream Channeler Remote, initializing");
    if (config.start) {
        try {
            await config.start(log);
        }
        catch (error) {
            log.error("Could not start playback:", error);
            mountPlayerControls(log);
            return;
        }
    }
    const { endSelector, isEnded } = config;
    for (const selector of [endSelector ?? []].flat()) {
        watchEndCheck(log, `element shown (${selector})`, () => document.querySelector(selector) !== null);
    }
    if (isEnded)
        watchEndCheck(log, "check passed", isEnded);
    for (const clickButton of config.clickButtons ?? []) {
        keepTrying(log, `Clicked ${clickButton.name}`, clickButton);
    }
    let video;
    try {
        video = await waitForVideo(videoSelector);
    }
    catch (error) {
        log.warn("No video found; falling back to URL watching:", error);
        mountPlayerControls(log);
        watchUrlChange(log, config.urlChangeDelayMs);
        return;
    }
    if (config.playerToFullscreen) {
        await expandPlayer(log, video, config.playerToFullscreen);
    }
    else {
        mountPlayerControls(log);
    }
    if (config.manualAutoplay ?? true)
        startPlayback(log, videoSelector);
    if (config.watchForVideoForCompletion !== undefined &&
        config.watchForVideoForCompletion !== false) {
        watchVideoCompletion(log, videoSelector, config.watchForVideoForCompletion);
    }
    if (config.watcForhUrlChange) {
        watchUrlChange(log, config.urlChangeDelayMs);
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
  // Episodes live at /videos/<show>/<episode>.
  matches: ["https://www.adultswim.com/videos/*"],
};


/***/ },

/***/ "./src/manage/Amazon/matches.cjs"
(module) {

module.exports = {
  hostnames: ["primevideo.com", "amazon.com"],
  matches: [
    "https://www.primevideo.com/*",
    "https://www.amazon.com/gp/video/detail/*",
  ],
};


/***/ },

/***/ "./src/manage/Crunchyroll/matches.cjs"
(module) {

module.exports = {
  hostnames: ["crunchyroll.com"],
  matches: ["https://www.crunchyroll.com/series/*"],
};


/***/ },

/***/ "./src/manage/Disney+/matches.cjs"
(module) {

module.exports = {
  hostnames: ["disneyplus.com"],
  matches: [
    "https://www.disneyplus.com/browse/*",
    "https://www.disneyplus.com/*/browse/*",
  ],
};


/***/ },

/***/ "./src/manage/HBO Max/matches.cjs"
(module) {

module.exports = {
  hostnames: ["hbomax.com"],
  matches: [
    "https://play.hbomax.com/*",
    "https://www.hbomax.com/shows/*",
    "https://www.hbomax.com/movies/*",
  ],
};


/***/ },

/***/ "./src/manage/HiDive/matches.cjs"
(module) {

module.exports = {
  hostnames: ["hidive.com"],
  matches: [
    "https://www.hidive.com/series/*",
    "https://www.hidive.com/season/*",
    "https://www.hidive.com/video/*",
  ],
};


/***/ },

/***/ "./src/manage/Hulu/matches.cjs"
(module) {

module.exports = {
  hostnames: ["hulu.com"],
  matches: ["https://www.hulu.com/series/*", "https://www.hulu.com/movie/*"],
};


/***/ },

/***/ "./src/manage/NHK World/matches.cjs"
(module) {

module.exports = {
  hostnames: ["nhk.or.jp"],
  matches: ["https://www3.nhk.or.jp/nhkworld/en/shows/*"],
};


/***/ },

/***/ "./src/manage/Netflix/matches.cjs"
(module) {

module.exports = {
  hostnames: ["netflix.com"],
  matches: [
    "https://www.netflix.com/title/*",
    "https://www.netflix.com/browse*",
  ],
};


/***/ },

/***/ "./src/manage/Paramount+/matches.cjs"
(module) {

module.exports = {
  hostnames: ["paramountplus.com"],
  matches: [
    "https://www.paramountplus.com/shows/*",
    "https://www.paramountplus.com/movies/video/*",
  ],
};


/***/ },

/***/ "./src/manage/Peacock/matches.cjs"
(module) {

module.exports = {
  hostnames: ["peacocktv.com"],
  matches: ["https://www.peacocktv.com/watch/asset/*"],
};


/***/ },

/***/ "./src/manage/Pluto TV/matches.cjs"
(module) {

module.exports = {
  hostnames: ["pluto.tv"],
  matches: [
    "https://pluto.tv/*/on-demand/series/*",
    "https://pluto.tv/*/on-demand/movies/*",
    "https://pluto.tv/*/shows/*",
    "https://pluto.tv/*/movies/*",
  ],
};


/***/ },

/***/ "./src/manage/Roku/matches.cjs"
(module) {

module.exports = {
  hostnames: ["therokuchannel.roku.com"],
  matches: ["https://therokuchannel.roku.com/details/*"],
};


/***/ },

/***/ "./src/manage/TMDB/matches.cjs"
(module) {

module.exports = {
  hostnames: ["themoviedb.org"],
  matches: [
    "https://www.themoviedb.org/tv/*",
    "https://www.themoviedb.org/movie/*",
  ],
};


/***/ },

/***/ "./src/manage/Tubi/matches.cjs"
(module) {

module.exports = {
  hostnames: ["tubitv.com"],
  matches: ["https://tubitv.com/series/*", "https://tubitv.com/movies/*"],
};


/***/ },

/***/ "./src/manage/YouTube/matches.cjs"
(module) {

module.exports = {
  hostnames: ["youtube.com"],
  matches: [
    "https://www.youtube.com/@*",
    "https://www.youtube.com/channel/*",
    "https://www.youtube.com/c/*",
    "https://www.youtube.com/user/*",
  ],
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

// EXTERNAL MODULE: ./src/shared.ts
var shared = __webpack_require__("./src/shared.ts");
;// ./src/custom_channel.ts
// TODO: Validate

const log = (0,shared/* createLogger */.h)("Custom Channel");
const URLS_KEY = "customChannelUrls";
let running = false;
let stoppedByTab = false;
let currentIndex = 0;
// TODO: Validate
let isCardRemoteRunning = () => false;
// TODO: Validate
function storedUrls() {
    return GM_getValue(URLS_KEY, []);
}
// TODO: Validate
function promptForUrls() {
    if (document.getElementById("custom-channel-dialog"))
        return;
    const overlay = document.createElement("div");
    overlay.id = "custom-channel-dialog";
    overlay.style.cssText =
        "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);font-family:system-ui,sans-serif;";
    const panel = document.createElement("div");
    panel.style.cssText =
        "display:flex;flex-direction:column;gap:10px;width:min(700px,90vw);padding:16px;border-radius:8px;background:#1c252f;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,0.5);";
    const label = document.createElement("label");
    label.textContent = "URLs to play as a channel, in order (one per line):";
    label.style.cssText = "font-size:14px;";
    const textarea = document.createElement("textarea");
    textarea.value = storedUrls().join("\n");
    textarea.rows = 15;
    textarea.spellcheck = false;
    textarea.style.cssText =
        "width:100%;box-sizing:border-box;padding:8px;border-radius:4px;border:1px solid #3a4a5c;background:#0f151b;color:#fff;font-family:monospace;font-size:13px;resize:vertical;";
    const buttons = document.createElement("div");
    buttons.style.cssText = "display:flex;justify-content:flex-end;gap:8px;";
    const button = (text, onClick) => {
        const el = document.createElement("button");
        el.type = "button";
        el.textContent = text;
        el.style.cssText =
            "padding:6px 16px;border-radius:4px;border:1px solid #3a4a5c;background:#2a3846;color:#fff;font-size:14px;cursor:pointer;";
        el.addEventListener("click", onClick);
        return el;
    };
    const close = () => overlay.remove();
    const save = () => {
        const urls = textarea.value
            .split("\n")
            .map((url) => url.trim())
            .filter((url) => url.length > 0);
        GM_setValue(URLS_KEY, urls);
        log.log(`Saved ${urls.length} URLs`);
        close();
    };
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay)
            close();
    });
    overlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape")
            close();
    });
    buttons.append(button("Cancel", close), button("Save", save));
    panel.append(label, textarea, buttons);
    overlay.append(panel);
    document.body.append(overlay);
    textarea.focus();
}
// TODO: Validate
function openCurrentUrl() {
    const urls = storedUrls();
    if (currentIndex >= urls.length) {
        log.log(`Finished all ${urls.length} URLs`);
        running = false;
        return;
    }
    const url = urls[currentIndex];
    log.log(`Opening ${currentIndex + 1}/${urls.length}:`, url);
    GM_setValue("loadingTab", true);
    GM_setValue("loadingUrl", url);
    window.open(url, "_blank");
}
// TODO: Validate
function toggleCustomChannel() {
    stoppedByTab = false;
    if (running) {
        running = false;
        log.log("Stopped");
        return;
    }
    if (isCardRemoteRunning()) {
        window.alert("Stop the channel's remote before starting a custom channel.");
        return;
    }
    if (storedUrls().length === 0) {
        window.alert("Set the custom channel URLs first.");
        return;
    }
    running = true;
    currentIndex = 0;
    openCurrentUrl();
}
// TODO: Validate
function initCustomChannel(cardRemoteRunning) {
    isCardRemoteRunning = cardRemoteRunning;
    (0,shared/* addMenuCommand */.iq)("start", "Start/stop custom channel", toggleCustomChannel);
    (0,shared/* addMenuCommand */.iq)("builder", "Set custom channel URLs", promptForUrls);
    GM_addValueChangeListener("videoEnded", () => {
        if (!running)
            return;
        if (isCardRemoteRunning()) {
            running = false;
            return;
        }
        currentIndex++;
        openCurrentUrl();
    });
    GM_addValueChangeListener("previousEpisodeRequested", () => {
        if (!running)
            return;
        if (isCardRemoteRunning()) {
            running = false;
            return;
        }
        currentIndex = Math.max(0, currentIndex - 1);
        openCurrentUrl();
    });
    GM_addValueChangeListener("remoteStopRequested", () => {
        if (!running)
            return;
        stoppedByTab = true;
        running = false;
    });
    GM_addValueChangeListener("remoteResumeRequested", () => {
        if (!stoppedByTab || running)
            return;
        stoppedByTab = false;
        running = true;
    });
}

;// ./src/playback.ts
// TODO: Validate

const playback_log = (0,shared/* createLogger */.h)();
let cards = [];
let playback_currentIndex = 0;
let playback_running = false;
let listenerRegistered = false;
let playback_stoppedByTab = false;
function promptSetCurrentIndex() {
    const input = window.prompt(`Set current episode (1-${cards.length}):`, String(playback_currentIndex + 1));
    if (input === null)
        return;
    const parsed = parseInt(input, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > cards.length)
        return;
    playback_currentIndex = parsed - 1;
    updateButton();
}
function handleButtonClick(event) {
    const target = event.target;
    if (target.closest("#remote-control-counter")) {
        event.preventDefault();
        promptSetCurrentIndex();
        return;
    }
    toggleRemote();
}
function updateButton() {
    let button = document.getElementById("remote-control-btn");
    if (!/^\/channels\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i.test(location.pathname)) {
        button?.remove();
        return;
    }
    if (!button) {
        // Place the button right after the "Comments" button in the channel toolbar,
        // matching its styling.
        const commentsButton = Array.from(document.querySelectorAll("button")).find((b) => b.querySelector("svg.lucide-message-square") &&
            b.textContent.trim() === "Comments");
        if (!commentsButton?.parentElement)
            return;
        button = document.createElement("button");
        button.id = "remote-control-btn";
        button.className = commentsButton.className;
        button.setAttribute("data-slot", "button");
        button.addEventListener("click", handleButtonClick);
        commentsButton.after(button);
    }
    // Icons: https://lucide.dev/icons/monitor-x and
    // https://lucide.dev/icons/monitor-play
    const icon = playback_running
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-monitor-x-icon lucide-monitor-x"><path d="m14.5 12.5-5-5"/><path d="m9.5 12.5 5-5"/><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M12 17v4"/><path d="M8 21h8"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-monitor-play-icon lucide-monitor-play"><path d="M15.033 9.44a.647.647 0 0 1 0 1.12l-4.065 2.352a.645.645 0 0 1-.968-.56V7.648a.645.645 0 0 1 .967-.56z"/><path d="M12 17v4"/><path d="M8 21h8"/><rect x="2" y="3" width="20" height="14" rx="2"/></svg>`;
    const action = playback_running ? "Stop Remote" : "Start Remote";
    // Shown 1-based: the episode that's playing, or that Start Remote will play
    // next. Capped at the last episode once the channel has finished.
    const displayed = Math.min(playback_currentIndex + 1, cards.length);
    const counter = `<span id="remote-control-counter" style="cursor:pointer;text-decoration:underline">${displayed}/${cards.length}</span>`;
    button.innerHTML = `${icon}${action} (${counter})`;
}
function clickCurrentCard() {
    // If all videos have been played stop remote.
    if (playback_currentIndex >= cards.length) {
        stopRemote();
        return;
    }
    // loadingTab is used to make sure the script only activates on the specific tabs
    // that it opens.
    // TODO: This isn't a perfectly safe way of tracking this because the user could
    // trigger a race condition if they open a tab to a video at the same time as the
    // script opens a video.
    GM_setValue("loadingTab", true);
    // Remember where the tab is headed, for plugins that get bounced elsewhere
    // first (e.g. Netflix's profile picker) and need to find their way back.
    const card = cards[playback_currentIndex];
    const link = card.querySelector("a[href]") ??
        card.closest("a[href]");
    GM_setValue("loadingUrl", link?.href ?? null);
    if (!link)
        captureOpenedUrl();
    card.click();
    updateButton();
}
// Cards without a plain link open their video from script, so record the URL
// they open (via window.open or a clicked link) as loadingUrl.
function captureOpenedUrl() {
    const page = unsafeWindow;
    const originalOpen = page.open;
    let captured = false;
    const record = (url) => {
        if (captured)
            return;
        captured = true;
        playback_log.log("Card opened", url);
        GM_setValue("loadingUrl", url);
    };
    const patchedOpen = (url, ...rest) => {
        if (url)
            record(new URL(String(url), location.href).href);
        return originalOpen.call(page, url, ...rest);
    };
    // Firefox keeps the page's globals behind Xray wrappers, so the patch has to
    // be exported into the page to be callable from it.
    page.open =
        typeof exportFunction === "function"
            ? exportFunction(patchedOpen, page)
            : patchedOpen;
    const onClick = (event) => {
        const anchor = event.target?.closest?.("a[href]");
        if (anchor instanceof HTMLAnchorElement)
            record(anchor.href);
    };
    document.addEventListener("click", onClick, true);
    // The card may open the tab after an await, so keep listening for a moment.
    window.setTimeout(() => {
        page.open = originalOpen;
        document.removeEventListener("click", onClick, true);
        if (!captured) {
            playback_log.warn("Couldn't tell which URL the card opened");
        }
    }, 3000);
}
function stopRemote() {
    playback_running = false;
    updateButton();
}
// TODO: Validate
function startRemote() {
    if (cards.length === 0) {
        cards = Array.from(document.querySelectorAll('[data-slot="card"]'));
        playback_currentIndex = 0;
    }
    playback_log.log(`Starting at ${playback_currentIndex + 1}/${cards.length}`);
    playback_running = true;
    // Listener to detect for when a video is completed.
    if (!listenerRegistered) {
        listenerRegistered = true;
        GM_addValueChangeListener("videoEnded", (_name, _oldValue, newValue) => {
            // Only automatically load the next channel if Stream Channeler Remote is in
            // an active state.
            if (!playback_running)
                return;
            if (typeof newValue !== "number")
                throw new Error(`videoEnded value is not a number: ${newValue}`);
            playback_currentIndex++;
            clickCurrentCard();
        });
        GM_addValueChangeListener("previousEpisodeRequested", () => {
            if (!playback_running)
                return;
            playback_currentIndex = Math.max(0, playback_currentIndex - 1);
            clickCurrentCard();
        });
    }
    clickCurrentCard();
}
// TODO: Validate
function toggleRemote() {
    playback_stoppedByTab = false;
    if (playback_running) {
        stopRemote();
    }
    else {
        startRemote();
    }
}
// TODO: Validate
function isRemoteRunning() {
    return playback_running;
}
// TODO: Validate
function initPlayback() {
    // A video tab's "Stop Auto Control" button sets this; stop the remote so the
    // Start/Stop Remote button reflects it.
    GM_addValueChangeListener("remoteStopRequested", () => {
        if (!playback_running)
            return;
        playback_stoppedByTab = true;
        stopRemote();
    });
    GM_addValueChangeListener("remoteResumeRequested", () => {
        if (!playback_stoppedByTab || playback_running)
            return;
        playback_stoppedByTab = false;
        playback_running = true;
        updateButton();
    });
    function syncState() {
        const newCards = Array.from(document.querySelectorAll('[data-slot="card"]'));
        // The user can remove cards (by verifying a watch) or changing card order (by
        // clicking the "Next Episode" button) so these changes need to be managed.
        if (newCards.length !== cards.length ||
            !newCards.every((c, i) => c === cards[i])) {
            const activeCard = cards[playback_currentIndex];
            cards = newCards;
            if (activeCard) {
                const newIndex = cards.indexOf(activeCard);
                playback_currentIndex = newIndex >= 0 ? newIndex : 0;
                // No activeCard can probably occur when the user verifies a watch on the last
                // episode of a
                // channel probably.
            }
            else {
                playback_currentIndex = 0;
            }
        }
        updateButton();
    }
    let debounceTimer;
    new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(syncState, 200);
    }).observe(document.body, { childList: true, subtree: true });
    // Clean up just in case when tab is closed to avoid the script from activating on a
    // tab that is opened later on.
    window.addEventListener("beforeunload", () => {
        if (cards.length > 0) {
            GM_setValue("loadingTab", false);
        }
    });
}

// EXTERNAL MODULE: ./src/manage.ts
var manage = __webpack_require__("./src/manage.ts");
;// ./src/index.ts
// TODO: Validate




function loadPlugins(ctx) {
    return ctx.keys().map((key) => ctx(key));
}
const playbackPlugin = loadPlugins(__webpack_require__("./src/playback sync recursive \\/index\\.ts$")).find((p) => p.hostnames.some((h) => location.hostname.includes(h)));
const managePlugin = loadPlugins(__webpack_require__("./src/manage sync recursive \\/index\\.ts$")).find((p) => p.hostnames.some((h) => location.hostname.includes(h)));
(0,shared/* registerSkipMenus */.V_)();
if (playbackPlugin)
    playbackPlugin.init();
if (managePlugin)
    managePlugin.init();
if (!playbackPlugin && !managePlugin) {
    if (location.hostname.includes("streamchanneler.com")) {
        initPlayback();
        initCustomChannel(isRemoteRunning);
        (0,manage/* initManage */.Ad)();
    }
}

})();

/******/ })()
;