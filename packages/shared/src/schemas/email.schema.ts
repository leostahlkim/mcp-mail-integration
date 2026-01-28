import { z } from 'zod';
import { EmailProviderSchema } from './provider.schema.js';

export const EmailAddressSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
});
export type EmailAddress = z.infer<typeof EmailAddressSchema>;

export const EmailSummarySchema = z.object({
  id: z.string(),
  provider: EmailProviderSchema,
  accountEmail: z.string().email(),
  threadId: z.string().optional(),
  subject: z.string(),
  from: EmailAddressSchema,
  to: z.array(EmailAddressSchema),
  date: z.string().datetime(),
  snippet: z.string(),
  labels: z.array(z.string()),
  isRead: z.boolean(),
  hasAttachments: z.boolean(),
});
export type EmailSummary = z.infer<typeof EmailSummarySchema>;

export const EmailContentSchema = EmailSummarySchema.extend({
  body: z.object({
    text: z.string().optional(),
    html: z.string().optional(),
  }),
  headers: z.record(z.string()).optional(),
});
export type EmailContent = z.infer<typeof EmailContentSchema>;

export const EmailFetchInputSchema = z.object({
  provider: EmailProviderSchema,
  accountEmail: z.string().email(),
  maxResults: z.number().min(1).max(100).default(50),
  pageToken: z.string().optional(),
  query: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
});
export type EmailFetchInput = z.infer<typeof EmailFetchInputSchema>;

export const EmailFetchOutputSchema = z.object({
  emails: z.array(EmailSummarySchema),
  nextPageToken: z.string().optional(),
  totalEstimate: z.number().optional(),
});
export type EmailFetchOutput = z.infer<typeof EmailFetchOutputSchema>;

export const EmailGetContentInputSchema = z.object({
  provider: EmailProviderSchema,
  accountEmail: z.string().email(),
  emailId: z.string(),
});
export type EmailGetContentInput = z.infer<typeof EmailGetContentInputSchema>;

export const EmailArchiveInputSchema = z.object({
  provider: EmailProviderSchema,
  accountEmail: z.string().email(),
  emailIds: z.array(z.string()).min(1).max(100),
});
export type EmailArchiveInput = z.infer<typeof EmailArchiveInputSchema>;

export const EmailArchiveOutputSchema = z.object({
  success: z.boolean(),
  archivedCount: z.number(),
  errors: z.array(z.object({
    emailId: z.string(),
    error: z.string(),
  })).optional(),
});
export type EmailArchiveOutput = z.infer<typeof EmailArchiveOutputSchema>;
