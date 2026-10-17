export const clampProgress = (value: number) => Math.max(0, Math.min(1, value));
export const footerProgress = (scroll: number, top: number, height: number, viewport: number) => clampProgress((scroll + viewport - top) / Math.max(1, height));
export const footerLetterOffset = (progress: number, index: number) => 110 * Math.pow(1 - clampProgress((progress - .3 - index * .025) / .5),3);
