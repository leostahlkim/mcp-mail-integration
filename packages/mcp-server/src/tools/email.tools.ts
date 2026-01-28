import { z } from 'zod';
import {
  EmailFetchInputSchema,
  EmailGetContentInputSchema,
  EmailArchiveInputSchema,
  type EmailFetchOutput,
  type EmailContent,
  type EmailArchiveOutput,
} from '@mcp-mail/shared';
import { getProviderClient } from '../providers/index.js';

export const emailTools = {
  emails_fetch: {
    description: 'Fetch emails from inbox with optional filters',
    inputSchema: EmailFetchInputSchema,
    handler: async (input: z.infer<typeof EmailFetchInputSchema>): Promise<EmailFetchOutput> => {
      const client = getProviderClient(input.provider);
      return client.fetchEmails(input.accountEmail, {
        maxResults: input.maxResults,
        pageToken: input.pageToken,
        query: input.query,
        labelIds: input.labelIds,
      });
    },
  },

  email_get_content: {
    description: 'Get full email content including body for classification',
    inputSchema: EmailGetContentInputSchema,
    handler: async (input: z.infer<typeof EmailGetContentInputSchema>): Promise<EmailContent> => {
      const client = getProviderClient(input.provider);
      return client.getEmailContent(input.accountEmail, input.emailId);
    },
  },

  emails_archive: {
    description: 'Archive emails (remove from inbox without deleting)',
    inputSchema: EmailArchiveInputSchema,
    handler: async (input: z.infer<typeof EmailArchiveInputSchema>): Promise<EmailArchiveOutput> => {
      const client = getProviderClient(input.provider);
      return client.archiveEmails(input.accountEmail, input.emailIds);
    },
  },
};
