# Email Cleaner - MCP Mail Integration

AI-powered email management application that classifies and archives emails using Claude AI.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 14 (App Router), React 18, Zustand, TanStack Query, Tailwind CSS, Radix UI |
| **Backend** | Node.js, Express, MCP SDK, SQLite (better-sqlite3) |
| **Shared** | TypeScript 5.3, Zod schemas |
| **AI** | Claude Sonnet 4 via Anthropic SDK |
| **Email APIs** | Gmail (googleapis), Yahoo (REST API) |
| **Build** | Turborepo, pnpm workspaces |

## Project Structure

```
/
├── apps/webapp/          # Next.js frontend (port 3000)
│   ├── src/app/          # Pages (App Router)
│   ├── src/components/   # React components
│   ├── src/stores/       # Zustand state stores
│   └── src/lib/          # Utilities, MCP client
├── packages/
│   ├── mcp-server/       # Express MCP server (port 3001)
│   │   ├── src/tools/    # MCP tool implementations
│   │   ├── src/providers/# Gmail & Yahoo API clients
│   │   ├── src/services/ # Classification service
│   │   └── src/storage/  # Encrypted token storage
│   └── shared/           # Shared Zod schemas & types
└── turbo.json            # Turborepo config
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `packages/shared/src/schemas/` | Zod schemas defining all data types (provider, email, classification) |
| `packages/mcp-server/src/tools/` | MCP tool handlers for auth, email, classification |
| `packages/mcp-server/src/providers/` | Email provider implementations (Gmail, Yahoo) |
| `packages/mcp-server/src/storage/` | SQLite token storage with AES-256-GCM encryption |
| `apps/webapp/src/stores/` | Zustand stores for auth and email state |
| `apps/webapp/src/lib/mcp-client.ts` | Type-safe MCP tool caller |

## Commands

```bash
# Install dependencies
pnpm install

# Development (runs all packages)
pnpm dev

# Build all packages
pnpm build

# Lint all packages
pnpm lint

# Clean build artifacts
pnpm clean
```

### Package-specific commands

```bash
# MCP Server only
cd packages/mcp-server && pnpm dev

# Webapp only
cd apps/webapp && pnpm dev
```

## Environment Variables

Required in `.env` (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` | Google OAuth credentials |
| `YAHOO_CLIENT_ID`, `YAHOO_CLIENT_SECRET` | Yahoo OAuth credentials |
| `ANTHROPIC_API_KEY` | Claude API access |
| `TOKEN_ENCRYPTION_KEY` | 32-byte key for token encryption |

## Key Files Reference

| File | Purpose |
|------|---------|
| `packages/mcp-server/src/server.ts:1-129` | MCP server setup, tool registration |
| `packages/mcp-server/src/services/classification.service.ts:11-44` | Claude prompt and classification logic |
| `packages/mcp-server/src/storage/token.storage.ts:23-49` | Token encryption/decryption |
| `packages/shared/src/schemas/classification.schema.ts:1-56` | Classification categories and thresholds |
| `apps/webapp/src/lib/mcp-client.ts:9-59` | MCP HTTP client with session management |
| `apps/webapp/src/stores/email.store.ts:81-124` | Email classification workflow |

## MCP Tools

The server exposes these tools via JSON-RPC:

| Tool | Purpose | File |
|------|---------|------|
| `auth_initiate` | Start OAuth flow | `tools/auth.tools.ts:8-21` |
| `auth_callback` | Complete OAuth exchange | `tools/auth.tools.ts:23-47` |
| `auth_status` | List connected accounts | `tools/auth.tools.ts:49-74` |
| `emails_fetch` | Fetch inbox emails | `tools/email.tools.ts:7-21` |
| `email_get_content` | Get full email content | `tools/email.tools.ts:23-33` |
| `emails_archive` | Archive emails | `tools/email.tools.ts:35-44` |
| `emails_classify` | AI classification | `tools/classify.tools.ts:8-76` |

## Classification Thresholds

Defined in `packages/shared/src/schemas/classification.schema.ts:48-52`:

- **HIGH** (>=0.85): Auto-archive
- **MEDIUM** (0.60-0.84): Review queue
- **LOW** (<0.60): Keep in inbox

## Additional Documentation

When working on specific areas, check these files:

| Topic | File |
|-------|------|
| Architectural patterns & conventions | `.claude/docs/architectural_patterns.md` |
