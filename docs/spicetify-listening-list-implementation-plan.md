# Spicetify Listening List — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a single-file Spicetify extension that lets users mark albums/tracks as "listened" with inline indicators across tracklists, album headers, album cards, and the now-playing bar — all backed by local storage with optional auto-seeding from playlists and threshold-based auto-marking.

**Architecture:** One IIFE-wrapped `listening-list.js` matching the conventions of `spicetify-album-length`, `spicetify-rym`, and `spicetify-enhanced-pins`. Two `Spicetify.LocalStorage` keys (`listening-list-data`, `listening-list-config`). Per-surface `MutationObserver` modules gated by config flags. Profile-menu entry opens a tabbed modal (Settings / Viewer / Stats). Context-menu items handle manual marking.

**Tech Stack:** Vanilla JavaScript (no build step), JSDoc type annotations, `#region` code partitioning, Spicetify API (`LocalStorage`, `URI`, `ContextMenu`, `Menu`, `Player`, `Platform.History`, `Platform.PlaylistAPI`, `Platform.RootlistAPI`, `PopupModal`, `showNotification`).

**Testing model:** Zero-build, zero automated test suite (matches existing repo conventions). Each task has an explicit **Manual verify** step performed by running `spicetify apply` and inspecting Spotify's DevTools (`Ctrl+Shift+I` after enabling `spicetify enable-devtools`). Console must remain free of errors during boot and normal navigation.

**Conventional commits enforced.** This repo already has commitlint + husky configured. Commit messages must follow `<type>(<scope>): <subject>`.

---

## File Structure

| File | Purpose |
|---|---|
| `listening-list.js` | Extension entry; single IIFE containing all regions |
| `manifest.json` | Spicetify marketplace metadata |
| `README.md` | User-facing docs (Features → How → Install → Usage → Settings → Troubleshooting) |
| `CHANGELOG.md` | Keep-a-Changelog format, SemVer |
| `LICENSE` | MIT, 2026 yusufaf |
| `CONTRIBUTING.md` | Fork → modify → `spicetify apply` workflow |
| `preview.png` | Marketplace preview screenshot (added once UI exists) |
| `package.json` | Update `license` from `ISC` → `MIT` |

All extension code lives in one file. Regions (mirrors existing repos):

```
//#region Type Definitions
//#region Constants
//#region State
//#region Storage
//#region URI Helpers
//#region Marking
//#region Surfaces / Tracklist Rows
//#region Surfaces / Album Header
//#region Surfaces / Album Cards
//#region Surfaces / Now Playing
//#region Auto-Seed
//#region Auto-On-Play
//#region Import / Export
//#region Modal / Settings Tab
//#region Modal / Viewer Tab
//#region Modal / Stats Tab
//#region Modal / Shell
//#region Context Menu
//#region Profile Menu
//#region Main
```

---

## Task 1: Project scaffolding

**Files:**
- Create: `C:\Projects\spicetify-listening-list\LICENSE`
- Create: `C:\Projects\spicetify-listening-list\CONTRIBUTING.md`
- Create: `C:\Projects\spicetify-listening-list\CHANGELOG.md`
- Create: `C:\Projects\spicetify-listening-list\README.md` (skeleton only)
- Create: `C:\Projects\spicetify-listening-list\manifest.json`
- Modify: `C:\Projects\spicetify-listening-list\package.json` (license `ISC` → `MIT`)
- Modify: `C:\Projects\spicetify-listening-list\.gitignore` (extend)

- [ ] **Step 1: Write LICENSE**

```
MIT License

Copyright (c) 2026 yusufaf

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Write CHANGELOG.md (Keep-a-Changelog skeleton)**

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release scaffolding

[Unreleased]: https://github.com/yusufaf/spicetify-listening-list/compare/v0.0.0...HEAD
```

- [ ] **Step 3: Write CONTRIBUTING.md**

```markdown
# Contributing

1. Fork and clone the repo
2. Edit `listening-list.js`
3. Copy the file to your Spicetify extensions folder:
   - Windows: `%APPDATA%\spicetify\Extensions\`
   - macOS / Linux: `~/.config/spicetify/Extensions/`
4. Register: `spicetify config extensions listening-list.js`
5. Apply: `spicetify apply`
6. Test by reloading Spotify. Open DevTools (`Ctrl+Shift+I` after `spicetify enable-devtools`) to inspect.
7. Commit using Conventional Commits (`feat:`, `fix:`, `docs:`, etc.) — enforced by commitlint
8. Open a PR

Bug reports and feature requests welcome via GitHub Issues.
```

