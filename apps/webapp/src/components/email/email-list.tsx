'use client';

import { useEmailStore } from '@/stores/email.store';
import { EmailListItem } from './email-list-item';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function EmailList() {
  const {
    emails,
    selectedIds,
    isLoading,
    isClassifying,
    error,
    nextPageToken,
    fetchEmails,
    classifySelected,
    classifyAll,
    toggleSelection,
    selectAll,
    clearSelection,
  } = useEmailStore();

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        <p>{error}</p>
        <Button variant="outline" onClick={() => fetchEmails()} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading && emails.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No emails found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectedIds.size === emails.length ? clearSelection : selectAll}
          >
            {selectedIds.size === emails.length ? 'Deselect All' : 'Select All'}
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedIds.size > 0 && `${selectedIds.size} selected`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={classifySelected}
            disabled={selectedIds.size === 0 || isClassifying}
          >
            {isClassifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Classify Selected
          </Button>
          <Button
            size="sm"
            onClick={classifyAll}
            disabled={isClassifying || emails.length === 0}
          >
            {isClassifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Classify All
          </Button>
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-auto">
        {emails.map((email) => (
          <EmailListItem
            key={email.id}
            email={email}
            selected={selectedIds.has(email.id)}
            onToggle={() => toggleSelection(email.id)}
          />
        ))}

        {nextPageToken && (
          <div className="p-4 text-center">
            <Button variant="outline" onClick={() => fetchEmails(true)} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
