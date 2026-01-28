'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { EmailProvider } from '@mcp-mail/shared';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleCallback } = useAuthStore();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const provider = searchParams.get('provider') as EmailProvider | null;
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setErrorMessage(searchParams.get('error_description') || 'Authorization was denied');
        return;
      }

      if (!provider || !code || !state) {
        setStatus('error');
        setErrorMessage('Missing required parameters');
        return;
      }

      const success = await handleCallback(provider, code, state);
      if (success) {
        setStatus('success');
        setTimeout(() => router.push('/'), 2000);
      } else {
        setStatus('error');
        setErrorMessage('Failed to complete authentication');
      }
    };

    processCallback();
  }, [searchParams, handleCallback, router]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        {status === 'processing' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <CardTitle className="mt-4">Connecting...</CardTitle>
            <CardDescription>Please wait while we complete the connection</CardDescription>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <CardTitle className="mt-4">Connected!</CardTitle>
            <CardDescription>Your account has been connected successfully</CardDescription>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-red-500" />
            <CardTitle className="mt-4">Connection Failed</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </>
        )}
      </CardHeader>

      {status === 'error' && (
        <CardContent>
          <Button className="w-full" onClick={() => router.push('/auth/connect')}>
            Try Again
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

export default function CallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted/50 to-background">
      <Suspense
        fallback={
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <CardTitle className="mt-4">Loading...</CardTitle>
            </CardHeader>
          </Card>
        }
      >
        <CallbackContent />
      </Suspense>
    </div>
  );
}
