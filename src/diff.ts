import type { ChangedLine } from './models.js';

/** Parse RIGHT-side lines and verify unified-hunk lengths; never invent anchors for incomplete diffs. */
export function addedLines(patch: string): { lines: ChangedLine[]; complete: boolean } {
  const lines: ChangedLine[] = [];
  const input = patch.split('\n');
  let newLine = 0;
  let expectedOld = 0;
  let expectedNew = 0;
  let seenOld = 0;
  let seenNew = 0;
  let inHunk = false;
  let complete = true;
  let sawHunk = false;
  const finish = (): void => {
    if (inHunk && (seenOld !== expectedOld || seenNew !== expectedNew)) complete = false;
  };
  for (const [index, raw] of input.entries()) {
    if (raw.startsWith('@@')) {
      finish();
      const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(raw);
      if (!match) {
        complete = false;
        inHunk = false;
        continue;
      }
      newLine = Number(match[3]);
      expectedOld = match[2] === undefined ? 1 : Number(match[2]);
      expectedNew = match[4] === undefined ? 1 : Number(match[4]);
      seenOld = 0;
      seenNew = 0;
      sawHunk = true;
      inHunk = true;
      continue;
    }
    if (raw.startsWith('\\ No newline at end of file')) continue;
    if (!inHunk) {
      if (raw) complete = false;
      continue;
    }
    if (raw.startsWith('+')) {
      lines.push({ line: newLine, text: raw.slice(1) });
      seenNew++;
      newLine++;
    } else if (raw.startsWith('-')) {
      seenOld++;
    } else if (raw.startsWith(' ')) {
      seenOld++;
      seenNew++;
      newLine++;
    } else if (!(raw === '' && index === input.length - 1)) {
      complete = false;
    }
  }
  finish();
  return { lines, complete: complete && sawHunk };
}
