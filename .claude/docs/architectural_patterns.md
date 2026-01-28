# Architectural Patterns

This document describes patterns and conventions used throughout the codebase.

## 1. Model Context Protocol (MCP) Architecture

The application uses MCP as a communication layer between frontend and backend.

**Pattern**: Tools are registered on the server with input/output schemas, called via HTTP JSON-RPC from the client.

**Server registration** (`packages/mcp-server/src/server.ts:24-67`):
- `server.setRequestHandler(ListToolsRequestSchema, ...)` returns tool definitions
- `server.setRequestHandler(CallToolRequestSchema, ...)` routes to tool handlers

**Client calls** (`apps/webapp/src/lib/mcp-client.ts:9-59`):
- Generic `callMcpTool<T>()` function with session ID management
- Type-safe wrappers for each tool (lines 79-100)

**Session management**: Session ID stored in closure, sent via `x-mcp-session-id` header.

## 2. Zod Schema-First Design

All data types are defined as Zod schemas, with TypeScript types inferred.

**Pattern**: Define schema once in `packages/shared`, use everywhere.

**Examples**:
- `packages/shared/src/schemas/email.schema.ts:6-24` → `EmailSummary` type
- `packages/shared/src/schemas/classification.schema.ts:11-21` → `ClassificationResult` type

**Usage**:
```typescript
import { EmailSummarySchema, type EmailSummary } from '@mcp-mail/shared';
const validated = EmailSummarySchema.parse(data);
```

**Benefits**: Runtime validation + compile-time types from single source.

## 3. Provider Factory Pattern

Email providers (Gmail, Yahoo) implement a common interface.

**Pattern**: Factory function returns appropriate client based on provider string.

**Implementation** (`packages/mcp-server/src/providers/index.ts:5-14`):
```typescript
export function getProviderClient(provider: EmailProvider) {
  switch (provider) {
    case 'gmail': return GmailClient;
    case 'yahoo': return YahooClient;
  }
}
```

**Common interface methods**:
- `getAuthUrl(state)` → OAuth authorization URL
- `exchangeCode(code)` → Exchange code for token
- `fetchEmails(token, cursor?)` → Fetch inbox emails
- `getEmailContent(token, emailId)` → Get full email
- `archiveEmail(token, emailId)` → Archive email

**Adding new provider**: Create client in `providers/`, add case to factory.

## 4. Zustand Store Pattern

Frontend state is managed with Zustand stores using a consistent structure.

**Pattern**: Each store has state interface, initial state, and action creators.

**Structure** (`apps/webapp/src/stores/email.store.ts:14-33`, `apps/webapp/src/stores/auth.store.ts:3-12`):
```typescript
interface StoreState {
  // State fields
  data: T[];
  isLoading: boolean;
  error: string | null;
  // Actions
  fetchData: () => Promise<void>;
  updateData: (item: T) => void;
}
```

**Async actions**: Use `get()` for current state, `set()` for updates.

## 5. Encrypted Token Storage

OAuth tokens are encrypted at rest using AES-256-GCM.

**Pattern**: Encrypt before save, decrypt on read, with random IV per token.

**Implementation** (`packages/mcp-server/src/storage/token.storage.ts:23-62`):
- Encryption key from `TOKEN_ENCRYPTION_KEY` env var
- Random 16-byte IV generated per encryption
- IV prepended to ciphertext for storage
- Auth tag appended for integrity verification

**Database schema** (lines 64-82):
- `tokens` table: provider, email, encrypted_token, created_at, updated_at
- `oauth_states` table: state code with 10-minute TTL for CSRF protection

## 6. OAuth State CSRF Protection

OAuth flows use database-stored state parameters to prevent CSRF attacks.

**Pattern**: Generate state → store with TTL → verify and consume on callback.

**Flow**:
1. `saveOAuthState(state)` → Store state with timestamp (`token.storage.ts:143-151`)
2. Include state in OAuth URL
3. `verifyAndConsumeState(state)` → Check exists and not expired, delete (`token.storage.ts:153-171`)
4. Reject if state invalid or expired (10-minute TTL)

## 7. Classification Caching

Email classifications are cached in-memory to avoid redundant API calls.

**Pattern**: Map-based cache keyed by email ID, checked before API call.

**Implementation** (`packages/mcp-server/src/services/classification.service.ts:118-130`):
- Cache is per-process, cleared on restart
- Suitable for session-based use

## 8. Confidence-Based Decision Making

AI classification results drive automated actions based on confidence thresholds.

**Pattern**: Define thresholds, route results to different actions.

**Thresholds** (`packages/shared/src/schemas/classification.schema.ts:48-52`):
- HIGH (>=0.85): Auto-archive
- MEDIUM (0.60-0.84): Review queue
- Below MEDIUM: Keep in inbox

**Decision logic** (`packages/mcp-server/src/tools/classify.tools.ts:55-74`):
- High confidence + archivable category → auto-archive
- Medium confidence → send to review queue
- Low confidence → keep in inbox

## 9. Component Composition (Radix + CVA)

UI components follow shadcn/ui patterns with Radix primitives and CVA variants.

**Pattern**: Wrap Radix primitives with Tailwind styles, expose variant props.

**Location**: `apps/webapp/src/components/ui/`

**Usage**: `<Button variant="outline" size="sm">Click</Button>`

## 10. Monorepo Package Dependencies

Packages reference each other using pnpm workspace protocol.

**Pattern**: Use `workspace:*` for local dependencies, Turborepo for build order.

**Configuration** (`packages/mcp-server/package.json:23-25`, `apps/webapp/package.json:31-33`):
```json
{
  "dependencies": {
    "@mcp-mail/shared": "workspace:*"
  }
}
```

**Build order** (`turbo.json:3-7`): `dependsOn: ["^build"]` ensures dependencies build first.
