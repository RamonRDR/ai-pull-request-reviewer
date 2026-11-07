import type { ChangedLine } from './models.js';

/** Parses RIGHT-side line numbers from unified GitHub patches; never uses diff positions as file lines. */
export function addedLines(patch: string): { lines: ChangedLine[]; complete: boolean } {
  const lines: ChangedLine[] = [];
  let newLine = 0;
  let inHunk = false;
  let complete = true;
  for (const raw of patch.split('\n')) {
    if (raw.startsWith('@@')) {
      const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
      if (!match) { complete = false; inHunk = false; continue; }
      newLine = Number(match[1]);
      inHunk = true;
      continue;
    }
    if (!inHunk || raw.startsWith('\\ No newline at end of file')) continue;
    if (raw.startsWith('+') && !raw.startsWith('+++')) {
      lines.push({ line: newLine, text: raw.slice(1) });
      newLine += 1;
    } else if (raw.startsWith('-') && !raw.startsWith('---')) {
      // A removed line has no RIGHT-side anchor.
    } else if (raw.startsWith(' ')) {
      newLine += 1;
    } else if (raw !== '') {
      complete = false;
    } else {
      // Trailing split terminator. Empty context lines from Git use a leading space.
    }
  }
  if (!inHunk) complete = false;
  return { lines, complete };
}
