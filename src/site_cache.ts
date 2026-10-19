// TODO: Validate
import {
  type ApiChannelDetails,
  type ApiChannelListItem,
  type DvrApiChannel,
  apiAssetUrl,
  type EpisodeQuery,
  fetchChannel,
  fetchChannelEpisodes,
  fetchDvrChannel,
  fetchFavoriteChannels,
  fetchOwnedChannels,
  fetchPublicChannels,
  GUIDE_SYNC_REQUEST_KEY,
  type DvrApiProgram,
  type GuideCache,
  PREVIEW_LIMIT,
  PUBLIC_PAGE_KEY,
  readGuideCache,
  readWatched,
  writeGuideCache,
} from "./dvr_api";

const SYNC_MS = 2000;
const PUBLIC_PAGE_ATTEMPTS = 5;
const namesRequested = new Set<string>();

type Json = Record<string, unknown>;

interface PersistedQuery {
  queryKey?: unknown[];
  queryHash: string;
  state: {
    data?: unknown;
    dataUpdatedAt?: number;
  };
}

interface PersistedClient {
  clientState: {
    queries: PersistedQuery[];
  };
}

let lastRaw: string | undefined;
let lastClient: PersistedClient | null = null;

// TODO: Validate
function readPersistedCache(): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("keyval-store");
    open.onupgradeneeded = () => open.result.createObjectStore("keyval");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const request = db
        .transaction("keyval", "readonly")
        .objectStore("keyval")
        .get("REACT_QUERY_OFFLINE_CACHE");
      request.onsuccess = () => {
        db.close();
        resolve(request.result as string | undefined);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    };
  });
}

// TODO: Validate
function patchPersistedCache(
  patch: (client: PersistedClient) => boolean,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("keyval-store");
    open.onupgradeneeded = () => open.result.createObjectStore("keyval");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction("keyval", "readwrite");
      const store = transaction.objectStore("keyval");
      const request = store.get("REACT_QUERY_OFFLINE_CACHE");
      request.onsuccess = () => {
        const raw = request.result as string | undefined;
        if (!raw) return;
        const client = JSON.parse(raw) as PersistedClient;
        if (patch(client)) {
          store.put(JSON.stringify(client), "REACT_QUERY_OFFLINE_CACHE");
        }
      };
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    };
  });
}

// TODO: Validate
async function loadClient(): Promise<PersistedClient | null> {
  const raw = await readPersistedCache();
  if (!raw) return null;
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastClient = JSON.parse(raw) as PersistedClient;
  }
  return lastClient;
}

