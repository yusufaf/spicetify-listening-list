# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0](https://github.com/yusufaf/spicetify-listening-list/compare/v1.0.0...v1.1.0) (2026-09-22)


### Features

* add want-to-listen list for albums ([bf52931](https://github.com/yusufaf/spicetify-listening-list/commit/bf52931f00e06bba4cf3617a18700251814475b3))
* add want-to-listen list for albums ([9404d4f](https://github.com/yusufaf/spicetify-listening-list/commit/9404d4f591206124aa02744a6f8f9a63f5c1b0b5))


### Bug Fixes

* album header badge deleted itself on first observer tick ([#2](https://github.com/yusufaf/spicetify-listening-list/issues/2)) ([8eba762](https://github.com/yusufaf/spicetify-listening-list/commit/8eba762f1fb15bc76f710617dd80d1e1bfdba6c0))
* harden album completion fetch and clear-all prompt ([bb94d4d](https://github.com/yusufaf/spicetify-listening-list/commit/bb94d4d8f38a91ef414a8dfd02edb1c418ac193d))

## [1.0.0] - 2026-05-16

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
