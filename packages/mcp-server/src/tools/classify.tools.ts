import { z } from 'zod';
import {
  ClassifyEmailsInputSchema,
  type ClassifyEmailsOutput,
  type EmailContent,
} from '@mcp-mail/shared';
import { getProviderClient } from '../providers/index.js';
import {
  classifyEmails,
  getCachedClassification,
  cacheClassification,
} from '../services/classification.service.js';

export const classifyTools = {
  emails_classify: {
    description: 'Classify emails using AI and determine which should be archived',
    inputSchema: ClassifyEmailsInputSchema,
    handler: async (input: z.infer<typeof ClassifyEmailsInputSchema>): Promise<ClassifyEmailsOutput> => {
      const client = getProviderClient(input.provider);

      // Fetch email content for classification
      const emailContents: EmailContent[] = [];
      const cachedResults: ClassifyEmailsOutput['results'] = [];

      for (const emailId of input.emailIds) {
        // Check cache first
        const cached = getCachedClassification(emailId);
        if (cached) {
          cachedResults.push(cached);
          continue;
        }

        const content = await client.getEmailContent(input.accountEmail, emailId);
        emailContents.push(content);
      }

      // Classify uncached emails
      const newResults = emailContents.length > 0
        ? await classifyEmails(emailContents)
        : [];

      // Cache new results
      newResults.forEach(result => cacheClassification(result));

      // Combine results
      const allResults = [...cachedResults, ...newResults];

      // Categorize results
      const autoArchived: string[] = [];
      const needsReview: string[] = [];
      const keptInInbox: string[] = [];

      for (const result of allResults) {
        if (result.shouldArchive) {
          autoArchived.push(result.emailId);
        } else if (result.needsReview) {
          needsReview.push(result.emailId);
        } else {
          keptInInbox.push(result.emailId);
        }
      }

      // Auto-archive high-confidence archivable emails
      if (autoArchived.length > 0) {
        await client.archiveEmails(input.accountEmail, autoArchived);
      }

      return {
        results: allResults,
        autoArchived,
        needsReview,
        keptInInbox,
      };
    },
  },
};
