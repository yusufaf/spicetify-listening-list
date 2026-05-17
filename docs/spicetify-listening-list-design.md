# Spicetify Listening List — Design Spec

**Date:** 2026-05-15
**Author:** yusufaf
**Status:** Approved (pending implementation plan)

## Context

No existing Spicetify extension lets users mark albums and tracks as "listened" with an inline indicator in Spotify. The closest match — `trackspot` — is album-only and requires a self-hosted backend. Adjacent extensions (star ratings, Last.fm-loved, play-count columns, scrobblers) cover different primitives.

Goal: a zero-backend, local-storage extension that lets the user manually flag albums/tracks as listened, optionally auto-mark from playlists or playback, and surface a small indicator across Spotify's tracklists, album pages, album cards, and now-playing bar — similar in spirit to a Letterboxd "watched" badge for music.

## Non-goals

- Ratings, notes, scores (already covered by `brimell/spicetify-star-ratings`)
- Aggregate listening stats / minutes / top artists (covered by Stats extensions)
- Cloud sync, multi-device, backend service
- Last.fm or external scrobbler integration

## Architecture

Single-file extension following the user's existing template (`spicetify-album-length`, `spicetify-rym`, `spicetify-enhanced-pins`):

- One output file: `listening-list.js` (vanilla JS, no build, JSDoc + `#region` organization)
- `manifest.json` for marketplace metadata
- `Spicetify.LocalStorage` for persistence
- Profile-menu entry (`Spicetify.Menu.Item`) opens a tabbed modal (Settings | Viewer | Stats)
- Context-menu items (`Spicetify.ContextMenu.Item`) for "Mark as listened" / "Unmark"
- Per-surface `MutationObserver` modules for inline badges

Internal module layout (within the single IIFE):

| Region | Responsibility |
|---|---|
| Constants | Storage keys, schema versions, default config, badge SVG, CSS class names |
| Storage | Load/save/migrate `data` and `config`; in-memory index for O(1) lookup |
| URI Helpers | `Spicetify.URI` wrappers for album/track detection, normalization |
| Marking | Public `markAlbum/markTrack/unmark…` API; emits internal events for refresh |
| Surfaces | One submodule per surface: `tracklistRows`, `albumHeader`, `albumCards`, `nowPlaying` — each owns its observer and gating |
| Auto-Seed | One-shot + on-demand scan of rootlist → playlists → albums; respects `minTracksPerAlbum` |
| Auto-On-Play | `Player` event listener; threshold-based mark |
| Import/Export | JSON serialize/deserialize with schema validation |
| UI / Modal | Tabbed modal (Settings, Viewer, Stats); pure DOM, themed with `--spice-*` vars |
| Main | Boot sequence, double-write guard, context-menu registration |

## Data Model

Two namespaced `Spicetify.LocalStorage` keys.

### `listening-list-data`

```js
{
  schemaVersion: 1,
  albums: {
    "spotify:album:<id>": {
      listenedAt: 1715817600000,       // ms epoch
      source: "manual" | "auto-playlist" | "auto-play" | "import"
    }
  },
  tracks: {
    "spotify:track:<id>": {
      listenedAt: 1715817600000,
      source: "manual" | "auto-playlist" | "auto-play" | "import"
    }
  }
}
```

Album and track flags are **independent**. UI may derive an "all tracks listened" state per album, but it does not write to the album record.

### `listening-list-config`

```js
{
  schemaVersion: 1,
  surfaces: {
    tracklistRows: true,
    albumHeader: true,
    albumCards: true,
    nowPlaying: true
  },
  badgeStyle: "checkmark",            // "checkmark" | "dot" | "text"
  autoSeed: {
    enabled: false,
    minTracksPerAlbum: 3,
    lastSeededAt: null                // ms epoch or null
  },
  autoOnPlay: {
    enabled: false,
    percentThreshold: 70              // 0..100
  }
}
```

A `schemaVersion` migration ladder lives in the Storage region; default config merges fill in new fields on upgrade (same pattern as `spicetify-rym`).

## Marking Surfaces

Each surface is independently toggleable. Implementation pattern is shared:

1. Read its enabled flag from config; if false, do nothing
2. Subscribe to `Spicetify.Platform.History` to redecorate on navigation
3. Set up a `MutationObserver` scoped to the relevant container
4. For each matching element, read its URI, look up status, inject/update/remove badge

### Tracklist rows

- Selector: `[data-testid="tracklist-row"]`
- URI extraction: nearest anchor with `href="/track/..."`/`/album/...`
- Badge placement: leading-edge of row, before track number; absolute-positioned overlay so layout doesn't shift
- Reference: `spicetify-album-length` already decorates these rows

### Album / artist page header

- Selector: header region containing album title (route-aware via `History.listen`)
- Badge placement: inline next to title with "Listened {date}" tooltip
- Larger style than tracklist badge

### Album cards / tiles

- Selector: `[data-testid="card-click-handler"]` whose link starts with `/album/`
- Badge placement: corner overlay on artwork
- Likely needs fallback selectors; if `data-testid` is missing on a Spotify build, walk descendant anchors

### Now-playing bar

- Source: `Spicetify.Player.data.item.uri` + `.album?.uri`
- Subscribe to `songchange`
- Badge placement: tiny icon next to track title in the left-of-player region

## Marking Flows

### Manual (context menu)

