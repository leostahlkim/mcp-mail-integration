import { create } from 'zustand';
import type {
  EmailProvider,
  EmailSummary,
  ClassificationResult,
} from '@mcp-mail/shared';
import { mcpTools } from '@/lib/mcp-client';

interface EmailWithClassification extends EmailSummary {
  classification?: ClassificationResult;
}

interface EmailState {
  emails: EmailWithClassification[];
  selectedIds: Set<string>;
  isLoading: boolean;
  isClassifying: boolean;
  error: string | null;
  nextPageToken?: string;
  currentAccount: { provider: EmailProvider; email: string } | null;
  reviewQueue: EmailWithClassification[];

  setCurrentAccount: (provider: EmailProvider, email: string) => void;
  fetchEmails: (loadMore?: boolean) => Promise<void>;
  classifySelected: () => Promise<void>;
  classifyAll: () => Promise<void>;
  archiveEmails: (emailIds: string[]) => Promise<void>;
  toggleSelection: (emailId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  acceptReview: (emailId: string) => Promise<void>;
  rejectReview: (emailId: string) => void;
}

export const useEmailStore = create<EmailState>((set, get) => ({
  emails: [],
  selectedIds: new Set(),
  isLoading: false,
  isClassifying: false,
  error: null,
  nextPageToken: undefined,
  currentAccount: null,
  reviewQueue: [],

  setCurrentAccount: (provider, email) => {
    set({
      currentAccount: { provider, email },
      emails: [],
      selectedIds: new Set(),
      nextPageToken: undefined,
      reviewQueue: [],
    });
  },

  fetchEmails: async (loadMore = false) => {
    const { currentAccount, nextPageToken, emails } = get();
    if (!currentAccount) return;

    set({ isLoading: true, error: null });
    try {
      const result = await mcpTools.emailsFetch({
        provider: currentAccount.provider,
        accountEmail: currentAccount.email,
        maxResults: 50,
        pageToken: loadMore ? nextPageToken : undefined,
      });

      set({
        emails: loadMore ? [...emails, ...result.emails] : result.emails,
        nextPageToken: result.nextPageToken,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch emails',
        isLoading: false,
      });
    }
  },

  classifySelected: async () => {
    const { currentAccount, selectedIds, emails } = get();
    if (!currentAccount || selectedIds.size === 0) return;

    set({ isClassifying: true, error: null });
    try {
      const result = await mcpTools.emailsClassify({
        provider: currentAccount.provider,
        accountEmail: currentAccount.email,
        emailIds: Array.from(selectedIds),
      });

      // Update emails with classification results
      const classificationMap = new Map(
        result.results.map(r => [r.emailId, r])
      );

      const updatedEmails = emails.map(email => ({
        ...email,
        classification: classificationMap.get(email.id) || email.classification,
      }));

      // Filter out auto-archived emails and add to review queue
      const remainingEmails = updatedEmails.filter(
        e => !result.autoArchived.includes(e.id)
      );

      const newReviewItems = updatedEmails.filter(
        e => result.needsReview.includes(e.id)
      );

      set({
        emails: remainingEmails,
        reviewQueue: [...get().reviewQueue, ...newReviewItems],
        selectedIds: new Set(),
        isClassifying: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Classification failed',
        isClassifying: false,
      });
    }
  },

  classifyAll: async () => {
    const { emails } = get();
    const allIds = new Set(emails.map(e => e.id));
    set({ selectedIds: allIds });
    await get().classifySelected();
  },

  archiveEmails: async (emailIds: string[]) => {
    const { currentAccount, emails, reviewQueue } = get();
    if (!currentAccount) return;

    try {
      await mcpTools.emailsArchive({
        provider: currentAccount.provider,
        accountEmail: currentAccount.email,
        emailIds,
      });

      set({
        emails: emails.filter(e => !emailIds.includes(e.id)),
        reviewQueue: reviewQueue.filter(e => !emailIds.includes(e.id)),
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Archive failed',
      });
    }
  },

  toggleSelection: (emailId: string) => {
    const { selectedIds } = get();
    const newIds = new Set(selectedIds);
    if (newIds.has(emailId)) {
      newIds.delete(emailId);
    } else {
      newIds.add(emailId);
    }
    set({ selectedIds: newIds });
  },

  selectAll: () => {
    const { emails } = get();
    set({ selectedIds: new Set(emails.map(e => e.id)) });
  },

  clearSelection: () => {
    set({ selectedIds: new Set() });
  },

  acceptReview: async (emailId: string) => {
    await get().archiveEmails([emailId]);
  },

  rejectReview: (emailId: string) => {
    const { reviewQueue } = get();
    set({ reviewQueue: reviewQueue.filter(e => e.id !== emailId) });
  },
}));
