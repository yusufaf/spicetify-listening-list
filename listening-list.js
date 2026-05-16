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

const LL_BASE_CSS = `
  .ll-badge { display: inline-flex; align-items: center; justify-content: center; color: var(--spice-button, #1ed760); pointer-events: none; }
  .ll-badge--tracklist { width: 14px; height: 14px; margin-right: 6px; vertical-align: middle; }
  .ll-badge--header { width: 18px; height: 18px; margin-left: 8px; vertical-align: middle; }
  .ll-badge--card { position: absolute; top: 6px; left: 6px; width: 22px; height: 22px; background: rgba(0,0,0,0.6); border-radius: 50%; padding: 3px; }
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
  const rows = document.querySelectorAll('[data-testid="tracklist-row"]');
  rows.forEach(llDecorateTracklistRow);
}

function llDecorateTracklistRow(row) {
  if (row.dataset.llProcessed === '1' && !llRowNeedsRefresh(row)) return;
  const anchors = row.querySelectorAll('a[href^="/track/"], a[href^="/album/"]');
  let uri = null;
  for (const a of anchors) {
    uri = llNormalizeUri(a.getAttribute('href'));
    if (uri) break;
  }
  const existing = row.querySelector(`.${LL_BADGE_TRACKLIST_CLASS}`);
  const listened = uri && (llIsAlbumListened(uri) || llIsTrackListened(uri));
  if (listened) {
    if (!existing) {
      const first = row.firstElementChild;
      if (first) {
        const wrap = document.createElement('span');
        wrap.innerHTML = llBadgeMarkup(LL_BADGE_TRACKLIST_CLASS);
        first.prepend(wrap.firstElementChild);
      }
    }
  } else if (existing) {
    existing.remove();
  }
  row.dataset.llProcessed = '1';
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

function llDecorateAlbumHeader() {
  const uri = llCurrentAlbumUriFromRoute();
  document.querySelectorAll(`.${LL_BADGE_HEADER_CLASS}`).forEach((el) => el.remove());
  if (!uri || !llIsAlbumListened(uri)) return;
  const title = document.querySelector('[data-testid="entityTitle"] h1, [data-testid="entityTitle"], main h1');
  if (!title || title.dataset.llHeaderTagged === '1') return;
  const span = document.createElement('span');
  span.innerHTML = llBadgeMarkup(LL_BADGE_HEADER_CLASS);
  const rec = llData.albums[uri];
  if (rec?.listenedAt) {
    span.firstElementChild.setAttribute('title', `Listened on ${new Date(rec.listenedAt).toLocaleDateString()}`);
  }
  title.appendChild(span.firstElementChild);
  title.dataset.llHeaderTagged = '1';
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
  document.querySelectorAll(`.${LL_BADGE_CARD_CLASS}`).forEach((el) => el.remove());
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
  const existing = card.querySelector(`.${LL_BADGE_CARD_CLASS}`);
  if (listened && !existing) {
    const imgWrap = card.querySelector('img')?.parentElement || card;
    if (getComputedStyle(imgWrap).position === 'static') imgWrap.style.position = 'relative';
    const span = document.createElement('span');
    span.innerHTML = llBadgeMarkup(LL_BADGE_CARD_CLASS);
    imgWrap.appendChild(span.firstElementChild);
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

function llDecorateNowPlaying() {
  document.querySelectorAll(`.${LL_BADGE_NOWPLAYING_CLASS}`).forEach((el) => el.remove());
  const item = Spicetify.Player?.data?.item;
  if (!item) return;
  const trackUri = item.uri;
  const albumUri = item.album?.uri;
  const listened = (trackUri && llIsTrackListened(trackUri)) || (albumUri && llIsAlbumListened(albumUri));
  if (!listened) return;
  const titleEl = document.querySelector('[data-testid="context-item-info-title"], [data-testid="now-playing-widget"] a');
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

function llRestartAutoOnPlay() { /* implemented in Task 15 */ }

//#endregion

//#region Import / Export

function llExportData() { Spicetify.showNotification?.('Export not yet implemented (Task 16)'); }
function llPromptImportData() { Spicetify.showNotification?.('Import not yet implemented (Task 16)'); }

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
`;

let llActiveTab = 'settings';

function llOpenModal(tab) {
  llActiveTab = tab || llActiveTab;
  const root = document.createElement('div');
  root.id = LL_MODAL_ROOT_ID;
  const style = document.createElement('style');
  style.textContent = LL_MODAL_CSS;
  root.appendChild(style);

  const tabs = document.createElement('div');
  tabs.className = 'll-tabs';
  for (const [key, label] of [['settings', 'Settings'], ['viewer', 'Viewer'], ['stats', 'Stats']]) {
    const b = document.createElement('button');
    b.className = 'll-tab' + (llActiveTab === key ? ' is-active' : '');
    b.textContent = label;
    b.addEventListener('click', () => { llActiveTab = key; Spicetify.PopupModal.hide(); llOpenModal(key); });
    tabs.appendChild(b);
  }
  root.appendChild(tabs);

  const body = document.createElement('div');
  body.className = 'll-body';
  if (llActiveTab === 'settings') body.appendChild(llRenderSettingsTab());
  else if (llActiveTab === 'viewer') body.appendChild(llRenderViewerTab());
  else if (llActiveTab === 'stats') body.appendChild(llRenderStatsTab());
  root.appendChild(body);

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
function llRenderViewerTab() {
  const d = document.createElement('div');
  d.textContent = 'Viewer (Task 17)';
  return d;
}
function llRenderStatsTab() {
  const d = document.createElement('div');
  d.textContent = 'Stats (Task 18)';
  return d;
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
    `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="${LL_CHECK_SVG_PATH}"/></svg>`,
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
    () => llOpenModal('settings'),
    `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="${LL_CHECK_SVG_PATH}"/></svg>`,
  );
  item.register();
}

//#endregion

//#region Main

async function main() {
  while (!Spicetify?.Platform || !Spicetify?.LocalStorage || !Spicetify?.ContextMenu || !Spicetify?.URI) {
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

  llRegisterContextMenu();
  llStartTracklistSurface();
  llStartAlbumHeaderSurface();
  llStartAlbumCardSurface();
  llStartNowPlayingSurface();
  llRegisterProfileMenu();

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
