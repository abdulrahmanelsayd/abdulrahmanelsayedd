export interface VisualAsset {
  readonly src: `/${string}`;
  readonly width: number;
  readonly height: number;
  readonly format: "webp" | "svg" | "png" | "jpeg" | "ico";
}

export const portraits = {
  clean: { src: "/images/me1.webp", width: 1191, height: 1321, format: "webp" },
  named: { src: "/images/me2.webp", width: 1191, height: 1321, format: "webp" },
} as const satisfies Record<string, VisualAsset>;

// Native-size, precompressed delivery keeps the critical portrait off the
// on-demand optimizer. Regenerate with tools/prepare-hero-portrait.mjs.
export const heroPortrait = {
  src: "/images/mee-hero-1f3f5b477899.webp", width: 1191, height: 1321, format: "webp",
} as const satisfies VisualAsset;

export const siteIcons = {
  favicon: "/favicon.ico",
  icon: "/icon.svg",
  apple: "/apple-icon.png",
} as const;
export const socialPreview = {
  src: "/images/social-preview.jpg",
  alt: "Abdulrahman Elsayed — Web Designer & Developer based in Egypt, with the AE monogram.",
} as const;

