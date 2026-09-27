# Live Tests — Listening List

Extension file: `listening-list.js`  
Use skill `spicetify-live-test` for CDP mechanics (reload, eval, screenshot, console).

## Storage keys (`Spicetify.LocalStorage.get(key)` or `localStorage.getItem(key)`)

| Key | Contents |
|-----|----------|
| `listening-list-data` | JSON — the listening list entries (schema-versioned) |
| `listening-list-config` | JSON config object |
| `listening-list-meta` | JSON metadata (e.g. last-seen versions) |

## Smoke test (run after every edit)

1. `node --check listening-list.js` — syntax gate.
2. CDP reload xpui.
3. Console (filter `Listening List`): expect `[Listening List] Booted.`
   - No `[Listening List] Failed to parse data` or `Failed to parse config` errors.
4. Screenshot: verify Listening List button/icon visible in Spotify UI.

```js
// Eval to verify storage readable
JSON.parse(Spicetify.LocalStorage.get('listening-list-data') || 'null')   // → object or null
JSON.parse(Spicetify.LocalStorage.get('listening-list-config') || 'null') // → object or null
JSON.parse(Spicetify.LocalStorage.get('listening-list-meta') || 'null')   // → object or null
```

## T1: Data schema loads without error

- Eval: `JSON.parse(Spicetify.LocalStorage.get('listening-list-data') || '{"items":[]}').items.length`
- Assert: returns a number (no parse error = schema valid).

## T2: Config defaults survive missing key

- `Spicetify.LocalStorage.remove('listening-list-config')` then reload.
- Assert: `[Listening List] Booted.` in console; no parse-error logs.
- Eval: `Spicetify.LocalStorage.get('listening-list-config')` → non-null (defaults written back).

## T3: Newer schema version is refused gracefully

- Eval: read current data, increment its schema version, write it back:
  ```js
  (() => {
    const d = JSON.parse(Spicetify.LocalStorage.get('listening-list-data') || '{"schemaVersion":1,"items":[]}');
    d.schemaVersion = 999;
    Spicetify.LocalStorage.set('listening-list-data', JSON.stringify(d));
  })()
  ```
- CDP reload.
- Console: expect `[Listening List] Data schema v999 newer than supported` warning.
- Restore original data after.

## T4: Listening List UI reachable

- Screenshot after boot: the Listening List panel/button must be visible.
- Click the button (via CDP `click` or eval `.click()`).
- Screenshot: panel opens; no JS errors in console.

## T5: Already-active guard

- Trigger `listening-list.js` load twice (eval the IIFE body manually, or inject a second script tag).
- Console: expect `[Listening List] Already active; skipping double-load.`

## T6: Hot-reload sanity

- Add `console.log('[Listening List] HOT-RELOAD-MARKER')` near the boot log line.
- CDP reload; console filter `HOT-RELOAD-MARKER`: must appear.
- Revert.

## T7: Data migrates v1 → v2 (want-to-listen)

- Eval: write v1 data, then reload:
  ```js
  Spicetify.LocalStorage.set('listening-list-data', JSON.stringify({ schemaVersion: 1, albums: { 'spotify:album:4LH4d3cOWNNsVw41Gqt2kv': { listenedAt: 1700000000000, source: 'manual' } }, tracks: {} }))
  ```
- Right-click any other album → "Want to listen" (forces a save).
- Eval: `JSON.parse(Spicetify.LocalStorage.get('listening-list-data'))` → `schemaVersion: 2`, original album intact, `wanted` has the new URI with `addedAt` + `source: 'manual'`.

## T8: Want badge on all surfaces, flips to listened

- With an album in `wanted`, open its page: header badge has class `ll-badge--wanted` and title `Want to listen · added <date>`; tracklist rows carry `ll-badge--tracklist ll-badge--wanted`, `row.dataset.llStatus === 'w'`.
- Search that album → its card badge is `ll-badge--card ll-badge--wanted` (bookmark); a listened album's card is the check.
- Play a track from it → now-playing badge is `ll-badge--nowplaying ll-badge--wanted`.
- Album "..." menu shows `Mark as listened` and `Remove from want-to-listen`, not `Want to listen`.
- Click `Mark as listened`: without reload, header/rows/cards swap to the check variant, exactly one header badge, `wanted` is `{}`.

## T9: Album completion via auto-on-play

- Config: `autoOnPlay.enabled = true`, `percentThreshold = 1`, `autoSeed.minTracksPerAlbum = 1`; data: one album in `wanted`. Reload.
- `Spicetify.Player.playUri('<that album uri>')`, then `Spicetify.Player.seek(0.5)`, wait ~3 s.
- Assert: the track is in `tracks` (`auto-play`), the album moved to `albums` with `source: 'auto-play'`, `wanted` is `{}`, notification shown, no `[Listening List] Album completion check failed` warning.

## T10: Viewer "Want to listen" tab

- Profile menu → Listening List → Viewer → "Want to listen".
- Assert: columns `Album / Artist / Added ▼ / Source`, names load, empty state reads `Nothing on your list yet…` when empty.
- Row check button → row removed, album in `albums`; row trash button → row removed, album gone from `wanted`.
- Switch to Albums sub-tab: date column reads `Listened` and stays the active sort.

## T11: Badges cost no layout

Badges must never move the page. Two Spotify containers make this easy to get
wrong: the album title heading is a `-webkit-box` with `-webkit-line-clamp`
(every child becomes its own row), and the now-playing title wraps its text
several levels deep (appending to the wrapper puts the badge on its own line).

For each of a short, a two-line and a three-line album title, with the album
marked (wanted or listened), eval on the album page:

```js
(() => {
  const y = (s) => {
    const e = document.querySelector(s);
    if (!e) throw new Error('probe found nothing for ' + s);   // a missing node must fail, not read as 0
    return e.getBoundingClientRect().y;
  };
  const probe = () => [
    y('.main-entityHeader-metaData'),
    y('.main-actionBar-ActionBar'),
    y('.main-trackList-trackListRow, [data-testid="tracklist-row"]'),
  ];
  const before = probe();
  document.querySelectorAll('.ll-badge--header, .ll-badge--tracklist').forEach((e) => e.remove());
  const after = probe();
  return before.map((v, i) => v - after[i]);   // must be [0, 0, 0]
})()
```

- Assert: `[0, 0, 0]` for every title length, and the header badge's parent is
  `.main-entityHeader-metaData` (not the heading). A throw means the selectors
  went stale — fix them, a null reading would score a silent pass.
- Now-playing: with the playing track's album marked, the badge's parent must be
  the element holding the track name (an `<a>`, not `.main-trackInfo-name`), and
  removing it must not change `.main-trackInfo-name`'s height. It must also sit
  *before* the text and inside `.main-trackInfo-overlay`'s box — that overlay
  clips horizontally, so a badge after the title vanishes on long track names.
- The metadata line must read `<badge> Artist • Year • N songs` — no stray `•`
  between the badge and the artist.
