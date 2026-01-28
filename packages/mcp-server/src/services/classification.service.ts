import Anthropic from '@anthropic-ai/sdk';
import type {
  EmailContent,
  ClassificationResult,
  ClassificationCategory,
} from '@mcp-mail/shared';
import { CONFIDENCE_THRESHOLDS, ARCHIVABLE_CATEGORIES } from '@mcp-mail/shared';

const client = new Anthropic();

const CLASSIFICATION_PROMPT = `You are an email classification assistant. Your job is to classify emails and determine if they should be archived (removed from inbox).

Be SKEPTICAL of emails. Most promotional, marketing, newsletter, and automated emails should be archived. Only emails that genuinely require user attention should stay in the inbox.

Categories:
- spam: Unsolicited, suspicious, or unwanted emails
- marketing: Promotional emails from companies
- newsletter: Regular newsletter subscriptions
- social: Social media notifications (likes, follows, comments)
- promotional: Sales, discounts, promotional offers
- irrelevant: Automated notifications, confirmations that need no action
- important: Personal emails, work emails, emails requiring action

For each email, provide:
1. category: One of the categories above
2. confidence: 0.0 to 1.0 (how confident you are)
3. reasoning: Brief explanation (1-2 sentences)

Confidence guidelines:
- 0.85+: Very clear classification (e.g., obvious marketing email)
- 0.60-0.84: Fairly confident but some ambiguity
- Below 0.60: Uncertain, better to keep in inbox

Respond in JSON format:
{
  "classifications": [
    {
      "emailId": "...",
      "category": "...",
      "confidence": 0.XX,
      "reasoning": "..."
    }
  ]
}`;

interface ClassificationResponse {
  classifications: Array<{
    emailId: string;
    category: ClassificationCategory;
    confidence: number;
    reasoning: string;
  }>;
}

export async function classifyEmails(
  emails: EmailContent[]
): Promise<ClassificationResult[]> {
  if (emails.length === 0) return [];

  const emailSummaries = emails.map(email => ({
    id: email.id,
    from: `${email.from.name || ''} <${email.from.email}>`,
    subject: email.subject,
    snippet: email.snippet,
    body: email.body.text?.slice(0, 500) || email.body.html?.slice(0, 500) || '',
    date: email.date,
  }));

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `${CLASSIFICATION_PROMPT}

Emails to classify:
${JSON.stringify(emailSummaries, null, 2)}`,
      },
    ],
  });

  const responseText = message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse classification response');
  }

  const response: ClassificationResponse = JSON.parse(jsonMatch[0]);

  return response.classifications.map(c => {
    const shouldArchive =
      ARCHIVABLE_CATEGORIES.includes(c.category) &&
      c.confidence >= CONFIDENCE_THRESHOLDS.HIGH;

    const needsReview =
      ARCHIVABLE_CATEGORIES.includes(c.category) &&
      c.confidence >= CONFIDENCE_THRESHOLDS.MEDIUM &&
      c.confidence < CONFIDENCE_THRESHOLDS.HIGH;

    return {
      emailId: c.emailId,
      category: c.category,
      confidence: c.confidence,
      reasoning: c.reasoning,
      shouldArchive,
      needsReview,
    };
  });
}

// Simple in-memory cache for classification results
const classificationCache = new Map<string, ClassificationResult>();

export function getCachedClassification(emailId: string): ClassificationResult | undefined {
  return classificationCache.get(emailId);
}

export function cacheClassification(result: ClassificationResult): void {
  classificationCache.set(result.emailId, result);
}

export function clearClassificationCache(): void {
  classificationCache.clear();
}
