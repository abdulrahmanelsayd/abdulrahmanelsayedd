import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const image = await sharp('public/images/mee-hero-h03-c01.webp')
  .webp({ quality: 75, alphaQuality: 100, effort: 6 }).toBuffer();
const hash = createHash('sha256').update(image).digest('hex');
const file = `public/images/mee-hero-${hash.slice(0, 12)}.webp`;
await writeFile(file, image);
console.log(JSON.stringify({ file, bytes: image.length, sha256: hash }));
console.log('If the filename changes, update heroPortrait in src/content/assets.ts and its netlify.toml cache rule.');
