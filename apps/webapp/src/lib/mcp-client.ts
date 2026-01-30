const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:3001';

let sessionId: string | null = null;
let isInitialized = false;
let initializePromise: Promise<void> | null = null;

function resetSession() {
  sessionId = null;
  isInitialized = false;
  initializePromise = null;
}

interface McpToolResult {
  content: Array<{ type: string; text: string }>;
}

// Parse SSE response format: "event: message\ndata: {...}\n\n"
async function parseSSEResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  // Extract JSON from SSE data line
  const dataMatch = text.match(/^data: (.+)$/m);
  if (!dataMatch) {
    throw new Error('Invalid SSE response format');
  }

  return JSON.parse(dataMatch[1]);
}

async function initializeSession(): Promise<void> {
  // Send initialize request
  const initResponse = await fetch(`${MCP_SERVER_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'mcp-mail-webapp',
          version: '1.0.0',
        },
      },
    }),
  });

  if (!initResponse.ok) {
    throw new Error(`MCP initialize failed: ${initResponse.statusText}`);
  }

  // Store session ID from initialize response
  const newSessionId = initResponse.headers.get('mcp-session-id');
  if (newSessionId) {
    sessionId = newSessionId;
  }

  const initData = await parseSSEResponse(initResponse) as { error?: { message: string } };
  if (initData.error) {
    throw new Error(initData.error.message || 'MCP initialize error');
  }

  // Send initialized notification to complete handshake
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };
  if (sessionId) {
    headers['mcp-session-id'] = sessionId;
  }

  const notifyResponse = await fetch(`${MCP_SERVER_URL}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    }),
  });

  if (!notifyResponse.ok) {
    throw new Error(`MCP initialized notification failed: ${notifyResponse.status}`);
  }

  isInitialized = true;
}

async function ensureInitialized(): Promise<void> {
  if (isInitialized) {
    return;
  }

  // Prevent concurrent initialization attempts
  if (!initializePromise) {
    initializePromise = initializeSession().finally(() => {
      initializePromise = null;
    });
  }

  await initializePromise;
}

export async function callMcpTool<T>(
  toolName: string,
  args: Record<string, unknown>
): Promise<T> {
  const maxRetries = 1;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Ensure MCP session is initialized before making tool calls
      await ensureInitialized();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      };

      if (sessionId) {
        headers['mcp-session-id'] = sessionId;
      }

      const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args,
          },
        }),
      });

      // Store session ID for subsequent requests
      const newSessionId = response.headers.get('mcp-session-id');
      if (newSessionId) {
        sessionId = newSessionId;
      }

      if (!response.ok) {
        throw new Error(`MCP request failed: ${response.status}`);
      }

      const data = await parseSSEResponse(response) as { error?: { message: string }; result: McpToolResult };

      if (data.error) {
        throw new Error(data.error.message || 'MCP tool error');
      }

      const result = data.result;
      const textContent = result.content.find(c => c.type === 'text');

      if (!textContent) {
        throw new Error('No text content in response');
      }

      return JSON.parse(textContent.text) as T;
    } catch (error) {
      if (attempt < maxRetries) {
        // Reset session state and retry once
        resetSession();
        continue;
      }
      throw error;
    }
  }

  throw new Error('Unreachable');
}

// Type-safe tool wrappers
import type {
  AuthInitiateInput,
  AuthInitiateOutput,
  AuthCallbackInput,
  AuthCallbackOutput,
  AuthStatusInput,
  AuthStatusOutput,
  EmailFetchInput,
  EmailFetchOutput,
  EmailGetContentInput,
  EmailContent,
  EmailArchiveInput,
  EmailArchiveOutput,
  ClassifyEmailsInput,
  ClassifyEmailsOutput,
} from '@mcp-mail/shared';

export const mcpTools = {
  authInitiate: (input: AuthInitiateInput) =>
    callMcpTool<AuthInitiateOutput>('auth_initiate', input),

  authCallback: (input: AuthCallbackInput) =>
    callMcpTool<AuthCallbackOutput>('auth_callback', input),

  authStatus: (input: AuthStatusInput = {}) =>
    callMcpTool<AuthStatusOutput>('auth_status', input),

  emailsFetch: (input: EmailFetchInput) =>
    callMcpTool<EmailFetchOutput>('emails_fetch', input),

  emailGetContent: (input: EmailGetContentInput) =>
    callMcpTool<EmailContent>('email_get_content', input),

  emailsArchive: (input: EmailArchiveInput) =>
    callMcpTool<EmailArchiveOutput>('emails_archive', input),

  emailsClassify: (input: ClassifyEmailsInput) =>
    callMcpTool<ClassifyEmailsOutput>('emails_classify', input),
};
