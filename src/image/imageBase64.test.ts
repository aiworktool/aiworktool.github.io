import { describe, expect, it } from 'vitest';
import { IMAGE_MAX_BYTES, imageDataUrl, imageFileError } from './imageBase64';

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('image base64', () => {
  it('wraps a short png payload and rejects junk', () => {
    const result = imageDataUrl(PNG);
    expect(result.ok && result.url.startsWith('data:image/png;base64,')).toBe(true);
    expect(imageDataUrl('not base64').ok).toBe(false);
  });

  it('rejects a file that is not an image or is over 2 MB', () => {
    expect(imageFileError(new File(['x'], 'a.txt', { type: 'text/plain' }))).toContain('JPG');
    const big = new File([new Uint8Array(IMAGE_MAX_BYTES + 1)], 'a.png', { type: 'image/png' });
    expect(imageFileError(big)).toContain('2 MB');
  });
});
