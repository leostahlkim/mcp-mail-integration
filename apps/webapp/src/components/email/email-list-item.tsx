'use client';

import { formatDistanceToNow } from '@/lib/date-utils';
import type { EmailSummary, ClassificationResult } from '@mcp-mail/shared';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EmailListItemProps {
  email: EmailSummary & { classification?: ClassificationResult };
  selected: boolean;
  onToggle: () => void;
}

export function EmailListItem({ email, selected, onToggle }: EmailListItemProps) {
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
    <div
      className={cn(
        'flex items-start gap-3 p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors',
        selected && 'bg-muted',
        !email.isRead && 'bg-blue-50/50'
      )}
      onClick={onToggle}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        onClick={(e) => e.stopPropagation()}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-sm truncate', !email.isRead && 'font-semibold')}>
            {email.from.name || email.from.email}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(email.date))}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <span className={cn('text-sm truncate', !email.isRead && 'font-medium')}>
            {email.subject}
          </span>
          {email.classification && (
            <Badge variant={categoryVariant} className="shrink-0">
              {email.classification.category}
              <span className="ml-1 opacity-70">
                {Math.round(email.classification.confidence * 100)}%
              </span>
            </Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground truncate mt-1">{email.snippet}</p>
      </div>
    </div>
  );
}
