import { z } from 'zod';

export const categorySchema = z.enum([
  'bug',
  'security',
  'edge_case',
  'maintainability',
  'testing',
  'performance',
]);
export type Category = z.infer<typeof categorySchema>;
export const severitySchema = z.enum(['critical', 'high', 'medium', 'low', 'informational']);
export type Severity = z.infer<typeof severitySchema>;

export const findingSchema = z.object({
  id: z.string().min(1).max(40).optional(),
  path: z.string().min(1).max(500),
  line: z.number().int().positive(),
  category: categorySchema,
  severity: severitySchema,
  title: z.string().min(8).max(180),
  explanation: z.string().min(20).max(2000),
  suggestion: z.string().min(10).max(1200),
  evidence: z.string().max(500).optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type Finding = z.infer<typeof findingSchema>;
export const responseSchema = z.object({ findings: z.array(findingSchema).max(100) });

export interface ChangedFile {
  filename: string;
  status: string;
  patch?: string | undefined;
  additions: number;
  deletions: number;
  changes: number;
}

export interface PullRequestData {
  repo: string;
  number: number;
  title: string;
  base: string;
  head: string;
  headRepo: string | null;
  changedFiles: number;
  files: ChangedFile[];
}

export interface ChangedLine {
  line: number;
  text: string;
}

export interface PreparedFile {
  path: string;
  status: string;
  patch: string;
  added: ChangedLine[];
}

export interface PreparedContext {
  files: PreparedFile[];
  skipped: string[];
  truncated: boolean;
  characterCount: number;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export interface ReviewResult {
  source: 'mock' | 'openai';
  findings: Finding[];
  excludedFindings: number;
  skipped: string[];
  truncated: boolean;
  fileCount: number;
  usage: Usage;
  report: string;
}

export const severityOrder: Record<Severity, number> = {
  informational: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};
