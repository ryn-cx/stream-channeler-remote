// TODO: Validate
export const DVR_API_ORIGIN = "https://api.streamchanneler.com";
export const DVR_TOKEN_KEY = "dvrAccessToken";
export const GUIDE_CACHE_KEY = "guideCache";
export const GUIDE_SYNC_REQUEST_KEY = "guideSyncRequest";
export const CHANNEL_ORDER_KEY = "guideChannelOrder";
export const PREVIEW_LIMIT = 20;
const WATCHED_KEY = "watchedEpisodes";
const WATCHED_LIMIT = 2000;

export interface DvrApiProgram {
  episode_id: string;
  title: string | null;
  subtitle: string;
  url: string | null;
  duration: number | null;
  thumbnail_url: string | null;
  favicon_url: string | null;
  source_key: string;
  plugin_key: string | null;
  watched: boolean;
  description?: string | null;
}

export type EpisodeQuery = Record<string, unknown>;

export interface DvrApiChannel {
  id: string;
  name: string | null;
  number: number | null;
  programs: DvrApiProgram[];
  updatedAt?: number;
  query?: EpisodeQuery | null;
  loadedAll?: boolean;
}

// TODO: Validate
function request(
  method: "GET" | "POST",
  url: string,
  options: { auth?: boolean; body?: unknown } = {},
): Promise<string> {
  const headers: Record<string, string> = {};
  if (options.auth) {
    const token = GM_getValue<string | null>(DVR_TOKEN_KEY, null);
    if (!token) {
      return Promise.reject(
        new Error("Not signed in; open streamchanneler.com to sign in"),
      );
    }
    headers.Authorization = `Bearer ${token}`;
  }
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method,
      url,
      headers,
      data:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      timeout: 30_000,
      onload: (response) => {
        if (response.status >= 200 && response.status < 300) {
          resolve(response.responseText);
        } else {
          reject(new Error(`${method} ${url} failed: ${response.status}`));
        }
      },
      onerror: () => reject(new Error(`${method} ${url} failed`)),
      ontimeout: () => reject(new Error(`${method} ${url} timed out`)),
    });
  });
}

// TODO: Validate
function apiUrl(path: string): string {
  return new URL(`/api/v1${path}`, DVR_API_ORIGIN).href;
}

// TODO: Validate
export async function fetchChannelEpisodes(
  channelId: string,
  query: EpisodeQuery,
): Promise<unknown> {
  const url = new URL(
    apiUrl(`/channels/${encodeURIComponent(channelId)}/episodes`),
  );
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (key === "sortBy" && Array.isArray(value)) {
      for (const sort of value) {
        url.searchParams.append(
          key,
          typeof sort === "string" ? sort : JSON.stringify(sort),
        );
      }
    } else if (typeof value === "object") {
      url.searchParams.append(key, JSON.stringify(value));
    } else {
      url.searchParams.append(key, String(value));
    }
  }
  return JSON.parse(await request("GET", url.href, { auth: true })) as unknown;
}

// TODO: Validate
export function readWatched(): Record<string, number> {
  return GM_getValue<Record<string, number>>(WATCHED_KEY, {});
}

// TODO: Validate
function rememberWatched(episodeId: string): void {
  const watched = Object.entries({
    ...readWatched(),
    [episodeId]: Date.now(),
  })
    .sort(([, a], [, b]) => b - a)
    .slice(0, WATCHED_LIMIT);
  GM_setValue(WATCHED_KEY, Object.fromEntries(watched));

  const cache = readGuideCache();
  if (!cache) return;
  let changed = false;
  for (const channel of cache.channels) {
    for (const program of channel.programs) {
      if (program.episode_id !== episodeId || program.watched) continue;
      program.watched = true;
      changed = true;
    }
  }
  if (changed) writeGuideCache(cache);
}

// TODO: Validate
export async function markEpisodeWatched(episodeId: string): Promise<void> {
  rememberWatched(episodeId);
  await request(
    "POST",
    apiUrl(`/episodes/${encodeURIComponent(episodeId)}/watches`),
    {
      auth: true,
      body: { watch_date: new Date().toISOString(), completed: false },
    },
  ).catch((): undefined => undefined);
}

// TODO: Validate
export function apiAssetUrl(url: string | null): string | null {
  return url ? new URL(url, DVR_API_ORIGIN).href : null;
}

// TODO: Validate
export function fetchDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      responseType: "blob",
      timeout: 30_000,
      onload: (response) => {
        if (response.status < 200 || response.status >= 300) {
          reject(new Error(`GET ${url} failed: ${response.status}`));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error(`Couldn't read ${url}`));
        reader.readAsDataURL(response.response as Blob);
      },
      onerror: () => reject(new Error(`GET ${url} failed`)),
      ontimeout: () => reject(new Error(`GET ${url} timed out`)),
    });
  });
}

// TODO: Validate
export function nextDvrProgram(
  channel: DvrApiChannel,
  afterEpisodeId?: string,
): DvrApiProgram | null {
  const index = channel.programs.findIndex(
    (program) => program.episode_id === afterEpisodeId,
  );
  return (
    channel.programs
      .slice(index + 1)
      .find(
        (program) => program.episode_id !== afterEpisodeId && program.url,
      ) ?? null
  );
}

export interface GuideCache {
  channels: DvrApiChannel[];
  favoriteIds?: string[];
  favoritesUpdatedAt?: number;
  fetchedAt: number;
}

// TODO: Validate
export function readGuideCache(): GuideCache | null {
  return GM_getValue<GuideCache | null>(GUIDE_CACHE_KEY, null);
}

// TODO: Validate
export function writeGuideCache(cache: GuideCache): void {
  GM_setValue(GUIDE_CACHE_KEY, cache);
}

// TODO: Validate
export function requestGuideSync(): void {
  GM_setValue(GUIDE_SYNC_REQUEST_KEY, Date.now());
}
