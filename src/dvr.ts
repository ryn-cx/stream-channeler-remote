// TODO: Validate
import { DVR_TOKEN_KEY as TOKEN_KEY } from "./dvr_api";
import { createNativeGuide, type NativeGuide } from "./dvr_native";
import { type DvrProgram, loadState, send } from "./remote";
import { createGuideButton, fitFakeFullscreen, type Logger } from "./shared";

const MESSAGE_SOURCE = "stream-channeler-dvr";
const REOPEN_GUIDE_KEY = "reopenGuideAt";
const REOPEN_GUIDE_MS = 60_000;
const SETTLE_QUIET_MS = 1000;
const SETTLE_MAX_MS = 10_000;
const SITE_GUIDE_LINK_CLASS = "scr-site-guide-link";
export const DVR_GUIDE_HEIGHT_VH = 65;
export const DVR_DETAIL_WIDTH_VW = 40;
const FRAME_STYLE = `position:fixed;left:0;right:0;bottom:0;width:100vw;height:${DVR_GUIDE_HEIGHT_VH}vh;border:0;border-top:1px solid #303030;z-index:2147483647;background:#0a0a0a;color-scheme:dark;box-shadow:0 -8px 24px rgba(0,0,0,0.6);`;
const DETAIL_STYLE = `position:fixed;top:0;left:0;width:${DVR_DETAIL_WIDTH_VW}vw;height:${100 - DVR_GUIDE_HEIGHT_VH}vh;z-index:2147483647;`;

let guide: NativeGuide | null = null;
let shortcutAdded = false;

// TODO: Validate
export function storeDvrToken(): void {
  if (window.top !== window) return;
  if (!location.hostname.includes("streamchanneler.com")) return;
  const token = localStorage.getItem("access_token");
  if (token) GM_setValue(TOKEN_KEY, token);
}

// TODO: Validate
function parseProgram(data: unknown): DvrProgram | null {
  if (typeof data !== "object" || data === null) return null;
  const message = data as Record<string, unknown>;
  if (message.source !== MESSAGE_SOURCE || message.type !== "play") {
    return null;
  }
  const { channelId, channelName, episodeId, url } = message;
  if (
    typeof channelId !== "string" ||
    typeof episodeId !== "string" ||
    typeof url !== "string" ||
    !/^https?:\/\//.test(url)
  ) {
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
export function bridgeDvrPage(): void {
  if (window.top !== window) return;
  document.documentElement.dataset.streamChannelerDvr = "1";
  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin) return;
    const program = parseProgram(event.data);
    if (program) void send({ type: "dvr:play", program });
  });
}

// TODO: Validate
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

// TODO: Validate
function ensureGuide(log: Logger): NativeGuide {
  if (guide) return guide;
  const state = loadState();
  guide = createNativeGuide({
    log,
    frameStyle: FRAME_STYLE,
    detailStyle: DETAIL_STYLE,
    playing:
      state.mode === "dvr" && state.dvr
        ? { channelId: state.dvr.channelId, episodeId: state.dvr.episodeId }
        : null,
    onPlay: (channel, program) => {
      if (!program.url) return;
      GM_setValue(REOPEN_GUIDE_KEY, Date.now());
      void send({
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
export function isDvrGuideOpen(): boolean {
  return guide?.isOpen() ?? false;
}

// TODO: Validate
export function setDvrGuideOpen(open: boolean): void {
  if (!guide) return;
  guide.setOpen(open);
  fitFakeFullscreen();
  if (!open) window.focus();
}

// TODO: Validate
export function toggleDvrGuide(): void {
  setDvrGuideOpen(!isDvrGuideOpen());
}

// TODO: Validate
function shouldReopenGuide(): boolean {
  const reopenAt = GM_getValue<number>(REOPEN_GUIDE_KEY, 0);
  return reopenAt > 0 && Date.now() - reopenAt < REOPEN_GUIDE_MS;
}

// TODO: Validate
function whenPageSettles(run: () => void): void {
  const start = (): void => {
    let quietTimer = window.setTimeout(finish, SETTLE_QUIET_MS);
    const hardTimer = window.setTimeout(finish, SETTLE_MAX_MS);
    const observer = new MutationObserver(() => {
      clearTimeout(quietTimer);
      quietTimer = window.setTimeout(finish, SETTLE_QUIET_MS);
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    function finish(): void {
      clearTimeout(quietTimer);
      clearTimeout(hardTimer);
      observer.disconnect();
      run();
    }
  };
  if (document.readyState === "complete") {
    start();
  } else {
    window.addEventListener("load", start, { once: true });
  }
}

// TODO: Validate
export function resumeDvrGuide(log: Logger): void {
  if (window.top !== window || !shouldReopenGuide()) return;
  whenPageSettles(() => {
    if (isDvrGuideOpen()) setDvrGuideOpen(true);
  });
  if (document.documentElement) {
    mountDvrGuide(log);
    return;
  }
  const observer = new MutationObserver(() => {
    if (!document.documentElement) return;
    observer.disconnect();
    mountDvrGuide(log);
  });
  observer.observe(document, { childList: true });
}

// TODO: Validate
export function mountDvrGuide(log: Logger): void {
  ensureGuide(log);
  if (shouldReopenGuide()) {
    GM_deleteValue(REOPEN_GUIDE_KEY);
    setDvrGuideOpen(true);
  } else if (isDvrGuideOpen()) {
    fitFakeFullscreen();
  }
  if (shortcutAdded) return;
  shortcutAdded = true;
  window.addEventListener(
    "keydown",
    (event) => {
      if (isTyping(event.composedPath()[0] ?? event.target)) return;
      if (
        event.key.toLowerCase() === "g" ||
        (isDvrGuideOpen() && event.key === "Escape")
      ) {
        event.stopPropagation();
        toggleDvrGuide();
      }
    },
    true,
  );
  log.debug("Guide overlay ready");
}

// TODO: Validate
export function openDvrGuide(log: Logger): void {
  mountDvrGuide(log);
  setDvrGuideOpen(true);
}

// TODO: Validate
export function mountSiteGuideLink(log: Logger): void {
  if (window.top !== window) return;
  mountDvrGuide(log);
  const addLinks = (): void => {
    document
      .querySelectorAll<HTMLAnchorElement>('nav a[href="/about"]')
      .forEach((about) => {
        if (about.parentElement?.querySelector(`.${SITE_GUIDE_LINK_CLASS}`)) {
          return;
        }
        const link = createGuideButton(log);
        link.classList.add(SITE_GUIDE_LINK_CLASS);
        about.after(link);
      });
  };
  addLinks();
  new MutationObserver(addLinks).observe(document.body, {
    childList: true,
    subtree: true,
  });
}
