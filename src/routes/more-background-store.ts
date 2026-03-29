/**
 * Stores the More screen's current page background color so the
 * MoreStackRoute wrapper can match it during rotation transitions,
 * eliminating the white flash when the native stack frame hasn't
 * updated yet.
 */
let storedColor = '#FFFFFF';
export const setMoreBackgroundColor = (color: string) => { storedColor = color; };
export const getMoreBackgroundColor = () => storedColor;
