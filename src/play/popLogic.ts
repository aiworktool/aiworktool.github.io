export const POP_COLS = 8;
export const POP_ROWS = 6;

export type Bubble = {
  id: number;
  x: number;
  y: number;
  tone: number;
  popped: boolean;
};

export function makeSheet(seed: number): Bubble[] {
  const bubbles: Bubble[] = [];
  let id = 0;
  for (let row = 0; row < POP_ROWS; row += 1) {
    for (let col = 0; col < POP_COLS; col += 1) {
      bubbles.push({
        id,
        x: (col + 0.5) / POP_COLS,
        y: (row + 0.5) / POP_ROWS,
        tone: (seed + id) % 4,
        popped: false,
      });
      id += 1;
    }
  }
  return bubbles;
}

export function bubbleRadius(width: number, height: number): number {
  const cellW = width / POP_COLS;
  const cellH = height / POP_ROWS;
  return Math.min(cellW, cellH) * 0.42;
}

export function hitBubble(
  bubbles: Bubble[],
  x: number,
  y: number,
  width: number,
  height: number,
): number | null {
  const limit = bubbleRadius(width, height) ** 2;
  let best: number | null = null;
  let bestD = Infinity;
  for (const bubble of bubbles) {
    if (bubble.popped) continue;
    const dx = bubble.x * width - x;
    const dy = bubble.y * height - y;
    const dist = dx * dx + dy * dy;
    if (dist <= limit && dist < bestD) {
      best = bubble.id;
      bestD = dist;
    }
  }
  return best;
}

export function popAt(bubbles: Bubble[], id: number): Bubble[] {
  return bubbles.map((bubble) => (
    bubble.id === id && !bubble.popped ? { ...bubble, popped: true } : bubble
  ));
}

export function leftCount(bubbles: Bubble[]): number {
  return bubbles.reduce((sum, bubble) => sum + (bubble.popped ? 0 : 1), 0);
}