- [ ] **Step 4: Write README.md skeleton**

```markdown
# Spicetify Listening List

Mark albums and tracks as listened, with inline indicators across Spotify.

## Features
- Mark albums and tracks as listened via right-click context menu
- Inline badge surfaces (tracklist rows, album page header, album cards, now-playing bar) — each toggleable
- Auto-seed listened albums from your playlists (threshold configurable)
- Auto-mark tracks past a play-progress threshold (threshold configurable)
- Local-only storage; nothing leaves your machine
- Export / import JSON
- Built-in viewer (sortable list) and stats summary

## How It Works
The extension stores two LocalStorage records: your listened items and your configuration. DOM observers attach small badges to tracklist rows, album headers, album cards, and the now-playing bar based on whichever surfaces you enable.

## Installation
### Prerequisites
- [Spicetify](https://spicetify.app/) installed and applied at least once

### Steps
1. Download `listening-list.js`
2. Place it in your Spicetify extensions folder:
   - Windows: `%APPDATA%\spicetify\Extensions\`
   - macOS / Linux: `~/.config/spicetify/Extensions/`
3. Register: `spicetify config extensions listening-list.js`
4. Apply: `spicetify apply`

## Usage
Right-click any track or album → "Mark as listened". A badge appears in enabled surfaces. Open the profile menu → "Listening List" to access Settings, the Viewer, and Stats.

## Settings
Accessed via profile menu → "Listening List". Toggle surfaces, choose badge style, enable auto-seed / auto-on-play, export/import data, clear all.

## Troubleshooting
- Badges not appearing? Confirm the relevant surface toggle is on in Settings and reload Spotify.
- Auto-seed fails? The Spicetify Platform API for playlists is undocumented and varies by Spotify version. Check DevTools console for the error.
- Open DevTools: enable once via `spicetify enable-devtools`, then `Ctrl+Shift+I` inside Spotify.

## License
MIT — see [LICENSE](LICENSE).
```

- [ ] **Step 5: Write manifest.json**

```json
{
  "name": "Listening List",
  "description": "Mark albums and tracks as listened, with inline indicators across Spotify.",
  "preview": "preview.png",
  "main": "listening-list.js",
  "readme": "README.md",
  "authors": [
    {
      "name": "yusufaf",
      "url": "https://github.com/yusufaf"
    }
  ],
  "tags": ["listening", "tracker", "albums", "library", "badges"]
}
```

- [ ] **Step 6: Update package.json license**

Modify `C:\Projects\spicetify-listening-list\package.json` — change `"license": "ISC"` to `"license": "MIT"`. Also clear `"main": "index.js"` to `"main": "listening-list.js"` and set `"description"` to `"Spicetify extension: mark albums/tracks as listened."`.

- [ ] **Step 7: Extend .gitignore**

Append to `C:\Projects\spicetify-listening-list\.gitignore`:

```
# Editors
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Build artifacts (none, but safety)
build/
dist/

# Local tooling
.claude/
```

- [ ] **Step 8: Commit**

```bash
git add LICENSE CONTRIBUTING.md CHANGELOG.md README.md manifest.json package.json .gitignore
git commit -m "chore: scaffold project (LICENSE, README, CHANGELOG, manifest)"
```

---

## Task 2: Extension entry skeleton

**Files:**
- Create: `C:\Projects\spicetify-listening-list\listening-list.js`

- [ ] **Step 1: Write the skeleton with header, IIFE, guard, and region markers**

```javascript
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
// (populated in Task 3)
//#endregion

//#region State
// (populated in Task 3)
//#endregion

//#region Storage
// (populated in Task 4)
//#endregion

//#region URI Helpers
// (populated in Task 5)
//#endregion

//#region Marking
// (populated in Task 6)
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
// (populated in Task 7)
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

  console.log('[Listening List] Booted.');
}

main();

//#endregion

})();
```

- [ ] **Step 2: Manual verify**

Copy `listening-list.js` to Spicetify Extensions folder; run `spicetify config extensions listening-list.js` (first time only); run `spicetify apply`. Reload Spotify. Open DevTools console.

