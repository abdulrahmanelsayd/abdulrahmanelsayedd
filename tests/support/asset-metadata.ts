import { readFile } from "node:fs/promises";
import sharp from "sharp";

export interface AssetMetadata {
  readonly format: string;
  readonly width?: number;
  readonly height?: number;
}

export async function inspectAsset(file: string): Promise<AssetMetadata> {
  const bytes = await readFile(file);
  if (bytes.subarray(0, 4).toString("ascii") === "wOF2") {
    if (bytes.length < 48 || bytes.readUInt32BE(8) !== bytes.length || bytes.readUInt32BE(16) === 0) {
      throw new Error("Invalid WOFF2 header: " + file);
    }
    return { format: "woff2" };
  }
  if (bytes.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0]))) {
    const count = bytes.readUInt16LE(4);
    const sizes = Array.from({ length: count }, (_, index) => ({
      width: bytes[6 + index * 16] || 256,
      height: bytes[7 + index * 16] || 256,
    }));
    const largest = sizes.sort((a, b) => b.width * b.height - a.width * a.height)[0];
    if (!largest || bytes.length < 6 + count * 16) throw new Error("Invalid ICO: " + file);
    return { format: "ico", ...largest };
  }
  if (file.endsWith(".txt")) {
    if (bytes.includes(0)) throw new Error("Invalid text asset: " + file);
    return { format: "text" };
  }
  const metadata = await sharp(bytes).metadata();
  if (!metadata.format || !metadata.width || !metadata.height) throw new Error("Invalid image: " + file);
  return { format: metadata.format, width: metadata.width, height: metadata.height };
}
