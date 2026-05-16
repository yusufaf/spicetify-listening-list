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
