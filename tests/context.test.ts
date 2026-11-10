import { describe, expect, it } from 'vitest';
import { configSchema } from '../src/config.js';
import { ignored, prepareContext, redact } from '../src/context.js';

const config = configSchema.parse({});
const file = (filename: string, patch: string | undefined) => ({
  filename,
  patch,
  status: 'modified',
  changes: 1,
  additions: 1,
  deletions: 0,
});

describe('safe context preparation', () => {
  it('ignores generated, dependency, binary and credential files', () => {
    for (const name of [
      'node_modules/a.js',
      'dist/a.ts',
      'picture.png',
      '.env',
      'src/x.pem',
      'pnpm-lock.yaml',
    ]) {
      expect(ignored(name, config)).toBe(true);
    }
  });
  it('ignores custom globs', () => {
    expect(
      ignored('docs/generated/output.txt', configSchema.parse({ ignore: ['docs/generated/**'] })),
    ).toBe(true);
  });
  it('redacts common token and assignment formats', () => {
    expect(redact('api_key="topsecret"')).not.toContain('topsecret');
    expect(redact('ghp_12345678901234567890')).not.toContain('12345678901234567890');
  });
  it('redacts JSON credentials in both patches and prepared added lines', () => {
    const syntheticValue = 'fake-credential-with-spaces 42';
    const json = '"password": "' + syntheticValue + '"';
    expect(redact(json)).toBe('"password": "[REDACTED]"');
    const patch = '@@ -0,0 +1,1 @@\n+{"api_key": "' + syntheticValue + '"}';
    const prepared = prepareContext([file('config.json', patch)], config);
    expect(prepared.truncated).toBe(false);
    expect(prepared.files).toHaveLength(1);
    expect(prepared.files[0]?.patch).not.toContain(syntheticValue);
    expect(prepared.files[0]?.added[0]?.text).not.toContain(syntheticValue);
    expect(prepared.files[0]?.patch).toContain('"api_key": "[REDACTED]"');
  });
  it('redacts quoted properties, whitespace values and escaped quoted content', () => {
    expect(redact("'password' = 'fake multi word value'")).toBe("'password' = '[REDACTED]'");
    expect(redact('access_token=fake-example-token')).toBe('access_token=[REDACTED]');
    const escaped = String.raw`"api_key": "fake \"inner\" value"`;
    expect(redact(escaped)).not.toContain('inner');
    expect(redact(escaped)).toContain('[REDACTED]');
  });
  it('skips patches without textual line anchors', () => {
    const result = prepareContext([file('src/new.ts', undefined)], config);
    expect(result.truncated).toBe(true);
    expect(result.files).toHaveLength(0);
  });
  it('never clips a patch in the middle of a hunk', () => {
    const result = prepareContext(
      [file('src/new.ts', '@@ -0,0 +1,1 @@\n+' + 'a'.repeat(2000))],
      configSchema.parse({ maxContextChars: 1000 }),
    );
    expect(result.truncated).toBe(true);
    expect(result.files).toHaveLength(0);
  });
});
