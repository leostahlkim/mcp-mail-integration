import { z } from 'zod';
import {
  AuthInitiateInputSchema,
  AuthCallbackInputSchema,
  AuthStatusInputSchema,
  type AuthInitiateOutput,
  type AuthCallbackOutput,
  type AuthStatusOutput,
} from '@mcp-mail/shared';
import { getProviderClient } from '../providers/index.js';
import { getTokenStorage } from '../storage/token.storage.js';

export const authTools = {
  auth_initiate: {
    description: 'Start OAuth flow for Gmail or Yahoo email provider',
    inputSchema: AuthInitiateInputSchema,
    handler: async (input: z.infer<typeof AuthInitiateInputSchema>): Promise<AuthInitiateOutput> => {
      const client = getProviderClient(input.provider);
      const { authUrl, state } = await client.generateAuthUrl();
      return { authUrl, state };
    },
  },

  auth_callback: {
    description: 'Exchange OAuth authorization code for access tokens',
    inputSchema: AuthCallbackInputSchema,
    handler: async (input: z.infer<typeof AuthCallbackInputSchema>): Promise<AuthCallbackOutput> => {
      const storage = getTokenStorage();

      // Verify state
      const provider = storage.verifyAndConsumeState(input.state);
      if (!provider || provider !== input.provider) {
        return {
          success: false,
          error: 'Invalid or expired OAuth state',
        };
      }

      try {
        const client = getProviderClient(input.provider);
        const { email } = await client.exchangeCode(input.code);
        return {
          success: true,
          email,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  },

  auth_status: {
    description: 'Check connected email accounts and their status',
    inputSchema: AuthStatusInputSchema,
    handler: async (input: z.infer<typeof AuthStatusInputSchema>): Promise<AuthStatusOutput> => {
      const storage = getTokenStorage();
      const allAccounts = storage.getAllAccounts();

      const accounts = allAccounts
        .filter(acc => !input.provider || acc.provider === input.provider)
        .map(acc => ({
          provider: acc.provider,
          email: acc.email,
          connected: acc.expiresAt > Date.now(),
          expiresAt: acc.expiresAt,
        }));

      return { accounts };
    },
  },
};
