// NAME: Listening List
// AUTHOR: yusufaf
// VERSION: 1.0.0
// DESCRIPTION: Mark albums and tracks as listened, with inline indicators across Spotify.

(function () {
'use strict';

//#region Type Definitions

/**
 * @typedef {Object} ListenedRecord
 * @property {number} listenedAt - ms epoch when marked
 * @property {"manual"|"auto-playlist"|"auto-play"|"import"} source
 */

/**
 * @typedef {Object} ListenedData
 * @property {number} schemaVersion
 * @property {Record<string, ListenedRecord>} albums - keyed by full URI
 * @property {Record<string, ListenedRecord>} tracks - keyed by full URI
 */

/**
 * @typedef {Object} ListenedConfig
 * @property {number} schemaVersion
 * @property {{ tracklistRows: boolean, albumHeader: boolean, albumCards: boolean, nowPlaying: boolean }} surfaces
 * @property {"checkmark"|"dot"|"text"} badgeStyle
 * @property {{ enabled: boolean, minTracksPerAlbum: number, lastSeededAt: number|null }} autoSeed
 * @property {{ enabled: boolean, percentThreshold: number }} autoOnPlay
 */

//#endregion

//#region Constants

/** LocalStorage keys */
const LL_DATA_KEY = 'listening-list-data';
const LL_CONFIG_KEY = 'listening-list-config';

/** Current schema versions */
const LL_DATA_SCHEMA_VERSION = 1;
const LL_CONFIG_SCHEMA_VERSION = 1;

/** DOM IDs / classes (unique-prefixed) */
const LL_BADGE_CLASS = 'll-badge';
const LL_BADGE_TRACKLIST_CLASS = 'll-badge--tracklist';
const LL_BADGE_HEADER_CLASS = 'll-badge--header';
const LL_BADGE_CARD_CLASS = 'll-badge--card';
const LL_BADGE_CARD_WRAPPER_CLASS = 'll-badge-card-wrapper';
const LL_BADGE_NOWPLAYING_CLASS = 'll-badge--nowplaying';
const LL_STYLE_ID = 'll-main-styles';
const LL_MODAL_ROOT_ID = 'll-modal-root';

/** Default configuration */
const LL_DEFAULT_CONFIG = Object.freeze({
  schemaVersion: LL_CONFIG_SCHEMA_VERSION,
  surfaces: {
    tracklistRows: true,
    albumHeader: true,
    albumCards: true,
    nowPlaying: true,
  },
  badgeStyle: 'checkmark',
  autoSeed: {
    enabled: false,
    minTracksPerAlbum: 3,
    lastSeededAt: null,
  },
  autoOnPlay: {
    enabled: false,
    percentThreshold: 70,
  },
});

/** Empty data object */
function llEmptyData() {
  return { schemaVersion: LL_DATA_SCHEMA_VERSION, albums: {}, tracks: {} };
}

/** Checkmark icon (16x16 viewBox) */
const LL_CHECK_SVG_PATH = 'M13.485 1.929a1 1 0 0 1 0 1.414L6.414 10.414a1 1 0 0 1-1.414 0L1.515 6.929a1 1 0 1 1 1.414-1.414L5.707 8.293l6.364-6.364a1 1 0 0 1 1.414 0z';

/** Gear icon (16x16 viewBox) */
const LL_GEAR_SVG_PATH = 'M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.858 2.929 2.929 0 0 1 0 5.858z';

/** Export schema version (matches data schema for now) */
const LL_EXPORT_SCHEMA_VERSION = 1;

/** Metadata cache LocalStorage key (name/artist by URI) */
const LL_META_KEY = 'listening-list-meta';

const LL_BASE_CSS = `
  .ll-badge { display: inline-flex; align-items: center; justify-content: center; color: var(--spice-button, #1ed760); pointer-events: none; }
  .ll-badge--tracklist { width: 14px; height: 14px; margin-right: 6px; vertical-align: middle; }
  .ll-badge--header { width: 18px; height: 18px; margin-left: 8px; vertical-align: middle; }
  .ll-badge-card-wrapper { position: relative; height: 0; width: 0; overflow: visible; pointer-events: none; z-index: 100; }
  .ll-badge--card { position: absolute; top: 10px; left: 10px; width: 22px; height: 22px; background: rgba(0,0,0,0.6); border-radius: 50%; padding: 3px; box-sizing: border-box; }
  .ll-badge--nowplaying { width: 12px; height: 12px; margin-left: 6px; vertical-align: middle; }
  .ll-badge--style-dot svg { display: none; }
  .ll-badge--style-dot::after { content: ""; display: block; width: 6px; height: 6px; border-radius: 50%; background: var(--spice-button, #1ed760); }
  .ll-badge--style-text svg { display: none; }
  .ll-badge--style-text::after { content: "✓"; font-size: 11px; line-height: 1; color: var(--spice-button, #1ed760); }
`;

function llEnsureStyles() {
  if (document.getElementById(LL_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = LL_STYLE_ID;
  s.textContent = LL_BASE_CSS;
  document.head.appendChild(s);
}

function llBadgeMarkup(extraClass) {
  const styleClass = llConfig.badgeStyle === 'dot' ? ' ll-badge--style-dot'
                    : llConfig.badgeStyle === 'text' ? ' ll-badge--style-text' : '';
  return `<span class="${LL_BADGE_CLASS} ${extraClass}${styleClass}" title="Listened" aria-label="Listened"><svg viewBox="0 0 16 16" width="100%" height="100%" fill="currentColor"><path d="${LL_CHECK_SVG_PATH}"/></svg></span>`;
}

//#endregion

//#region State

/** @type {ListenedData} */
let llData = llEmptyData();

/** @type {ListenedConfig} */
let llConfig = JSON.parse(JSON.stringify(LL_DEFAULT_CONFIG));

/** Metadata cache: { albums: { uri: { name, artist } }, tracks: { uri: { name, artist } } } */
let llMeta = { albums: {}, tracks: {} };

/** In-flight fetches to avoid duplicate requests */
const llMetaInflight = new Set();

/** Internal event bus for "data changed" — subscribers re-render their surfaces. */
const llListeners = new Set();

function llEmit() {
  for (const fn of llListeners) {
    try { fn(); } catch (e) { console.error('[Listening List] listener error', e); }
  }
}

function llSubscribe(fn) {
  llListeners.add(fn);
  return () => llListeners.delete(fn);
}

//#endregion

//#region Storage

function llLoadData() {
  const raw = Spicetify.LocalStorage.get(LL_DATA_KEY);
  if (!raw) return llEmptyData();
  try {
    const parsed = JSON.parse(raw);
    return llMigrateData(parsed);
  } catch (e) {
    console.error('[Listening List] Failed to parse data; using empty. Raw:', raw, e);
    return llEmptyData();
  }
}

function llSaveData() {
  try {
    Spicetify.LocalStorage.set(LL_DATA_KEY, JSON.stringify(llData));
  } catch (e) {
    console.error('[Listening List] Failed to save data', e);
    Spicetify.showNotification?.('Listening List: failed to save data');
  }
}

function llMigrateData(parsed) {
  if (!parsed || typeof parsed !== 'object') return llEmptyData();
  const v = parsed.schemaVersion ?? 0;
  if (v > LL_DATA_SCHEMA_VERSION) {
    console.warn(`[Listening List] Data schema v${v} newer than supported v${LL_DATA_SCHEMA_VERSION}; refusing to write.`);
    return { ...llEmptyData(), schemaVersion: v, __readOnly: true };
  }
  return {
    schemaVersion: LL_DATA_SCHEMA_VERSION,
    albums: parsed.albums && typeof parsed.albums === 'object' ? parsed.albums : {},
    tracks: parsed.tracks && typeof parsed.tracks === 'object' ? parsed.tracks : {},
  };
}

function llLoadConfig() {
  const raw = Spicetify.LocalStorage.get(LL_CONFIG_KEY);
  if (!raw) return JSON.parse(JSON.stringify(LL_DEFAULT_CONFIG));
  try {
    const parsed = JSON.parse(raw);
    return llMigrateConfig(parsed);
  } catch (e) {
    console.error('[Listening List] Failed to parse config; using defaults. Raw:', raw, e);
    return JSON.parse(JSON.stringify(LL_DEFAULT_CONFIG));
  }
}

function llSaveConfig() {
  try {
    Spicetify.LocalStorage.set(LL_CONFIG_KEY, JSON.stringify(llConfig));
  } catch (e) {
    console.error('[Listening List] Failed to save config', e);
  }
}

function llMigrateConfig(parsed) {
  if (!parsed || typeof parsed !== 'object') return JSON.parse(JSON.stringify(LL_DEFAULT_CONFIG));
  return llDeepMerge(LL_DEFAULT_CONFIG, parsed, { schemaVersion: LL_CONFIG_SCHEMA_VERSION });
}

function llLoadMeta() {
  const raw = Spicetify.LocalStorage.get(LL_META_KEY);
  if (!raw) return { albums: {}, tracks: {} };
  try {
    const parsed = JSON.parse(raw);
    const albums = parsed.albums && typeof parsed.albums === 'object' ? parsed.albums : {};
    const tracks = parsed.tracks && typeof parsed.tracks === 'object' ? parsed.tracks : {};
    for (const side of [albums, tracks]) {
      for (const k of Object.keys(side)) {
        const m = side[k];
        if (!m || typeof m !== 'object' || !('artistUri' in m)) delete side[k];
      }
    }
    return { albums, tracks };
  } catch {
    return { albums: {}, tracks: {} };
  }
}

function llSaveMeta() {
  try {
    Spicetify.LocalStorage.set(LL_META_KEY, JSON.stringify(llMeta));
  } catch (e) {
    console.error('[Listening List] Failed to save meta', e);
  }
}

async function llFetchOneAlbumMeta(uri) {
  const id = uri.split(':').pop();
  try {
    const res = await Spicetify.CosmosAsync.get(`wg://album/v1/album-app/album/${id}/desktop`);
    if (res?.name) {
      const a0 = res.artists?.[0];
      return { name: res.name, artist: a0?.name || '', artistUri: a0?.uri || '' };
    }
  } catch {}
  try {
    if (Spicetify.GraphQL?.Request && Spicetify.GraphQL?.Definitions?.getAlbum) {
      const res = await Spicetify.GraphQL.Request(
        Spicetify.GraphQL.Definitions.getAlbum,
        { uri, locale: Spicetify.Locale?.getLocale?.() || 'en', limit: 1, offset: 0 },
      );
      const a = res?.data?.albumUnion;
      if (a?.name) {
        const ar = a.artists?.items?.[0];
        return { name: a.name, artist: ar?.profile?.name || '', artistUri: ar?.uri || '' };
      }
    }
  } catch {}
  return null;
}

async function llFetchOneTrackMeta(uri) {
  try {
    if (Spicetify.GraphQL?.Request && Spicetify.GraphQL?.Definitions?.getTrack) {
      const res = await Spicetify.GraphQL.Request(
        Spicetify.GraphQL.Definitions.getTrack,
        { uri, locale: Spicetify.Locale?.getLocale?.() || 'en' },
      );
      const t = res?.data?.trackUnion;
      if (t?.name) {
        const ar = t.artists?.items?.[0] || t.firstArtist?.items?.[0];
        return { name: t.name, artist: ar?.profile?.name || '', artistUri: ar?.uri || '' };
      }
    }
  } catch {}
  return null;
}

async function llFetchMetadata(uris, kind, onItem, onDone) {
  const target = kind === 'albums' ? llMeta.albums : llMeta.tracks;
  const need = uris.filter((u) => !target[u]);
  if (need.length === 0) { onDone?.(0); return; }
  const fetcher = kind === 'albums' ? llFetchOneAlbumMeta : llFetchOneTrackMeta;
  const concurrency = 4;
  let cursor = 0;
  let saveAt = 0;
  let completed = 0;
  async function worker() {
    while (cursor < need.length) {
      const uri = need[cursor++];
      if (target[uri]) { completed++; try { onItem?.(uri, target[uri], completed, need.length); } catch {} continue; }
      const meta = await fetcher(uri);
      if (meta) target[uri] = meta;
      completed++;
      saveAt++;
      if (saveAt >= 10) { saveAt = 0; llSaveMeta(); }
      try { onItem?.(uri, meta, completed, need.length); } catch (e) { console.warn('[Listening List] onItem error', e); }
    }
  }
  try {
    await Promise.all(Array.from({ length: concurrency }, worker));
  } finally {
    llSaveMeta();
    try { onDone?.(need.length); } catch (e) { console.warn('[Listening List] onDone error', e); }
  }
}

function llDeepMerge(base, override, ...extras) {
  const out = Array.isArray(base) ? base.slice() : { ...base };
  if (override && typeof override === 'object') {
    for (const k of Object.keys(override)) {
      const bv = out[k];
      const ov = override[k];
      if (bv && typeof bv === 'object' && !Array.isArray(bv) && ov && typeof ov === 'object' && !Array.isArray(ov)) {
        out[k] = llDeepMerge(bv, ov);
      } else if (ov !== undefined) {
        out[k] = ov;
      }
    }
  }
  for (const extra of extras) Object.assign(out, extra);
  return out;
}

//#endregion

//#region URI Helpers

function llParseUri(uri) {
  if (typeof uri !== 'string') return null;
  try {
    return Spicetify.URI.fromString(uri);
  } catch {
    return null;
  }
}

function llIsAlbumUri(uri) {
  const p = llParseUri(uri);
  return !!p && p.type === Spicetify.URI.Type.ALBUM;
}

function llIsTrackUri(uri) {
  const p = llParseUri(uri);
  return !!p && p.type === Spicetify.URI.Type.TRACK;
}

function llNormalizeUri(input) {
  if (!input) return null;
  if (typeof input === 'string' && input.startsWith('spotify:')) return input;
  const m = typeof input === 'string' && input.match(/\/(album|track)\/([A-Za-z0-9]+)/);
  if (m) return `spotify:${m[1]}:${m[2]}`;
  return null;
}

//#endregion

//#region Marking

function llIsAlbumListened(uri) { return !!llData.albums[uri]; }
function llIsTrackListened(uri) { return !!llData.tracks[uri]; }

function llMarkOne(uri, source) {
  if (llData.__readOnly) {
    Spicetify.showNotification?.('Listening List: data is read-only (schema newer than this version)');
    return false;
  }
  const norm = llNormalizeUri(uri);
  if (!norm) return false;
  const rec = { listenedAt: Date.now(), source };
  if (llIsAlbumUri(norm)) {
    if (llData.albums[norm]) return false;
    llData.albums[norm] = rec;
    return true;
  }
  if (llIsTrackUri(norm)) {
    if (llData.tracks[norm]) return false;
    llData.tracks[norm] = rec;
    return true;
  }
  return false;
}

function llUnmarkOne(uri) {
  const norm = llNormalizeUri(uri);
  if (!norm) return false;
  if (llIsAlbumUri(norm) && llData.albums[norm]) { delete llData.albums[norm]; return true; }
  if (llIsTrackUri(norm) && llData.tracks[norm]) { delete llData.tracks[norm]; return true; }
  return false;
}

/**
 * @param {string[]} uris
 * @param {"manual"|"auto-playlist"|"auto-play"|"import"} source
 */
function llMarkMany(uris, source) {
  let marked = 0, skipped = 0;
  for (const u of uris) (llMarkOne(u, source) ? marked++ : skipped++);
  if (marked > 0) { llSaveData(); llEmit(); }
  return { marked, skipped };
}

function llUnmarkMany(uris) {
  let removed = 0;
  for (const u of uris) if (llUnmarkOne(u)) removed++;
  if (removed > 0) { llSaveData(); llEmit(); }
  return removed;
}

//#endregion

//#region Surfaces / Tracklist Rows

let llTracklistObserver = null;
let llTracklistUnsub = null;
let llTracklistHistoryUnlisten = null;

function llStartTracklistSurface() {
  if (!llConfig.surfaces.tracklistRows) return;
  llEnsureStyles();
  llDecorateAllTracklistRows();
  llTracklistObserver = new MutationObserver(() => llDecorateAllTracklistRows());
  llTracklistObserver.observe(document.body, { childList: true, subtree: true });
  llTracklistUnsub = llSubscribe(() => llDecorateAllTracklistRows());
  llTracklistHistoryUnlisten = Spicetify.Platform?.History?.listen?.(() => llDecorateAllTracklistRows()) || null;
}

function llStopTracklistSurface() {
  llTracklistObserver?.disconnect();
  llTracklistObserver = null;
  llTracklistUnsub?.();
  llTracklistUnsub = null;
  llTracklistHistoryUnlisten?.();
  llTracklistHistoryUnlisten = null;
  document.querySelectorAll(`.${LL_BADGE_TRACKLIST_CLASS}`).forEach((el) => el.remove());
}

function llDecorateAllTracklistRows() {
  const rows = document.querySelectorAll('.main-trackList-trackListRow, [data-testid="tracklist-row"]');
  rows.forEach(llDecorateTracklistRow);
}

function llDecorateTracklistRow(row) {
  const anchors = row.querySelectorAll('a[href^="/track/"], a[href^="/album/"]');
  let uri = null;
  for (const a of anchors) {
    uri = llNormalizeUri(a.getAttribute('href'));
    if (uri) break;
  }
  const existing = row.querySelector(`.${LL_BADGE_TRACKLIST_CLASS}`);
  const ambientAlbum = llCurrentAlbumUriFromRoute();
  const listened = (uri && (llIsAlbumListened(uri) || llIsTrackListened(uri)))
                   || (!!ambientAlbum && llIsAlbumListened(ambientAlbum));
  if (listened) {
    if (!existing) {
      const titleSlot = row.querySelector('.main-trackList-rowMainContent, .main-trackList-rowTitle, [data-testid="tracklist-row-title"]')
        || row.firstElementChild;
      if (titleSlot) {
        const wrap = document.createElement('span');
        wrap.innerHTML = llBadgeMarkup(LL_BADGE_TRACKLIST_CLASS);
        titleSlot.prepend(wrap.firstElementChild);
      }
    }
  } else if (existing) {
    existing.remove();
  }
  row.dataset.llStatus = listened ? '1' : '0';
}

function llRowNeedsRefresh(row) {
  return false;
}

//#endregion

//#region Surfaces / Album Header

let llHeaderObserver = null;
let llHeaderHistoryUnlisten = null;
let llHeaderUnsub = null;

function llStartAlbumHeaderSurface() {
  if (!llConfig.surfaces.albumHeader) return;
  llEnsureStyles();
  const tick = () => llDecorateAlbumHeader();
  tick();
  llHeaderObserver = new MutationObserver(tick);
  llHeaderObserver.observe(document.body, { childList: true, subtree: true });
  llHeaderHistoryUnlisten = Spicetify.Platform?.History?.listen?.(tick) || null;
  llHeaderUnsub = llSubscribe(tick);
}

function llStopAlbumHeaderSurface() {
  llHeaderObserver?.disconnect();
  llHeaderObserver = null;
  llHeaderHistoryUnlisten?.();
  llHeaderHistoryUnlisten = null;
  llHeaderUnsub?.();
  llHeaderUnsub = null;
  document.querySelectorAll(`.${LL_BADGE_HEADER_CLASS}`).forEach((el) => el.remove());
}

function llCurrentAlbumUriFromRoute() {
  const path = Spicetify.Platform?.History?.location?.pathname || location.pathname;
  const m = path.match(/^\/album\/([A-Za-z0-9]+)/);
  return m ? `spotify:album:${m[1]}` : null;
}

function llFindAlbumHeaderTitleEl() {
  const direct = document.querySelector('.main-entityHeader-title, [data-testid="entityTitle"] h1, [data-testid="entityTitle"], main h1, main h2');
  if (direct) return direct;
  const container = document.querySelector('[class*="entityHeader"], section[aria-labelledby]');
  if (!container) return null;
  const candidates = container.querySelectorAll('span[data-encore-id="text"], [data-encore-id="text"], button span, a span, span');
  let best = null;
  let bestSize = 0;
  for (const el of candidates) {
    if (el.querySelector('*')) continue;
    if (!el.textContent || !el.textContent.trim()) continue;
    const size = parseFloat(getComputedStyle(el).fontSize) || 0;
    if (size > bestSize) { best = el; bestSize = size; }
  }
  return best;
}

function llDecorateAlbumHeader() {
  const uri = llCurrentAlbumUriFromRoute();
  document.querySelectorAll(`.${LL_BADGE_HEADER_CLASS}`).forEach((el) => el.remove());
  document.querySelectorAll('[data-ll-header-tagged="1"]').forEach((el) => { delete el.dataset.llHeaderTagged; });
  if (!uri || !llIsAlbumListened(uri)) return;
  const title = llFindAlbumHeaderTitleEl();
  if (!title || title.dataset.llHeaderTagged === '1') return;
  const span = document.createElement('span');
  span.innerHTML = llBadgeMarkup(LL_BADGE_HEADER_CLASS);
  const rec = llData.albums[uri];
  if (rec?.listenedAt) {
    span.firstElementChild.setAttribute('title', `Listened on ${new Date(rec.listenedAt).toLocaleDateString()}`);
  }
  const target = title.tagName === 'H1' || title.tagName === 'H2' ? title : (title.parentElement || title);
  target.appendChild(span.firstElementChild);
  target.dataset.llHeaderTagged = '1';
}

//#endregion

//#region Surfaces / Album Cards

let llCardObserver = null;
let llCardHistoryUnlisten = null;
let llCardUnsub = null;

function llStartAlbumCardSurface() {
  if (!llConfig.surfaces.albumCards) return;
  llEnsureStyles();
  const tick = () => llDecorateAllAlbumCards();
  tick();
  llCardObserver = new MutationObserver(tick);
  llCardObserver.observe(document.body, { childList: true, subtree: true });
  llCardHistoryUnlisten = Spicetify.Platform?.History?.listen?.(tick) || null;
  llCardUnsub = llSubscribe(tick);
}

function llStopAlbumCardSurface() {
  llCardObserver?.disconnect();
  llCardObserver = null;
  llCardHistoryUnlisten?.();
  llCardHistoryUnlisten = null;
  llCardUnsub?.();
  llCardUnsub = null;
  document.querySelectorAll(`.${LL_BADGE_CARD_WRAPPER_CLASS}, .${LL_BADGE_CARD_CLASS}`).forEach((el) => el.remove());
}

function llDecorateAllAlbumCards() {
  const candidates = document.querySelectorAll('[data-testid="card-click-handler"], [data-encore-id="card"]');
  candidates.forEach((c) => llDecorateAlbumCard(c));
  document.querySelectorAll('a[href^="/album/"]').forEach((a) => {
    const card = a.closest('[data-testid="card-click-handler"], [data-encore-id="card"], .main-card-card');
    if (card) llDecorateAlbumCard(card, a);
  });
}

function llDecorateAlbumCard(card, anchorHint) {
  const anchor = anchorHint || card.querySelector('a[href^="/album/"]');
  if (!anchor) return;
  const uri = llNormalizeUri(anchor.getAttribute('href'));
  if (!uri) return;
  const listened = llIsAlbumListened(uri);
  const existing = card.querySelector(`.${LL_BADGE_CARD_WRAPPER_CLASS}`);
  if (listened && !existing) {
    const wrapper = document.createElement('div');
    wrapper.className = LL_BADGE_CARD_WRAPPER_CLASS;
    wrapper.innerHTML = llBadgeMarkup(LL_BADGE_CARD_CLASS);
    card.insertBefore(wrapper, card.firstChild);
  } else if (!listened && existing) {
    existing.remove();
  }
}

//#endregion

//#region Surfaces / Now Playing

let llNowPlayingHandler = null;
let llNowPlayingUnsub = null;

function llStartNowPlayingSurface() {
  if (!llConfig.surfaces.nowPlaying) return;
  llEnsureStyles();
  const tick = () => llDecorateNowPlaying();
  tick();
  llNowPlayingHandler = tick;
  Spicetify.Player.addEventListener('songchange', llNowPlayingHandler);
  llNowPlayingUnsub = llSubscribe(tick);
}

function llStopNowPlayingSurface() {
  if (llNowPlayingHandler) {
    Spicetify.Player.removeEventListener('songchange', llNowPlayingHandler);
    llNowPlayingHandler = null;
  }
  llNowPlayingUnsub?.();
  llNowPlayingUnsub = null;
  document.querySelectorAll(`.${LL_BADGE_NOWPLAYING_CLASS}`).forEach((el) => el.remove());
}

function llFindNowPlayingTitleEl() {
  const direct = document.querySelector('[data-testid="context-item-info-title"] a, [data-testid="context-item-info-title"], [data-testid="now-playing-widget"] [data-testid="context-item-link"], [data-testid="now-playing-widget"] a[href^="/album/"], [data-testid="now-playing-widget"] a[href^="/track/"], [data-testid="now-playing-widget"] a');
  if (direct) return direct;
  const widget = document.querySelector('[data-testid="now-playing-widget"], footer [class*="nowPlaying" i], aside [class*="nowPlaying" i]');
  if (!widget) return null;
  const link = widget.querySelector('a[href^="/album/"], a[href^="/track/"], a');
  return link || widget.querySelector('span[data-encore-id="text"]');
}

function llDecorateNowPlaying() {
  document.querySelectorAll(`.${LL_BADGE_NOWPLAYING_CLASS}`).forEach((el) => el.remove());
  const item = Spicetify.Player?.data?.item;
  if (!item) return;
  const trackUri = item.uri;
  const albumUri = item.album?.uri;
  const listened = (trackUri && llIsTrackListened(trackUri)) || (albumUri && llIsAlbumListened(albumUri));
  if (!listened) return;
  const titleEl = llFindNowPlayingTitleEl();
  if (!titleEl) return;
  const span = document.createElement('span');
  span.innerHTML = llBadgeMarkup(LL_BADGE_NOWPLAYING_CLASS);
  titleEl.appendChild(span.firstElementChild);
}

//#endregion

//#region Auto-Seed

async function llRunAutoSeed() {
  const rootlist = Spicetify.Platform?.RootlistAPI;
  const plAPI = Spicetify.Platform?.PlaylistAPI;
  if (!rootlist || !plAPI) {
    Spicetify.showNotification?.('Playlist API unavailable on this Spotify version');
    throw new Error('Platform.RootlistAPI or PlaylistAPI missing');
  }
  const root = await rootlist.getContents();
  const playlistUris = llCollectPlaylistUris(root);
  const albumCounts = new Map();
  let playlistsScanned = 0;
  for (const plUri of playlistUris) {
    try {
      const contents = await plAPI.getContents(plUri);
      const items = contents?.items || contents?.rows || [];
      for (const it of items) {
        const albumUri = it?.album?.uri || it?.albumOfTrack?.uri || it?.item?.album?.uri;
        if (albumUri && albumUri.startsWith('spotify:album:')) {
          albumCounts.set(albumUri, (albumCounts.get(albumUri) || 0) + 1);
        }
      }
      playlistsScanned++;
    } catch (e) {
      console.warn('[Listening List] Failed to read playlist', plUri, e);
    }
  }
  const min = Math.max(1, llConfig.autoSeed.minTracksPerAlbum);
  const toMark = [];
  for (const [uri, count] of albumCounts) {
    if (count >= min) toMark.push(uri);
  }
  const { marked } = llMarkMany(toMark, 'auto-playlist');
  llConfig.autoSeed.lastSeededAt = Date.now();
  llSaveConfig();
  return { playlistsScanned, candidates: toMark.length, markedAlbums: marked };
}

function llCollectPlaylistUris(node) {
  const out = [];
  if (!node) return out;
  if (node.type === 'playlist' && node.uri) out.push(node.uri);
  const children = node.items || node.rows || node.children || [];
  for (const c of children) out.push(...llCollectPlaylistUris(c));
  return out;
}

//#endregion

//#region Auto-On-Play

let llAOPProgressHandler = null;
let llAOPSongChangeHandler = null;
let llAOPCurrentMarked = false;

function llStartAutoOnPlay() {
  if (!llConfig.autoOnPlay.enabled) return;
  llAOPCurrentMarked = false;
  llAOPSongChangeHandler = () => { llAOPCurrentMarked = false; };
  llAOPProgressHandler = (ev) => {
    if (llAOPCurrentMarked) return;
    const data = Spicetify.Player?.data;
    if (!data?.item) return;
    const dur = data.item.duration?.milliseconds ?? data.item.duration_ms ?? 0;
    if (!dur) return;
    const pos = (ev && typeof ev.data === 'number') ? ev.data : Spicetify.Player.getProgress?.() ?? 0;
    const pct = (pos / dur) * 100;
    if (pct >= llConfig.autoOnPlay.percentThreshold) {
      const uri = data.item.uri;
      if (uri && !llIsTrackListened(uri)) {
        llMarkMany([uri], 'auto-play');
      }
      llAOPCurrentMarked = true;
    }
  };
  Spicetify.Player.addEventListener('songchange', llAOPSongChangeHandler);
  Spicetify.Player.addEventListener('onprogress', llAOPProgressHandler);
}

function llStopAutoOnPlay() {
  if (llAOPSongChangeHandler) Spicetify.Player.removeEventListener('songchange', llAOPSongChangeHandler);
  if (llAOPProgressHandler) Spicetify.Player.removeEventListener('onprogress', llAOPProgressHandler);
  llAOPSongChangeHandler = null;
  llAOPProgressHandler = null;
  llAOPCurrentMarked = false;
}

function llRestartAutoOnPlay() {
  llStopAutoOnPlay();
  if (llConfig.autoOnPlay.enabled) llStartAutoOnPlay();
}

//#endregion

//#region Import / Export

function llExportData() {
  const payload = {
    exportSchemaVersion: LL_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: llData,
    config: llConfig,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  a.download = `listening-list-export-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  Spicetify.showNotification?.('Exported listening list');
}

function llPromptImportData() {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <p style="margin-top:0">Paste exported JSON or choose a file. Existing entries are kept; new entries are merged (earliest <code>listenedAt</code> wins per URI).</p>
    <input type="file" accept="application/json" id="ll-import-file" />
    <textarea id="ll-import-text" rows="10" style="width:100%; margin-top:8px; background:var(--spice-card,#222); color:var(--spice-text); border:1px solid var(--spice-subtext,#555); border-radius:4px; padding:6px;"></textarea>
    <div style="margin-top:8px; display:flex; gap:8px;">
      <button class="ll-btn" id="ll-import-go">Import</button>
      <button class="ll-btn ll-btn--ghost" id="ll-import-cancel">Cancel</button>
    </div>
  `;
  wrap.querySelector('#ll-import-file').addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    wrap.querySelector('#ll-import-text').value = await f.text();
  });
  wrap.querySelector('#ll-import-cancel').addEventListener('click', () => Spicetify.PopupModal.hide());
  wrap.querySelector('#ll-import-go').addEventListener('click', () => {
    const raw = wrap.querySelector('#ll-import-text').value;
    try {
      const parsed = JSON.parse(raw);
      const result = llMergeImport(parsed);
      Spicetify.showNotification?.(`Imported ${result.addedAlbums} albums, ${result.addedTracks} tracks`);
      Spicetify.PopupModal.hide();
    } catch (e) {
      console.error('[Listening List] Import failed', e);
      Spicetify.showNotification?.('Import failed (see console)');
    }
  });
  Spicetify.PopupModal.display({ title: 'Import Listening List', content: wrap, isLarge: true });
}

function llMergeImport(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Not an object');
  const incoming = payload.data || payload;
  if (!incoming.albums || !incoming.tracks) throw new Error('Missing albums/tracks');
  if (payload.exportSchemaVersion && payload.exportSchemaVersion > LL_EXPORT_SCHEMA_VERSION) {
    throw new Error(`Export schema v${payload.exportSchemaVersion} newer than supported v${LL_EXPORT_SCHEMA_VERSION}`);
  }
  let addedAlbums = 0, addedTracks = 0;
  const mergeSide = (target, source, counterKey) => {
    for (const [uri, rec] of Object.entries(source)) {
      if (!rec || typeof rec.listenedAt !== 'number') continue;
      const incomingRec = { listenedAt: rec.listenedAt, source: rec.source === 'manual' || rec.source === 'auto-playlist' || rec.source === 'auto-play' || rec.source === 'import' ? rec.source : 'import' };
      if (!target[uri]) {
        target[uri] = incomingRec;
        if (counterKey === 'a') addedAlbums++; else addedTracks++;
      } else if (incomingRec.listenedAt < target[uri].listenedAt) {
        target[uri] = incomingRec;
      }
    }
  };
  mergeSide(llData.albums, incoming.albums, 'a');
  mergeSide(llData.tracks, incoming.tracks, 't');
  llSaveData();
  llEmit();
  return { addedAlbums, addedTracks };
}

//#endregion

//#region Modal

const LL_MODAL_CSS = `
  #${LL_MODAL_ROOT_ID} { color: var(--spice-text); }
  #${LL_MODAL_ROOT_ID} .ll-tabs { display: flex; gap: 8px; border-bottom: 1px solid var(--spice-subtext, #999); margin-bottom: 12px; }
  #${LL_MODAL_ROOT_ID} .ll-tab { background: none; border: none; color: var(--spice-subtext, #999); padding: 8px 12px; cursor: pointer; border-bottom: 2px solid transparent; }
  #${LL_MODAL_ROOT_ID} .ll-tab.is-active { color: var(--spice-text); border-bottom-color: var(--spice-button, #1ed760); }
  #${LL_MODAL_ROOT_ID} .ll-section { margin-bottom: 16px; }
  #${LL_MODAL_ROOT_ID} .ll-section h3 { margin: 0 0 8px 0; font-size: 14px; }
  #${LL_MODAL_ROOT_ID} .ll-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; }
  #${LL_MODAL_ROOT_ID} input[type="number"], #${LL_MODAL_ROOT_ID} input[type="range"] { background: var(--spice-card, #222); color: var(--spice-text); border: 1px solid var(--spice-subtext, #555); border-radius: 4px; padding: 4px; }
  #${LL_MODAL_ROOT_ID} button.ll-btn { background: var(--spice-button, #1ed760); color: var(--spice-button-text, #000); border: none; border-radius: 16px; padding: 6px 14px; cursor: pointer; }
  #${LL_MODAL_ROOT_ID} button.ll-btn.ll-btn--ghost { background: transparent; color: var(--spice-text); border: 1px solid var(--spice-subtext, #555); }
  #${LL_MODAL_ROOT_ID} table { width: 100%; border-collapse: collapse; font-size: 12px; }
  #${LL_MODAL_ROOT_ID} th, #${LL_MODAL_ROOT_ID} td { text-align: left; padding: 4px 6px; border-bottom: 1px solid var(--spice-card, #222); }
  #${LL_MODAL_ROOT_ID} th { cursor: pointer; user-select: none; }
  #${LL_MODAL_ROOT_ID} td a { text-decoration: none; color: var(--spice-text); }
  #${LL_MODAL_ROOT_ID} td a:hover { text-decoration: underline; }
  #${LL_MODAL_ROOT_ID} .ll-artist-link { color: inherit; }
  #${LL_MODAL_ROOT_ID} .ll-artist-link:hover { color: var(--spice-text); text-decoration: underline; }
`;

let llActiveTab = 'viewer';

function llOpenModal(tab) {
  llActiveTab = tab || llActiveTab;
  const root = document.createElement('div');
  root.id = LL_MODAL_ROOT_ID;
  const style = document.createElement('style');
  style.textContent = LL_MODAL_CSS;
  root.appendChild(style);

  const tabs = document.createElement('div');
  tabs.className = 'll-tabs';
  const tabButtons = {};
  for (const [key, label] of [['viewer', 'Viewer'], ['stats', 'Stats'], ['settings', 'Settings']]) {
    const b = document.createElement('button');
    b.className = 'll-tab' + (llActiveTab === key ? ' is-active' : '');
    b.textContent = label;
    b.addEventListener('click', () => {
      llActiveTab = key;
      for (const [k, btn] of Object.entries(tabButtons)) btn.classList.toggle('is-active', k === key);
      body.innerHTML = '';
      body.appendChild(renderActive());
    });
    tabButtons[key] = b;
    tabs.appendChild(b);
  }
  root.appendChild(tabs);

  const body = document.createElement('div');
  body.className = 'll-body';
  body.appendChild(renderActive());
  root.appendChild(body);

  function renderActive() {
    if (llActiveTab === 'viewer') return llRenderViewerTab();
    if (llActiveTab === 'stats') return llRenderStatsTab();
    return llRenderSettingsTab();
  }

  Spicetify.PopupModal.display({ title: 'Listening List', content: root, isLarge: true });
}

function llRenderSettingsTab() {
  const root = document.createElement('div');
  root.appendChild(llSettingsSurfaces());
  root.appendChild(llSettingsBadgeStyle());
  root.appendChild(llSettingsAutoSeed());
  root.appendChild(llSettingsAutoOnPlay());
  root.appendChild(llSettingsData());
  return root;
}

function llSettingsSurfaces() {
  const sec = document.createElement('div');
  sec.className = 'll-section';
  sec.innerHTML = '<h3>Surfaces</h3>';
  for (const [key, label] of [
    ['tracklistRows', 'Tracklist rows'],
    ['albumHeader', 'Album page header'],
    ['albumCards', 'Album cards / tiles'],
    ['nowPlaying', 'Now-playing bar'],
  ]) {
    const row = document.createElement('label');
    row.className = 'll-row';
    row.innerHTML = `<span>${label}</span>`;
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!llConfig.surfaces[key];
    cb.addEventListener('change', () => {
      llConfig.surfaces[key] = cb.checked;
      llSaveConfig();
      llRestartSurface(key);
    });
    row.appendChild(cb);
    sec.appendChild(row);
  }
  return sec;
}

function llRestartSurface(key) {
  const startStop = {
    tracklistRows: [llStartTracklistSurface, llStopTracklistSurface],
    albumHeader:   [llStartAlbumHeaderSurface, llStopAlbumHeaderSurface],
    albumCards:    [llStartAlbumCardSurface, llStopAlbumCardSurface],
    nowPlaying:    [llStartNowPlayingSurface, llStopNowPlayingSurface],
  }[key];
  if (!startStop) return;
  const [start, stop] = startStop;
  stop();
  if (llConfig.surfaces[key]) start();
}

function llSettingsBadgeStyle() {
  const sec = document.createElement('div');
  sec.className = 'll-section';
  sec.innerHTML = '<h3>Badge style</h3>';
  for (const v of ['checkmark', 'dot', 'text']) {
    const row = document.createElement('label');
    row.className = 'll-row';
    row.innerHTML = `<span>${v.charAt(0).toUpperCase() + v.slice(1)}</span>`;
    const rb = document.createElement('input');
    rb.type = 'radio';
    rb.name = 'll-badge-style';
    rb.checked = llConfig.badgeStyle === v;
    rb.addEventListener('change', () => {
      if (rb.checked) {
        llConfig.badgeStyle = v;
        llSaveConfig();
        llEmit();
      }
    });
    row.appendChild(rb);
    sec.appendChild(row);
  }
  return sec;
}

function llSettingsAutoSeed() {
  const sec = document.createElement('div');
  sec.className = 'll-section';
  sec.innerHTML = '<h3>Auto-seed from playlists</h3>';
  const enabled = document.createElement('label');
  enabled.className = 'll-row';
  enabled.innerHTML = '<span>Enabled</span>';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = llConfig.autoSeed.enabled;
  cb.addEventListener('change', () => { llConfig.autoSeed.enabled = cb.checked; llSaveConfig(); });
  enabled.appendChild(cb);
  sec.appendChild(enabled);

  const thr = document.createElement('label');
  thr.className = 'll-row';
  thr.innerHTML = '<span>Min tracks per album</span>';
  const n = document.createElement('input');
  n.type = 'number'; n.min = '1'; n.max = '20'; n.value = String(llConfig.autoSeed.minTracksPerAlbum);
  n.addEventListener('change', () => {
    const v = Math.max(1, Math.min(20, Number(n.value) || 3));
    llConfig.autoSeed.minTracksPerAlbum = v;
    llSaveConfig();
  });
  thr.appendChild(n);
  sec.appendChild(thr);

  const runRow = document.createElement('div');
  runRow.className = 'll-row';
  const last = llConfig.autoSeed.lastSeededAt ? new Date(llConfig.autoSeed.lastSeededAt).toLocaleString() : 'never';
  runRow.innerHTML = `<span>Last seeded: ${last}</span>`;
  const btn = document.createElement('button');
  btn.className = 'll-btn';
  btn.textContent = 'Seed now';
  btn.addEventListener('click', async () => {
    btn.disabled = true; btn.textContent = 'Seeding...';
    try {
      const summary = await llRunAutoSeed();
      Spicetify.showNotification?.(`Seeded ${summary.markedAlbums} albums from ${summary.playlistsScanned} playlists`);
    } catch (e) {
      console.error('[Listening List] Auto-seed failed', e);
      Spicetify.showNotification?.('Auto-seed failed (see console)');
    } finally {
      btn.disabled = false; btn.textContent = 'Seed now';
    }
  });
  runRow.appendChild(btn);
  sec.appendChild(runRow);
  return sec;
}

function llSettingsAutoOnPlay() {
  const sec = document.createElement('div');
  sec.className = 'll-section';
  sec.innerHTML = '<h3>Auto-mark on play</h3>';

  const en = document.createElement('label');
  en.className = 'll-row';
  en.innerHTML = '<span>Enabled</span>';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = llConfig.autoOnPlay.enabled;
  cb.addEventListener('change', () => {
    llConfig.autoOnPlay.enabled = cb.checked;
    llSaveConfig();
    llRestartAutoOnPlay();
  });
  en.appendChild(cb);
  sec.appendChild(en);

  const thr = document.createElement('label');
  thr.className = 'll-row';
  thr.innerHTML = `<span>Threshold: <span id="ll-aop-val">${llConfig.autoOnPlay.percentThreshold}</span>%</span>`;
  const r = document.createElement('input');
  r.type = 'range'; r.min = '0'; r.max = '100'; r.value = String(llConfig.autoOnPlay.percentThreshold);
  r.addEventListener('input', () => {
    const v = Number(r.value);
    llConfig.autoOnPlay.percentThreshold = v;
    const val = thr.querySelector('#ll-aop-val');
    if (val) val.textContent = String(v);
  });
  r.addEventListener('change', () => llSaveConfig());
  thr.appendChild(r);
  sec.appendChild(thr);
  return sec;
}

function llSettingsData() {
  const sec = document.createElement('div');
  sec.className = 'll-section';
  sec.innerHTML = '<h3>Data</h3>';
  const row = document.createElement('div');
  row.className = 'll-row';

  const exp = document.createElement('button');
  exp.className = 'll-btn ll-btn--ghost';
  exp.textContent = 'Export JSON';
  exp.addEventListener('click', llExportData);

  const imp = document.createElement('button');
  imp.className = 'll-btn ll-btn--ghost';
  imp.textContent = 'Import JSON';
  imp.addEventListener('click', llPromptImportData);

  const clr = document.createElement('button');
  clr.className = 'll-btn ll-btn--ghost';
  clr.textContent = 'Clear all';
  clr.addEventListener('click', () => {
    if (!confirm('Clear all listened data? This cannot be undone.')) return;
    llData = llEmptyData(); llSaveData(); llEmit();
    Spicetify.showNotification?.('Listening List cleared');
  });

  row.append(exp, imp, clr);
  sec.appendChild(row);
  return sec;
}
let llViewerState = { kind: 'albums', sortKey: 'listenedAt', sortDir: 'desc', filter: '' };

function llRenderViewerTab() {
  const root = document.createElement('div');
  const subTabs = document.createElement('div');
  subTabs.className = 'll-tabs';
  for (const [k, label] of [['albums', 'Albums'], ['tracks', 'Tracks']]) {
    const b = document.createElement('button');
    b.className = 'll-tab' + (llViewerState.kind === k ? ' is-active' : '');
    b.textContent = label;
    b.addEventListener('click', () => { llViewerState.kind = k; renderBody(); refreshTabs(); });
    subTabs.appendChild(b);
  }
  root.appendChild(subTabs);

  const filter = document.createElement('input');
  filter.type = 'text';
  filter.placeholder = 'Filter by name, artist, or URI';
  filter.value = llViewerState.filter;
  filter.style.width = '100%';
  filter.style.margin = '8px 0';
  filter.style.padding = '6px';
  filter.style.background = 'var(--spice-card, #222)';
  filter.style.color = 'var(--spice-text)';
  filter.style.border = '1px solid var(--spice-subtext, #555)';
  filter.style.borderRadius = '4px';
  filter.addEventListener('input', () => { llViewerState.filter = filter.value; renderBody(); });
  root.appendChild(filter);

  const bodyHost = document.createElement('div');
  root.appendChild(bodyHost);

  function refreshTabs() {
    subTabs.querySelectorAll('.ll-tab').forEach((el, i) => {
      el.classList.toggle('is-active', ['albums', 'tracks'][i] === llViewerState.kind);
    });
  }

  function renderBody() {
    bodyHost.innerHTML = '';
    bodyHost.appendChild(llRenderViewerTable());
  }

  renderBody();
  return root;
}

function llRenderViewerTable() {
  const source = llViewerState.kind === 'albums' ? llData.albums : llData.tracks;
  const f = llViewerState.filter.trim().toLowerCase();
  const metaForFilter = llViewerState.kind === 'albums' ? llMeta.albums : llMeta.tracks;
  let entries = Object.entries(source).filter(([uri]) => {
    if (!f) return true;
    if (uri.toLowerCase().includes(f)) return true;
    const m = metaForFilter[uri];
    return !!m && ((m.name || '').toLowerCase().includes(f) || (m.artist || '').toLowerCase().includes(f));
  });

  const wrap = document.createElement('div');

  if (entries.length === 0) {
    wrap.innerHTML = '<p style="opacity:.6">Nothing here yet.</p>';
    return wrap;
  }

  const status = document.createElement('div');
  status.style.cssText = 'margin:0 0 8px 0; font-size:12px; opacity:.75; display:flex; align-items:center; gap:8px; min-height:18px;';
  wrap.appendChild(status);

  const scroll = document.createElement('div');
  scroll.style.cssText = 'max-height:50vh; overflow-y:auto;';
  wrap.appendChild(scroll);

  const kind = llViewerState.kind;
  const metaSide = kind === 'albums' ? llMeta.albums : llMeta.tracks;

  // Re-sort with name support if requested
  entries.sort((a, b) => {
    let aKey, bKey;
    if (llViewerState.sortKey === 'name') {
      aKey = (metaSide[a[0]]?.name || '').toLowerCase();
      bKey = (metaSide[b[0]]?.name || '').toLowerCase();
    } else if (llViewerState.sortKey === 'artist') {
      aKey = (metaSide[a[0]]?.artist || '').toLowerCase();
      bKey = (metaSide[b[0]]?.artist || '').toLowerCase();
    } else {
      aKey = a[1].listenedAt;
      bKey = b[1].listenedAt;
    }
    const cmp = aKey > bKey ? 1 : aKey < bKey ? -1 : 0;
    return llViewerState.sortDir === 'asc' ? cmp : -cmp;
  });

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const titleLabel = kind === 'albums' ? 'Album' : 'Track';
  const arrow = (key) => llViewerState.sortKey === key ? (llViewerState.sortDir === 'asc' ? ' ▲' : ' ▼') : '';
  thead.innerHTML = `<tr>
    <th data-sort="name" style="white-space:nowrap">${titleLabel}<span class="ll-sort">${arrow('name')}</span></th>
    <th data-sort="artist" style="white-space:nowrap">Artist<span class="ll-sort">${arrow('artist')}</span></th>
    <th data-sort="listenedAt" style="white-space:nowrap">Listened<span class="ll-sort">${arrow('listenedAt')}</span></th>
    <th style="white-space:nowrap">Source</th>
    <th></th>
  </tr>`;
  thead.querySelectorAll('th[data-sort]').forEach((th) => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = th.getAttribute('data-sort');
      if (llViewerState.sortKey === key) {
        llViewerState.sortDir = llViewerState.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        llViewerState.sortKey = key;
        llViewerState.sortDir = key === 'listenedAt' ? 'desc' : 'asc';
      }
      wrap.replaceWith(llRenderViewerTable());
    });
  });
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const max = 500;
  const visible = entries.slice(0, max);
  const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const buildArtistCell = (m) => {
    if (!m) return '';
    const artistName = escHtml(m.artist || '');
    if (m.artistUri && m.artistUri.startsWith('spotify:artist:')) {
      const aid = m.artistUri.split(':').pop();
      return `<a href="/artist/${aid}" class="ll-artist-link" data-artist-path="/artist/${aid}">${artistName}</a>`;
    }
    return artistName;
  };
  for (const [uri, rec] of visible) {
    const tr = document.createElement('tr');
    tr.dataset.uri = uri;
    const id = uri.split(':').pop();
    const path = kind === 'albums' ? `/album/${id}` : `/track/${id}`;
    const m = metaSide[uri];
    const nameCell = m?.name ? escHtml(m.name) : '<span style="opacity:.4">…</span>';
    tr.innerHTML = `
      <td class="ll-name-cell"><a href="${path}" style="color:var(--spice-text)" title="${escHtml(uri)}">${nameCell}</a></td>
      <td class="ll-artist-cell" style="opacity:.85">${buildArtistCell(m)}</td>
      <td>${new Date(rec.listenedAt).toLocaleDateString()}</td>
      <td>${rec.source}</td>
      <td><button class="ll-btn ll-btn--ghost" data-act="unmark">Unmark</button></td>
    `;
    tr.querySelector('.ll-name-cell a').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      Spicetify.Platform?.History?.push(path);
      Spicetify.PopupModal.hide();
    });
    const artistLink = tr.querySelector('.ll-artist-link');
    if (artistLink) {
      artistLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        Spicetify.Platform?.History?.push(artistLink.getAttribute('data-artist-path'));
        Spicetify.PopupModal.hide();
      });
    }
    tr.querySelector('button[data-act="unmark"]').addEventListener('click', (e) => {
      e.stopPropagation();
      llUnmarkMany([uri]);
      tr.remove();
    });
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  scroll.appendChild(table);

  const missing = visible.map(([u]) => u).filter((u) => !metaSide[u]);
  if (missing.length > 0) {
    status.innerHTML = `<span class="ll-spinner" style="display:inline-block;width:12px;height:12px;border:2px solid var(--spice-subtext,#999);border-top-color:var(--spice-button,#1ed760);border-radius:50%;animation:ll-spin 0.8s linear infinite;"></span><span class="ll-status-text">Loading 0 / ${missing.length}…</span>`;
    if (!document.getElementById('ll-spinner-css')) {
      const s = document.createElement('style');
      s.id = 'll-spinner-css';
      s.textContent = '@keyframes ll-spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(s);
    }
    const patchRow = (uri) => {
      const tr = tbody.querySelector(`tr[data-uri="${CSS.escape(uri)}"]`);
      if (!tr) return;
      const m = metaSide[uri];
      if (!m) return;
      const a = tr.querySelector('.ll-name-cell a');
      if (a) a.textContent = m.name || a.textContent;
      const art = tr.querySelector('.ll-artist-cell');
      if (art) {
        art.innerHTML = buildArtistCell(m);
        const newLink = art.querySelector('.ll-artist-link');
        if (newLink) {
          newLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            Spicetify.Platform?.History?.push(newLink.getAttribute('data-artist-path'));
            Spicetify.PopupModal.hide();
          });
        }
      }
    };
    llFetchMetadata(
      missing,
      kind,
      (uri, _meta, done, total) => {
        patchRow(uri);
        const txt = status.querySelector('.ll-status-text');
        if (txt) txt.textContent = `Loading ${done} / ${total}…`;
      },
      () => { status.innerHTML = ''; },
    );
  }

  if (entries.length > max) {
    const more = document.createElement('p');
    more.style.opacity = '.6';
    more.textContent = `Showing first ${max} of ${entries.length}. Use the filter to narrow.`;
    wrap.appendChild(more);
  }
  return wrap;
}
function llRenderStatsTab() {
  const root = document.createElement('div');
  const albums = Object.values(llData.albums);
  const tracks = Object.values(llData.tracks);
  const now = Date.now();
  const monthAgo = now - 30 * 24 * 3600 * 1000;
  const albumsThisMonth = albums.filter((r) => r.listenedAt >= monthAgo).length;
  const tracksThisMonth = tracks.filter((r) => r.listenedAt >= monthAgo).length;

  const bySource = (rows) => rows.reduce((acc, r) => { acc[r.source] = (acc[r.source] || 0) + 1; return acc; }, {});
  const a = bySource(albums);
  const t = bySource(tracks);

  const earliest = [...albums, ...tracks].reduce((min, r) => r.listenedAt < min ? r.listenedAt : min, Infinity);
  const latest = [...albums, ...tracks].reduce((max, r) => r.listenedAt > max ? r.listenedAt : max, 0);

  const fmt = (n) => Number.isFinite(n) && n > 0 ? new Date(n).toLocaleDateString() : '—';

  root.innerHTML = `
    <div class="ll-section">
      <h3>Totals</h3>
      <div class="ll-row"><span>Albums listened</span><span>${albums.length}</span></div>
      <div class="ll-row"><span>Tracks listened</span><span>${tracks.length}</span></div>
    </div>
    <div class="ll-section">
      <h3>Last 30 days</h3>
      <div class="ll-row"><span>Albums</span><span>${albumsThisMonth}</span></div>
      <div class="ll-row"><span>Tracks</span><span>${tracksThisMonth}</span></div>
    </div>
    <div class="ll-section">
      <h3>By source — albums</h3>
      <div class="ll-row"><span>Manual</span><span>${a.manual || 0}</span></div>
      <div class="ll-row"><span>Auto-playlist</span><span>${a['auto-playlist'] || 0}</span></div>
      <div class="ll-row"><span>Auto-play</span><span>${a['auto-play'] || 0}</span></div>
      <div class="ll-row"><span>Import</span><span>${a.import || 0}</span></div>
    </div>
    <div class="ll-section">
      <h3>By source — tracks</h3>
      <div class="ll-row"><span>Manual</span><span>${t.manual || 0}</span></div>
      <div class="ll-row"><span>Auto-playlist</span><span>${t['auto-playlist'] || 0}</span></div>
      <div class="ll-row"><span>Auto-play</span><span>${t['auto-play'] || 0}</span></div>
      <div class="ll-row"><span>Import</span><span>${t.import || 0}</span></div>
    </div>
    <div class="ll-section">
      <h3>Range</h3>
      <div class="ll-row"><span>Earliest</span><span>${fmt(earliest)}</span></div>
      <div class="ll-row"><span>Latest</span><span>${fmt(latest)}</span></div>
    </div>
  `;
  return root;
}

