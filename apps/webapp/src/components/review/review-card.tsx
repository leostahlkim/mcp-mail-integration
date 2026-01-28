'use client';

import type { EmailSummary, ClassificationResult } from '@mcp-mail/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/date-utils';

interface ReviewCardProps {
  email: EmailSummary & { classification?: ClassificationResult };
  onAccept: () => void;
  onReject: () => void;
}

export function ReviewCard({ email, onAccept, onReject }: ReviewCardProps) {
  const categoryVariant = email.classification?.category as
    | 'spam'
    | 'marketing'
    | 'newsletter'
    | 'social'
    | 'promotional'
    | 'irrelevant'
    | 'important'
    | undefined;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{email.subject}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              From: {email.from.name || email.from.email}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(email.date))}
            </p>
          </div>
          {email.classification && (
            <Badge variant={categoryVariant} className="shrink-0 ml-2">
              {email.classification.category}
              <span className="ml-1 opacity-70">
                {Math.round(email.classification.confidence * 100)}%
              </span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{email.snippet}</p>

        {email.classification?.reasoning && (
          <div className="bg-muted/50 rounded-md p-3 mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">AI Reasoning:</p>
            <p className="text-sm">{email.classification.reasoning}</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onReject}>
            <X className="mr-2 h-4 w-4" />
            Keep in Inbox
          </Button>
          <Button onClick={onAccept}>
            <Check className="mr-2 h-4 w-4" />
            Archive
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
