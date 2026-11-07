import { describe, expect, it } from 'vitest';
import { evaluate, fixtures } from '../src/evaluate.js';

describe('synthetic fixture suite', () => {
  it('contains positives, negatives, and prompt-injection attempts', () => {
    expect(fixtures).toHaveLength(27);
    expect(fixtures.filter((entry) => entry.expected === null).length).toBe(9);
    expect(fixtures.filter((entry) => entry.name.includes('injection')).length).toBe(2);
  });
  it('generates reproducible marker-oracle metrics, not AI benchmarks', async () => {
    const metrics = await evaluate();
    expect(metrics.source).toBe('mock');
    expect(metrics.truePositives).toBe(18);
    expect(metrics.falsePositives).toBe(0);
    expect(metrics.falseNegatives).toBe(0);
  });
});
