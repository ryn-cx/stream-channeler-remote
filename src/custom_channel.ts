// TODO: Validate
import { addMenuCommand, createLogger } from "./shared";

const log = createLogger("Custom Channel");
const URLS_KEY = "customChannelUrls";

let running = false;
let stoppedByTab = false;
let currentIndex = 0;
// TODO: Validate
let isCardRemoteRunning = (): boolean => false;

// TODO: Validate
function storedUrls(): string[] {
  return GM_getValue<string[]>(URLS_KEY, []);
}

// TODO: Validate
function promptForUrls(): void {
  if (document.getElementById("custom-channel-dialog")) return;

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

  const button = (text: string, onClick: () => void): HTMLButtonElement => {
    const el = document.createElement("button");
    el.type = "button";
    el.textContent = text;
    el.style.cssText =
      "padding:6px 16px;border-radius:4px;border:1px solid #3a4a5c;background:#2a3846;color:#fff;font-size:14px;cursor:pointer;";
    el.addEventListener("click", onClick);
    return el;
  };

  const close = (): void => overlay.remove();
  const save = (): void => {
    const urls = textarea.value
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
    GM_setValue(URLS_KEY, urls);
    log.log(`Saved ${urls.length} URLs`);
    close();
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  buttons.append(button("Cancel", close), button("Save", save));
  panel.append(label, textarea, buttons);
  overlay.append(panel);
  document.body.append(overlay);
  textarea.focus();
}

// TODO: Validate
function openCurrentUrl(): void {
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
function toggleCustomChannel(): void {
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
export function initCustomChannel(cardRemoteRunning: () => boolean): void {
  isCardRemoteRunning = cardRemoteRunning;
  addMenuCommand("start", "Start/stop custom channel", toggleCustomChannel);
  addMenuCommand("builder", "Set custom channel URLs", promptForUrls);

  GM_addValueChangeListener("videoEnded", () => {
    if (!running) return;
    if (isCardRemoteRunning()) {
      running = false;
      return;
    }
    currentIndex++;
    openCurrentUrl();
  });

  GM_addValueChangeListener("previousEpisodeRequested", () => {
    if (!running) return;
    if (isCardRemoteRunning()) {
      running = false;
      return;
    }
    currentIndex = Math.max(0, currentIndex - 1);
    openCurrentUrl();
  });

  GM_addValueChangeListener("remoteStopRequested", () => {
    if (!running) return;
    stoppedByTab = true;
    running = false;
  });

  GM_addValueChangeListener("remoteResumeRequested", () => {
    if (!stoppedByTab || running) return;
    stoppedByTab = false;
    running = true;
  });
}