Expected: `[Listening List] Booted.` appears once. No errors.

- [ ] **Step 3: Commit**

```bash
git add listening-list.js
git commit -m "feat: add extension entry skeleton with region markers"
```

---

## Task 3: Constants, defaults, and module state

**Files:**
- Modify: `C:\Projects\spicetify-listening-list\listening-list.js` (Constants + State regions)

- [ ] **Step 1: Fill Constants region**

Replace the Constants region body with:

```javascript
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
```

- [ ] **Step 2: Fill State region**

Replace the State region body with:

```javascript
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
```

- [ ] **Step 3: Manual verify**

Re-copy file, `spicetify apply`, reload Spotify, open DevTools. In console:

```javascript
window.__listeningListActive
```
Expected: `true`. No errors.

- [ ] **Step 4: Commit**

```bash
git add listening-list.js
git commit -m "feat: add constants, defaults, and state primitives"
```

---

## Task 4: Storage module (load, save, migrate)

**Files:**
- Modify: `C:\Projects\spicetify-listening-list\listening-list.js` (Storage region)

- [ ] **Step 1: Fill Storage region**

```javascript
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
  // Deep-merge defaults so new fields fill in
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
```

- [ ] **Step 2: Wire storage into Main**

In the Main region, after the double-load guard, insert before the boot log:

```javascript
  llData = llLoadData();
  llConfig = llLoadConfig();
  llSaveConfig(); // persist any migration fill-ins
```

- [ ] **Step 3: Manual verify**

Reload Spotify after `spicetify apply`. In DevTools console:

```javascript
Spicetify.LocalStorage.get('listening-list-config')
```
Expected: JSON string containing all default config fields with `"schemaVersion":1`.

```javascript
Spicetify.LocalStorage.set('listening-list-data', '{"schemaVersion":0,"albums":{"spotify:album:test":{"listenedAt":1,"source":"manual"}}}'); location.reload();
```
After reload:
```javascript
JSON.parse(Spicetify.LocalStorage.get('listening-list-data'))
```
Expected: `schemaVersion: 1`, the synthetic `spotify:album:test` entry preserved under `albums`.

Cleanup:
```javascript
Spicetify.LocalStorage.remove('listening-list-data')
```

- [ ] **Step 4: Commit**

```bash
git add listening-list.js
git commit -m "feat: add data and config storage with schema migration"
```

---

## Task 5: URI helpers

**Files:**
- Modify: `C:\Projects\spicetify-listening-list\listening-list.js` (URI Helpers region)

- [ ] **Step 1: Fill URI Helpers region**

```javascript
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

/** Convert "/album/abc" or "spotify:album:abc" → "spotify:album:abc". Returns null on failure. */
function llNormalizeUri(input) {
  if (!input) return null;
  if (typeof input === 'string' && input.startsWith('spotify:')) return input;
  const m = typeof input === 'string' && input.match(/\/(album|track)\/([A-Za-z0-9]+)/);
  if (m) return `spotify:${m[1]}:${m[2]}`;
  return null;
}
```

- [ ] **Step 2: Manual verify**

Reload Spotify, open DevTools:

```javascript
const ctx = document.querySelector('script + script'); // no-op, just confirm scope
[
  llIsAlbumUri('spotify:album:6dVIqQ8qmQ5GBnJ9shOYGE'),
  llIsAlbumUri('spotify:track:6dVIqQ8qmQ5GBnJ9shOYGE'),
  llIsTrackUri('spotify:track:6dVIqQ8qmQ5GBnJ9shOYGE'),
  llNormalizeUri('/album/abc123'),
]
```

(Helpers are inside an IIFE so they are not on `window`. To verify, temporarily expose `window.__ll = { llIsAlbumUri, llIsTrackUri, llNormalizeUri };` at the bottom of the IIFE; remove that line before commit.)

Expected: `[true, false, true, "spotify:album:abc123"]`.

- [ ] **Step 3: Commit**

```bash
git add listening-list.js
git commit -m "feat: add URI parsing helpers"
```

---

## Task 6: Marking core

**Files:**
- Modify: `C:\Projects\spicetify-listening-list\listening-list.js` (Marking region)

- [ ] **Step 1: Fill Marking region**

```javascript
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
    if (llData.albums[norm]) return false; // dedup guard: do not overwrite
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
 * Batch mark. Returns { marked, skipped }.
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
```

