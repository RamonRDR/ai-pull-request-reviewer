import { describe, expect, it } from 'vitest';
import { configSchema } from '../src/config.js';
import { ignored, prepareContext, redact } from '../src/context.js';

const config = configSchema.parse({});
const file = (filename: string, patch: string | undefined) => ({
  filename, patch, status: 'modified', changes: 1, additions: 1, deletions: 0,
});

describe('safe context preparation', () => {
  it('ignores generated, dependency, binary and credential files', () => {
    for (const name of ['node_modules/a.js', 'dist/a.ts', 'picture.png', '.env', 'src/x.pem', 'pnpm-lock.yaml']) {
      expect(ignored(name, config)).toBe(true);
    }
  });
  it('ignores custom globs', () => {
    expect(ignored('docs/generated/output.txt', configSchema.parse({ignore:['docs/generated/**']}))).toBe(true);
  });
  it('redacts common token and assignment formats', () => {
    expect(redact('api_key="topsecret"')).not.toContain('topsecret');
    expect(redact('ghp_12345678901234567890')).not.toContain('12345678901234567890');
  });
  it('skips patches without textual line anchors', () => {
    const result = prepareContext([file('src/new.ts', undefined)], config);
    expect(result.truncated).toBe(true);
    expect(result.files).toHaveLength(0);
  });
  it('never clips a patch in the middle of a hunk', () => {
    const result = prepareContext([file('src/new.ts', '@@ -0,0 +1,1 @@\n+' + 'a'.repeat(2000))], configSchema.parse({maxContextChars: 1000}));
    expect(result.truncated).toBe(true);
    expect(result.files).toHaveLength(0);
  });
});
