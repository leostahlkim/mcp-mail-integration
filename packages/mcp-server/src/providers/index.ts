import type { EmailProvider, EmailSummary, EmailContent } from '@mcp-mail/shared';
import { gmailClient } from './gmail/gmail.client.js';
import { yahooClient } from './yahoo/yahoo.client.js';

export function getProviderClient(provider: EmailProvider) {
  switch (provider) {
    case 'gmail':
      return gmailClient;
    case 'yahoo':
      return yahooClient;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export { gmailClient, yahooClient };
