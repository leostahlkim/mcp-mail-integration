'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEmailStore } from '@/stores/email.store';
import { useAuthStore } from '@/stores/auth.store';
import { EmailList } from '@/components/email/email-list';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, ClipboardList, Loader2 } from 'lucide-react';

export default function InboxPage() {
  const router = useRouter();
  const { currentAccount, reviewQueue, fetchEmails } = useEmailStore();
  const { accounts } = useAuthStore();

  useEffect(() => {
    if (!currentAccount && accounts.length > 0) {
      const first = accounts[0];
      useEmailStore.getState().setCurrentAccount(first.provider, first.email);
      fetchEmails();
    } else if (!currentAccount && accounts.length === 0) {
      router.push('/');
    }
  }, [currentAccount, accounts, fetchEmails, router]);

  if (!currentAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <span className="font-semibold">Inbox</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{currentAccount.email}</span>
            <Button
              variant={reviewQueue.length > 0 ? 'default' : 'outline'}
              size="sm"
              onClick={() => router.push('/review')}
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              Review Queue
              {reviewQueue.length > 0 && (
                <span className="ml-2 bg-primary-foreground text-primary px-2 py-0.5 rounded-full text-xs">
                  {reviewQueue.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <EmailList />
      </main>
    </div>
  );
}
