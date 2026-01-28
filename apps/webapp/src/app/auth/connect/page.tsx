'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { EmailProvider } from '@mcp-mail/shared';

export default function ConnectPage() {
  const router = useRouter();
  const { initiateAuth, isLoading, error } = useAuthStore();
  const [connecting, setConnecting] = useState<EmailProvider | null>(null);

  const handleConnect = async (provider: EmailProvider) => {
    setConnecting(provider);
    try {
      const authUrl = await initiateAuth(provider);
      // Redirect to OAuth provider
      window.location.href = authUrl;
    } catch {
      setConnecting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Connect Email Account</CardTitle>
              <CardDescription>
                Choose your email provider to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                  {error}
                </div>
              )}

              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => handleConnect('gmail')}
                disabled={isLoading}
              >
                {connecting === 'gmail' ? (
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                ) : (
                  <div className="w-6 h-6 mr-3 bg-red-100 text-red-600 rounded flex items-center justify-center text-sm font-bold">
                    G
                  </div>
                )}
                <div className="text-left">
                  <p className="font-medium">Gmail</p>
                  <p className="text-xs text-muted-foreground">
                    Connect your Google account
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => handleConnect('yahoo')}
                disabled={isLoading}
              >
                {connecting === 'yahoo' ? (
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                ) : (
                  <div className="w-6 h-6 mr-3 bg-purple-100 text-purple-600 rounded flex items-center justify-center text-sm font-bold">
                    Y
                  </div>
                )}
                <div className="text-left">
                  <p className="font-medium">Yahoo Mail</p>
                  <p className="text-xs text-muted-foreground">
                    Connect your Yahoo account
                  </p>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
