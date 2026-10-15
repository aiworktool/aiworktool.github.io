import { describe, expect, it } from 'vitest';
import { splitCharSpan } from './charSpan';

const LEFT_CLIENT = 'client=ca-pub-93983232906636-aaa0';
const RIGHT_CLIENT = 'client=ca-pub-9398323290663640';

describe('character diff span', () => {
  it('marks the inserted aaa and the replaced 4', () => {
    const span = splitCharSpan(LEFT_CLIENT, RIGHT_CLIENT);
    expect(span).toEqual({
      left: { before: 'client=ca-pub-93983232906636', mark: '-aaa', after: '0' },
      right: { before: 'client=ca-pub-93983232906636', mark: '4', after: '0' },
    });
    expect(span?.left.mark).toContain('aaa');
    expect(span?.right.mark).toBe('4');
  });

  it('marks only the differing digits in a json line', () => {
    expect(splitCharSpan('  "a": 1', '  "a": 2')).toEqual({
      left: { before: '  "a": ', mark: '1', after: '' },
      right: { before: '  "a": ', mark: '2', after: '' },
    });
  });

  it('does not mark equal strings', () => {
    expect(splitCharSpan('a=1', 'a=1')).toBeNull();
    expect(splitCharSpan('  "a": 1', '  "a": 1')).toBeNull();
  });

  it('highlights the whole non-empty side when the other side is empty', () => {
    expect(splitCharSpan('a=2', '')).toEqual({
      left: { before: '', mark: 'a=2', after: '' },
      right: { before: '', mark: '', after: '' },
    });
    expect(splitCharSpan('', 'c=3')).toEqual({
      left: { before: '', mark: '', after: '' },
      right: { before: '', mark: 'c=3', after: '' },
    });
  });
});
