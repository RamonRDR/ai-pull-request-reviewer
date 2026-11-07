import { describe, expect, it } from 'vitest';
import { addedLines } from '../src/diff.js';

describe('unified diff parser', () => {
  it('anchors added lines on RIGHT side, across hunks', () => {
    const patch = '@@ -4,3 +4,4 @@\n existing\n-old\n+new\n+second\n unchanged\n@@ -20,0 +22,1 @@\n+last';
    expect(addedLines(patch)).toEqual({
      complete: true,
      lines: [
        { line: 5, text: 'new' },
        { line: 6, text: 'second' },
        { line: 22, text: 'last' },
      ],
    });
  });
  it('rejects patches without hunk headers', () => {
    expect(addedLines('not a patch').complete).toBe(false);
  });
  it('never anchors removed lines', () => {
    expect(addedLines('@@ -1,1 +1,0 @@\n-old').lines).toEqual([]);
  });
});
