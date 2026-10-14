import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(join(root, 'models/manifest.json'), 'utf8'));
const files = manifest.files
  .filter((file) => typeof file.sha256 === 'string' && file.sha256.length === 64)
  .map((file) => ({ path: file.path, sha256: file.sha256 }));
const target = join(root, 'src/workers/modelIntegrity.json');
await writeFile(target, `${JSON.stringify({ files }, null, 2)}\n`);
console.log(`wrote ${files.length} model hashes`);
