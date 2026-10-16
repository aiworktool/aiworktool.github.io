import { useState } from 'react';
import { playClick } from './clickTone';

const SOUND_KEY = 'handy-play-sound';

export function usePlaySound(): { on: boolean; toggle: () => void } {
  const [on, setOn] = useState(readSound);

  function toggle() {
    const next = !on;
    writeSound(next);
    setOn(next);
    if (next) playClick(true, 520);
  }

  return { on, toggle };
}

function readSound(): boolean {
  try {
    return globalThis.localStorage?.getItem(SOUND_KEY) === '1';
  } catch {
    return false;
  }
}

function writeSound(on: boolean): void {
  try {
    globalThis.localStorage?.setItem(SOUND_KEY, on ? '1' : '0');
  } catch {
    // Private mode can reject storage. Sound still works for this visit.
  }
}
