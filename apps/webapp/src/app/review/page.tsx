'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEmailStore } from '@/stores/email.store';
import { ReviewQueue } from '@/components/review/review-queue';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';

export default function ReviewPage() {
  const router = useRouter();
  const { currentAccount } = useEmailStore();

  useEffect(() => {
    if (!currentAccount) {
      router.push('/');
    }
  }, [currentAccount, router]);

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
            <Button variant="ghost" size="icon" onClick={() => router.push('/inbox')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <span className="font-semibold">Review Queue</span>
            </div>
          </div>

          <span className="text-sm text-muted-foreground">{currentAccount.email}</span>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-3xl">
        <ReviewQueue />
      </main>
    </div>
  );
}