- Register two `Spicetify.ContextMenu.Item`s: "Mark as listened" and "Unmark as listened"
- `shouldAdd(uris)`: show "Mark" only if at least one URI is not currently listened, "Unmark" only if at least one is
- Supports multi-select; iterates `uris[]`, classifies via `Spicetify.URI.fromString().type`, writes batch update, fires single refresh
- `Spicetify.showNotification("Marked N items as listened")`

### Auto-seed from playlists

- Triggered from settings ("Seed from playlists now") or first run if `autoSeed.enabled && !lastSeededAt`
- Steps:
  1. `Spicetify.Platform.RootlistAPI.getContents()` → iterate playlist URIs
  2. For each playlist, `PlatformPlaylistAPI.getContents(uri)` → group tracks by `album.uri`
  3. For each album with `count >= minTracksPerAlbum`, mark album with `source: "auto-playlist"` (skip if already listened)
  4. Write `lastSeededAt`, notify user with summary count
- Wrapped in try/catch; on failure, surface a clear "Playlist API unavailable on this Spotify version" notification

### Auto-on-play threshold

- Subscribe to `Spicetify.Player.addEventListener("onprogress", ...)`
- When current track's progress / duration ≥ `percentThreshold / 100` AND not already listened, mark with `source: "auto-play"`, then deactivate watch for that URI until next `songchange`
- Dedup guard: never overwrite an existing listened record on auto-mark

### Import / export

- Export: serialize full `data` object to JSON, trigger download via blob URL (`listening-list-export-YYYYMMDD.json`)
- Import: textarea paste + file picker; validate `schemaVersion`; merge strategy = union by URI, keep earliest `listenedAt` per URI; report counts

## Settings / Viewer / Stats Modal

One modal opened from profile-menu entry, three tabs.

### Settings tab

- Surface toggles (4 switches)
- Badge style radio (`checkmark` / `dot` / `text`)
- Auto-seed: enabled toggle, `minTracksPerAlbum` number, "Seed now" button, last-seeded timestamp
- Auto-on-play: enabled toggle, threshold slider 0–100%
- Data: Export JSON, Import JSON, Clear all (with confirm)

### Viewer tab

- Two sub-tabs: Albums / Tracks
- Sortable table: title, artist (if cheaply available — fall back to URI), source, listenedAt
- Click row → `Spicetify.Platform.History.push("/album/<id>")`
- Search filter input
- Pagination or simple windowed render if list grows large (>500 rows)

### Stats tab

- Total albums listened
- Total tracks listened
- This month (rolling 30-day) count for each
- Breakdown by source (manual / auto-playlist / auto-play / import)
- Earliest and latest `listenedAt`

## Error Handling

- All Platform API calls wrapped in try/catch with a user-visible toast on failure
- Storage parse failures fall back to defaults but log the raw value to console for recovery
- Schema migration is one-way (vN → vN+1); if version is newer than supported, refuse to write and notify
- Double-load guard: `window.__listeningListActive` flag prevents observer duplication

## Project Conventions (matching existing repos)

- License: MIT (update `package.json` from current `ISC`)
- README structure: Intro + preview → Features → How It Works → Installation → Usage → Settings → Troubleshooting → License
- `CHANGELOG.md` in Keep-a-Changelog format with SemVer
- `CONTRIBUTING.md` and `LICENSE`
- Manifest fields: `name`, `description`, `preview` (PNG), `main: "listening-list.js"`, `readme`, `authors`, `tags: ["listening", "tracker", "albums", "library"]`
- Git tags: `v1.0.0`, `v1.0.1`, …
- Commits already enforced via existing commitlint + husky setup
- No build step; `listening-list.js` is the deliverable

## Critical Files (to create)

- `C:\Projects\spicetify-listening-list\listening-list.js` — extension entry
- `C:\Projects\spicetify-listening-list\manifest.json`
- `C:\Projects\spicetify-listening-list\README.md`
- `C:\Projects\spicetify-listening-list\CHANGELOG.md`
- `C:\Projects\spicetify-listening-list\LICENSE` (MIT)
- `C:\Projects\spicetify-listening-list\CONTRIBUTING.md`
- `C:\Projects\spicetify-listening-list\preview.png` (placeholder until UI exists)
- Update `package.json` license `ISC` → `MIT`

## Verification

End-to-end checks after each build stage:

1. **Install locally:** copy `listening-list.js` to `%APPDATA%\spicetify\Extensions\` and `spicetify config extensions listening-list.js && spicetify apply`
2. **Storage round-trip:** mark a track → reload Spotify → badge persists
3. **Context menu:** right-click track/album, both URIs supported, multi-select works
4. **Surfaces:** toggle each in settings → badges appear/disappear without reload
5. **Auto-seed:** run on a known playlist set, verify album count matches manual count of albums with ≥ N tracks
6. **Auto-on-play:** scrub to past threshold → mark; verify no double-mark on replay
7. **Import/export:** export, clear, import same file → state matches
8. **Schema migration:** synthetic v0 blob in LocalStorage → loads cleanly, writes back as v1
9. **DevTools console clean:** no errors during boot or normal navigation
10. **Manifest:** load via Spicetify Marketplace dev-mode and verify metadata renders

## Open Risks

- `Platform.PlaylistAPI` / `RootlistAPI` are undocumented; behavior may vary across Spotify versions — defensive try/catch + clear failure UX
- Album-card `data-testid` selectors may drift across Spotify releases — fallback to anchor walking
- Auto-on-play `onprogress` event fires frequently; debounce/throttle the threshold check
- Large libraries (10k+ tracks): viewer needs windowed rendering, in-memory index keyed by URI prefix-stripped id for fast lookups during MutationObserver passes
