// TODO: Validate
export const REMOTE_LOG = "[Stream Channeler Remote]";

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
      reject(new Error(`${REMOTE_LOG} Timed out waiting for "${selector}"`));
    }, timeoutMs);
  });
}

/**
 * Resolve once `element`'s own `style` attribute has been quiet (no changes) for
 * `quietMs`, or after `maxMs` as a hard stop. Used to wait for a busy SPA player
 * to finish laying itself out before we restyle it — adaptive, unlike a fixed
 * delay. Only the element's own attributes are watched (not the subtree) so
 * normal playback (progress bar, etc.) doesn't keep it from settling.
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
export function stopAutoControl(): void {
  autoControlStopped = true;
  console.log(`${REMOTE_LOG} Automatic control stopped by user`);
  // Tell the controller on the channels page to stop too, so its Start/Stop
  // Remote button updates. A fresh timestamp guarantees a value change.
  GM_setValue("remoteStopRequested", Date.now());
}

// A small button pinned to the bottom-left that lets the user cancel automatic
// control of the current video. Styled to match the Manage "Add to Channel"
// widget. Hidden by default and revealed when the user moves the cursor (like a
// video player's controls), then auto-hides after a short idle period.
const STOP_BUTTON_HIDE_DELAY_MS = 3000;
export function createStopButton(): void {
  if (document.getElementById("stream-channeler-stop-btn")) return;

  let stopped = false;
  const button = document.createElement("button");
  button.id = "stream-channeler-stop-btn";
  button.textContent = "Stop Auto Control";
  button.style.cssText =
    "position:fixed;bottom:16px;left:16px;z-index:2147483647;padding:6px 16px;border-radius:4px;border:1px solid #3a4a5c;background:#c0392b;color:#fff;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.5);opacity:0;pointer-events:none;transition:opacity 0.2s ease;";

  button.addEventListener("click", () => {
    stopped = true;
    stopAutoControl();
    button.textContent = "Auto Control Stopped";
    button.disabled = true;
    button.style.opacity = "0.6";
    button.style.cursor = "default";
  });

  // Reveal on cursor movement, then fade back out once the cursor is idle.
  let hideTimer: number;
  document.addEventListener("mousemove", () => {
    if (stopped) return;
    button.style.opacity = "1";
    button.style.pointerEvents = "auto";
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      button.style.opacity = "0";
      button.style.pointerEvents = "none";
    }, STOP_BUTTON_HIDE_DELAY_MS);
  });

  document.body.appendChild(button);
}

// Icons as structured data (root svg attrs + child shapes). Built via
// createElementNS rather than from a markup string because YouTube's strict CSP
// (Trusted Types) blocks both innerHTML and DOMParser string sinks.
const SVG_NS = "http://www.w3.org/2000/svg";
interface IconSpec {
  attrs: Record<string, string>;
  shapes: Array<{ tag: string; attrs: Record<string, string> }>;
}
const STROKE_ATTRS = {
  viewBox: "0 0 24 24",
  width: "16",
  height: "16",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  "aria-hidden": "true",
};
const STOP_ICON: IconSpec = {
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
const RESTORE_ICON: IconSpec = {
  attrs: STROKE_ATTRS,
  shapes: [
    { tag: "path", attrs: { d: "M8 3v3a2 2 0 0 1-2 2H3" } },
    { tag: "path", attrs: { d: "M21 8h-3a2 2 0 0 1-2-2V3" } },
    { tag: "path", attrs: { d: "M3 16h3a2 2 0 0 1 2 2v3" } },
    { tag: "path", attrs: { d: "M16 21v-3a2 2 0 0 1 2-2h3" } },
  ],
};
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
// place (the element never moves, so there's no reload and restore is exact).
// Styles are inline via CSSOM (not an injected <style>) so a strict CSP can't
// block them. Pass the player *wrapper* that contains the site's own controls so
// they come along into fullscreen.
export const FAKE_FULLSCREEN_CLASS = "scr-fake-fullscreen";
const FAKE_FULLSCREEN_STYLES: Record<string, string> = {
  position: "fixed",
  top: "0",
  left: "0",
  width: "100vw",
  height: "100vh",
  "z-index": "2147483646",
  background: "#000",
};

// While expanded, ancestors whose inline style we overrode (to lift the player
// to the top of the stacking order); their original inline style is restored on
// exit. Only one player per tab, so module-level state is fine.
let liftedAncestors: Array<{ el: HTMLElement; cssText: string }> = [];

export function setFakeFullscreen(target: HTMLElement, on: boolean): void {
  if (on === target.classList.contains(FAKE_FULLSCREEN_CLASS)) return;

  if (on) {
    for (const [prop, value] of Object.entries(FAKE_FULLSCREEN_STYLES)) {
      target.style.setProperty(prop, value, "important");
    }
    // A fixed player can be trapped inside a transformed ancestor's stacking
    // context, so other page elements paint over it. Lift every ancestor to the
    // top of its parent's stacking order so the whole chain (and the player)
    // floats above the page. z-index only changes paint order (no reflow); any
    // shift from positioning a static ancestor is hidden behind the player and
    // reverted on exit.
    liftedAncestors = [];
    for (
      let el = target.parentElement;
      el && el !== document.body && el !== document.documentElement;
      el = el.parentElement
    ) {
      liftedAncestors.push({ el, cssText: el.style.cssText });
      el.style.setProperty("z-index", "2147483646", "important");
      if (getComputedStyle(el).position === "static") {
        el.style.setProperty("position", "relative", "important");
      }
    }
    document.documentElement.style.overflow = "hidden";
    target.classList.add(FAKE_FULLSCREEN_CLASS);
  } else {
    for (const prop of Object.keys(FAKE_FULLSCREEN_STYLES)) {
      target.style.removeProperty(prop);
    }
    for (const { el, cssText } of liftedAncestors) el.style.cssText = cssText;
    liftedAncestors = [];
    document.documentElement.style.overflow = "";
    target.classList.remove(FAKE_FULLSCREEN_CLASS);
    // The player may have sized its <video> to fill the full-viewport area; clear
    // that inline size so it refits the restored player instead of overflowing.
    const video = target.querySelector<HTMLVideoElement>("video");
    if (video) {
      for (const prop of ["width", "height", "left", "top", "transform"]) {
        video.style.removeProperty(prop);
      }
    }
    // Nudge a recompute (immediate + delayed, once layout settles).
    window.dispatchEvent(new Event("resize"));
    setTimeout(() => window.dispatchEvent(new Event("resize")), 300);
  }
}

export interface PlayerControlsConfig {
  /** Whether the player is currently expanded (fake fullscreen). */
  isExpanded: () => boolean;
  /** Toggle the fake fullscreen on/off. */
  toggleExpand: () => void;
  /** Label for the toggle when expanded. Defaults to "Restore Original Size". */
  restoreLabel?: string;
  /** Element whose class changes should re-sync the expand toggle's label. */
  expandObserveTarget?: Element | null;
  /** Log prefix. */
  log?: string;
}

