// TODO: Validate
import { openDvrGuide } from "./dvr";
import {
  ALWAYS_SHOW_GUIDE_KEY,
  CUSTOM_URLS_KEY,
  isRunning,
  loadState,
  type RemoteState,
  send,
  SKIP_CREDITS_KEY,
  SKIP_INTROS_KEY,
} from "./remote";
import { createLogger } from "./shared";

const log = createLogger();
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

type Child = Node | string;

// TODO: Validate
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.append(...children);
  return element;
}

// TODO: Validate
function button(text: string, onClick: () => void): HTMLButtonElement {
  const element = el("button", undefined, text);
  element.type = "button";
  element.addEventListener("click", onClick);
  return element;
}

// TODO: Validate
function describe(state: RemoteState): string {
  if (state.mode === null) return "Nothing is playing.";
  const status = isRunning(state) ? "Playing" : "Stopped";
  if (state.mode === "dvr") {
    return `${status}: ${state.dvr?.channelName || "DVR"}`;
  }
  const source = state.mode === "remote" ? "Channel" : "Custom channel";
  return `${status}: ${source}, episode ${Math.min(state.index + 1, state.queue.length)} of ${state.queue.length}`;
}

// TODO: Validate
function checkbox(text: string, key: string): HTMLLabelElement {
  const input = el("input");
  input.type = "checkbox";
  input.checked = GM_getValue(key, true);
  input.addEventListener("change", () => GM_setValue(key, input.checked));
  return el("label", undefined, input, text);
}

// TODO: Validate
function textField(text: string, key: string, numeric = false): HTMLElement {
  const input = el("input");
  input.type = "text";
  if (numeric) input.inputMode = "numeric";
  input.value = GM_getValue(key, "");
  input.addEventListener("change", () => GM_setValue(key, input.value.trim()));
  return el("label", undefined, text, input);
}

// TODO: Validate
function applyStyles(root: ShadowRoot): void {
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(PANEL_CSS);
    root.adoptedStyleSheets = [sheet];
  } catch {
    const style = document.createElement("style");
    style.textContent = PANEL_CSS;
    root.prepend(style);
  }
}

// TODO: Validate
export function openSettingsPanel(): void {
  if (document.getElementById(PANEL_ID)) return;
  const host = document.createElement("div");
  host.id = PANEL_ID;
  const root = host.attachShadow({ mode: "open" });
  applyStyles(root);

  const closeOnEscape = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    close();
  };
  const close = (): void => {
    host.remove();
    clearInterval(statusPoll);
    window.removeEventListener("keydown", closeOnEscape, true);
  };

  const status = el("p", "status");
  const renderStatus = (): void => {
    status.textContent = describe(loadState());
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
  textarea.value = GM_getValue<string[]>(CUSTOM_URLS_KEY, []).join("\n");
  const customUrls = (): string[] =>
    textarea.value
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  textarea.addEventListener("change", () =>
    GM_setValue(CUSTOM_URLS_KEY, customUrls()),
  );
  const customLabel = el(
    "label",
    undefined,
    "URLs to play in order, one per line",
  );
  customLabel.htmlFor = "custom-urls";

  const panel = el(
    "main",
    undefined,
    el(
      "header",
      undefined,
      el("h1", undefined, "Stream Channeler Remote"),
      button("Close", close),
    ),
    el(
      "section",
      undefined,
      status,
      el(
        "div",
        "row",
        button("Open guide", () => {
          close();
          openDvrGuide(log);
        }),
        button("Stop", () => void send({ type: "remote:stop" })),
      ),
    ),
    el(
      "section",
      undefined,
      el("h2", undefined, "Playback"),
      checkbox("Skip intros", SKIP_INTROS_KEY),
      checkbox("Skip credits", SKIP_CREDITS_KEY),
      checkbox("Always show guide button", ALWAYS_SHOW_GUIDE_KEY),
    ),
    el(
      "section",
      undefined,
      el("h2", undefined, "Netflix profile"),
      textField("Profile name", NETFLIX_NAME_KEY),
      textField("PIN", NETFLIX_PIN_KEY, true),
    ),
    el(
      "section",
      undefined,
      el("h2", undefined, "Custom channel"),
      customLabel,
      textarea,
      el(
        "div",
        "row",
        button("Play custom channel", () => {
          const urls = customUrls();
          GM_setValue(CUSTOM_URLS_KEY, urls);
          if (urls.length === 0) return;
          close();
          void send({ type: "custom:start", urls });
        }),
      ),
    ),
  );

  host.addEventListener("click", (event) => {
    if (event.composedPath()[0] === host) close();
  });
  host.addEventListener("keydown", (event) => event.stopPropagation());
  window.addEventListener("keydown", closeOnEscape, true);
  root.append(panel);
  document.body.append(host);
}
