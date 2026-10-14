import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const index = join(dist, 'index.html');
const routes = ['record', 'audio-file', 'matting'];

await copyFile(index, join(dist, '404.html'));
await writeFile(join(dist, '.nojekyll'), '');
for (const route of routes) {
  const dir = join(dist, route);
  await mkdir(dir, { recursive: true });
  await copyFile(index, join(dir, 'index.html'));
}
console.log('wrote dist/404.html, route indexes, and dist/.nojekyll');
