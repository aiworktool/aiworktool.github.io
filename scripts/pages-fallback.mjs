import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const index = join(dist, 'index.html');
const routes = [
  'record', 'audio-file', 'matting', 'json', 'json-diff', 'url-diff', 'time',
  'base64', 'url', 'sha256', 'jwt', 'regex', 'qr',
  'text-diff', 'uuid', 'password', 'image-base64', 'cron', 'color',
];

await copyFile(index, join(dist, '404.html'));
await writeFile(join(dist, '.nojekyll'), '');
for (const route of routes) {
  await writeRoute(join(dist, route));
  await writeRoute(join(dist, 'en', route));
}
await writeRoute(join(dist, 'en'));
console.log('wrote dist/404.html, route indexes, and dist/.nojekyll');

async function writeRoute(dir) {
  await mkdir(dir, { recursive: true });
  await copyFile(index, join(dir, 'index.html'));
}
