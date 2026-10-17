export const clamp = (value: number) => Math.max(0, Math.min(1, value));
export const marqueeSpeed = 24;
export function marqueeTiming(width: number, offset = 0) {
  return { duration: width / marqueeSpeed * 1000, currentTime: ((offset % width) + width) % width / marqueeSpeed * 1000 };
}

export function readingGeometry(input: { viewportHeight: number; headerReserve: number; contentHeight: number; characters: number; decorationBottom?: number }) {
  const availableHeight = Math.max(0, input.viewportHeight - input.headerReserve);
  const stageHeight = input.contentHeight + (input.decorationBottom ?? 0);
  const enabled = input.characters > 0 && stageHeight <= availableHeight;
  const distance = enabled ? Math.max(1.2 * availableHeight, Math.min(.015 * input.characters * availableHeight, 2.4 * availableHeight)) : 0;
  return { enabled, availableHeight, stageHeight, distance, height: enabled ? stageHeight + distance : input.contentHeight };
}

export function characterOpacity(progress: number, index: number, count: number) {
  const overlap = 6;
  const local = clamp((clamp(progress) * (count + overlap - 1) - index) / overlap);
  return .22 + .78 * local;
}