//#endregion

//#region Context Menu

function llShouldShowMark(uris) {
  return uris.some((u) => {
    const norm = llNormalizeUri(u);
    if (!norm) return false;
    return (llIsAlbumUri(norm) && !llIsAlbumListened(norm))
        || (llIsTrackUri(norm) && !llIsTrackListened(norm));
  });
}

function llShouldShowUnmark(uris) {
  return uris.some((u) => {
    const norm = llNormalizeUri(u);
    if (!norm) return false;
    return (llIsAlbumUri(norm) && llIsAlbumListened(norm))
        || (llIsTrackUri(norm) && llIsTrackListened(norm));
  });
}

function llRegisterContextMenu() {
  const markItem = new Spicetify.ContextMenu.Item(
    'Mark as listened',
    (uris) => {
      const { marked, skipped } = llMarkMany(uris, 'manual');
      Spicetify.showNotification?.(`Marked ${marked} as listened${skipped ? ` (${skipped} already)` : ''}`);
    },
    llShouldShowMark,
  );
  const unmarkItem = new Spicetify.ContextMenu.Item(
    'Unmark as listened',
    (uris) => {
      const removed = llUnmarkMany(uris);
      Spicetify.showNotification?.(`Unmarked ${removed}`);
    },
    llShouldShowUnmark,
  );
  markItem.register();
  unmarkItem.register();
}

