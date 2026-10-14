import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'models/manifest.json');
const withSmall = process.argv.includes('--with-small');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
let changed = false;

for (const file of manifest.files) {
  if (file.optional && !withSmall) continue;
  console.log(`get ${file.path}`);
  const target = join(root, 'public/models', file.path);
  await mkdir(dirname(target), { recursive: true });
  const bytes = await download(file.url);
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (file.sha256 && file.sha256 !== hash) {
    throw new Error(`${file.path} sha256 mismatch`);
  }
  if (!file.sha256) {
    file.sha256 = hash;
    changed = true;
  }
  await writeFile(target, bytes);
  console.log(`ok ${file.path} (${bytes.byteLength} bytes)`);
}

if (changed) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log('wrote missing sha256 values into models/manifest.json');
}

async function download(url) {
  const mirrorUrl = url.replace('https://huggingface.co/', 'https://hf-mirror.com/');
  const mirrors = [mirrorUrl, url];
  let lastError = 'download failed';
  for (const mirror of mirrors) {
    try {
      const response = await fetch(mirror);
      if (!response.ok) {
        lastError = `${mirror} -> ${response.status}`;
        continue;
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(lastError);
}
