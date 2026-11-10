import { describe, expect, it } from 'vitest';
import { configSchema } from '../src/config.js';
import { prepareContext } from '../src/context.js';
import { validateFindings, runReview, fingerprint } from '../src/review.js';
import { MockProvider } from '../src/provider.js';
import { demoPr } from '../src/demo.js';
import type { Finding } from '../src/models.js';

const sample = {
  path: 'src/fixture.ts',
  line: 1,
  category: 'bug',
  severity: 'high',
  title: 'This change breaks input handling',
  explanation: 'This condition fails when the supplied array has no elements.',
  suggestion: 'Guard against empty input before running the calculation.',
} satisfies Finding;

describe('finding validation', () => {
  const config = configSchema.parse({});
  const context = prepareContext(
    [
      {
        filename: 'src/fixture.ts',
        status: 'modified',
        patch: '@@ -0,0 +1,1 @@\n+new code',
        additions: 1,
        deletions: 0,
        changes: 1,
      },
    ],
    config,
  );

  it('removes duplicate findings and nonexistent line anchors', () => {
    const { valid, excluded } = validateFindings(
      [sample, sample, { ...sample, line: 8 }],
      context,
      config,
    );
    expect(valid).toHaveLength(1);
    expect(excluded).toBe(2);
  });
  it('respects enabled categories and minimum severity', () => {
    const restricted = configSchema.parse({ minSeverity: 'critical', categories: ['security'] });
    expect(validateFindings([sample], context, restricted).valid).toHaveLength(0);
  });
  it('drops any finding that would expose a known secret', () => {
    const syntheticAssignment = ['password', 'example-value'].join('=');
    const secret = {
      ...sample,
      explanation: 'This condition exposes the ' + syntheticAssignment + ' value to end users.',
    };
    expect(validateFindings([secret], context, config).valid).toHaveLength(0);
  });
  it('drops model output containing quoted JSON credentials', () => {
    const value = 'fake-example-api-credential';
    const item = {
      ...sample,
      explanation: 'A configuration file contains "api_key": "' + value + '" for the user.',
    };
    const { valid, excluded } = validateFindings([item], context, config);
    expect(valid).toHaveLength(0);
    expect(excluded).toBe(1);
  });
  it('deduplicates paraphrased titles using one stable finding identity', () => {
    const reworded = { ...sample, title: 'Input handling fails for empty arrays' };
    expect(fingerprint(sample)).toBe(fingerprint(reworded));
    const { valid, excluded } = validateFindings([sample, reworded], context, config);
    expect(valid).toHaveLength(1);
    expect(excluded).toBe(1);
  });
  it('rejects invalid schema payloads', () => {
    expect(
      validateFindings([{ ...sample, severity: 'explosive' }], context, config).valid,
    ).toHaveLength(0);
  });
});

describe('full simulated pipeline', () => {
  it('creates an explicitly simulated human-readable report', async () => {
    const result = await runReview(demoPr, configSchema.parse({}), new MockProvider());
    expect(result.source).toBe('mock');
    expect(result.findings).toHaveLength(2);
    expect(result.report).toContain('SIMULATED DEMO ONLY');
    expect(result.report).toContain('src/average.ts');
    expect(result.usage.estimatedCostUsd).toBe(0);
  });
});
