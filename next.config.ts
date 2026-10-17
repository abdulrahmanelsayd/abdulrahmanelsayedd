import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { getSiteUrl } from "./src/lib/site-url.ts";

getSiteUrl();
const root = fileURLToPath(new URL(".", import.meta.url));
const config: NextConfig = {
  turbopack: { root },
  outputFileTracingRoot: root,
  // Work cards are 272–470 CSS pixels wide; avoid a jump from 384 to 640 at DPR 1.
  images: { qualities: [75, 90], imageSizes: [32, 48, 64, 96, 128, 256, 320, 384, 400, 480] },
};
export default config;
