import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const logo = await readFile(new URL('../src/assets/icons/app-logo.svg', import.meta.url), 'utf8');
const content = logo.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '');
for (const [name, size, scale] of [
  ['pwa-192x192.png', 192, 0.72],
  ['pwa-512x512.png', 512, 0.72],
  ['pwa-maskable-512x512.png', 512, 0.56],
  ['apple-touch-icon.png', 180, 0.72],
]) {
  const offset = size * (1 - scale) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="white"/><g transform="translate(${offset} ${offset}) scale(${size * scale / 30})">${content}</g></svg>`;
  await writeFile(new URL(`../public/${name}`, import.meta.url), new Resvg(svg).render().asPng());
}
await writeFile(new URL('../public/favicon.svg', import.meta.url), logo);
