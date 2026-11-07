import { describe, expect, it } from 'vitest';
import { configSchema } from '../src/config.js';
import { MockProvider } from '../src/provider.js';

describe('deterministic, zero-cost demonstration', () => {
  it('returns no findings for clean changes', async () => {
    const result = await new MockProvider().analyze(
      {
        files: [
          {
            path: 'src/safe.ts',
            status: 'modified',
            patch: '@@ -0,0 +1,1 @@\n+const x = 1;',
            added: [{ line: 1, text: 'const x = 1;' }],
          },
        ],
        skipped: [],
        truncated: false,
        characterCount: 20,
      },
      configSchema.parse({}),
    );
    expect(result.findings).toEqual([]);
    expect(result.usage.inputTokens).toBe(0);
  });
});
