import { describe, expect, it } from 'vitest';
import { addedLines } from '../src/diff.js';

describe('unified diff parser', () => {
  it('anchors added lines on RIGHT side, across hunks', () => {
    const patch =
      '@@ -4,3 +4,4 @@\n existing\n-old\n+new\n+second\n unchanged\n@@ -20,0 +22,1 @@\n+last';
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
  it('rejects truncated hunks even when the header exists', () => {
    expect(addedLines('@@ -0,0 +1,2 @@\n+only one').complete).toBe(false);
  });
  it('recognizes code lines whose content begins with plus signs', () => {
    expect(addedLines('@@ -0,0 +1,1 @@\n+++increment').lines).toEqual([
      { line: 1, text: '++increment' },
    ]);
  });
  it('never anchors removed lines', () => {
    expect(addedLines('@@ -1,1 +1,0 @@\n-old').lines).toEqual([]);
  });
});
