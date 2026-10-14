import { cp, mkdir, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const candidates = [
  join(root, 'node_modules/onnxruntime-web/dist'),
  join(root, 'node_modules/@huggingface/transformers/node_modules/onnxruntime-web/dist'),
];
const dest = join(root, 'public/ort');

const source = await firstExisting(candidates);
await mkdir(dest, { recursive: true });
const names = await readdir(source);
let copied = 0;
for (const name of names) {
  if (!/^ort-wasm.*\.(wasm|mjs)$/.test(name)) continue;
  await cp(join(source, name), join(dest, name));
  copied += 1;
}
if (copied === 0) throw new Error(`No ORT wasm files in ${source}`);
console.log(`copied ${copied} ORT files`);

async function firstExisting(paths) {
  for (const path of paths) {
    try {
      await readdir(path);
      return path;
    } catch {
      // try the next install location
    }
  }
  throw new Error('onnxruntime-web dist was not found. Run npm install first.');
}
