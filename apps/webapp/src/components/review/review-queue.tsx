'use client';

import { useEmailStore } from '@/stores/email.store';
import { ReviewCard } from './review-card';

export function ReviewQueue() {
  const { reviewQueue, acceptReview, rejectReview } = useEmailStore();

  if (reviewQueue.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No emails to review</p>
        <p className="text-sm mt-2">
          Classify some emails to see items that need manual review here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Review Queue</h2>
        <p className="text-sm text-muted-foreground">
          {reviewQueue.length} email{reviewQueue.length !== 1 ? 's' : ''} need your review
        </p>
      </div>

      {reviewQueue.map((email) => (
        <ReviewCard
          key={email.id}
          email={email}
          onAccept={() => acceptReview(email.id)}
          onReject={() => rejectReview(email.id)}
        />
      ))}
    </div>
  );
}
