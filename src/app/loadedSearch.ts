// The address bar as the page was opened. store.ts takes the query string off the address on boot (a deep link is
// consumed), so anything that reads a flag from it (the dev `?gpu=` override, §9.6.2) must read it from here.
// store.ts imports this module first, so it evaluates before cleanUrl() runs.
export const LOADED_SEARCH: string = typeof window === 'undefined' ? '' : window.location.search;
