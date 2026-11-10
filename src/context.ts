import type { ChangedFile, PreparedContext, PreparedFile } from './models.js';
import type { ReviewerConfig } from './config.js';
import { addedLines } from './diff.js';

const skippedSegments =
  /(^|\/)(node_modules|dist|build|coverage|vendor|\.git|__generated__)(\/|$)/i;
const skippedFiles =
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|.*\.min\.(js|css)|.*\.map)$/i;
const binaryExt =
  /\.(png|jpe?g|gif|webp|ico|svg|pdf|zip|gz|jar|wasm|exe|dll|class|woff2?|ttf|mp4|mov|sqlite|db)$/i;
const sensitivePath =
  /(^|\/)(\.env($|\.)|.*\.(pem|key|p12|pfx)$|id_rsa|id_ed25519|secrets?\.json$)/i;

function globMatch(path: string, pattern: string): boolean {
  const escaped = pattern
    .replace(/[.+^$()|[\]{}]/g, '\\$&')
    .replace(/\*\*\//g, '__GLOBSTAR_DIR__')
    .replace(/\*\*/g, '__GLOBSTAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/__GLOBSTAR_DIR__/g, '(?:.*/)?')
    .replace(/__GLOBSTAR__/g, '.*');
  return new RegExp('^' + escaped + '$').test(path);
}

export function ignored(path: string, config: ReviewerConfig): boolean {
  return (
    sensitivePath.test(path) ||
    skippedSegments.test(path) ||
    skippedFiles.test(path) ||
    binaryExt.test(path) ||
    config.ignore.some((rule) => globMatch(path, rule))
  );
}

/** Best-effort defense in depth. Confidential repositories should never use a remote LLM by default. */
export function redact(text: string): string {
  return text
    .replace(
      /(gh[pousr]_[A-Za-z0-9_]{15,}|github_pat_[A-Za-z0-9_]{15,}|sk-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16})/g,
      '[REDACTED]',
    )
    .replace(
      /((?:["']?(?:password|secret|api[_-]?key|access[_-]?token|private[_-]?key)["']?)\s*[:=]\s*)(["'])(?:\\.|(?!\2)[^\\\r\n])*\2/gi,
      '$1$2[REDACTED]$2',
    )
    .replace(
      /((?:["']?(?:password|secret|api[_-]?key|access[_-]?token|private[_-]?key)["']?)\s*[:=]\s*)[^\s'",;]+/gi,
      '$1[REDACTED]',
    )
    .replace(
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
      '[REDACTED PRIVATE KEY]',
    );
}

function priority(file: ChangedFile): number {
  return (
    (/^(src|app|lib|api)\//.test(file.filename) ? 3 : 0) +
    (/\.(ts|tsx|js|py|go|rs|java)$/.test(file.filename) ? 2 : 0) +
    (file.status === 'modified' ? 1 : 0)
  );
}

export function prepareContext(files: ChangedFile[], config: ReviewerConfig): PreparedContext {
  const result: PreparedFile[] = [];
  const skipped: string[] = [];
  let count = 0;
  let truncated = false;
  for (const file of [...files].sort((a, b) => priority(b) - priority(a))) {
    if (ignored(file.filename, config)) {
      skipped.push(file.filename + ': ignored');
      continue;
    }
    if (!file.patch) {
      skipped.push(file.filename + ': no textual patch (binary, deleted or truncated)');
      truncated = true;
      continue;
    }
    const parsed = addedLines(file.patch);
    if (!parsed.complete) {
      skipped.push(file.filename + ': invalid or incomplete patch');
      truncated = true;
      continue;
    }
    if (!parsed.lines.length) {
      skipped.push(file.filename + ': no added lines');
      continue;
    }
    if (result.length >= config.maxFiles) {
      truncated = true;
      skipped.push(file.filename + ': file limit');
      continue;
    }
    const safePatch = redact(file.patch);
    if (count + safePatch.length > config.maxContextChars) {
      truncated = true;
      skipped.push(file.filename + ': context character limit');
      continue; // Never cut a hunk and invent anchors.
    }
    count += safePatch.length;
    result.push({
      path: file.filename,
      status: file.status,
      patch: safePatch,
      added: parsed.lines.map((l) => ({ line: l.line, text: redact(l.text) })),
    });
  }
  return { files: result, skipped, truncated, characterCount: count };
}
