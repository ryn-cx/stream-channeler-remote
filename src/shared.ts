// TODO: Validate
import {
  DVR_DETAIL_WIDTH_VW,
  DVR_GUIDE_HEIGHT_VH,
  isDvrGuideOpen,
  mountDvrGuide,
  toggleDvrGuide,
} from "./dvr";
import {
  ALWAYS_SHOW_GUIDE_KEY,
  listenForPlayRequests,
  send,
  SKIP_CREDITS_KEY,
  SKIP_INTROS_KEY,
  type TabStatus,
} from "./remote";

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

let tabStatus: TabStatus | null = null;

// TODO: Validate
export function currentTabStatus(): TabStatus | null {
  return tabStatus;
}

// TODO: Validate
export async function isControlledTab(): Promise<boolean> {
  tabStatus ??= await send<TabStatus>({ type: "tab:hello" });
  return tabStatus?.controlled ?? false;
}

// TODO: Validate
export function shouldSkipIntros(): boolean {
  return GM_getValue(SKIP_INTROS_KEY, true);
}

// TODO: Validate
export function shouldSkipCredits(): boolean {
  return GM_getValue(SKIP_CREDITS_KEY, true);
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
// TODO: Validate
export function stopAutoControl(log: Logger): void {
  autoControlStopped = true;
  log.log("Automatic control stopped by user");
  void send({ type: "tab:stop" });
}

// TODO: Validate
export function resumeAutoControl(log: Logger): void {
  autoControlStopped = false;
  log.log("Automatic control resumed by user");
  void send({ type: "tab:resume" });
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
// fullscreen. Controller-opened tabs have no undo: stopping auto control and
// refreshing the page restores the original layout. Tabs the user opened only
// go fake fullscreen while the guide is open, and are restored when it closes.
interface FakeFullscreen {
  target: HTMLElement;
  observer: MutationObserver;
  original: Map<HTMLElement, Map<string, [string, string]>>;
  forGuide: boolean;
}

let fakeFullscreen: FakeFullscreen | null = null;

let guidePlayer: { videoSelector: string; playerSelectors: string[] } | null =
  null;

// TODO: Validate
function fakeFullscreenBox(): Record<string, string> {
  return isDvrGuideOpen()
    ? {
        left: `${DVR_DETAIL_WIDTH_VW}vw`,
        width: `${100 - DVR_DETAIL_WIDTH_VW}vw`,
        height: `${100 - DVR_GUIDE_HEIGHT_VH}vh`,
      }
    : { left: "0", width: "100vw", height: "100vh" };
}

// TODO: Validate
function setFakeFullscreenStyle(
  state: FakeFullscreen,
  el: HTMLElement,
  prop: string,
  value: string,
): void {
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
export function fitFakeFullscreen(): void {
  if (isDvrGuideOpen() && !fakeFullscreen && guidePlayer) {
    const video = findVideo(guidePlayer.videoSelector);
    if (video) {
      setFakeFullscreen(findPlayer(video, guidePlayer.playerSelectors), true);
    }
  } else if (!isDvrGuideOpen() && fakeFullscreen?.forGuide) {
    exitFakeFullscreen(fakeFullscreen);
  }
  if (fakeFullscreen) {
    for (const [prop, value] of Object.entries(fakeFullscreenBox())) {
      setFakeFullscreenStyle(
        fakeFullscreen,
        fakeFullscreen.target,
        prop,
        value,
      );
    }
  }
  window.dispatchEvent(new Event("resize"));
}

// TODO: Validate
function applyFakeFullscreenStyles(state: FakeFullscreen): void {
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
  for (
    let el = target.parentElement;
    el && el !== document.body && el !== document.documentElement;
    el = el.parentElement
  ) {
    setFakeFullscreenStyle(state, el, "z-index", "2147483646");
    if (getComputedStyle(el).position === "static") {
      setFakeFullscreenStyle(state, el, "position", "relative");
    }
  }
}

// TODO: Validate
export function setFakeFullscreen(target: HTMLElement, forGuide = false): void {
  if (fakeFullscreen) {
    if (!forGuide) fakeFullscreen.forGuide = false;
    return;
  }

  let parent = target.parentElement;
  const state: FakeFullscreen = {
    target,
    original: new Map(),
    forGuide,
    observer: new MutationObserver(() => {
      if (
        target.parentElement === parent &&
        target.style.getPropertyValue("position") === "fixed"
      ) {
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
function exitFakeFullscreen(state: FakeFullscreen): void {
  state.observer.disconnect();
  for (const [el, props] of state.original) {
    for (const [prop, [value, priority]] of props) {
      if (value) {
        el.style.setProperty(prop, value, priority);
      } else {
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
      if (!event.relatedTarget && event.pointerType === "mouse") hide();
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

  const container = createControlsContainer();

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
    autoControlStopped ? "Resume Auto Control" : "Stop Auto Control",
    autoControlStopped ? resumeIcon : stopIcon,
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

  container.append(previousButton, nextButton, stopButton);
  container.prepend(createGuideButton(log));
  attachControls(log, container);
}

// TODO: Validate
export function mountGuideControls(log: Logger): void {
  if (document.getElementById("stream-channeler-controls")) return;

  const container = createControlsContainer();
  container.append(createGuideButton(log));
  attachControls(log, container);
}

// TODO: Validate
function createControlsContainer(): HTMLDivElement {
  const container = document.createElement("div");
  container.id = "stream-channeler-controls";
  container.style.cssText =
    "position:fixed;top:12px;right:12px;z-index:2147483647;display:flex;gap:8px;";
  fadeWhenIdle(() => container);
  return container;
}

// TODO: Validate
function createGuideButton(log: Logger): HTMLButtonElement {
  mountDvrGuide(log);
  return createOverlayButton(
    document,
    "stream-channeler-guide-btn",
    "Guide",
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
          tag: "rect",
          attrs: { x: "2", y: "3", width: "20", height: "14", rx: "2" },
        },
        { tag: "path", attrs: { d: "M2 9h20" } },
        { tag: "path", attrs: { d: "M9 9v8" } },
        { tag: "path", attrs: { d: "M12 17v4" } },
        { tag: "path", attrs: { d: "M8 21h8" } },
      ],
    },
    toggleDvrGuide,
  );
}

// TODO: Validate
function attachControls(log: Logger, container: HTMLDivElement): void {
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
    log.log("Going back to the previous episode");
    void send({ type: "tab:previous", reason }).finally(() => {
      episodeEndSignaled = false;
    });
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
    log.log("Episode ended, waiting for the next one");
    void send({ type: "tab:ended", reason }).finally(() => {
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

// TODO: Validate
async function initTab(log: Logger, debug: boolean): Promise<boolean> {
  if (!(await isControlledTab())) {
    log.debug("Tab not opened by the remote, leaving it alone");
    if (GM_getValue(ALWAYS_SHOW_GUIDE_KEY, true)) mountGuideControls(log);
    return false;
  }
  autoControlStopped = tabStatus?.stopped ?? false;
  log.log("Tab controlled by Stream Channeler Remote");
  if (debug) enableDebug();
  mountPlayerControls(log);
  listenForPlayRequests();
  return true;
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

// TODO: Validate
function findPlayer(
  video: HTMLElement,
  playerSelectors: string[],
): HTMLElement {
  for (const selector of playerSelectors) {
    const player = video.closest<HTMLElement>(selector);
    if (player) return player;
  }
  return findSameSizeWrapper(video);
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
  const target = findPlayer(video, playerSelectors);
  log.debug("Fullscreen target:", target);

  try {
    // These players keep restyling themselves while they lay out after load, so
    // wait for that to stop or our fullscreen styles get overwritten.
    await waitForQuiet(target);
    setFakeFullscreen(target);
    log.debug("Fullscreen applied");
  } catch (error) {
    log.error("Fullscreen setup failed:", error);
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
   * as the video when none match or when it is left out.
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
  const documents: Document[] = [document];
  for (const frame of Array.from(document.querySelectorAll("iframe"))) {
    try {
      if (frame.contentDocument) documents.push(frame.contentDocument);
    } catch {
      continue;
    }
  }
  const videos = documents.flatMap((doc) =>
    Array.from(doc.querySelectorAll<HTMLVideoElement>(selector)),
  );
  return (
    videos.find((video) => video.getBoundingClientRect().width > 0) ??
    videos[0] ??
    null
  );
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
  const videoSelector = config.videoSelector ?? "video";
  guidePlayer = {
    videoSelector,
    playerSelectors: config.playerToFullscreen ?? [],
  };
  if (!(await initTab(log, config.debug ?? false))) return;
  const navigation = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  const opened =
    (await send<boolean>({ type: "tab:opened" })) ||
    (!autoControlStopped && navigation?.type === "reload");

  if (opened && config.start) {
    try {
      await config.start(log);
    } catch (error) {
      log.error("Could not start playback:", error);
      return;
    }
  }

  watchEpisode(log, config, videoSelector);
  if (!opened) return;

  let video: HTMLVideoElement;
  try {
    video = await waitForVideo(videoSelector);
  } catch (error) {
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
function watchEpisode(
  log: Logger,
  config: VideoPluginConfig,
  videoSelector: string,
): void {
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
  if (
    config.watchForVideoForCompletion !== undefined &&
    config.watchForVideoForCompletion !== false
  ) {
    watchVideoCompletion(log, videoSelector, config.watchForVideoForCompletion);
  }
  if (config.watcForhUrlChange) {
    watchUrlChange(log, config.urlChangeDelayMs);
  } else {
    waitForVideo(videoSelector).catch((error: unknown) => {
      log.warn("No video found; falling back to URL watching:", error);
      watchUrlChange(log, config.urlChangeDelayMs);
    });
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
