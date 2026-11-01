// NAME: Listening List
// AUTHOR: yusufaf
// DESCRIPTION: Mark albums and tracks as listened, with inline indicators across Spotify.
//
// Listening List moved to https://github.com/yusufaf/spicetify-extensions/tree/main/extensions/listening-list
// This file only loads it from there, so installs from this repository keep updating.
// Install it from the new location to stop depending on this redirect.

(function () {
  if (window.__listeningListActive) return;
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/gh/yusufaf/spicetify-extensions@main/extensions/listening-list/listening-list.js';
  script.onerror = () => console.error('[Listening List] Could not load the extension from https://cdn.jsdelivr.net/gh/yusufaf/spicetify-extensions@main/extensions/listening-list/listening-list.js');
  document.head.appendChild(script);
})();