// Add a generic controls overlay (Stop Auto Control + an expand/restore toggle)
// to every controller-opened tab. It's always pinned to the same spot — fixed in
// the top-right of the top page, above any fake-fullscreen player — independent
// of the site's own player. Like a video player's own controls, it's hidden until
// the cursor moves, then fades out again once the cursor is idle (but stays while
// hovered). Site-specific behaviour (how fullscreen is faked) is supplied via
// `config`.
const CONTROLS_IDLE_HIDE_MS = 2500;
export function mountPlayerControls(config: PlayerControlsConfig): void {
  const log = config.log ?? REMOTE_LOG;
  if (document.getElementById("stream-channeler-controls")) return;

  const container = document.createElement("div");
  container.id = "stream-channeler-controls";
  container.style.cssText =
    "position:fixed;top:12px;right:12px;z-index:2147483647;display:flex;gap:8px;opacity:0;pointer-events:none;transition:opacity 0.3s ease;";

  // Visibility is driven by a window capture-phase pointermove listener (which
  // runs before any page handler can stop it) rather than mouseenter/mouseleave,
  // because some players (e.g. Adult Swim) swallow pointer events.
  let hideTimer: number | undefined;
  const setVisible = (visible: boolean): void => {
    container.style.opacity = visible ? "1" : "0";
    // Not clickable while hidden, so a stray click can't hit an invisible button.
    container.style.pointerEvents = visible ? "auto" : "none";
  };
  const hide = (): void => {
    clearTimeout(hideTimer);
    setVisible(false);
  };
  window.addEventListener(
    "pointermove",
    (event) => {
      setVisible(true);
      clearTimeout(hideTimer);
      const rect = container.getBoundingClientRect();
      const hovered =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      // Keep showing while the cursor rests on the controls.
      if (!hovered) hideTimer = window.setTimeout(hide, CONTROLS_IDLE_HIDE_MS);
    },
    { capture: true, passive: true },
  );
  // Pointer left the page entirely (no element it moved to).
  document.addEventListener(
    "pointerout",
    (event) => {
      if (!event.relatedTarget) hide();
    },
    { capture: true, passive: true },
  );
  window.addEventListener("blur", hide);

  const stopButton = createOverlayButton(
    document,
    "stream-channeler-stop-btn",
    "Stop Auto Control",
    STOP_ICON,
    () => {
      stopAutoControl();
      stopButton.style.opacity = "0.5";
      stopButton.title = "Auto Control Stopped";
      const span = stopButton.querySelector("span");
      if (span) span.textContent = "Auto Control Stopped";
    },
  );

  // Restore control: only shown while the video is expanded. Once the video is
  // back at its original size there's no button (no separate expand control).
  const restoreLabel = config.restoreLabel ?? "Restore Original Size";
  let toggleButton: HTMLButtonElement;
  const updateToggle = (): void => {
    toggleButton.style.display = config.isExpanded() ? "" : "none";
  };
  toggleButton = createOverlayButton(
    document,
    "stream-channeler-restore-btn",
    restoreLabel,
    RESTORE_ICON,
    () => {
      config.toggleExpand();
      updateToggle();
    },
  );

  // Keep the toggle in sync when the expand state changes elsewhere (e.g. the
  // initial auto-expand done right after these controls mount).
  if (config.expandObserveTarget) {
    new MutationObserver(updateToggle).observe(config.expandObserveTarget, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
  }
  updateToggle();

  container.append(stopButton, toggleButton);
  document.body.appendChild(container);
  console.log(`${log} Player controls overlay added`);
}

export function signalEpisodeEnded(): void {
  if (autoControlStopped) {
    console.log(
      `${REMOTE_LOG} Episode ended but automatic control is stopped — staying on tab`,
    );
    return;
  }

  console.log(`${REMOTE_LOG} Episode ended, closing tab`);
  const now = Date.now();
  const current = GM_getValue("videoEnded", 0) as number;
  console.log(`${REMOTE_LOG} Current videoEnded=${current}, now=${now}`);
  // Only signal if the current value is older (stop sets it to far future)
  if (now > current) {
    console.log(
      `${REMOTE_LOG} Signaling episode ended (setting videoEnded=${now})`,
    );
    GM_setValue("videoEnded", now);
  } else {
    console.log(
      `${REMOTE_LOG} Skipping signal — current value is newer (stop was triggered?)`,
    );
  }
  console.log(`${REMOTE_LOG} Closing tab`);
  window.close();
}

/**
 * Detect episode end via URL change: after a settle period (to avoid false
 * positives from redirects on load), watch for the page URL to change and signal
 * completion. Used by sites whose player auto-advances by navigating.
 */
export function watchUrlChange(log: string): void {
  // Sites may redirect the URL immediately on load, so wait before
  // capturing the URL to avoid a false positive.
  const SETTLE_DELAY_MS = 5000;
  console.log(`${log} Waiting ${SETTLE_DELAY_MS}ms for URL to settle`);

  setTimeout(() => {
    const initialUrl = location.href;
    console.log(
      `${log} Settle complete, watching for URL change from: ${initialUrl}`,
    );

    function onEpisodeEnded(): void {
      console.log(`${log} URL changed to: ${location.href}`);
      console.log(`${log} Episode ended, cleaning up observers`);
      observer.disconnect();
      clearInterval(poll);
      signalEpisodeEnded();
    }

    function checkUrlChanged(): void {
      if (location.href !== initialUrl) {
        onEpisodeEnded();
      }
    }

    // Watch for URL changes via History API pushState/replaceState (SPA navigation)
    const observeTarget = document.querySelector("title") ?? document.head;
    console.log(
      `${log} Observing element for mutations: <${observeTarget.tagName.toLowerCase()}>`,
    );
    const observer = new MutationObserver(checkUrlChanged);
    observer.observe(observeTarget, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Fallback polling in case MutationObserver misses the navigation
    const poll = window.setInterval(checkUrlChanged, 2000);
    console.log(`${log} Polling every 2000ms as fallback`);

    // Also catch popstate events
    window.addEventListener("popstate", checkUrlChanged);
    console.log(`${log} Listening for popstate events`);
  }, SETTLE_DELAY_MS);
}

/**
 * Generic plugin for sites where episode end is detected by URL change, with the
 * floating stop button.
 */
export function initUrlChangePlugin(name: string): void {
  const LOG = `${REMOTE_LOG} [${name}]`;
  // Only run the script if the tab was opened by Stream Channeler Remote.
  const loading = GM_getValue("loadingTab", false);
  if (!loading) return;
  GM_setValue("loadingTab", false);

  createStopButton();
  watchUrlChange(LOG);
}

export interface VideoPluginConfig {
  /** Display name of the site, used in log messages. */
  name: string;
  /**
   * Candidate selectors for the site's player wrapper — the element that holds
   * both the <video> and the site's own controls. Tried in order via
   * `video.closest()`; the first hit is what gets fake-fullscreened. Falls back
   * to the video's parent when none match.
   */
  playerSelectors?: string[];
  /** Selector for the <video> element. Defaults to any video on the page. */
  videoSelector?: string;
  /**
   * Also treat a URL change as the end of the episode. For sites whose player
   * auto-advances by navigating instead of ending the video element.
   */
  watchUrl?: boolean;
  /** Nudge playback if the player loads paused. Defaults to true. */
  autoplay?: boolean;
}

// How close to the end counts as finished. Sites that cut to a "next episode"
// promo often never fire `ended`, but the video does reach its duration.
const VIDEO_END_SLACK_S = 1;
const VIDEO_POLL_MS = 1000;

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
export async function initVideoPlugin(
  config: VideoPluginConfig,
): Promise<void> {
  const LOG = `${REMOTE_LOG} [${config.name}]`;
  // Only run the script if the tab was opened by Stream Channeler Remote.
  const loading = GM_getValue("loadingTab", false);
  if (!loading) return;
  GM_setValue("loadingTab", false);

  const videoSelector = config.videoSelector ?? "video";
  console.log(`${LOG} Tab opened by Stream Channeler Remote, initializing`);

  let video: HTMLVideoElement;
  try {
    video = await waitForElement<HTMLVideoElement>(videoSelector);
  } catch (error) {
    console.warn(`${LOG} No video found; falling back to URL watching:`, error);
    createStopButton();
    watchUrlChange(LOG);
    return;
  }

  // Fullscreen the wrapper that holds the site's own controls, not the bare
  // <video> — otherwise the controls are left behind on the page.
  let player: HTMLElement = video;
  for (const selector of config.playerSelectors ?? []) {
    const match = video.closest<HTMLElement>(selector);
    if (match) {
      player = match;
      break;
    }
  }
  if (player === video) player = video.parentElement ?? video;
  console.log(
    `${LOG} Fullscreen target: <${player.tagName.toLowerCase()} class="${player.className}">`,
  );

  try {
    mountPlayerControls({
      log: LOG,
      isExpanded: () => player.classList.contains(FAKE_FULLSCREEN_CLASS),
      toggleExpand: () =>
        setFakeFullscreen(
          player,
          !player.classList.contains(FAKE_FULLSCREEN_CLASS),
        ),
      expandObserveTarget: player,
    });
    // These players keep restyling themselves while they lay out after load, so
    // wait for that to settle or our fullscreen styles get overwritten.
    await waitForQuiet(player);
    setFakeFullscreen(player, true);
    console.log(`${LOG} Fullscreen applied`);
  } catch (error) {
    console.error(`${LOG} Controls/fullscreen setup failed:`, error);
  }

  if (config.autoplay ?? true) {
    const current = document.querySelector<HTMLVideoElement>(videoSelector);
    if (current?.paused) {
      current.play().catch((error: unknown) => {
        console.warn(`${LOG} Autoplay was rejected:`, error);
      });
    }
  }

  watchVideoCompletion(LOG, videoSelector);
  if (config.watchUrl) watchUrlChange(LOG);
  console.log(`${LOG} Watching for end`);
}

// Signal completion once the current <video> ends or reaches its duration. The
// element is looked up fresh each tick so a recreated player is picked up.
function watchVideoCompletion(log: string, videoSelector: string): void {
  let done = false;
  let seenPlaying = false;

  function finish(reason: string): void {
    if (done) return;
    done = true;
    clearInterval(poll);
    console.log(`${log} Video finished (${reason})`);
    signalEpisodeEnded();
  }

  const poll = window.setInterval(() => {
    const video = document.querySelector<HTMLVideoElement>(videoSelector);
    if (!video) return;

    // Attach `ended` once per element; recreated players get their own listener.
    if (!video.dataset.scrEndWatched) {
      video.dataset.scrEndWatched = "1";
      video.addEventListener("ended", () => finish("ended event"));
    }

    // Only trust the near-end check after playback has actually started, so a
    // player reporting a stale currentTime/duration on load can't end the
    // episode before it begins.
    if (video.currentTime > 0 && !video.paused) seenPlaying = true;
    if (!seenPlaying) return;

    const { currentTime, duration } = video;
    if (
      Number.isFinite(duration) &&
      duration > 0 &&
      currentTime >= duration - VIDEO_END_SLACK_S
    ) {
      finish(`reached ${currentTime.toFixed(1)}s of ${duration.toFixed(1)}s`);
    }
  }, VIDEO_POLL_MS);
}
