import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { categorySchema, severitySchema } from './models.js';

export const configSchema = z
  .object({
    language: z.enum(['en', 'pt-BR', 'es']).default('en'),
    categories: z.array(categorySchema).max(6).default(categorySchema.options),
    minSeverity: severitySchema.default('low'),
    maxFiles: z.number().int().min(1).max(100).default(25),
    maxContextChars: z.number().int().min(1000).max(120000).default(40000),
    maxComments: z.number().int().min(0).max(50).default(15),
    maxInputTokens: z.number().int().min(500).max(100000).default(12000),
    maxOutputTokens: z.number().int().min(100).max(10000).default(2000),
    maxCostUsd: z.number().positive().max(100).default(0.15),
    ignore: z.array(z.string().min(1).max(200)).max(100).default([]),
    customRules: z.array(z.string().min(1).max(300)).max(20).default([]),
    enablePublishing: z.boolean().default(false),
  })
  .strict();

export type ReviewerConfig = z.infer<typeof configSchema>;

export async function loadConfig(path = '.ai-pr-reviewer.json'): Promise<ReviewerConfig> {
  try {
    const raw: unknown = JSON.parse(await readFile(path, 'utf8'));
    return configSchema.parse(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return configSchema.parse({});
    if (error instanceof z.ZodError) {
      throw new Error('Invalid reviewer configuration: ' + error.issues.map((i) => i.path.join('.') + ': ' + i.message).join('; '));
    }
    throw error;
  }
}
