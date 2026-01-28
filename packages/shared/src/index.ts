// Provider schemas
export {
  EmailProviderSchema,
  OAuthTokenSchema,
  AuthStatusSchema,
  AuthInitiateInputSchema,
  AuthInitiateOutputSchema,
  AuthCallbackInputSchema,
  AuthCallbackOutputSchema,
  AuthStatusInputSchema,
  AuthStatusOutputSchema,
  type EmailProvider,
  type OAuthToken,
  type AuthStatus,
  type AuthInitiateInput,
  type AuthInitiateOutput,
  type AuthCallbackInput,
  type AuthCallbackOutput,
  type AuthStatusInput,
  type AuthStatusOutput,
} from './schemas/provider.schema.js';

// Email schemas
export {
  EmailAddressSchema,
  EmailSummarySchema,
  EmailContentSchema,
  EmailFetchInputSchema,
  EmailFetchOutputSchema,
  EmailGetContentInputSchema,
  EmailArchiveInputSchema,
  EmailArchiveOutputSchema,
  type EmailAddress,
  type EmailSummary,
  type EmailContent,
  type EmailFetchInput,
  type EmailFetchOutput,
  type EmailGetContentInput,
  type EmailArchiveInput,
  type EmailArchiveOutput,
} from './schemas/email.schema.js';

// Classification schemas
export {
  ClassificationCategorySchema,
  ClassificationResultSchema,
  ClassifyEmailsInputSchema,
  ClassifyEmailsOutputSchema,
  CONFIDENCE_THRESHOLDS,
  ARCHIVABLE_CATEGORIES,
  type ClassificationCategory,
  type ClassificationResult,
  type ClassifyEmailsInput,
  type ClassifyEmailsOutput,
} from './schemas/classification.schema.js';