- [ ] **Step 2: Manual verify**

Temporarily expose at bottom of IIFE (remove before commit):
```javascript
window.__ll = { llMarkMany, llUnmarkMany, llIsAlbumListened, llData };
```

Reload Spotify. In console:
```javascript
__ll.llMarkMany(['spotify:album:6dVIqQ8qmQ5GBnJ9shOYGE'], 'manual')
__ll.llIsAlbumListened('spotify:album:6dVIqQ8qmQ5GBnJ9shOYGE')
__ll.llUnmarkMany(['spotify:album:6dVIqQ8qmQ5GBnJ9shOYGE'])
__ll.llIsAlbumListened('spotify:album:6dVIqQ8qmQ5GBnJ9shOYGE')
```
Expected: `{marked:1, skipped:0}`, `true`, `1`, `false`. Remove the `window.__ll` line.

- [ ] **Step 3: Commit**

```bash
git add listening-list.js
git commit -m "feat: add core marking API (mark, unmark, batch)"
```

---

## Task 7: Context-menu integration

**Files:**
- Modify: `C:\Projects\spicetify-listening-list\listening-list.js` (Context Menu region, Main region)

- [ ] **Step 1: Fill Context Menu region**

```javascript
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
```

- [ ] **Step 2: Call registrar from Main**

In the Main region, after the storage init:

```javascript
  llRegisterContextMenu();
```

- [ ] **Step 3: Manual verify**

Reload Spotify. Right-click any track in a playlist. Expected: "Mark as listened" appears. Click it; toast appears. Right-click same track again — "Unmark as listened" appears (and "Mark" does not). Click; toast. Right-click an album in Your Library; "Mark as listened" appears.

Multi-select: hold Shift, click multiple tracks, right-click → "Mark as listened" shows; click; toast reports correct count.

- [ ] **Step 4: Commit**

```bash
git add listening-list.js
git commit -m "feat: add context-menu mark/unmark items"
```

---

## Task 8: Tracklist row badge surface

**Files:**
- Modify: `C:\Projects\spicetify-listening-list\listening-list.js` (Surfaces / Tracklist Rows region, Main region)

- [ ] **Step 1: Inject base CSS into a `<style>` once**

Append to Constants region:

```javascript
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
```

- [ ] **Step 2: Fill Surfaces / Tracklist Rows region**

```javascript
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
  // Force re-check on every mutation pass (cheap because we early-exit on no-op)
  return false;
}
```

- [ ] **Step 3: Wire start in Main**

After `llRegisterContextMenu();`:

```javascript
  llStartTracklistSurface();
```

- [ ] **Step 4: Manual verify**

Reload Spotify. Right-click a track in a playlist → "Mark as listened". Expected: a small green check badge appears at the left edge of that track's row immediately. Navigate to a different playlist and back — badge persists. Right-click → "Unmark" — badge disappears.

Mark an album from Your Library; navigate into that album; expected: all rows in the album view that match this album URI show the badge (only via album-level mark when the row has an album href; track rows in albums typically only have track hrefs so they will not show unless tracks are also marked — this is by design per "independent flags").

- [ ] **Step 5: Commit**

```bash
git add listening-list.js
git commit -m "feat: add tracklist row badge surface"
```

---

## Task 9: Album header badge surface

**Files:**
- Modify: `C:\Projects\spicetify-listening-list\listening-list.js` (Surfaces / Album Header region, Main region)

- [ ] **Step 1: Fill Surfaces / Album Header region**

```javascript
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
  // Target the album title — Spotify uses an h1 in the entityHeader; selector fallback chain:
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
```

- [ ] **Step 2: Wire in Main**

```javascript
  llStartAlbumHeaderSurface();
```

- [ ] **Step 3: Manual verify**

Reload Spotify. Mark an album via right-click in Your Library. Navigate into that album page. Expected: a green check badge appears inline next to the album title; hover tooltip shows "Listened on <date>". Unmark via right-click — badge gone.

- [ ] **Step 4: Commit**

```bash
git add listening-list.js
git commit -m "feat: add album header badge surface"
```

---

## Task 10: Album card / tile badge surface

**Files:**
- Modify: `C:\Projects\spicetify-listening-list\listening-list.js` (Surfaces / Album Cards region, Main region)

