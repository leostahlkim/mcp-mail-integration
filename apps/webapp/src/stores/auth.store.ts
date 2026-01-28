import { create } from 'zustand';
import type { AuthStatus, EmailProvider } from '@mcp-mail/shared';
import { mcpTools } from '@/lib/mcp-client';

interface AuthState {
  accounts: AuthStatus[];
  isLoading: boolean;
  error: string | null;
  fetchAccounts: () => Promise<void>;
  initiateAuth: (provider: EmailProvider) => Promise<string>;
  handleCallback: (provider: EmailProvider, code: string, state: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accounts: [],
  isLoading: false,
  error: null,

  fetchAccounts: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await mcpTools.authStatus({});
      set({ accounts: result.accounts, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch accounts',
        isLoading: false,
      });
    }
  },

  initiateAuth: async (provider: EmailProvider) => {
    set({ isLoading: true, error: null });
    try {
      const result = await mcpTools.authInitiate({ provider });
      set({ isLoading: false });
      return result.authUrl;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to initiate auth',
        isLoading: false,
      });
      throw err;
    }
  },

  handleCallback: async (provider: EmailProvider, code: string, state: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await mcpTools.authCallback({ provider, code, state });
      if (result.success) {
        // Refresh accounts list
        const statusResult = await mcpTools.authStatus({});
        set({ accounts: statusResult.accounts, isLoading: false });
        return true;
      } else {
        set({ error: result.error || 'Auth failed', isLoading: false });
        return false;
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Auth callback failed',
        isLoading: false,
      });
      return false;
    }
  },
}));
