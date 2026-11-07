import { describe, expect, it } from 'vitest';
import { configSchema } from '../src/config.js';

describe('configuration validation', () => {
  it('defaults to safe read-only', () => {
    expect(configSchema.parse({}).enablePublishing).toBe(false);
  });
  it('refuses invalid budgets and unknown settings', () => {
    expect(() => configSchema.parse({maxCostUsd:-1})).toThrow();
    expect(() => configSchema.parse({unexpected:true})).toThrow();
  });
});