- [ ] **Step 1: Fill Surfaces / Album Cards region**

```javascript
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
  // Primary selector: card containers with an album link
  const candidates = document.querySelectorAll('[data-testid="card-click-handler"], [data-encore-id="card"]');
  candidates.forEach(llDecorateAlbumCard);
  // Fallback: any anchor to /album/ inside a card-like wrapper that we missed
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
    // Find image wrapper; fallback to card itself
    const imgWrap = card.querySelector('img')?.parentElement || card;
    if (getComputedStyle(imgWrap).position === 'static') imgWrap.style.position = 'relative';
    const span = document.createElement('span');
    span.innerHTML = llBadgeMarkup(LL_BADGE_CARD_CLASS);
    imgWrap.appendChild(span.firstElementChild);
  } else if (!listened && existing) {
    existing.remove();
  }
}
```

- [ ] **Step 2: Wire in Main**

```javascript
  llStartAlbumCardSurface();
```

- [ ] **Step 3: Manual verify**

Mark a couple of albums. Go to Search → albums tab, or your artist's discography page. Expected: each listened album has a corner badge on its artwork. Unmark; badge disappears on next mutation pass (≤ 200 ms).

- [ ] **Step 4: Commit**

```bash
git add listening-list.js
git commit -m "feat: add album card badge surface"
```

---

## Task 11: Now-playing badge surface

**Files:**
- Modify: `C:\Projects\spicetify-listening-list\listening-list.js` (Surfaces / Now Playing region, Main region)

- [ ] **Step 1: Fill Surfaces / Now Playing region**

```javascript
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
```

- [ ] **Step 2: Wire in Main**

```javascript
  llStartNowPlayingSurface();
```

- [ ] **Step 3: Manual verify**

Play a track. Right-click it in the now-playing bar (or via the queue) → "Mark as listened". Expected: a tiny badge appears next to the track title in the now-playing area. Skip to next track that is not listened; badge disappears. Skip back; badge returns.

- [ ] **Step 4: Commit**

```bash
git add listening-list.js
git commit -m "feat: add now-playing badge surface"
```

---

## Task 12: Profile menu entry + modal shell

**Files:**
- Modify: `C:\Projects\spicetify-listening-list\listening-list.js` (Modal / Shell region, Profile Menu region, Main region)

- [ ] **Step 1: Fill Modal / Shell region**

```javascript
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

// Placeholders — filled by later tasks
function llRenderSettingsTab() {
  const d = document.createElement('div');
  d.textContent = 'Settings (Task 13)';
  return d;
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
```

- [ ] **Step 2: Fill Profile Menu region**

```javascript
function llRegisterProfileMenu() {
  const item = new Spicetify.Menu.Item(
    'Listening List',
    false,
    () => llOpenModal('settings'),
    `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="${LL_CHECK_SVG_PATH}"/></svg>`,
  );
  item.register();
}
```

- [ ] **Step 3: Wire in Main**

```javascript
  llRegisterProfileMenu();
```

- [ ] **Step 4: Manual verify**

Reload Spotify. Click your profile avatar (top right). Expected: "Listening List" entry with check icon. Click it → modal opens with three tabs (Settings / Viewer / Stats), placeholders visible. Click each tab — switching works.

- [ ] **Step 5: Commit**

```bash
git add listening-list.js
git commit -m "feat: add profile menu entry and modal shell"
```

---

## Task 13: Settings tab

**Files:**
- Modify: `C:\Projects\spicetify-listening-list\listening-list.js` (Modal / Settings Tab region — replaces placeholder)

- [ ] **Step 1: Replace `llRenderSettingsTab` with the real implementation**

```javascript
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
```

- [ ] **Step 2: Add stubs so the file still parses before later tasks**

In Auto-Seed region (placeholder until Task 14):
```javascript
async function llRunAutoSeed() { throw new Error('Auto-seed not yet implemented (Task 14)'); }
```
In Auto-On-Play region (placeholder until Task 15):
```javascript
function llRestartAutoOnPlay() { /* implemented in Task 15 */ }
```
In Import/Export region (placeholder until Task 16):
```javascript
function llExportData() { Spicetify.showNotification?.('Export not yet implemented (Task 16)'); }
function llPromptImportData() { Spicetify.showNotification?.('Import not yet implemented (Task 16)'); }
```

- [ ] **Step 3: Manual verify**

