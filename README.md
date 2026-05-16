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
