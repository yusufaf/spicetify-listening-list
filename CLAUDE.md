# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file Spicetify extension (`listening-list.js`, ~1450 lines, no build step) that tracks which albums and tracks you've listened to and shows an inline badge across four Spotify surfaces. Everything ships as one IIFE: storage, marking, surface injectors, import/export, settings modal, and context menus.

## Commands

```bash
pnpm test          # node --check listening-list.js — syntax gate, the only automated test
pnpm install       # installs husky hooks via `prepare`
```

Husky runs `pnpm test` on pre-commit and `commitlint` (config-conventional) on commit-msg. Commit messages **must** be Conventional Commits — release-please parses them to cut releases.

### Testing changes in the real client

There is no unit test suite. Verification is manual against a running Spotify:

1. Copy `listening-list.js` to `%APPDATA%\spicetify\Extensions\` (Windows) or `~/.config/spicetify/Extensions/`.
2. `spicetify apply` — Spotify restarts.
3. DevTools (`Ctrl+Shift+J`), filter console for `[Listening List]`. Expect `[Listening List] Booted.`

`tests.live.md` holds the live smoke test and case list. Use the `spicetify-live-test` skill for CDP mechanics (reload xpui, eval against `Spicetify.*`, read console, screenshot) instead of asking the user to click through manually.

## Architecture

Read the `//#region` markers — they are the file's table of contents (Type Definitions, Constants, State, Storage, URI Helpers, Marking, Surfaces ×4, Auto-Seed, Auto-On-Play, Import/Export, Modal, Context Menu, Profile Menu, Main).

**Everything is keyed by full Spotify URI.** `llNormalizeUri()` accepts either a `spotify:album:…` URI or an href path and returns the canonical URI form; every read and write goes through it. Never key state off an id fragment or a DOM path — rows get recycled, URIs don't.

**One event bus, four independent surfaces.** `llEmit()` notifies every subscriber in `llListeners` after any data mutation; each surface (tracklist rows, album header, album cards, now playing) subscribes and re-renders itself. Surfaces are independently toggleable via `config.surfaces`. Adding a surface means: an injector, a subscription, a config flag, and a badge class — don't reach across surfaces.

**Forward-incompatible data is loaded read-only, never clobbered.** `llMigrateData()` compares the stored `schemaVersion` against `LL_DATA_SCHEMA_VERSION`. If the stored data is *newer* (user ran a later version, then downgraded), it returns `{ ...empty, schemaVersion: v, __readOnly: true }` and `llMarkOne` refuses to write, notifying the user. This protects a user's listening history from being silently truncated by an older build. Any new write path must check `llData.__readOnly` first.

**Parse failures degrade, they don't throw.** Both `llLoadData` and `llLoadConfig` catch, log the raw string, and fall back to empty/defaults. A corrupt localStorage value must not prevent the extension from booting.

**Config is deep-cloned from a frozen default.** `LL_DEFAULT_CONFIG` is `Object.freeze`d and every load does `JSON.parse(JSON.stringify(...))`. Nested objects (`surfaces`, `autoSeed`, `autoOnPlay`) mean a shallow spread would alias shared state across resets — don't "simplify" it to `{ ...LL_DEFAULT_CONFIG }`.

**Auto-seed walks the user's whole library.** `llRunAutoSeed()` recurses the Rootlist tree (`llCollectPlaylistUris` handles the `items`/`rows`/`children` shape variance), fetches each playlist's contents, counts tracks per album, and marks albums meeting `minTracksPerAlbum`. It's off by default and slow by nature — it's an explicit user action, not something to run on boot. Album URIs are read from three possible shapes (`album.uri`, `albumOfTrack.uri`, `item.album.uri`) because the Platform API's row shape varies by surface and Spotify version.

**Auto-on-play marks once per song.** `llAOPCurrentMarked` latches on cross of `percentThreshold` and resets on `songchange`; without the latch the progress handler would re-mark on every tick.

### Storage keys

| Key | Contents |
|-----|----------|
| `listening-list-data` | JSON `ListenedData` — schema-versioned, albums + tracks keyed by URI |
| `listening-list-config` | JSON `ListenedConfig` — surfaces, badge style, auto-seed, auto-on-play |
| `listening-list-meta` | JSON name/artist cache by URI, for the viewer and export |

`llMetaInflight` dedupes concurrent metadata fetches for the same URI.

## Conventions

- All globals and functions are `ll`-prefixed; there is no module scope to protect them.
- JSDoc typedefs at the top of the file drive editor tooling — there's no TypeScript. Update them when shapes change.
- Console output is prefixed `[Listening List]`. `console.warn` for recoverable degradation (a playlist that wouldn't read, forward-incompatible schema); `console.error` for failures that lost data or state (parse/save failures, listener exceptions).
- Styles are injected `<style>` tags (`LL_BASE_CSS` under `ll-main-styles`, `LL_MODAL_CSS` for the modal). Theme colors come from `--spice-*` CSS vars, so changes must be checked against both light and dark themes.
- Bumping either `LL_DATA_SCHEMA_VERSION` or `LL_CONFIG_SCHEMA_VERSION` requires a matching migration branch in `llMigrateData` / `llMigrateConfig`.
- Version is owned by release-please (`release-please-config.json`) — don't bump `package.json` by hand.
- `manifest.json` is the Spicetify Marketplace descriptor; `preview` must point at a file that actually exists in the repo.
