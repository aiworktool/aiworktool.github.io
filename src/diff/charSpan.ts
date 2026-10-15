export type CharParts = {
  before: string;
  mark: string;
  after: string;
};

export type CharSpan = {
  left: CharParts;
  right: CharParts;
};

function sharedPrefixLength(left: string, right: string): number {
  const limit = Math.min(left.length, right.length);
  let index = 0;
  while (index < limit && left[index] === right[index]) index += 1;
  return index;
}

function sharedSuffixLength(left: string, right: string, prefix: number): number {
  const limit = Math.min(left.length, right.length) - prefix;
  let index = 0;
  while (
    index < limit
    && left[left.length - 1 - index] === right[right.length - 1 - index]
  ) {
    index += 1;
  }
  return index;
}

function sliceParts(text: string, prefix: number, suffix: number): CharParts {
  const markEnd = text.length - suffix;
  return {
    before: text.slice(0, prefix),
    mark: text.slice(prefix, markEnd),
    after: text.slice(markEnd),
  };
}

export function splitCharSpan(left: string, right: string): CharSpan | null {
  if (left === right) return null;
  const prefix = sharedPrefixLength(left, right);
  const suffix = sharedSuffixLength(left, right, prefix);
  return {
    left: sliceParts(left, prefix, suffix),
    right: sliceParts(right, prefix, suffix),
  };
}
