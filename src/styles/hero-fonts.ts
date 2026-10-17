import localFont from "next/font/local";

export const epilogue = localFont({
  src: "../assets/fonts/Epilogue-hero.woff2",
  weight: "900",
  style: "normal",
  display: "swap",
  variable: "--font-epilogue",
});

export const instrumentSerif = localFont({
  src: "../assets/fonts/InstrumentSerif-Italic-hero.woff2",
  weight: "400",
  style: "italic",
  display: "swap",
  variable: "--font-instrument-serif",
});
