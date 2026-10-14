import { env } from '@huggingface/transformers';

export function configureEnv(): void {
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = '/models/';
  env.useBrowserCache = false;
  const wasm = env.backends.onnx.wasm;
  if (!wasm) return;
  wasm.wasmPaths = new URL('/ort/', self.location.origin).href;
  wasm.proxy = false;
  wasm.numThreads = 1;
}
