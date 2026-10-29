import { cp, mkdir, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const dest = join(root, 'public/pose');

await mkdir(dest, { recursive: true });
const names = await readdir(source);
let copied = 0;
for (const name of names) {
  if (!/^vision_wasm_.*\.(js|wasm)$/.test(name)) continue;
  await cp(join(source, name), join(dest, name));
  copied += 1;
}
if (copied === 0) throw new Error(`No pose wasm files in ${source}`);
console.log(`copied ${copied} pose files`);
