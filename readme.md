# Stream Channeler Remote

A companion UserScript for [Stream Channeler](https://streamchanneler.com) that adds two features:

- **Playback** - Automatically plays through episodes in a channel sequentially, detecting when each episode ends and advancing to the next one. Supports YouTube, NHK World, Crunchyroll, HBO Max, Netflix, Hulu, Prime Video, Disney+, Paramount+, Peacock, Adult Swim, HiDive, Tubi, Pluto TV, and The Roku Channel.
- **Manage** - Assists in building channels by letting you queue shows from TMDB, Crunchyroll, and YouTube, then bulk import them into Stream Channeler.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or a similar userscript manager.
2. Install [Stream Channeler Remote](https://ryn-cx.github.io/stream-channeler-tuner/index.prod.user.js).

## Supported Sites

**Autoplay** and **Fullscreen** are Playback features (auto-play through episodes); **Add to Channel** is the Manage feature (queue shows for bulk import).

| Site             | Autoplay | Fullscreen | Add to Channel |
| ---------------- | -------- | ---------- | -------------- |
| YouTube          | ✅       | ✅         | ✅             |
| NHK World        | ✅       | ✅         | ❌             |
| Crunchyroll      | ✅       | ✅         | ✅             |
| HBO Max          | ✅       | ❌         | ❌             |
| Netflix          | ✅       | ❌         | ❌             |
| Hulu             | ✅       | ✅         | ❌             |
| Prime Video      | ✅       | ✅         | ❌             |
| Disney+          | ✅       | ✅         | ❌             |
| Paramount+       | ✅       | ✅         | ❌             |
| Peacock          | ✅       | ❌         | ❌             |
| Adult Swim       | ✅       | ✅         | ❌             |
| HiDive           | ✅       | ✅         | ❌             |
| Tubi             | ✅       | ✅         | ❌             |
| Pluto TV         | ✅       | ✅         | ❌             |
| The Roku Channel | ✅       | ✅         | ❌             |
| TMDB             | N/A      | N/A        | ✅             |

## Usage

### Playback

1. Go to a channel on [streamchanneler.com](https://streamchanneler.com)
2. Click **Start Remote**
3. Episodes will open, play, and advance automatically

### Manage

1. Go to the [channels page](https://streamchanneler.com/channels) and open the **Bulk Import** modal
2. Click **Load Channels** to load your channel list
3. Browse shows on [TMDB](https://www.themoviedb.org) and use the **Add to Channel** button to queue them
4. Return to the Bulk Import modal and click **Insert URLs** to populate the import field

## Development

```bash
npm install
npm run build
```

## Adding Plugins

Plugins are auto-discovered from `src/playback/` and `src/manage/`. Each plugin lives in its own folder, named after the site exactly as it is written (capitalization and spaces included, e.g. `HBO Max`, `Disney+`), containing an `index.ts` and a `matches.cjs`.

### Playback Plugin (auto-play episodes)

A playback plugin detects when an episode ends on a streaming site and signals back to Stream Channeler.

**`src/playback/Example/matches.cjs`**

```js
module.exports = {
    hostnames: ["example.com"],
    matches: ["https://www.example.com/watch/*"],
};
```

**`src/playback/Example/index.ts`**

```ts
import { initUrlChangePlugin } from "../../shared";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
    const loading = GM_getValue("loadingTab", false);
    if (!loading) return;
    GM_setValue("loadingTab", false);

    // For sites where episode end is detected by URL change, use the shared helper:
    initUrlChangePlugin("Example");

    // For custom detection, use signalEpisodeEnded() from "../../shared" when the episode ends.
}
```

For the common case — a streaming site that plays a plain `<video>` in an SPA —
use `initVideoPlugin` instead. It gates on `loadingTab`, waits for the video,
fake-fullscreens the player wrapper, mounts the overlay controls, and signals
completion when the video ends or reaches its duration:

```ts
import { initVideoPlugin } from "../../shared";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
    initVideoPlugin({
        name: "Example",
        // Tried in order via video.closest(); pick wrappers that also hold the
        // site's own controls, so they come along into fullscreen.
        playerSelectors: ["#video-player", ".player-container"],
        // Optional: also signal completion when the site auto-advances by navigating.
        watchUrl: false,
    });
}
```

### Manage Plugin (queue shows)

A manage plugin adds an "Add to Channel" button on a content discovery site.

**`src/manage/Example/matches.cjs`**

```js
module.exports = {
    hostnames: ["example.com"],
    matches: ["https://www.example.com/*/show/*"],
};
```

**`src/manage/Example/index.ts`**

```ts
import { initManagePlugin } from "../../manage_plugin";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
    // Render the "Add to Channel" footer that lets the user pick a channel
    // and queue the current page's URL.
    initManagePlugin({
        website_name: "Example",
        buttonColor: "#000000",
        waitSelector: "h1",
        getCurrentUrl: () => location.href,
        getMatchKey: (url) => url,
    });
}
```

### Notes

- The `matches.cjs` file defines which URLs the script runs on. It is shared between the TypeScript plugin (runtime) and the build config (metadata generation).
- No changes to `index.ts` or `metadata.cjs` are needed — new plugins are picked up automatically.
- Playback plugins should check `GM_getValue("loadingTab", false)` and exit early if false, to avoid running on tabs not opened by Stream Channeler.
- Use `signalEpisodeEnded()` from `shared.ts` to notify Stream Channeler that an episode has finished.

For more details, check out the existing plugins: [YouTube (playback)](<src/playback/YouTube/index.ts>) and [TMDB (manage)](<src/manage/TMDB/index.ts>).
