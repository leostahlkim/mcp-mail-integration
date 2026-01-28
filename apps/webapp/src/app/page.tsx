'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useEmailStore } from '@/stores/email.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { accounts, isLoading, fetchAccounts } = useAuthStore();
  const { setCurrentAccount, fetchEmails } = useEmailStore();

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleSelectAccount = (provider: 'gmail' | 'yahoo', email: string) => {
    setCurrentAccount(provider, email);
    fetchEmails();
    router.push('/inbox');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Mail className="h-16 w-16 mx-auto text-primary mb-4" />
          <h1 className="text-4xl font-bold tracking-tight">Email Cleaner</h1>
          <p className="text-lg text-muted-foreground mt-2">
            AI-powered email cleaning and organization
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {accounts.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>Select an account to manage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {accounts.map((account) => (
                  <Button
                    key={`${account.provider}-${account.email}`}
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => handleSelectAccount(account.provider, account.email)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          account.provider === 'gmail'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-purple-100 text-purple-600'
                        }`}
                      >
                        {account.provider === 'gmail' ? 'G' : 'Y'}
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{account.email}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {account.provider}
                        </p>
                      </div>
                    </div>
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.push('/auth/connect')}
                >
                  + Connect another account
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Get Started</CardTitle>
                <CardDescription>Connect your email account to begin</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => router.push('/auth/connect')}>
                  Connect Email Account
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