Reload Spotify, open profile menu → Listening List → Settings. Toggle each surface — corresponding badges appear/disappear in real Spotify UI without reloading. Change badge style to "dot" — existing badges re-render as dots. Adjust slider — value text updates. Click Seed Now → toast says "not yet implemented". Click Clear all → confirm → all listened data wiped (badges disappear).

- [ ] **Step 4: Commit**

```bash
git add listening-list.js
git commit -m "feat: implement settings tab with live surface and style toggles"
```

---

## Task 14: Auto-seed from playlists

**Files:**
- Modify: `C:\Projects\spicetify-listening-list\listening-list.js` (Auto-Seed region, Main region)

- [ ] **Step 1: Replace the `llRunAutoSeed` stub**

```javascript
async function llRunAutoSeed() {
  const rootlist = Spicetify.Platform?.RootlistAPI;
  const plAPI = Spicetify.Platform?.PlaylistAPI;
  if (!rootlist || !plAPI) {
    Spicetify.showNotification?.('Playlist API unavailable on this Spotify version');
    throw new Error('Platform.RootlistAPI or PlaylistAPI missing');
  }
  const root = await rootlist.getContents();
  const playlistUris = llCollectPlaylistUris(root);
  const albumCounts = new Map(); // albumUri -> count
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
```

- [ ] **Step 2: Optionally trigger first-run auto-seed**

In Main, after surface starts:

```javascript
  if (llConfig.autoSeed.enabled && !llConfig.autoSeed.lastSeededAt) {
    llRunAutoSeed()
      .then((s) => Spicetify.showNotification?.(`Listening List: seeded ${s.markedAlbums} albums`))
      .catch((e) => console.warn('[Listening List] First-run auto-seed failed', e));
  }
```

- [ ] **Step 3: Manual verify**

Open Settings → Auto-seed. Set Min tracks per album = 3. Click "Seed now". Expected: toast reports "Seeded N albums from M playlists" with N matching your manual count of albums with ≥ 3 tracks across all playlists. Navigate to one of those albums — header badge present. Navigate to an album below the threshold — no badge.

Failure path: in console, temporarily delete `Spicetify.Platform.PlaylistAPI` (`delete Spicetify.Platform.PlaylistAPI`), click Seed Now — toast says "Playlist API unavailable on this Spotify version". Reload to restore.

- [ ] **Step 4: Commit**

```bash
git add listening-list.js
git commit -m "feat: implement auto-seed from playlists"
```

---

## Task 15: Auto-on-play threshold listener

**Files:**
- Modify: `C:\Projects\spicetify-listening-list\listening-list.js` (Auto-On-Play region, Main region)

- [ ] **Step 1: Replace `llRestartAutoOnPlay` stub**

```javascript
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
```

- [ ] **Step 2: Wire in Main**

```javascript
  llStartAutoOnPlay();
```

- [ ] **Step 3: Manual verify**

Open Settings → Auto-mark on play → Enable; set threshold to 20%. Close modal. Play any unmarked track and scrub past 20% of the track length. Expected: track is silently marked (verify by reopening Viewer or by inspecting `Spicetify.LocalStorage.get('listening-list-data')`). Skip back to 10%; do not re-fire. Skip to next song; threshold resets for that song.

Edge: replay the same track from the start; do NOT overwrite the existing record (`listenedAt` preserved) — confirm via `JSON.parse(Spicetify.LocalStorage.get('listening-list-data')).tracks[uri].listenedAt`.

- [ ] **Step 4: Commit**

```bash
git add listening-list.js
git commit -m "feat: implement auto-on-play threshold marking"
```

---

## Task 16: Import / export JSON

**Files:**
- Modify: `C:\Projects\spicetify-listening-list\listening-list.js` (Import / Export region)

- [ ] **Step 1: Replace export/import stubs**

```javascript
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
  const incoming = payload.data || payload; // accept bare data export too
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
```

- [ ] **Step 2: Manual verify**

Mark some items. Settings → Data → Export JSON. File downloads (`listening-list-export-YYYYMMDD.json`); open it — contains your data. Click Clear all → confirm. Settings → Data → Import JSON; paste the JSON or choose the file → Import. Toast reports the counts. Badges return.

Edge: paste `{}` → toast "Import failed". Paste a payload with `exportSchemaVersion: 999` → toast "Import failed", console shows the version error.

