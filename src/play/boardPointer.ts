type Box = { left: number; top: number; width: number; height: number };

export function localPoint(
  target: { getBoundingClientRect: () => Box },
  clientX: number,
  clientY: number,
): { x: number; y: number; width: number; height: number } {
  const rect = target.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
    width: rect.width,
    height: rect.height,
  };
}
