# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0](https://github.com/yusufaf/spicetify-listening-list/compare/v1.0.0...v1.1.0) (2026-06-07)


### Features

* add album card badge surface ([63216fb](https://github.com/yusufaf/spicetify-listening-list/commit/63216fb23131908c609c550da799e57d262748f3))
* add album header badge surface ([f94cb80](https://github.com/yusufaf/spicetify-listening-list/commit/f94cb80f1ebe08507a2da1bf299df6a56e5dba64))
* add constants, defaults, and state primitives ([e836e55](https://github.com/yusufaf/spicetify-listening-list/commit/e836e55f2b0390674135eb61bd50678c1f8f63fc))
* add context-menu mark/unmark items ([35f28b3](https://github.com/yusufaf/spicetify-listening-list/commit/35f28b3ad68a7245f603087d90d03551264e433b))
* add core marking API (mark, unmark, batch) ([ecc60da](https://github.com/yusufaf/spicetify-listening-list/commit/ecc60da86f039551ea96426d1a41779e105a613f))
* add data and config storage with schema migration ([2817007](https://github.com/yusufaf/spicetify-listening-list/commit/2817007f5569f1fc3770ae599a962bccb1a057c5))
* add extension entry skeleton with region markers ([2ca5ff9](https://github.com/yusufaf/spicetify-listening-list/commit/2ca5ff9cd827533b28d293d6b7ad127f249db24c))
* add now-playing badge surface ([74cca5d](https://github.com/yusufaf/spicetify-listening-list/commit/74cca5d0f96f31ce19bf0745cbb8846723dc48ff))
* add profile menu entry and modal shell ([a429107](https://github.com/yusufaf/spicetify-listening-list/commit/a4291075e4b89b8f8d6cc84b076d15e51df808d4))
* add tracklist row badge surface ([1c65797](https://github.com/yusufaf/spicetify-listening-list/commit/1c657977045dec95efbe82880d5aba2eb5f2db1e))
* add URI parsing helpers ([bfa58f2](https://github.com/yusufaf/spicetify-listening-list/commit/bfa58f2f3ded299582d82dae363652e1751cd15e))
* clickable artist link, sort arrows, refetch on reopen, defensive stopPropagation ([329c755](https://github.com/yusufaf/spicetify-listening-list/commit/329c755ae6077b173f8bf28070899239aa5ccf43))
* implement auto-on-play threshold marking ([24f3860](https://github.com/yusufaf/spicetify-listening-list/commit/24f386065bd8d43085b8178afea2548943cf5433))
* implement auto-seed from playlists ([b58e63a](https://github.com/yusufaf/spicetify-listening-list/commit/b58e63a76be2fb8d832971a3dc003f2222e40f58))
* implement JSON export and import ([d8448a8](https://github.com/yusufaf/spicetify-listening-list/commit/d8448a8881047914380f249967fa6c7529e96267))
* implement settings tab with live surface and style toggles ([5acc84e](https://github.com/yusufaf/spicetify-listening-list/commit/5acc84e33a4518ebc0d30c0340742bc7777da0da))
* implement stats tab ([2a74719](https://github.com/yusufaf/spicetify-listening-list/commit/2a74719bdc539053231cfa8f0f8051e64bb81d34))
* implement viewer tab with sorting, filtering, and navigation ([29f7eed](https://github.com/yusufaf/spicetify-listening-list/commit/29f7eed61d506eaf588ca3f32e9a6d961e0d8660))
* show album/track names + artist in viewer with lazy metadata fetch ([e39395f](https://github.com/yusufaf/spicetify-listening-list/commit/e39395f734919e3d0382dc27d2d189ed47b5ad4e))
* underline-on-hover for viewer table links ([3cfe7b0](https://github.com/yusufaf/spicetify-listening-list/commit/3cfe7b0607e4b8640e0375a7731f87f4391446c5))


### Bug Fixes

* card badge uses zero-size wrapper to avoid altering cover art layout ([4d2b94e](https://github.com/yusufaf/spicetify-listening-list/commit/4d2b94eadd659f8b8385261f1f8718cc22c04250))
* drop icon args and broaden boot wait for ContextMenu/Menu APIs ([eba0c39](https://github.com/yusufaf/spicetify-listening-list/commit/eba0c39f80d114cdd77feefc9f4fd7051d2c6a3e))
* drop inline styles on artist link so hover underline applies ([7199de1](https://github.com/yusufaf/spicetify-listening-list/commit/7199de10aec45155a41fa929456de65c468a8eb3))
* pass icon names instead of SVG markup to Menu/ContextMenu items ([72871db](https://github.com/yusufaf/spicetify-listening-list/commit/72871dbda5c4f866b8a8490fd0c0e35386c72be8))
* patch viewer rows in place as metadata arrives + show loading spinner ([f05c236](https://github.com/yusufaf/spicetify-listening-list/commit/f05c23678caa8aa928710c6133f1b0ecf8f2a164))
* swap modal tab content in place instead of hide+display cycle ([4328116](https://github.com/yusufaf/spicetify-listening-list/commit/432811614077f568a2e309b3e2cfa584d376e78d))
* tracklist badge inline with title; now-playing uses main-trackInfo-name selector ([6e9d141](https://github.com/yusufaf/spicetify-listening-list/commit/6e9d141ec639fd88f1892971568a3cebe01155d4))
* tracklist rows badge when ambient album marked; broader header/nowplaying lookup with text-size heuristic ([c7d01fd](https://github.com/yusufaf/spicetify-listening-list/commit/c7d01fde817c64272aa2eb67d93179e5fca8f1aa))
* update selectors for current Spotify build (trackList class, entityHeader title) ([7956c21](https://github.com/yusufaf/spicetify-listening-list/commit/7956c21808f4444bc66c206c6a14c3d8e7bd1f0d))
* use internal Cosmos/GraphQL endpoints for metadata (avoid public API rate limits) ([b110d52](https://github.com/yusufaf/spicetify-listening-list/commit/b110d52e2e46d1d768b0aac7cba7eea077fc1bbd))
* viewer-first tabs, top status bar, header nowrap, drop pre-artistUri cache entries ([a9ce34f](https://github.com/yusufaf/spicetify-listening-list/commit/a9ce34f54bd8666039306169a96a3d135d3a29f7))
* wait for React, ReactJSX, ReactComponent.MenuItem before registering menu items ([57eabbc](https://github.com/yusufaf/spicetify-listening-list/commit/57eabbca33a65506b9612fe5f2de50900c3eadc2))


### Reverts

* aggressive DOM walk that crashed the main view ([c06e663](https://github.com/yusufaf/spicetify-listening-list/commit/c06e663e5d891db2c1160dc0bb8891432dd8237f))

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
