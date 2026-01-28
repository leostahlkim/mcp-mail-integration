import { z } from 'zod';
import { EmailProviderSchema } from './provider.schema.js';

export const ClassificationCategorySchema = z.enum([
  'spam',
  'marketing',
  'newsletter',
  'social',
  'promotional',
  'irrelevant',
  'important',
]);
export type ClassificationCategory = z.infer<typeof ClassificationCategorySchema>;

export const ClassificationResultSchema = z.object({
  emailId: z.string(),
  category: ClassificationCategorySchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  shouldArchive: z.boolean(),
  needsReview: z.boolean(),
});
export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

export const ClassifyEmailsInputSchema = z.object({
  provider: EmailProviderSchema,
  accountEmail: z.string().email(),
  emailIds: z.array(z.string()).min(1).max(20),
});
export type ClassifyEmailsInput = z.infer<typeof ClassifyEmailsInputSchema>;

export const ClassifyEmailsOutputSchema = z.object({
  results: z.array(ClassificationResultSchema),
  autoArchived: z.array(z.string()),
  needsReview: z.array(z.string()),
  keptInInbox: z.array(z.string()),
});
export type ClassifyEmailsOutput = z.infer<typeof ClassifyEmailsOutputSchema>;

// Confidence thresholds
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,    // Auto-archive
  MEDIUM: 0.60,  // Show in review queue
  LOW: 0.60,     // Keep in inbox
} as const;

// Categories that should be archived
export const ARCHIVABLE_CATEGORIES: ClassificationCategory[] = [
  'spam',
  'marketing',
  'newsletter',
  'social',
  'promotional',
  'irrelevant',
];
