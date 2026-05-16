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
// (populated in Task 8)
//#endregion

//#region Surfaces / Album Header
// (populated in Task 9)
//#endregion

//#region Surfaces / Album Cards
// (populated in Task 10)
//#endregion

//#region Surfaces / Now Playing
// (populated in Task 11)
//#endregion

//#region Auto-Seed
// (populated in Task 14)
//#endregion

//#region Auto-On-Play
// (populated in Task 15)
//#endregion

//#region Import / Export
// (populated in Task 16)
//#endregion

//#region Modal
// (populated in Tasks 12, 13, 17, 18)
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
// (populated in Task 12)
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

  console.log('[Listening List] Booted.');
}

main();

//#endregion

})();
