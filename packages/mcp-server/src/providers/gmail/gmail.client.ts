import { google, gmail_v1 } from 'googleapis';
import crypto from 'node:crypto';
import type {
  EmailProvider,
  OAuthToken,
  EmailSummary,
  EmailContent,
  EmailAddress,
} from '@mcp-mail/shared';
import { getTokenStorage } from '../../storage/token.storage.js';
import { getOAuthRedirectUri } from '../../utils/tunnel.js';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
];

function getOAuth2Client(redirectUri?: string) {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    redirectUri || process.env.GMAIL_REDIRECT_URI
  );
}

export class GmailClient {
  private provider: EmailProvider = 'gmail';

  async generateAuthUrl(): Promise<{ authUrl: string; state: string }> {
    const redirectUri = await getOAuthRedirectUri(this.provider);
    const oauth2Client = getOAuth2Client(redirectUri);
    const state = crypto.randomBytes(32).toString('hex');

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GMAIL_SCOPES,
      state,
      prompt: 'consent',
    });

    getTokenStorage().saveOAuthState(state, this.provider);

    return { authUrl, state };
  }

  async exchangeCode(code: string): Promise<{ email: string; token: OAuthToken }> {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    oauth2Client.setCredentials(tokens);

    // Get user email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;

    if (!email) {
      throw new Error('Could not retrieve user email');
    }

    const token: OAuthToken = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || undefined,
      expiresAt: tokens.expiry_date || Date.now() + 3600 * 1000,
      scope: tokens.scope || undefined,
    };

    getTokenStorage().saveToken(this.provider, email, token);

    return { email, token };
  }

  private async getAuthenticatedClient(email: string): Promise<gmail_v1.Gmail> {
    const token = getTokenStorage().getToken(this.provider, email);
    if (!token) {
      throw new Error(`No token found for ${email}`);
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expiry_date: token.expiresAt,
    });

    // Check if token needs refresh
    if (token.expiresAt < Date.now() + 60000) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      const newToken: OAuthToken = {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || token.refreshToken,
        expiresAt: credentials.expiry_date || Date.now() + 3600 * 1000,
        scope: credentials.scope || token.scope,
      };
      getTokenStorage().saveToken(this.provider, email, newToken);
      oauth2Client.setCredentials(credentials);
    }

    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  async fetchEmails(
    email: string,
    options: {
      maxResults?: number;
      pageToken?: string;
      query?: string;
      labelIds?: string[];
    } = {}
  ): Promise<{
    emails: EmailSummary[];
    nextPageToken?: string;
    totalEstimate?: number;
  }> {
    const gmail = await this.getAuthenticatedClient(email);

    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: options.maxResults || 50,
      pageToken: options.pageToken,
      q: options.query,
      labelIds: options.labelIds || ['INBOX'],
    });

    const messages = response.data.messages || [];
    const emails: EmailSummary[] = [];

    // Fetch details for each message
    for (const msg of messages) {
      if (!msg.id) continue;

      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });

      const headers = detail.data.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

      const fromHeader = getHeader('from');
      const from = parseEmailAddress(fromHeader);

      const toHeader = getHeader('to');
      const to = toHeader.split(',').map(parseEmailAddress);

      emails.push({
        id: msg.id,
        provider: this.provider,
        accountEmail: email,
        threadId: msg.threadId || undefined,
        subject: getHeader('subject') || '(no subject)',
        from,
        to,
        date: new Date(getHeader('date') || Date.now()).toISOString(),
        snippet: detail.data.snippet || '',
        labels: detail.data.labelIds || [],
        isRead: !detail.data.labelIds?.includes('UNREAD'),
        hasAttachments: hasAttachments(detail.data.payload),
      });
    }

    return {
      emails,
      nextPageToken: response.data.nextPageToken || undefined,
      totalEstimate: response.data.resultSizeEstimate || undefined,
    };
  }

  async getEmailContent(email: string, emailId: string): Promise<EmailContent> {
    const gmail = await this.getAuthenticatedClient(email);

    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: emailId,
      format: 'full',
    });

    const headers = detail.data.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    const fromHeader = getHeader('from');
    const from = parseEmailAddress(fromHeader);

    const toHeader = getHeader('to');
    const to = toHeader.split(',').map(parseEmailAddress);

    const body = extractBody(detail.data.payload);

    return {
      id: emailId,
      provider: this.provider,
      accountEmail: email,
      threadId: detail.data.threadId || undefined,
      subject: getHeader('subject') || '(no subject)',
      from,
      to,
      date: new Date(getHeader('date') || Date.now()).toISOString(),
      snippet: detail.data.snippet || '',
      labels: detail.data.labelIds || [],
      isRead: !detail.data.labelIds?.includes('UNREAD'),
      hasAttachments: hasAttachments(detail.data.payload),
      body,
      headers: Object.fromEntries(headers.map(h => [h.name || '', h.value || ''])),
    };
  }

  async archiveEmails(email: string, emailIds: string[]): Promise<{
    success: boolean;
    archivedCount: number;
    errors?: Array<{ emailId: string; error: string }>;
  }> {
    const gmail = await this.getAuthenticatedClient(email);
    const errors: Array<{ emailId: string; error: string }> = [];
    let archivedCount = 0;

    for (const emailId of emailIds) {
      try {
        await gmail.users.messages.modify({
          userId: 'me',
          id: emailId,
          requestBody: {
            removeLabelIds: ['INBOX'],
          },
        });
        archivedCount++;
      } catch (err) {
        errors.push({
          emailId,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return {
      success: errors.length === 0,
      archivedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

function parseEmailAddress(str: string): EmailAddress {
  const match = str.match(/^(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?$/);
  if (match) {
    return {
      name: match[1]?.trim() || undefined,
      email: match[2].trim(),
    };
  }
  return { email: str.trim() };
}

function hasAttachments(payload: gmail_v1.Schema$MessagePart | undefined): boolean {
  if (!payload) return false;
  if (payload.filename && payload.filename.length > 0) return true;
  if (payload.parts) {
    return payload.parts.some(part => hasAttachments(part));
  }
  return false;
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): {
  text?: string;
  html?: string;
} {
  if (!payload) return {};

  const result: { text?: string; html?: string } = {};

  function processPayload(part: gmail_v1.Schema$MessagePart) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      result.text = Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      result.html = Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.parts) {
      part.parts.forEach(processPayload);
    }
  }

  processPayload(payload);
  return result;
}

export const gmailClient = new GmailClient();
