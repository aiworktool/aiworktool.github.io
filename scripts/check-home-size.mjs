import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const html = await readFile('dist/index.html', 'utf8');
const refs = [...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((match) => match[1]);
if (refs.length === 0) throw new Error('dist/index.html has no script');
let total = 0;
for (const ref of refs) {
  const path = join('dist', ref.replace(/^\//, ''));
  const gzip = gzipSync(await readFile(path)).length;
  total += gzip;
  console.log(`${ref} gzip ${gzip}`);
}
console.log(`homepage js gzip ${total}`);
if (total > 500 * 1024) {
  throw new Error('homepage JS gzip exceeds 500 KB');
}

const assets = await readdir('dist/assets');
const entry = assets.find((name) => name.startsWith('index-') && name.endsWith('.js'));
if (!entry) throw new Error('missing index chunk');
const source = await readFile(join('dist/assets', entry), 'utf8');
if (source.includes('@huggingface/transformers') || source.includes('onnxruntime')) {
  throw new Error('homepage chunk references the inference runtime');
}
