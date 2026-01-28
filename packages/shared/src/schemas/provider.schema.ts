import { z } from 'zod';

export const EmailProviderSchema = z.enum(['gmail', 'yahoo']);
export type EmailProvider = z.infer<typeof EmailProviderSchema>;

export const OAuthTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number(),
  scope: z.string().optional(),
});
export type OAuthToken = z.infer<typeof OAuthTokenSchema>;

export const AuthStatusSchema = z.object({
  provider: EmailProviderSchema,
  email: z.string().email(),
  connected: z.boolean(),
  expiresAt: z.number().optional(),
});
export type AuthStatus = z.infer<typeof AuthStatusSchema>;

export const AuthInitiateInputSchema = z.object({
  provider: EmailProviderSchema,
});
export type AuthInitiateInput = z.infer<typeof AuthInitiateInputSchema>;

export const AuthInitiateOutputSchema = z.object({
  authUrl: z.string().url(),
  state: z.string(),
});
export type AuthInitiateOutput = z.infer<typeof AuthInitiateOutputSchema>;

export const AuthCallbackInputSchema = z.object({
  provider: EmailProviderSchema,
  code: z.string(),
  state: z.string(),
});
export type AuthCallbackInput = z.infer<typeof AuthCallbackInputSchema>;

export const AuthCallbackOutputSchema = z.object({
  success: z.boolean(),
  email: z.string().email().optional(),
  error: z.string().optional(),
});
export type AuthCallbackOutput = z.infer<typeof AuthCallbackOutputSchema>;

export const AuthStatusInputSchema = z.object({
  provider: EmailProviderSchema.optional(),
});
export type AuthStatusInput = z.infer<typeof AuthStatusInputSchema>;

export const AuthStatusOutputSchema = z.object({
  accounts: z.array(AuthStatusSchema),
});
export type AuthStatusOutput = z.infer<typeof AuthStatusOutputSchema>;
