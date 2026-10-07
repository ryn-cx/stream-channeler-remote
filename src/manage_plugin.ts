// TODO: Validate
import {
  getChannelQueues,
  getLastChannelId,
  setChannelQueues,
  setLastChannelId,
} from "./manage";
import { FADE_HIDDEN_STYLE, createLogger, fadeWhenIdle } from "./shared";

export interface ManagePluginConfig {
  website_name: string;
  buttonColor: string;
  textColor?: string;
  /** Pages to show the UI on, tested against `location.pathname`. */
  urlRegex?: RegExp;
  /**
   * Custom page check, for sites where the title is identified by more than the
   * path (e.g. a query string). Takes precedence over `urlRegex`.
   */
  isValidPage?: () => boolean;
  /** A selector to wait for before trying to insert the UI. */
  waitSelector: string;
  /** Returns the URL to queue when the user clicks "Add to Channel". */
  getCurrentUrl: () => string;
  /** Extracts the comparable identity from a URL (channel id, series id, or just the URL itself). */
  getMatchKey: (url: string) => string | null;
  /** When true, render a "Source (optional)" text input that prefixes the queued URL. */
  showSourceInput?: boolean;
  /**
   * For sites that play video on top of the title page (e.g. Amazon):
   * returns true while a video is playing, so the footer stays out of the way.
   */
  isPlaybackActive?: () => boolean;
}

// TODO: Validate
export function initManagePlugin(config: ManagePluginConfig): void {
  const log = createLogger(config.website_name);
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
  let lastSeenUrl: string | null = null;

  function createUI(): void {
    if (document.getElementById(containerId)) return;

    const channelEntries = Object.entries(getChannelQueues());
    const initialUrl = config.getCurrentUrl();
    lastSeenUrl = initialUrl;
    const currentKey = config.getMatchKey(initialUrl);
    log.debug("Current URL:", initialUrl, "match key:", currentKey);
    if (!currentKey) {
      log.warn(
        "Could not extract a match key from the current page; channels won't be highlighted",
      );
    }

    const isOnChannel = (
      channelName: string,
      showUrls: string[] | undefined,
    ): boolean => {
      if (!currentKey) return false;
      const urls = showUrls ?? [];
      if (urls.length === 0) {
        log.debug(
          `Channel "${channelName}" has no shows loaded (run "Load Channels" on /channels to load them)`,
        );
        return false;
      }
      const showKeys = urls.map(config.getMatchKey);
      const match = showKeys.includes(currentKey);
      log.debug(
        `Channel "${channelName}": ${urls.length} shows, match: ${match}, keys:`,
        showKeys,
      );
      return match;
    };

    const optionTextFor = (channel: {
      name: string;
      urls: string[];
      showUrls: string[];
    }): string => {
      const marker = isOnChannel(channel.name, channel.showUrls) ? "★ " : "";
      return `${marker}${channel.name} (${channel.urls.length} queued)`;
    };

    const container = document.createElement("div");
    container.id = containerId;
    // Every site renders the same compact widget pinned to the bottom-right corner
    // so the UI looks consistent regardless of the host page's layout.
    container.style.cssText =
      "position:fixed;bottom:16px;right:16px;z-index:2147483647;display:flex;gap:8px;align-items:center;padding:8px 10px;background:rgba(15,15,15,0.92);border:1px solid #303030;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.5);font-family:system-ui,sans-serif;font-size:13px;" +
      FADE_HIDDEN_STYLE;

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
    const lastChannelId = getLastChannelId();
    if (lastChannelId && channelEntries.some(([id]) => id === lastChannelId)) {
      select.value = lastChannelId;
    }
    select.addEventListener("change", () => {
      if (select.value) setLastChannelId(select.value);
    });

    let sourceInput: HTMLInputElement | null = null;
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
      if (!channelId) return;
      setLastChannelId(channelId);

      // Re-read the URL on every click in case the SPA navigated without
      // tearing down the UI.
      const urlToQueue = config.getCurrentUrl();
      const source = sourceInput?.value.trim() ?? "";
      const fullUrl = source ? `${source} ${urlToQueue}` : urlToQueue;

      const allChannels = getChannelQueues();
      const channel = allChannels[channelId];
      if (!channel) return;

      if (channel.urls.includes(fullUrl)) {
        log.log(`URL already queued for channel "${channel.name}"`);
        btn.textContent = "Already Added";
        setTimeout(() => {
          btn.textContent = "Add to Channel";
        }, 2000);
        return;
      }

      channel.urls.push(fullUrl);
      setChannelQueues(allChannels);
      log.log(
        `Added "${fullUrl}" to channel "${channel.name}" (${channel.urls.length} total)`,
      );

      const option = select.querySelector<HTMLOptionElement>(
        `option[value="${channelId}"]`,
      );
      if (option) option.textContent = optionTextFor(channel);

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
    if (sourceInput) container.appendChild(sourceInput);
    container.appendChild(btn);
    container.appendChild(closeBtn);

    document.body.appendChild(container);
    log.debug(`UI inserted with ${channelEntries.length} channels`);
  }

  function removeUI(): void {
    document.getElementById(containerId)?.remove();
  }

  function isValidPage(): boolean {
    if (config.isValidPage) return config.isValidPage();
    return !config.urlRegex || config.urlRegex.test(location.pathname);
  }

  // TODO: Validate
  function ensureUI(): void {
    if (closed) return;
    if (!isValidPage() || config.isPlaybackActive?.()) {
      removeUI();
      return;
    }
    if (document.getElementById(containerId)) return;
    if (!document.querySelector(config.waitSelector)) return;
    createUI();
  }

  function onMutation(): void {
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
  fadeWhenIdle(() => document.getElementById(containerId));
  new MutationObserver(onMutation).observe(document.body, {
    childList: true,
    subtree: true,
  });
}
