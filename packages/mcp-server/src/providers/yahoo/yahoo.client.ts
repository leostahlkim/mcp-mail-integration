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

const YAHOO_AUTH_URL = 'https://api.login.yahoo.com/oauth2/request_auth';
const YAHOO_TOKEN_URL = 'https://api.login.yahoo.com/oauth2/get_token';
const YAHOO_MAIL_API = 'https://mail.yahooapis.com/ws/mail/v3.0';

const YAHOO_SCOPES = ['mail-r', 'mail-w'];

export class YahooClient {
  private provider: EmailProvider = 'yahoo';

  async generateAuthUrl(): Promise<{ authUrl: string; state: string }> {
    const state = crypto.randomBytes(32).toString('hex');
    const redirectUri = await getOAuthRedirectUri(this.provider);

    const params = new URLSearchParams({
      client_id: process.env.YAHOO_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: YAHOO_SCOPES.join(' '),
      state,
    });

    const authUrl = `${YAHOO_AUTH_URL}?${params.toString()}`;
    getTokenStorage().saveOAuthState(state, this.provider);

    return { authUrl, state };
  }

  async exchangeCode(code: string): Promise<{ email: string; token: OAuthToken }> {
    const basicAuth = Buffer.from(
      `${process.env.YAHOO_CLIENT_ID}:${process.env.YAHOO_CLIENT_SECRET}`
    ).toString('base64');

    const redirectUri = await getOAuthRedirectUri(this.provider);

    const response = await fetch(YAHOO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Yahoo token exchange failed: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      xoauth_yahoo_guid: string;
    };

    // Get user profile to get email
    const profileResponse = await fetch(
      `https://social.yahooapis.com/v1/user/${data.xoauth_yahoo_guid}/profile?format=json`,
      {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      }
    );

    if (!profileResponse.ok) {
      throw new Error('Could not retrieve Yahoo user profile');
    }

    const profile = (await profileResponse.json()) as {
      profile: { emails?: Array<{ handle: string; primary?: boolean }> };
    };

    const primaryEmail = profile.profile.emails?.find(e => e.primary)?.handle ||
      profile.profile.emails?.[0]?.handle;

    if (!primaryEmail) {
      throw new Error('Could not retrieve user email from Yahoo');
    }

    const token: OAuthToken = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    getTokenStorage().saveToken(this.provider, primaryEmail, token);

    return { email: primaryEmail, token };
  }

  private async getAccessToken(email: string): Promise<string> {
    const token = getTokenStorage().getToken(this.provider, email);
    if (!token) {
      throw new Error(`No token found for ${email}`);
    }

    // Check if token needs refresh
    if (token.expiresAt < Date.now() + 60000 && token.refreshToken) {
      const basicAuth = Buffer.from(
        `${process.env.YAHOO_CLIENT_ID}:${process.env.YAHOO_CLIENT_SECRET}`
      ).toString('base64');

      const response = await fetch(YAHOO_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: token.refreshToken,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          access_token: string;
          refresh_token?: string;
          expires_in: number;
        };

        const newToken: OAuthToken = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || token.refreshToken,
          expiresAt: Date.now() + data.expires_in * 1000,
        };

        getTokenStorage().saveToken(this.provider, email, newToken);
        return newToken.accessToken;
      }
    }

    return token.accessToken;
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
    const accessToken = await this.getAccessToken(email);

    // Yahoo Mail API uses JSON-RPC
    const response = await fetch(`${YAHOO_MAIL_API}/jsonrpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        method: 'ListMessages',
        params: {
          fid: 'Inbox',
          startMid: options.pageToken ? parseInt(options.pageToken, 10) : 0,
          numMid: options.maxResults || 50,
          groupBy: 'none',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Yahoo API error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      result?: {
        messageInfo?: Array<{
          mid: string;
          subject?: string;
          from?: { email: string; name?: string };
          to?: Array<{ email: string; name?: string }>;
          receivedDate?: number;
          snippet?: string;
          flags?: { isRead?: boolean };
          hasAttachment?: boolean;
        }>;
        total?: number;
      };
    };

    const messages = data.result?.messageInfo || [];
    const emails: EmailSummary[] = messages.map(msg => ({
      id: msg.mid,
      provider: this.provider,
      accountEmail: email,
      subject: msg.subject || '(no subject)',
      from: {
        email: msg.from?.email || '',
        name: msg.from?.name,
      },
      to: (msg.to || []).map(t => ({
        email: t.email,
        name: t.name,
      })),
      date: msg.receivedDate
        ? new Date(msg.receivedDate * 1000).toISOString()
        : new Date().toISOString(),
      snippet: msg.snippet || '',
      labels: ['INBOX'],
      isRead: msg.flags?.isRead || false,
      hasAttachments: msg.hasAttachment || false,
    }));

    const lastMid = messages[messages.length - 1]?.mid;

    return {
      emails,
      nextPageToken: lastMid,
      totalEstimate: data.result?.total,
    };
  }

  async getEmailContent(email: string, emailId: string): Promise<EmailContent> {
    const accessToken = await this.getAccessToken(email);

    const response = await fetch(`${YAHOO_MAIL_API}/jsonrpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        method: 'GetMessage',
        params: {
          mid: emailId,
          expandTOField: true,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Yahoo API error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      result?: {
        mid: string;
        subject?: string;
        from?: { email: string; name?: string };
        to?: Array<{ email: string; name?: string }>;
        receivedDate?: number;
        snippet?: string;
        flags?: { isRead?: boolean };
        hasAttachment?: boolean;
        textBody?: string;
        htmlBody?: string;
        headers?: Record<string, string>;
      };
    };

    const msg = data.result;
    if (!msg) {
      throw new Error('Email not found');
    }

    return {
      id: msg.mid,
      provider: this.provider,
      accountEmail: email,
      subject: msg.subject || '(no subject)',
      from: {
        email: msg.from?.email || '',
        name: msg.from?.name,
      },
      to: (msg.to || []).map(t => ({
        email: t.email,
        name: t.name,
      })),
      date: msg.receivedDate
        ? new Date(msg.receivedDate * 1000).toISOString()
        : new Date().toISOString(),
      snippet: msg.snippet || '',
      labels: ['INBOX'],
      isRead: msg.flags?.isRead || false,
      hasAttachments: msg.hasAttachment || false,
      body: {
        text: msg.textBody,
        html: msg.htmlBody,
      },
      headers: msg.headers,
    };
  }

  async archiveEmails(email: string, emailIds: string[]): Promise<{
    success: boolean;
    archivedCount: number;
    errors?: Array<{ emailId: string; error: string }>;
  }> {
    const accessToken = await this.getAccessToken(email);
    const errors: Array<{ emailId: string; error: string }> = [];
    let archivedCount = 0;

    for (const emailId of emailIds) {
      try {
        const response = await fetch(`${YAHOO_MAIL_API}/jsonrpc`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            method: 'MoveMessage',
            params: {
              mid: emailId,
              fid: 'Archive',
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

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

export const yahooClient = new YahooClient();