- [ ] **Step 3: Commit**

```bash
git add listening-list.js
git commit -m "feat: implement JSON export and import"
```

---

## Task 17: Viewer tab

**Files:**
- Modify: `C:\Projects\spicetify-listening-list\listening-list.js` (Modal / Viewer Tab region — replaces placeholder)

- [ ] **Step 1: Replace `llRenderViewerTab`**

```javascript
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
  filter.placeholder = 'Filter by URI';
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
  let entries = Object.entries(source).filter(([uri]) => !f || uri.toLowerCase().includes(f));
  entries.sort((a, b) => {
    const aKey = llViewerState.sortKey === 'uri' ? a[0] : a[1].listenedAt;
    const bKey = llViewerState.sortKey === 'uri' ? b[0] : b[1].listenedAt;
    const cmp = aKey > bKey ? 1 : aKey < bKey ? -1 : 0;
    return llViewerState.sortDir === 'asc' ? cmp : -cmp;
  });

  const wrap = document.createElement('div');
  wrap.style.maxHeight = '50vh';
  wrap.style.overflowY = 'auto';

  if (entries.length === 0) {
    wrap.innerHTML = '<p style="opacity:.6">Nothing here yet.</p>';
    return wrap;
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>
    <th data-sort="uri">URI</th>
    <th data-sort="listenedAt">Listened</th>
    <th>Source</th>
    <th></th>
  </tr>`;
  thead.querySelectorAll('th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort');
      if (llViewerState.sortKey === key) {
        llViewerState.sortDir = llViewerState.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        llViewerState.sortKey = key;
        llViewerState.sortDir = 'desc';
      }
      // Re-render
      const parent = wrap.parentElement;
      wrap.replaceWith(llRenderViewerTable());
      // ensure parent linkage in case caller depends on it
      void parent;
    });
  });
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  // Simple windowing: render first 500
  const max = 500;
  for (const [uri, rec] of entries.slice(0, max)) {
    const tr = document.createElement('tr');
    const id = uri.split(':').pop();
    const path = llViewerState.kind === 'albums' ? `/album/${id}` : `/track/${id}`;
    tr.innerHTML = `
      <td><a href="${path}" style="color:var(--spice-text)">${uri}</a></td>
      <td>${new Date(rec.listenedAt).toLocaleDateString()}</td>
      <td>${rec.source}</td>
      <td><button class="ll-btn ll-btn--ghost" data-act="unmark">Unmark</button></td>
    `;
    tr.querySelector('a').addEventListener('click', (e) => {
      e.preventDefault();
      Spicetify.Platform?.History?.push(path);
      Spicetify.PopupModal.hide();
    });
    tr.querySelector('button[data-act="unmark"]').addEventListener('click', () => {
      llUnmarkMany([uri]);
      tr.remove();
    });
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);

  if (entries.length > max) {
    const more = document.createElement('p');
    more.style.opacity = '.6';
    more.textContent = `Showing first ${max} of ${entries.length}. Use the filter to narrow.`;
    wrap.appendChild(more);
  }
  return wrap;
}
```

- [ ] **Step 2: Manual verify**

Mark a handful of albums and tracks. Open Listening List → Viewer. Expected: Albums table populated; clicking column headers toggles sort; switching to Tracks shows tracks. Filter narrows the list. Clicking a URI link navigates Spotify to that album/track and closes the modal. Clicking Unmark removes the row immediately and badge disappears in the underlying view.

- [ ] **Step 3: Commit**

```bash
git add listening-list.js
git commit -m "feat: implement viewer tab with sorting, filtering, and navigation"
```

---

## Task 18: Stats tab

**Files:**
- Modify: `C:\Projects\spicetify-listening-list\listening-list.js` (Modal / Stats Tab region — replaces placeholder)

- [ ] **Step 1: Replace `llRenderStatsTab`**

```javascript
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
```

- [ ] **Step 2: Manual verify**

Open Listening List → Stats. Expected: totals reflect current data; last-30 counts match a manual scan; source breakdown sums to total per kind; earliest/latest dates render correctly when data exists and show `—` when empty.

- [ ] **Step 3: Commit**

```bash
git add listening-list.js
git commit -m "feat: implement stats tab"
```

---

## Task 19: Polish, preview screenshot, changelog finalization

**Files:**
- Modify: `C:\Projects\spicetify-listening-list\CHANGELOG.md`
- Modify: `C:\Projects\spicetify-listening-list\README.md` (add screenshots once captured)
- Create: `C:\Projects\spicetify-listening-list\preview.png`

- [ ] **Step 1: Capture preview screenshot**

In Spotify, navigate to a playlist or album view where the badge surfaces are visible (recommended: a playlist where several tracks belong to listened albums + an album page header). Take a screenshot, save as `preview.png` in repo root.

Add screenshots inline in `README.md` after the Features section (`![Badges in tracklist](preview.png)`).

- [ ] **Step 2: Update CHANGELOG to v1.0.0**

Replace the `[Unreleased]` section:

```markdown
## [1.0.0] - YYYY-MM-DD

