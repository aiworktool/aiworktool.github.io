export const ROUND_MS = 30000;

export type Dot = {
  id: number;
  x: number;
  y: number;
  r: number;
  born: number;
  life: number;
};

export function makeDot(id: number, now: number, rand: () => number): Dot {
  return {
    id,
    x: 0.1 + rand() * 0.8,
    y: 0.12 + rand() * 0.76,
    r: 0.07 + rand() * 0.02,
    born: now,
    life: 1200 + rand() * 800,
  };
}

export function dotScale(dot: Dot, now: number): number {
  const age = (now - dot.born) / dot.life;
  if (age <= 0) return 0.4;
  if (age < 0.12) return 0.4 + (age / 0.12) * 0.6;
  return Math.max(0.55, 1 - (age - 0.12) * 0.5);
}

export function isAlive(dot: Dot, now: number): boolean {
  return now >= dot.born && now < dot.born + dot.life;
}

export function hitDotPx(
  dots: Dot[],
  x: number,
  y: number,
  now: number,
  width: number,
  height: number,
): number | null {
  const unit = Math.min(width, height);
  for (let i = dots.length - 1; i >= 0; i -= 1) {
    const dot = dots[i];
    if (!isAlive(dot, now)) continue;
    const radius = unit * dot.r * dotScale(dot, now);
    const dx = dot.x * width - x;
    const dy = dot.y * height - y;
    if (dx * dx + dy * dy <= radius * radius) return dot.id;
  }
  return null;
}

export function dropDot(dots: Dot[], id: number): Dot[] {
  return dots.filter((dot) => dot.id !== id);
}

export function stepDots(dots: Dot[], now: number, onExpire: () => void): Dot[] {
  const alive: Dot[] = [];
  for (const dot of dots) {
    if (isAlive(dot, now)) alive.push(dot);
    else onExpire();
  }
  return alive;
}
