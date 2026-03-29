/**
 * Tracks the background color of the currently active tab so that
 * the AuthIndexRoute wrapper (which sits inside an RNSScreen that
 * can lag on rotation) uses the right color at every layer.
 */
let activeBg = '#FFFFFF';
export const setActiveTabBackground = (color: string) => { activeBg = color; };
export const getActiveTabBackground = () => activeBg;