// TODO: Validate
function isObject(value: unknown): value is Json {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// TODO: Validate
function episodesOf(data: unknown): Json[] {
  if (!isObject(data) || !Array.isArray(data.episodes)) return [];
  return data.episodes.filter(isObject);
}

// TODO: Validate
function text(source: Json, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

// TODO: Validate
function count(source: Json, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

// TODO: Validate
function queryKeyOf(query: PersistedQuery): unknown[] {
  if (Array.isArray(query.queryKey)) return query.queryKey;
  try {
    const parsed: unknown = JSON.parse(query.queryHash);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// TODO: Validate
function lookup(data: Json, table: string, id: unknown): Json {
  const entries = data[table];
  if (!isObject(entries) || typeof id !== "string") return {};
  const entry = entries[id];
  return isObject(entry) ? entry : {};
}

// TODO: Validate
function cardSubtitle(episode: Json, season: Json, title: Json): string {
  if (title.media_type === "Movie") return "Movie";
  const linked =
    typeof episode.tmdb_episode_id === "string" &&
    episode.tmdb_episode_id !== episode.id;
  const seasonNumber = linked
    ? count(episode, "tmdb_season_number")
    : count(season, "season_number");
  const number = linked
    ? count(episode, "tmdb_episode_number")
    : count(episode, "episode_number");
  const numbering =
    seasonNumber !== null && number !== null
      ? `S${seasonNumber} Ep${number}`
      : number !== null
        ? `Ep${number}`
        : null;
  return [numbering, text(episode, "name")].filter(Boolean).join(" · ");
}

// TODO: Validate
function cardThumbnail(episode: Json): string | null {
  const images = Array.isArray(episode.images)
    ? episode.images.filter(isObject)
    : [];
  for (const kind of ["still", "backdrop", "poster"]) {
    const image = images.find((candidate) => candidate.kind === kind);
    if (image && isObject(image.urls)) {
      return apiAssetUrl(text(image.urls, "w300", "w780", "original"));
    }
  }
  return null;
}

// TODO: Validate
function programsFromCards(data: unknown): DvrApiProgram[] {
  if (!isObject(data)) return [];
  return episodesOf(data).flatMap((episode) => {
    const id = text(episode, "id");
    if (!id) return [];
    const season = lookup(data, "seasons", episode.season_id);
    const title = lookup(data, "titles", season.title_id);
    const source = lookup(data, "sources", title.source_id);
    const plugin = lookup(data, "plugins", source.plugin_id);
    return [
      {
        episode_id: id,
        title: text(title, "name"),
        subtitle: cardSubtitle(episode, season, title),
        url: text(episode, "url"),
        duration: count(episode, "duration"),
        thumbnail_url: cardThumbnail(episode),
        favicon_url: apiAssetUrl(text(source, "favicon_url")),
        source_key: text(source, "key") ?? "",
        plugin_key: text(plugin, "key"),
        watched:
          episode.watch_date !== null && episode.watch_date !== undefined,
        description: text(episode, "description"),
      },
    ];
  });
}

// TODO: Validate
function isGuideChannel(value: unknown): value is DvrApiChannel {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    Array.isArray(value.programs)
  );
}

// TODO: Validate
function collectChannelInfo(
  value: unknown,
  info: Map<string, Json>,
  depth = 0,
): void {
  if (depth > 6) return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectChannelInfo(item, info, depth + 1));
    return;
  }
  if (!isObject(value)) return;
  if (
    typeof value.id === "string" &&
    (typeof value.name === "string" || typeof value.custom_name === "string")
  ) {
    info.set(value.id, { ...value, ...info.get(value.id) });
  }
  for (const child of Object.values(value)) {
    if (typeof child === "object") collectChannelInfo(child, info, depth + 1);
  }
}

// TODO: Validate
function markWatched(
  value: unknown,
  watched: Record<string, number>,
  depth = 0,
): boolean {
  if (depth > 8) return false;
  if (Array.isArray(value)) {
    return value
      .map((item) => markWatched(item, watched, depth + 1))
      .some(Boolean);
  }
  if (!isObject(value)) return false;
  let changed = false;
  const id = text(value, "episode_id", "id");
  if (id && id in watched) {
    if (value.watched === false) {
      value.watched = true;
      changed = true;
    }
    if ("watch_date" in value && value.watch_date === null) {
      value.watch_date = new Date(watched[id]).toISOString();
      changed = true;
    }
  }
  for (const child of Object.values(value)) {
    if (typeof child === "object" && markWatched(child, watched, depth + 1)) {
      changed = true;
    }
  }
  return changed;
}

// TODO: Validate
async function markWatchedInSiteCache(
  watched: Record<string, number>,
): Promise<void> {
  if (Object.keys(watched).length === 0) return;
  await patchPersistedCache((client) =>
    client.clientState.queries
      .map((query) => markWatched(query.state.data, watched))
      .some(Boolean),
  );
}

// TODO: Validate
function favoriteChannelIds(
  client: PersistedClient,
): { ids: string[]; updatedAt: number } | null {
  for (const query of client.clientState.queries) {
    const [kind, scope] = queryKeyOf(query);
    const data = query.state.data;
    if (kind !== "channels" || scope !== "favorite-ids") continue;
    if (!Array.isArray(data)) continue;
    return {
      ids: data.filter((id): id is string => typeof id === "string"),
      updatedAt: query.state.dataUpdatedAt ?? 0,
    };
  }
  return null;
}

// TODO: Validate
function newerChannels(
  built: DvrApiChannel[],
  previous: DvrApiChannel[],
): DvrApiChannel[] {
  const previousById = new Map(
    previous.map((channel) => [channel.id, channel]),
  );
  const builtIds = new Set(built.map((channel) => channel.id));
  return [
    ...built.map((channel) => {
      const older = previousById.get(channel.id);
      if (!older) return channel;
      const chosen =
        (older.updatedAt ?? 0) > (channel.updatedAt ?? 0) ? older : channel;
      return {
        ...chosen,
        name: chosen.name ?? channel.name ?? older.name,
        number: chosen.number ?? channel.number ?? older.number,
        query: channel.query ?? older.query,
      };
    }),
    ...previous.filter(
      (channel) => channel.fromApi && !builtIds.has(channel.id),
    ),
  ];
}

// TODO: Validate
function defaultQuery(details: Json): EpisodeQuery | null {
  const order = text(details, "default_order");
  if (!order) return null;
  try {
    const parsed: unknown = JSON.parse(order);
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// TODO: Validate
function buildGuide(client: PersistedClient): DvrApiChannel[] {
  const queries = [...client.clientState.queries].sort(
    (a, b) => (b.state.dataUpdatedAt ?? 0) - (a.state.dataUpdatedAt ?? 0),
  );
  const channels = new Map<string, DvrApiChannel>();
  const info = new Map<string, Json>();

  for (const query of queries) {
    const data = query.state.data;
    collectChannelInfo(data, info);
    const listed =
      isObject(data) && Array.isArray(data.channels) ? data.channels : [data];
    for (const channel of listed) {
      if (isGuideChannel(channel) && !channels.has(channel.id)) {
        const raw = channel as unknown as Json;
        channels.set(channel.id, {
          ...channel,
          query: defaultQuery(info.get(channel.id) ?? raw),
          name: text(raw, "custom_name", "name"),
          number: count(
            raw,
            "custom_channel_number",
            "number",
            "channel_number",
          ),
          updatedAt: query.state.dataUpdatedAt ?? 0,
          programs: channel.programs.map((program) => ({
            ...program,
            thumbnail_url: apiAssetUrl(program.thumbnail_url),
            favicon_url: apiAssetUrl(program.favicon_url),
          })),
        });
      }
    }
  }

  const episodeQueries = queries.filter((query) =>
    ["episodes", "episodes-preview"].includes(String(queryKeyOf(query)[0])),
  );
  for (const query of episodeQueries) {
    const [kind, channelId, params, seed] = queryKeyOf(query);
    if (typeof channelId !== "string") continue;
    if (channels.has(channelId)) continue;
    const programs = programsFromCards(query.state.data);
    if (programs.length === 0) continue;
    const details = info.get(channelId) ?? {};
    const preview = kind === "episodes-preview";
    channels.set(channelId, {
      query: isObject(params)
        ? preview && typeof seed === "number"
          ? { ...params, randomSeed: seed }
          : params
        : defaultQuery(details),
      loadedAll: !preview || programs.length < PREVIEW_LIMIT,
      id: channelId,
      name: text(details, "custom_name", "name"),
      number: count(
        details,
        "custom_channel_number",
        "number",
        "channel_number",
      ),
      programs,
      updatedAt: query.state.dataUpdatedAt ?? 0,
    });
  }

  return Array.from(channels.values()).sort(
    (a, b) =>
      (a.number ?? Number.MAX_SAFE_INTEGER) -
        (b.number ?? Number.MAX_SAFE_INTEGER) ||
      (a.name ?? "").localeCompare(b.name ?? ""),
  );
}

// TODO: Validate
function withWatched(
  programs: DvrApiProgram[],
  watched: Record<string, number>,
): DvrApiProgram[] {
  return programs.map((program) =>
    program.episode_id in watched ? { ...program, watched: true } : program,
  );
}

// TODO: Validate
export async function loadChannelEpisodes(
  channel: DvrApiChannel,
  all: boolean,
): Promise<void> {
  if (!channel.query) {
    throw new Error(`No episode order known for ${channel.id}`);
  }
  const data = await fetchChannelEpisodes(
    channel.id,
    all ? channel.query : { ...channel.query, limit: PREVIEW_LIMIT },
  );
  const programs = withWatched(programsFromCards(data), readWatched());
  const loadedAll = all || programs.length < PREVIEW_LIMIT;
  const cache = readGuideCache();
  if (!cache) return;
  const updatedAt = Date.now();
  writeGuideCache({
    ...cache,
    channels: cache.channels.map((candidate) =>
      candidate.id === channel.id
        ? { ...candidate, programs, loadedAll, updatedAt }
        : candidate,
    ),
  });
}

// TODO: Validate
async function syncGuideCache(force = false): Promise<void> {
  const watched = readWatched();
  await markWatchedInSiteCache(watched);
  const client = await loadClient();
  if (!client) return;
  const previous = readGuideCache();
  const channels = newerChannels(
    buildGuide(client),
    previous?.channels ?? [],
  ).map((channel) => ({
    ...channel,
    programs: withWatched(channel.programs, watched),
  }));
  const favorites = favoriteChannelIds(client);
  const keepFavorites =
    previous?.favoriteIds !== undefined &&
    (favorites === null ||
      (previous.favoritesUpdatedAt ?? 0) > favorites.updatedAt);
  const favoriteIds = keepFavorites
    ? (previous?.favoriteIds ?? [])
    : (favorites?.ids ?? []);
  const favoritesUpdatedAt = keepFavorites
    ? previous?.favoritesUpdatedAt
    : favorites?.updatedAt;
  if (
    !force &&
    previous &&
    JSON.stringify([previous.channels, previous.favoriteIds ?? []]) ===
      JSON.stringify([channels, favoriteIds])
  )
    return;
  writeGuideCache({
    channels,
    favoriteIds,
    favoritesUpdatedAt,
    ownedIds: previous?.ownedIds,
    fetchedAt: Date.now(),
  });
}

// TODO: Validate
export function startGuideSync(): void {
  if (window.top !== window) return;
  const sync = (force = false): void => {
    syncGuideCache(force).catch((error: unknown) =>
      console.warn(
        "[Stream Channeler Remote] Couldn't read the site cache:",
        error,
      ),
    );
  };
  sync();
  window.setInterval(() => sync(), SYNC_MS);
  GM_addValueChangeListener(GUIDE_SYNC_REQUEST_KEY, () => sync(true));
}

// TODO: Validate
async function guideChannelFromApi(
  item: ApiChannelListItem,
  watched: Record<string, number>,
): Promise<DvrApiChannel> {
  const randomSeed = Math.floor(Math.random() * 2 ** 31);
  const dvr = await fetchDvrChannel(item.id, randomSeed);
  const order = defaultQuery(item as unknown as Json);
  return {
    id: item.id,
    name: item.custom_name ?? item.name ?? dvr.name,
    number: item.custom_channel_number ?? dvr.number,
    query: order ? { ...order, randomSeed } : null,
    loadedAll: dvr.programs.length < PREVIEW_LIMIT,
    updatedAt: Date.now(),
    fromApi: true,
    programs: withWatched(
      dvr.programs.map((program) => ({
        ...program,
        thumbnail_url: apiAssetUrl(program.thumbnail_url),
        favicon_url: apiAssetUrl(program.favicon_url),
      })),
      watched,
    ),
  };
}

// TODO: Validate
async function addApiChannels(
  items: ApiChannelListItem[],
  update: Partial<GuideCache> = {},
): Promise<number> {
  const known = new Set(readGuideCache()?.channels.map(({ id }) => id) ?? []);
  const watched = readWatched();
  const loaded = await Promise.allSettled(
    items
      .filter((item) => !known.has(item.id))
      .map((item) => guideChannelFromApi(item, watched)),
  );
  const added = loaded.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  const cache = readGuideCache() ?? { channels: [], fetchedAt: Date.now() };
  const present = new Set(cache.channels.map(({ id }) => id));
  writeGuideCache({
    ...cache,
    channels: [
      ...cache.channels,
      ...added.filter((channel) => !present.has(channel.id)),
    ],
    ...update,
  });
  return added.filter((channel) => channel.programs.length > 0).length;
}

// TODO: Validate
export async function loadMorePublicChannels(): Promise<number | null> {
  for (let attempt = 0; attempt < PUBLIC_PAGE_ATTEMPTS; attempt++) {
    const page = GM_getValue(PUBLIC_PAGE_KEY, 0);
    const items = await fetchPublicChannels(page);
    if (items.length === 0) return null;
    GM_setValue(PUBLIC_PAGE_KEY, page + 1);
    const added = await addApiChannels(items);
    if (added > 0) return added;
  }
  return 0;
}

// TODO: Validate
export async function loadFavoriteChannels(): Promise<void> {
  const items = await fetchFavoriteChannels();
  await addApiChannels(items, {
    favoriteIds: items.map(({ id }) => id),
    favoritesUpdatedAt: Date.now(),
  });
}

// TODO: Validate
export async function loadOwnedChannels(): Promise<void> {
  const items = await fetchOwnedChannels();
  await addApiChannels(items, { ownedIds: items.map(({ id }) => id) });
}

// TODO: Validate
export async function fillChannelNames(): Promise<void> {
  const missing = (readGuideCache()?.channels ?? []).filter(
    (channel) => !channel.name && !namesRequested.has(channel.id),
  );
  if (missing.length === 0) return;
  for (const channel of missing) namesRequested.add(channel.id);
  const loaded = await Promise.allSettled(
    missing.map((channel) => fetchChannel(channel.id)),
  );
  const found = new Map<string, ApiChannelDetails>();
  loaded.forEach((result, index) => {
    const { id } = missing[index];
    if (result.status === "fulfilled" && result.value.name) {
      found.set(id, result.value);
    } else if (result.status === "rejected") {
      namesRequested.delete(id);
    }
  });
  const cache = readGuideCache();
  if (!cache || found.size === 0) return;
  writeGuideCache({
    ...cache,
    channels: cache.channels.map((channel) => {
      const named = found.get(channel.id);
      return named && !channel.name
        ? {
            ...channel,
            name: named.name,
            number: channel.number ?? named.channel_number,
          }
        : channel;
    }),
  });
}
