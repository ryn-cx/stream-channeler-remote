// TODO: Validate
const REMOTE_LOG = "[Stream Channeler Remote]";

export type WatchVideoSetting = boolean | number;

export interface Logger {
  debug(...args: unknown[]): void;
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

/**
 * Console logging tagged "[Stream Channeler Remote]" (plus the site, when
 * given), so the script's messages can be filtered out of the page's own.
 */
export function createLogger(site?: string): Logger {
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
export function claimTab(): boolean {
  if (!GM_getValue("loadingTab", false)) return false;
  GM_setValue("loadingTab", false);
  return true;
}

// TODO: Validate
export function shouldSkipIntros(): boolean {
  return GM_getValue("skipIntros", true);
}

// TODO: Validate
export function shouldSkipCredits(): boolean {
  return GM_getValue("skipCredits", true);
}

const menuSections = ["start", "settings", "builder"] as const;

interface MenuCommand {
  section: (typeof menuSections)[number];
  label: string | (() => string);
  run: () => void;
}

const menuCommands: MenuCommand[] = [];
let menuIds: number[] = [];

// TODO: Validate
function renderMenu(): void {
  menuIds.forEach(GM_unregisterMenuCommand);
  menuIds = menuSections.flatMap((section) =>
    menuCommands
      .filter((command) => command.section === section)
      .map(({ label, run }) =>
        GM_registerMenuCommand(
          typeof label === "string" ? label : label(),
          run,
        ),
      ),
  );
}

// TODO: Validate
export function addMenuCommand(
  section: MenuCommand["section"],
  label: MenuCommand["label"],
  run: () => void,
): void {
  menuCommands.push({ section, label, run });
  renderMenu();
}

const skipSettings = [
  { key: "skipIntros", noun: "intros" },
  { key: "skipCredits", noun: "credits" },
];

// TODO: Validate
export function registerSkipMenus(): void {
  for (const { key, noun } of skipSettings) {
    addMenuCommand(
      "settings",
      () =>
        GM_getValue(key, true)
          ? `Skipping ${noun} (click to play ${noun})`
          : `Playing ${noun} (click to skip ${noun})`,
      () => GM_setValue(key, !GM_getValue(key, true)),
    );
    GM_addValueChangeListener(key, renderMenu);
  }
}

// TODO: Validate
export function clickWhenShown(selector: string, text?: RegExp): () => boolean {
  return () => {
    const button = Array.from(
      document.querySelectorAll<HTMLElement>(selector),
    ).find((element) => !text || text.test(element.textContent ?? ""));
    if (!button?.checkVisibility({})) return false;
    button.click();
    return true;
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function waitForElement<T extends Element>(
  selector: string,
  timeoutMs = 15_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<T>(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector<T>(selector);
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
export function waitForQuiet(
  element: Element,
  quietMs = 1200,
  maxMs = 10_000,
): Promise<void> {
  return new Promise((resolve) => {
    let quietTimer = window.setTimeout(finish, quietMs);
    const hardTimer = window.setTimeout(finish, maxMs);
    const observer = new MutationObserver(() => {
      clearTimeout(quietTimer);
      quietTimer = window.setTimeout(finish, quietMs);
    });
    observer.observe(element, { attributes: true, attributeFilter: ["style"] });

    function finish(): void {
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
export function stopAutoControl(log: Logger): void {
  autoControlStopped = true;
  log.log("Automatic control stopped by user");
  // Tell the controller on the channels page to stop too, so its Start/Stop
  // Remote button updates. A fresh timestamp guarantees a value change.
  GM_setValue("remoteStopRequested", Date.now());
}

// TODO: Validate
export function resumeAutoControl(log: Logger): void {
  autoControlStopped = false;
  log.log("Automatic control resumed by user");
  GM_setValue("remoteResumeRequested", Date.now());
}

// Icons as structured data (root svg attrs + child shapes). Built via
// createElementNS rather than from a markup string because YouTube's strict CSP
// (Trusted Types) blocks both innerHTML and DOMParser string sinks.
const SVG_NS = "http://www.w3.org/2000/svg";
interface IconSpec {
  attrs: Record<string, string>;
  shapes: Array<{ tag: string; attrs: Record<string, string> }>;
}
// Build an icon's SVG element with DOM APIs (no string parsing — CSP-safe).
function buildIcon(doc: Document, spec: IconSpec): SVGElement {
  const svg = doc.createElementNS(SVG_NS, "svg");
  for (const [k, v] of Object.entries(spec.attrs)) svg.setAttribute(k, v);
  for (const shape of spec.shapes) {
    const el = doc.createElementNS(SVG_NS, shape.tag);
    for (const [k, v] of Object.entries(shape.attrs)) el.setAttribute(k, v);
    svg.appendChild(el);
  }
  return svg;
}

// Set a button's content to an icon + visible label without using innerHTML.
function setButtonContent(
  doc: Document,
  button: HTMLButtonElement,
  icon: IconSpec,
  label: string,
): void {
  button.replaceChildren();
  button.appendChild(buildIcon(doc, icon));
  const span = doc.createElement("span");
  span.textContent = label;
  button.appendChild(span);
}

// Build a labelled overlay button (icon + visible title).
function createOverlayButton(
  doc: Document,
  id: string,
  label: string,
  icon: IconSpec,
  onClick: () => void,
): HTMLButtonElement {
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
export function setFakeFullscreen(target: HTMLElement): void {
  if (target.classList.contains(FAKE_FULLSCREEN_CLASS)) return;

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
  for (
    let el = target.parentElement;
    el && el !== document.body && el !== document.documentElement;
    el = el.parentElement
  ) {
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
function onPointerMoveInAnyFrame(
  handler: (event: PointerEvent, frame: HTMLIFrameElement | null) => void,
): void {
  const options = { capture: true, passive: true };
  window.addEventListener(
    "pointermove",
    (event) => handler(event, null),
    options,
  );

  // An iframe gets a new window each time it navigates, so re-attach on load.
  const attached = new WeakSet<Window>();
  const attachToFrame = (frame: HTMLIFrameElement): void => {
    try {
      const frameWindow = frame.contentWindow;
      // Throws for cross-origin frames, which can't be listened to.
      if (!frameWindow || attached.has(frameWindow) || !frameWindow.document)
        return;
      attached.add(frameWindow);
      frameWindow.addEventListener(
        "pointermove",
        (event) => handler(event, frame),
        options,
      );
    } catch {
      // Cross-origin frame.
    }
  };
  const watchFrame = (frame: HTMLIFrameElement): void => {
    if (frame.dataset.scrPointerWatched) return;
    frame.dataset.scrPointerWatched = "1";
    frame.addEventListener("load", () => attachToFrame(frame));
    attachToFrame(frame);
  };

  document.querySelectorAll("iframe").forEach(watchFrame);
  new MutationObserver(() => {
    document.querySelectorAll("iframe").forEach(watchFrame);
  }).observe(document.body, { childList: true, subtree: true });
}

export const FADE_HIDDEN_STYLE =
  "opacity:0;pointer-events:none;transition:opacity 0.3s ease;";

// TODO: Validate
// Visibility is driven by a window capture-phase pointermove listener (which
// runs before any page handler can stop it) rather than mouseenter/mouseleave,
// because some players (e.g. Adult Swim) swallow pointer events.
export function fadeWhenIdle(getElement: () => HTMLElement | null): void {
  let hideTimer: number | undefined;
  const setVisible = (visible: boolean): void => {
    const element = getElement();
    if (!element) return;
    element.style.opacity = visible ? "1" : "0";
    // Not clickable while hidden, so a stray click can't hit an invisible button.
    element.style.pointerEvents = visible ? "auto" : "none";
  };
  const hide = (): void => {
    clearTimeout(hideTimer);
    if (getElement()?.contains(document.activeElement)) return;
    setVisible(false);
  };
  const initial = getElement();
  if (initial) initial.style.cssText += FADE_HIDDEN_STYLE;
  onPointerMoveInAnyFrame((event, frame) => {
    setVisible(true);
    clearTimeout(hideTimer);
    const element = getElement();
    if (!element) return;
    // Events from a player iframe are in its coordinates; shift them into the
    // top page's to compare against the element.
    const offset = frame?.getBoundingClientRect() ?? { left: 0, top: 0 };
    const x = event.clientX + offset.left;
    const y = event.clientY + offset.top;
    const rect = element.getBoundingClientRect();
    const hovered =
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    if (!hovered) hideTimer = window.setTimeout(hide, 2500);
  });
  // Pointer left the page entirely (no element it moved to).
  document.addEventListener(
    "pointerout",
    (event) => {
      if (!event.relatedTarget) hide();
    },
    { capture: true, passive: true },
  );
  window.addEventListener("blur", hide);
}

// Add the Stop Auto Control overlay to every controller-opened tab. It's always
// pinned to the same spot — fixed in the top-right of the top page, above any
// fake-fullscreen player — independent of the site's own player. Like a video player's own controls, it's hidden until
// the cursor moves, then fades out again once the cursor is idle (but stays while
// hovered).
// TODO: Validate
export function mountPlayerControls(log: Logger): void {
  if (document.getElementById("stream-channeler-controls")) return;

  const container = document.createElement("div");
  container.id = "stream-channeler-controls";
  container.style.cssText =
    "position:fixed;top:12px;right:12px;z-index:2147483647;display:flex;gap:8px;";
  fadeWhenIdle(() => container);

  const stopIcon: IconSpec = {
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
  const resumeIcon: IconSpec = {
    attrs: {
      viewBox: "0 0 24 24",
      width: "16",
      height: "16",
      fill: "currentColor",
      "aria-hidden": "true",
    },
    shapes: [{ tag: "polygon", attrs: { points: "7 4 19 12 7 20 7 4" } }],
  };
  const stopButton = createOverlayButton(
    document,
    "stream-channeler-stop-btn",
    "Stop Auto Control",
    stopIcon,
    () => {
      const [icon, label] = autoControlStopped
        ? [stopIcon, "Stop Auto Control"]
        : [resumeIcon, "Resume Auto Control"];
      if (autoControlStopped) {
        resumeAutoControl(log);
      } else {
        stopAutoControl(log);
      }
      stopButton.title = label;
      setButtonContent(document, stopButton, icon, label);
    },
  );

  const refreshButton = createOverlayButton(
    document,
    "stream-channeler-refresh-btn",
    "Refresh",
    {
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
    },
    () => {
      if (!autoControlStopped) GM_setValue("loadingTab", true);
      log.log("Refreshing the page");
      location.reload();
    },
  );

  const nextButton = createOverlayButton(
    document,
    "stream-channeler-next-btn",
    "Play Next Episode",
    {
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
    },
    () => {
      signalEpisodeEnded(log, "Play Next Episode was clicked");
    },
  );

  const previousButton = createOverlayButton(
    document,
    "stream-channeler-previous-btn",
    "Play Previous Episode",
    {
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
    },
    () => {
      signalPreviousEpisode(log, "Play Previous Episode was clicked");
    },
  );

  container.append(refreshButton, previousButton, nextButton, stopButton);
  document.body.appendChild(container);
  log.debug("Player controls overlay added");

  new MutationObserver(() => {
    if (container.isConnected) return;
    document.body.appendChild(container);
    log.debug("Player controls overlay re-added after the page removed it");
  }).observe(document.body, { childList: true });
}

// Several detectors (URL change, video end) can fire for the same episode; only
// the first one may advance the channel.
let episodeEndSignaled = false;

let debugEnabled = false;

// TODO: Validate
export function enableDebug(): void {
  debugEnabled = true;
}

// TODO: Validate
function confirmLeave(reason: string, leave: () => void): void {
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
  const button = (text: string, onClick: () => void): HTMLButtonElement => {
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
  buttons.append(
    button("Block", () => {
      episodeEndSignaled = false;
    }),
    button("Allow", leave),
  );
  panel.append(message, buttons);
  overlay.append(panel);
  document.body.append(overlay);
}

// TODO: Validate
function leaveEpisode(log: Logger, reason: string, leave: () => void): void {
  episodeEndSignaled = true;
  log.log(`Leaving the episode: ${reason}`);
  if (debugEnabled) {
    confirmLeave(reason, leave);
  } else {
    leave();
  }
}

// TODO: Validate
export function signalPreviousEpisode(log: Logger, reason: string): void {
  if (episodeEndSignaled) return;
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
export function signalEpisodeEnded(log: Logger, reason: string): void {
  if (episodeEndSignaled) return;
  if (autoControlStopped) {
    log.log("Episode ended but automatic control is stopped, staying on tab");
    return;
  }

  leaveEpisode(log, reason, () => {
    log.log("Episode ended, closing tab");
    const now = Date.now();
    const current = GM_getValue("videoEnded", 0) as number;
    log.debug("videoEnded:", current, "now:", now);
    // Only signal if the current value is older (stop sets it to far future)
    if (now > current) {
      log.debug("Setting videoEnded to", now);
      GM_setValue("videoEnded", now);
    } else {
      log.warn(
        "Not signaling: videoEnded is newer than now (was the remote stopped?)",
      );
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
export function watchUrlChange(log: Logger, delayMs = 0): void {
  if (delayMs > 0) {
    log.debug(`Waiting ${delayMs}ms before watching the URL`);
  }

  setTimeout(() => {
    const initialUrl = location.href;
    log.debug("Watching for the URL to change from", initialUrl);

    function onEpisodeEnded(): void {
      log.log("URL changed to", location.href);
      observer.disconnect();
      clearInterval(poll);
      window.removeEventListener("popstate", checkUrlChanged);
      signalEpisodeEnded(
        log,
        `the URL changed from ${initialUrl} to ${location.href}`,
      );
    }

    function checkUrlChanged(): void {
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
export async function initUrlChangePlugin(
  name: string,
  playerSelectors?: string[],
  start?: (log: Logger) => Promise<void>,
  {
    watchVideo = false,
    debug = false,
  }: { watchVideo?: WatchVideoSetting; debug?: boolean } = {},
): Promise<void> {
  const log = createLogger(name);
  if (!claimTab()) {
    log.debug("Tab not opened by the remote, skipping");
    return;
  }
  if (debug) enableDebug();

  if (start) {
    try {
      await start(log);
    } catch (error) {
      log.error("Could not start playback:", error);
      mountPlayerControls(log);
      return;
    }
  }

  watchUrlChange(log);
  if (watchVideo !== false) watchVideoCompletion(log, "video", watchVideo);
  if (!playerSelectors) {
    mountPlayerControls(log);
    return;
  }
  waitForElement<HTMLVideoElement>("video")
    .then((video) => expandPlayer(log, video, playerSelectors))
    .catch((error: unknown) => {
      log.warn("No video found; showing stop button only:", error);
      mountPlayerControls(log);
    });
}

// Climb from the <video> while each parent is still the same size as the video.
// Sites usually overlay their controls on a wrapper exactly the video's size, so
// the outermost such wrapper takes the controls into fullscreen with it.
function findSameSizeWrapper(video: HTMLElement): HTMLElement {
  const SIZE_TOLERANCE_PX = 4;
  const rect = video.getBoundingClientRect();
  let wrapper: HTMLElement = video;
  for (
    let el = video.parentElement;
    el && el !== document.body && el !== document.documentElement;
    el = el.parentElement
  ) {
    const elRect = el.getBoundingClientRect();
    if (
      Math.abs(elRect.width - rect.width) > SIZE_TOLERANCE_PX ||
      Math.abs(elRect.height - rect.height) > SIZE_TOLERANCE_PX
    ) {
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
export async function expandPlayer(
  log: Logger,
  video: HTMLElement,
  playerSelectors: string[] = [],
): Promise<void> {
  let player: HTMLElement | null = null;
  for (const selector of playerSelectors) {
    player = video.closest<HTMLElement>(selector);
    if (player) break;
  }
  player ??= findSameSizeWrapper(video);
  const target = player;
  log.debug("Fullscreen target:", target);

  try {
    mountPlayerControls(log);
    // These players keep restyling themselves while they lay out after load, so
    // wait for that to stop or our fullscreen styles get overwritten.
    await waitForQuiet(target);
    setFakeFullscreen(target);
    log.debug("Fullscreen applied");
  } catch (error) {
    log.error("Controls/fullscreen setup failed:", error);
  }
}

export interface VideoPluginConfig {
  /** Display name of the site, used in log messages. */
  name: string;
  /**
   * Candidate selectors for the site's player wrapper — the element that holds
   * both the <video> and the site's own controls. When given, the player is
   * fake-fullscreened: they're tried in order via `video.closest()` and the
   * first hit is expanded, falling back to the outermost wrapper the same size
   * as the video when none match. Leave it out for sites whose player already
   * fills the window, where restyling it only shrinks it.
   */
  playerToFullscreen?: string[];
  /** Selector for the <video> element. Defaults to any video on the page. */
  videoSelector?: string;
  /**
   * Also treat a URL change as the end of the episode. For sites whose player
   * auto-advances by navigating instead of ending the video element.
   */
  watcForhUrlChange?: boolean;
  /**
   * How long to wait before watching the URL, for sites that redirect on load.
   */
  urlChangeDelayMs?: number;
  /**
   * Elements the site shows once the episode is effectively over (e.g. a
   * "Next Up" card over the credits). The appearance of any of them ends the
   * episode, so the credits are skipped.
   */
  endSelector?: string | string[];
  /**
   * Returns true once the episode is effectively over. For end screens that a
   * selector alone cannot identify.
   */
  isEnded?: () => boolean;
  clickButtons?: Array<() => boolean>;
  /**
   * Treat the <video> finishing as the end of the episode. A number does the
   * same, but waits that many seconds after the video finishes before moving
   * on to the next one (0 is on, with no wait).
   */
  watchForVideoForCompletion?: WatchVideoSetting;
  /**
   * Start playback if the player loads paused. Keeps trying until the video
   * has loaded enough to play, however long that takes. On by default.
   */
  manualAutoplay?: boolean;
  /**
   * Runs before looking for the <video>, for sites that need a step (like
   * clicking a play button) before the player loads.
   */
  start?: (log: Logger) => Promise<void>;
  /**
   * Instead of leaving the episode, show a popup explaining why it would leave,
   * with buttons to allow or block it.
   */
  debug?: boolean;
}

const VIDEO_POLL_MS = 1000;

// TODO: Validate
function findVideo(selector: string): HTMLVideoElement | null {
  const video = document.querySelector<HTMLVideoElement>(selector);
  if (video) return video;
  for (const frame of Array.from(document.querySelectorAll("iframe"))) {
    try {
      const framed =
        frame.contentDocument?.querySelector<HTMLVideoElement>(selector);
      if (framed) return framed;
    } catch {
      continue;
    }
  }
  return null;
}

// TODO: Validate
async function waitForVideo(
  selector: string,
  timeoutMs = 15_000,
): Promise<HTMLVideoElement> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const video = findVideo(selector);
    if (video) return video;
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
export async function initVideoPlugin(
  config: VideoPluginConfig,
): Promise<void> {
  const log = createLogger(config.name);
  if (!claimTab()) return;
  if (config.debug) enableDebug();

  const videoSelector = config.videoSelector ?? "video";
  log.log("Tab opened by Stream Channeler Remote, initializing");

  if (config.start) {
    try {
      await config.start(log);
    } catch (error) {
      log.error("Could not start playback:", error);
      mountPlayerControls(log);
      return;
    }
  }

  const { endSelector, isEnded } = config;
  for (const selector of [endSelector ?? []].flat()) {
    watchEndCheck(
      log,
      `element shown (${selector})`,
      () => document.querySelector(selector) !== null,
    );
  }
  if (isEnded) watchEndCheck(log, "check passed", isEnded);
  for (const clickButton of config.clickButtons ?? []) {
    keepTrying(log, `Clicked ${clickButton.name}`, clickButton);
  }

  let video: HTMLVideoElement;
  try {
    video = await waitForVideo(videoSelector);
  } catch (error) {
    log.warn("No video found; falling back to URL watching:", error);
    mountPlayerControls(log);
    watchUrlChange(log, config.urlChangeDelayMs);
    return;
  }

  if (config.playerToFullscreen) {
    await expandPlayer(log, video, config.playerToFullscreen);
  } else {
    mountPlayerControls(log);
  }

  if (config.manualAutoplay ?? true) startPlayback(log, videoSelector);

  if (
    config.watchForVideoForCompletion !== undefined &&
    config.watchForVideoForCompletion !== false
  ) {
    watchVideoCompletion(log, videoSelector, config.watchForVideoForCompletion);
  }
  if (config.watcForhUrlChange) {
    watchUrlChange(log, config.urlChangeDelayMs);
  }
  log.debug("Watching for the end of the episode");
}

function keepTrying(
  log: Logger,
  message: string,
  attempt: () => boolean,
): void {
  const poll = window.setInterval(() => {
    if (!attempt()) return;
    clearInterval(poll);
    log.log(message);
  }, VIDEO_POLL_MS);
}

// Call play() on the video once it has loaded enough to play, retrying until
// playback starts. A single attempt right after the <video> appears fails when
// the stream is still loading (play() is interrupted by the load), and the
// element is looked up fresh each tick in case the player replaces it.
// TODO: Validate
function startPlayback(log: Logger, videoSelector: string): void {
  const poll = window.setInterval(() => {
    const video = findVideo(videoSelector);
    if (!video) return;
    if (!video.paused) {
      clearInterval(poll);
      log.debug("Playback started");
      return;
    }
    if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) return;
    video.play().catch((error: unknown) => {
      // The browser's autoplay policy won't change by retrying.
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        clearInterval(poll);
        log.warn("Autoplay was blocked by the browser:", error);
        window.alert(
          `Stream Channeler Remote couldn't start the video because your browser blocked autoplay on ${location.hostname}.\n\n` +
            "Allow audio and video autoplay for this site, then reload the page:\n" +
            "• Firefox: click the permissions icon in the address bar and set Autoplay to Allow Audio and Video.\n" +
            "• Chrome: open Site settings for this site and set Sound to Allow.",
        );
        return;
      }
      log.debug("play() failed, retrying:", error);
    });
  }, VIDEO_POLL_MS);
}

// TODO: Validate
// Signal completion once `isEnded` returns true.
function watchEndCheck(
  log: Logger,
  reason: string,
  isEnded: () => boolean,
): void {
  const poll = window.setInterval(() => {
    if (!isEnded()) return;
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
function watchVideoCompletion(
  log: Logger,
  videoSelector: string,
  setting: true | number,
): void {
  let done = false;
  let seenPlaying = false;
  let lastTime = 0;
  let lastDuration = 0;
  // Tracked here rather than marked on the element, so the site's player never
  // sees its <video> change.
  const watchedVideos = new WeakSet<HTMLVideoElement>();

  function finish(reason: string): void {
    if (done) return;
    done = true;
    clearInterval(poll);
    log.log(`Video finished (${reason})`);
    const delaySeconds = setting === true ? 0 : setting;
    if (delaySeconds > 0) {
      log.log(`Waiting ${delaySeconds}s before moving on`);
      window.setTimeout(
        () => signalEpisodeEnded(log, `the video finished (${reason})`),
        delaySeconds * 1000,
      );
    } else {
      signalEpisodeEnded(log, `the video finished (${reason})`);
    }
  }

  const poll = window.setInterval(() => {
    const video = findVideo(videoSelector);
    if (!video) {
      if (seenPlaying && lastDuration > 0 && lastDuration - lastTime <= 120) {
        finish(
          `video removed at ${lastTime.toFixed(1)}s of ${lastDuration.toFixed(1)}s`,
        );
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
    if (video.currentTime > 0 && !video.paused) seenPlaying = true;
    if (!seenPlaying) return;

    const { currentTime, duration } = video;
    if (Number.isFinite(duration) && duration > 0) {
      lastTime = currentTime;
      lastDuration = duration;
    }
    if (
      Number.isFinite(duration) &&
      duration > 0 &&
      // How close to the end counts as finished. Sites that cut to a "next episode"
      // promo often never fire `ended`, but the video does reach its duration.
      currentTime >= duration - 1
    ) {
      finish(`reached ${currentTime.toFixed(1)}s of ${duration.toFixed(1)}s`);
    }
  }, VIDEO_POLL_MS);
}