### Added
- Mark albums and tracks as listened via context menu (manual)
- Inline badge surfaces: tracklist rows, album page header, album cards, now-playing bar (each toggleable)
- Auto-seed listened albums from playlists with configurable minimum-tracks threshold
- Auto-mark tracks on play once a configurable progress threshold is crossed
- Export and import full listening list as versioned JSON
- Viewer tab (sortable, filterable) and Stats tab in a profile-menu modal
- Three badge styles: checkmark, dot, text
- Schema-versioned LocalStorage with forward-compatible migration
- MIT licensed

[1.0.0]: https://github.com/yusufaf/spicetify-listening-list/releases/tag/v1.0.0
```

(Replace `YYYY-MM-DD` with the actual release date.)

- [ ] **Step 3: Tag and commit**

```bash
git add preview.png CHANGELOG.md README.md
git commit -m "docs: add preview screenshot and finalize v1.0.0 changelog"
git tag v1.0.0
```

- [ ] **Step 4: Final manual smoke pass**

End-to-end checklist before pushing:

1. Fresh Spicetify install path: copy `listening-list.js`, run `spicetify config extensions listening-list.js`, `spicetify apply`, reload Spotify
2. DevTools console clean during boot, while navigating between playlists, albums, search, library
3. Right-click on track → Mark / Unmark works; multi-select works; album right-click works
4. Toggle each surface in Settings — badges appear/disappear immediately
5. Change badge style — re-renders
6. Auto-seed — runs and reports a sensible count
7. Auto-on-play — crosses threshold and marks; replay doesn't overwrite
8. Export → Clear all → Import → data restored
9. Viewer sort + filter + navigate works; Stats tab numbers tally
10. Reload Spotify — all state persists, no errors

- [ ] **Step 5: Push (when ready — manual)**

```bash
git push origin main
git push origin v1.0.0
```

(Pushing is intentionally left to the developer per repo convention.)

---

## Risks & Mitigations Recap

| Risk | Mitigation |
|---|---|
| `Platform.PlaylistAPI` / `RootlistAPI` undocumented and varies by Spotify version | All calls wrapped in try/catch; clear "unavailable on this version" notification |
| Album-card `data-testid` selectors may drift | Multi-selector chain + fallback to walking anchors to `/album/...` |
| `onprogress` fires frequently | Single-shot guard (`llAOPCurrentMarked`) prevents repeated work per track |
| Multiple MutationObservers on `document.body` could be expensive | Each observer's decoration pass is idempotent and short-circuits when no matching elements; if performance becomes a problem, scope observers to `main` element |
| User imports older or malformed export | Schema-versioned merge with explicit error toast; never overwrites newer `listenedAt` |

## Spec Coverage Check

| Spec section | Implementing task(s) |
|---|---|
| Architecture / single-file IIFE | 2 |
| Data model (`listening-list-data`) | 3, 4, 6 |
| Config model (`listening-list-config`) | 3, 4, 13 |
| Schema migration | 4 |
| Tracklist row surface | 8 |
| Album header surface | 9 |
| Album card surface | 10 |
| Now-playing surface | 11 |
| Manual context-menu marking | 7 |
| Auto-seed from playlists | 14 |
| Auto-on-play threshold | 15 |
| Import / export JSON | 16 |
| Settings tab | 13 |
| Viewer tab | 17 |
| Stats tab | 18 |
| Profile menu entry / modal | 12 |
| Error handling (try/catch, notifications) | 4, 14, 16 |
| Conventions (LICENSE, README, CHANGELOG, manifest) | 1, 19 |
