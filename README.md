# Email Cleaner - MCP Mail Integration

An AI-powered email cleaning application that helps you organize your inbox by automatically classifying and archiving emails. Built with the Model Context Protocol (MCP) for a clean separation between the AI backend and the web interface.

## Table of Contents

- [What Does This App Do?](#what-does-this-app-do)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Setup Instructions](#setup-instructions)
- [Running the App](#running-the-app)
- [Environment Variables](#environment-variables)
- [MCP Tools Reference](#mcp-tools-reference)
- [Classification Logic](#classification-logic)

---

## What Does This App Do?

This application connects to your Gmail or Yahoo email account and uses Claude AI to classify your emails into categories like:

- **Spam** - Unsolicited, suspicious emails
- **Marketing** - Promotional emails from companies
- **Newsletter** - Regular newsletter subscriptions
- **Social** - Social media notifications
- **Promotional** - Sales, discounts, offers
- **Irrelevant** - Automated notifications that need no action
- **Important** - Personal/work emails requiring attention

Based on the AI's confidence level, emails are either:
- **Auto-archived** (high confidence junk mail)
- **Sent to review queue** (medium confidence, you decide)
- **Kept in inbox** (low confidence or important)

---

## Architecture Overview

The app consists of three main parts that communicate with each other:

```
┌─────────────────────┐         HTTP/JSON-RPC         ┌─────────────────────┐
│                     │◄────────────────────────────►│                     │
│   Web App (UI)      │                              │   MCP Server        │
│   Next.js           │                              │   Node.js           │
│   Port 3000         │                              │   Port 3001         │
│                     │                              │                     │
└─────────────────────┘                              └──────────┬──────────┘
                                                                │
                                                                │ OAuth2 + API calls
                                                                │
                                              ┌─────────────────┴─────────────────┐
                                              │                                   │
                                              ▼                                   ▼
                                    ┌─────────────────┐                 ┌─────────────────┐
                                    │  Gmail / Yahoo  │                 │   Claude API    │
                                    │  Email APIs     │                 │   (Anthropic)   │
                                    └─────────────────┘                 └─────────────────┘
```

### Why This Architecture?

1. **MCP Server**: Acts as a "backend" that exposes "tools" (functions) the web app can call. This keeps all the sensitive logic (OAuth tokens, API keys) on the server side.

2. **Web App**: A user-friendly interface that calls the MCP server's tools to fetch emails, trigger classification, and archive messages.

3. **Separation of Concerns**: The web app doesn't know how to talk to Gmail or Claude - it just calls tools like `emails_fetch` or `emails_classify`. This makes the system modular and secure.

---

## Project Structure

This is a **monorepo** (multiple packages in one repository) managed by **pnpm workspaces** and **Turborepo**.

```
mcp-mail-integration/
│
├── packages/                    # Shared libraries and backend
│   │
│   ├── shared/                  # Shared code used by both server and webapp
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts         # Exports everything from this package
│   │       └── schemas/         # Zod schemas (validation + TypeScript types)
│   │           ├── provider.schema.ts      # OAuth & auth types
│   │           ├── email.schema.ts         # Email data types
│   │           └── classification.schema.ts # Classification types
│   │
│   └── mcp-server/              # The MCP server (backend)
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts         # Entry point - starts Express server
│           ├── server.ts        # MCP server setup & tool registration
│           │
│           ├── tools/           # MCP tool definitions (what the server can do)
│           │   ├── auth.tools.ts      # OAuth flow tools
│           │   ├── email.tools.ts     # Email fetch/archive tools
│           │   └── classify.tools.ts  # Classification tool
│           │
│           ├── providers/       # Email provider implementations
│           │   ├── index.ts           # Provider factory
│           │   ├── gmail/
│           │   │   └── gmail.client.ts    # Gmail API integration
│           │   └── yahoo/
│           │       └── yahoo.client.ts    # Yahoo API integration
│           │
│           ├── services/        # Business logic services
│           │   └── classification.service.ts  # Claude AI classification
│           │
│           └── storage/         # Data persistence
│               └── token.storage.ts   # Encrypted SQLite for OAuth tokens
│
├── apps/                        # Applications
│   │
│   └── webapp/                  # Next.js web application (frontend)
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.js       # Next.js configuration
│       ├── tailwind.config.js   # Tailwind CSS configuration
│       ├── postcss.config.js    # PostCSS configuration
│       │
│       └── src/
│           ├── app/             # Next.js App Router pages
│           │   ├── layout.tsx         # Root layout (applies to all pages)
│           │   ├── page.tsx           # Home page (/)
│           │   ├── providers.tsx      # React Query provider setup
│           │   ├── globals.css        # Global styles & CSS variables
│           │   │
│           │   ├── auth/
│           │   │   ├── connect/
│           │   │   │   └── page.tsx   # Provider selection (/auth/connect)
│           │   │   └── callback/
│           │   │       └── page.tsx   # OAuth callback handler (/auth/callback)
│           │   │
│           │   ├── inbox/
│           │   │   └── page.tsx       # Email list view (/inbox)
│           │   │
│           │   └── review/
│           │       └── page.tsx       # Review queue (/review)
│           │
│           ├── components/      # Reusable React components
│           │   ├── ui/                # Generic UI components (shadcn/ui style)
│           │   │   ├── button.tsx
│           │   │   ├── card.tsx
│           │   │   ├── checkbox.tsx
│           │   │   └── badge.tsx
│           │   │
│           │   ├── email/             # Email-specific components
│           │   │   ├── email-list.tsx       # Email list with toolbar
│           │   │   └── email-list-item.tsx  # Individual email row
│           │   │
│           │   └── review/            # Review queue components
│           │       ├── review-queue.tsx     # Review queue container
│           │       └── review-card.tsx      # Individual review item
│           │
│           ├── stores/          # Zustand state management
│           │   ├── auth.store.ts      # Authentication state
│           │   └── email.store.ts     # Email & classification state
│           │
│           └── lib/             # Utility functions
│               ├── utils.ts           # General utilities (cn for classNames)
│               ├── date-utils.ts      # Date formatting
│               └── mcp-client.ts      # MCP server communication
│
├── package.json                 # Root package.json (workspace scripts)
├── pnpm-workspace.yaml          # Defines which folders are packages
├── turbo.json                   # Turborepo build configuration
├── tsconfig.base.json           # Shared TypeScript configuration
├── .env.example                 # Example environment variables
└── .gitignore                   # Git ignore rules
```

---

## How It Works

### 1. Shared Package (`packages/shared`)

This package contains **Zod schemas** that define the shape of data used throughout the app. Zod gives us both:
- **Runtime validation**: Check that data matches expected shape
- **TypeScript types**: Auto-generated types for type safety

Example from `email.schema.ts`:
```typescript
export const EmailSummarySchema = z.object({
  id: z.string(),
  subject: z.string(),
  from: EmailAddressSchema,
  date: z.string().datetime(),
  // ... more fields
});

// This generates a TypeScript type automatically
export type EmailSummary = z.infer<typeof EmailSummarySchema>;
```

### 2. MCP Server (`packages/mcp-server`)

The MCP server exposes **tools** that can be called over HTTP. Think of tools as API endpoints, but following the MCP protocol.

**Entry Point (`index.ts`):**
- Creates an Express server
- Sets up CORS for the web app
- Handles MCP requests at `/mcp` endpoint
- Manages session IDs for stateful connections

**Server Setup (`server.ts`):**
- Creates the MCP server instance
- Registers all tools with their schemas and handlers

**Tools (`tools/`):**
Each tool has:
- A **name** (e.g., `emails_fetch`)
- A **description** (what it does)
- An **input schema** (what parameters it accepts)
- A **handler function** (the actual logic)

**Providers (`providers/`):**
These are the actual implementations for talking to email services:
- `gmail.client.ts`: Uses Google's `googleapis` library
- `yahoo.client.ts`: Uses Yahoo's REST API

Each provider handles:
- OAuth URL generation
- Token exchange
- Token refresh
- Email fetching
- Email archiving

**Services (`services/`):**
- `classification.service.ts`: Sends emails to Claude API with a carefully crafted prompt, parses the response, and determines what action to take.

**Storage (`storage/`):**
- `token.storage.ts`: Stores OAuth tokens in SQLite, encrypted with AES-256-GCM. This keeps tokens secure at rest.

### 3. Web App (`apps/webapp`)

A Next.js 14 application using the App Router.

**Pages (`app/`):**
- `/` - Home page showing connected accounts
- `/auth/connect` - Choose Gmail or Yahoo to connect
- `/auth/callback` - Handles OAuth redirect
- `/inbox` - Main email list view
- `/review` - Review queue for uncertain classifications

**State Management (`stores/`):**
Uses Zustand for simple, lightweight state:
- `auth.store.ts`: Tracks connected accounts, handles auth flow
- `email.store.ts`: Manages email list, selections, classifications, review queue

**MCP Client (`lib/mcp-client.ts`):**
A wrapper that:
- Sends JSON-RPC requests to the MCP server
- Maintains session ID for stateful communication
- Provides type-safe functions like `mcpTools.emailsFetch()`

**Components:**
- `ui/`: Generic, reusable components (buttons, cards, etc.)
- `email/`: Email-specific components (list, list item)
- `review/`: Review queue components

---

## Setup Instructions

### Prerequisites

- Node.js 18 or higher
- pnpm (will be installed if missing)

### 1. Install Dependencies

```bash
# Install pnpm globally if you don't have it
npm install -g pnpm

# Install all dependencies
pnpm install
```

### 2. Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your values (see Environment Variables section)
```

### 3. Set Up Gmail OAuth (if using Gmail)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Gmail API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials (Web application)
6. Add `http://localhost:3000/auth/callback?provider=gmail` as authorized redirect URI
7. Copy Client ID and Client Secret to `.env`

### 4. Set Up Yahoo OAuth (if using Yahoo)

1. Go to [Yahoo Developer Network](https://developer.yahoo.com/)
2. Create an app with Mail API access
3. Get Client ID and Client Secret
4. Add redirect URI: `http://localhost:3000/auth/callback?provider=yahoo`

### 5. Get Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an API key
3. Add to `.env` as `ANTHROPIC_API_KEY`

---

## Running the App

### Development Mode

```bash
# Start both MCP server and web app
pnpm dev
```

This runs:
- MCP Server at `http://localhost:3001`
- Web App at `http://localhost:3000`

### Production Build

```bash
# Build all packages
pnpm build

# Start the MCP server
pnpm -F @mcp-mail/server start

# In another terminal, start the web app
pnpm -F @mcp-mail/webapp start
```

---

## Environment Variables

Create a `.env` file in the root directory:

```bash
# Gmail OAuth Credentials
# Get these from Google Cloud Console
GMAIL_CLIENT_ID=your-gmail-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-gmail-client-secret
GMAIL_REDIRECT_URI=http://localhost:3000/auth/callback?provider=gmail

# Yahoo OAuth Credentials
# Get these from Yahoo Developer Network
YAHOO_CLIENT_ID=your-yahoo-client-id
YAHOO_CLIENT_SECRET=your-yahoo-client-secret
YAHOO_REDIRECT_URI=http://localhost:3000/auth/callback?provider=yahoo

# Anthropic API Key
# Get this from console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-your-api-key

# MCP Server Port
MCP_SERVER_PORT=3001

# Token Encryption Key
# Generate a random string for encrypting stored OAuth tokens
# You can use: openssl rand -hex 32
TOKEN_ENCRYPTION_KEY=your-random-encryption-key
```

---

## MCP Tools Reference

These are the tools exposed by the MCP server:

### Authentication Tools

| Tool | Description | Input |
|------|-------------|-------|
| `auth_initiate` | Starts OAuth flow, returns URL to redirect user | `{ provider: "gmail" \| "yahoo" }` |
| `auth_callback` | Exchanges OAuth code for tokens | `{ provider, code, state }` |
| `auth_status` | Lists all connected accounts | `{ provider?: "gmail" \| "yahoo" }` |

### Email Tools

| Tool | Description | Input |
|------|-------------|-------|
| `emails_fetch` | Fetches emails from inbox | `{ provider, accountEmail, maxResults?, pageToken?, query? }` |
| `email_get_content` | Gets full email body | `{ provider, accountEmail, emailId }` |
| `emails_archive` | Archives emails (removes from inbox) | `{ provider, accountEmail, emailIds[] }` |

### Classification Tools

| Tool | Description | Input |
|------|-------------|-------|
| `emails_classify` | Classifies emails using AI | `{ provider, accountEmail, emailIds[] }` |

---

## Classification Logic

The classification service uses these confidence thresholds:

| Confidence Level | Range | Action |
|------------------|-------|--------|
| **High** | >= 85% | Auto-archive (no user review needed) |
| **Medium** | 60% - 84% | Add to review queue (user decides) |
| **Low** | < 60% | Keep in inbox (probably important) |

### Categories That Get Archived

These categories are considered "archivable" (not important):
- spam
- marketing
- newsletter
- social
- promotional
- irrelevant

The `important` category is never auto-archived.

### Classification Prompt

The AI is instructed to be **skeptical** - it assumes most automated emails are not important. This helps catch more junk mail while being conservative with potentially important emails.

---

## Tech Stack Summary

| Component | Technology |
|-----------|------------|
| **Monorepo** | pnpm workspaces + Turborepo |
| **Language** | TypeScript |
| **Validation** | Zod |
| **MCP Server** | @modelcontextprotocol/sdk + Express |
| **Email APIs** | googleapis (Gmail), fetch (Yahoo) |
| **AI** | @anthropic-ai/sdk (Claude) |
| **Token Storage** | better-sqlite3 (encrypted) |
| **Web Framework** | Next.js 14 (App Router) |
| **Styling** | Tailwind CSS |
| **UI Components** | Radix UI primitives |
| **State Management** | Zustand |
| **Data Fetching** | TanStack Query |

---

## Troubleshooting

### "TOKEN_ENCRYPTION_KEY environment variable is required"
Make sure you've set the `TOKEN_ENCRYPTION_KEY` in your `.env` file.

### OAuth redirect errors
- Check that your redirect URIs exactly match what's configured in Google/Yahoo console
- Make sure you're using `http://localhost:3000` (not `127.0.0.1`)

### "Cannot find module '@mcp-mail/shared'"
Run `pnpm build` to build all packages first.

### Emails not loading
- Check browser console for errors
- Verify the MCP server is running on port 3001
- Check that OAuth tokens haven't expired

---

## License

MIT
