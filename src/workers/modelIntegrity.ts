import integrity from './modelIntegrity.json';

const MAX_HASHES = 64;

const hashes = new Map<string, string>();
for (const file of integrity.files.slice(0, MAX_HASHES)) {
  if (file.sha256) hashes.set(file.path, file.sha256);
}

export function expectedSha256(modelUrl: string): string | null {
  const path = decodeURIComponent(new URL(modelUrl).pathname).replace(/^\/models\//, '');
  return hashes.get(path) ?? null;
}