//#endregion

//#region Profile Menu

function llRegisterProfileMenu() {
  const item = new Spicetify.Menu.Item(
    'Listening List',
    false,
    () => llOpenModal('viewer'),
  );
  item.register();
}

//#endregion

//#region Main

async function main() {
  while (
    !Spicetify?.Platform?.History ||
    !Spicetify?.LocalStorage ||
    !Spicetify?.ContextMenu?.Item ||
    !Spicetify?.Menu?.Item ||
    !Spicetify?.URI ||
    !Spicetify?.Player ||
    !Spicetify?.React ||
    !Spicetify?.ReactJSX?.jsx ||
    !Spicetify?.ReactComponent?.MenuItem ||
    !Spicetify?.CosmosAsync ||
    !Spicetify?.GraphQL?.Definitions?.getAlbum
  ) {
    await new Promise((r) => setTimeout(r, 100));
  }

  if (window.__listeningListActive) {
    console.warn('[Listening List] Already active; skipping double-load.');
    return;
  }
  window.__listeningListActive = true;

  llData = llLoadData();
  llConfig = llLoadConfig();
  llSaveConfig();
  llMeta = llLoadMeta();

  llRegisterContextMenu();
  llStartTracklistSurface();
  llStartAlbumHeaderSurface();
  llStartAlbumCardSurface();
  llStartNowPlayingSurface();
  llRegisterProfileMenu();
  llStartAutoOnPlay();

  if (llConfig.autoSeed.enabled && !llConfig.autoSeed.lastSeededAt) {
    llRunAutoSeed()
      .then((s) => Spicetify.showNotification?.(`Listening List: seeded ${s.markedAlbums} albums`))
      .catch((e) => console.warn('[Listening List] First-run auto-seed failed', e));
  }

  console.log('[Listening List] Booted.');
}

main();

//#endregion

})();
