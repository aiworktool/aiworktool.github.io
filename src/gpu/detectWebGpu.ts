type GpuNavigator = Navigator & {
  gpu?: { requestAdapter: () => Promise<unknown> };
};

export async function detectWebGpu(): Promise<boolean> {
  const gpu = (navigator as GpuNavigator).gpu;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}
